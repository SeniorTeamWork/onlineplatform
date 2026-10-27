export function lessonAccessState(data, enrollment) {
  if (!enrollment) return "trial";

  const paid = data.payments
    .filter(
      (payment) =>
        payment.userId === enrollment.userId &&
        payment.courseId === enrollment.courseId &&
        !payment.voidedAt
    )
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const user = data.users.find(
    (account) => account.id === enrollment.userId
  );

  const mode = enrollment.accessMode || user?.accessMode;

  if (Number(enrollment.fee) <= paid || mode === "active") {
    return "active";
  }

  return paid > 0 || mode === "deposit" ? "deposit" : "trial";
}

export function lessonUnlocked(data, userId, lessonId) {
  const user = data.users.find(
    (account) => account.id === userId
  );

  const lesson = data.lessons.find(
    (item) => item.id === lessonId
  );

  if (!user?.active || !lesson?.published || lesson.archived) {
    return false;
  }

  const enrollment = data.enrollments.find(
    (item) =>
      item.userId === userId &&
      item.courseId === lesson.courseId
  );

  if (!enrollment) return false;

  const lessons = data.lessons.filter(
    (item) =>
      item.courseId === lesson.courseId &&
      item.published &&
      !item.archived
  );

  const index = lessons.findIndex(
    (item) => item.id === lessonId
  );

  if (index < 0) return false;

  // Kursning birinchi darsi.
  if (index === 0) return true;

  const paid = data.payments
    .filter(
      (payment) =>
        payment.userId === userId &&
        payment.courseId === lesson.courseId &&
        !payment.voidedAt
    )
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const manualActive =
    (enrollment.accessMode || user.accessMode) === "active";

  // Mavjud to‘lov cheklovi saqlanadi.
  if (Number(enrollment.fee) > 0 && paid <= 0 && !manualActive) {
    return false;
  }

  // Barcha oldingi darslarda:
  // 1. Video oxirigacha ko‘rilgan bo‘lishi kerak.
  // 2. Test topshirilgan bo‘lishi kerak.
  // Test bali bo‘yicha chegara yo‘q.
  return lessons.slice(0, index).every((previous) => {
    const watched =
      data.progress?.[userId]?.[previous.id]?.watched === true;

    const submitted = data.attempts.some(
      (attempt) =>
        attempt.userId === userId &&
        attempt.lessonId === previous.id &&
        testScore(attempt) !== null
    );

    return watched && submitted;
  });
}

export function testScore(attempt) {
  if (!attempt) return null;

  const total = Number(attempt.total);
  const correct = Number(attempt.correctCount);

  if (
    Number.isInteger(total) &&
    total > 0 &&
    Number.isInteger(correct) &&
    correct >= 0 &&
    correct <= total
  ) {
    return (correct * 100) / total;
  }

  if (
    attempt.score === null ||
    attempt.score === undefined ||
    attempt.score === ""
  ) {
    return null;
  }

  const score = Number(attempt.score);

  return Number.isFinite(score) && score >= 0 && score <= 100
    ? score
    : null;
}

export function certificateLevel(score) {
  if (!Number.isFinite(score) || score < 60 || score > 100) {
    return null;
  }

  if (score < 74) return "Basic";
  if (score < 88) return "Standart";

  return "Expert";
}

export function calculateCourseResult(data, userId, courseId) {
  const lessons = data.lessons.filter(
    (lesson) =>
      lesson.courseId === courseId &&
      lesson.published &&
      !lesson.archived
  );

  const scores = lessons.map((lesson) => {
    const attempts = data.attempts.filter(
      (attempt) =>
        attempt.userId === userId &&
        attempt.lessonId === lesson.id
    );

    const latest = attempts.reduce((previous, current) => {
      if (!previous) return current;

      const previousTime = Date.parse(previous.createdAt) || 0;
      const currentTime = Date.parse(current.createdAt) || 0;

      return currentTime >= previousTime ? current : previous;
    }, null);

    return testScore(latest);
  });

  const tests = scores.filter(
    (score) => score !== null
  ).length;

  const allTestsDone =
    lessons.length > 0 && tests === lessons.length;

  const average = tests
    ? scores.reduce(
        (sum, score) => sum + (score ?? 0),
        0
      ) / tests
    : 0;

  const enrolled = data.enrollments.some(
    (enrollment) =>
      enrollment.userId === userId &&
      enrollment.courseId === courseId
  );

  const student = data.users.find(
    (user) => user.id === userId
  );

  const level = allTestsDone
    ? certificateLevel(average)
    : null;

  return {
    lessons,
    tests,
    allTestsDone,
    average,
    level,

    watched: lessons.filter(
      (lesson) =>
        data.progress?.[userId]?.[lesson.id]?.watched
    ).length,

    practical: lessons.filter((lesson) =>
      data.submissions.some(
        (submission) =>
          submission.userId === userId &&
          submission.lessonId === lesson.id &&
          submission.status === "approved"
      )
    ).length,

    ready:
      enrolled &&
      Boolean(student?.active) &&
      allTestsDone &&
      Boolean(level),
  };
}

export function createCourseCertificate(data, userId, courseId) {
  data.certificates ??= [];

  const existing = data.certificates.find(
    (certificate) =>
      certificate.userId === userId &&
      certificate.courseId === courseId
  );

  if (existing) return existing;

  const result = calculateCourseResult(
    data,
    userId,
    courseId
  );

  if (!result.ready) {
    throw new Error(
      "Barcha dars testlarini yakunlang. O‘rtacha ball kamida 60 bo‘lishi kerak."
    );
  }

  const student = data.users.find(
    (user) => user.id === userId
  );

  const course = data.courses.find(
    (item) => item.id === courseId
  );

  const name = student.firstName
    ? [student.lastName || student.surname, student.firstName]
        .filter(Boolean)
        .join(" ")
        .trim()
    : String(student.name || "").trim();

  if (!name || !course) {
    throw new Error(
      "Talabaning familiyasi, ismi va kurs ma’lumotlarini tekshiring."
    );
  }

  const maximum = data.certificates.reduce(
    (max, certificate) => {
      const match = /^A#O(\d{3,})(\d{2})$/.exec(
        certificate.id || ""
      );

      return Math.max(
        max,
        match ? Number(match[1]) : 0
      );
    },
    0
  );

  const sequence =
    Math.max(maximum, data.certificates.length) + 1;

  if (!Number.isSafeInteger(sequence)) {
    throw new Error("Sertifikat raqami chegaradan oshdi.");
  }

  const random = new Uint32Array(1);
  globalThis.crypto.getRandomValues(random);

  const suffix = String(random[0] % 100).padStart(2, "0");

  const certificate = {
    id: "A#O" + String(sequence).padStart(3, "0") + suffix,
    userId,
    courseId,
    name,
    title: course.title,
    score: result.average,
    level: result.level,
    lessonCount: result.lessons.length,
    testCount: result.tests,
    createdAt: new Date().toISOString(),
    gradingVersion: 2,
  };

  data.certificates.push(certificate);

  return certificate;
}