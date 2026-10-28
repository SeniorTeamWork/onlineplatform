import {
  lessonAccessState,
  lessonUnlocked,
  testScore,
  calculateCourseResult,
  createCourseCertificate,
} from "./lessonRules";

import {
  cloudEnabled,
  uploadCloudFile,
  cloudFile,
} from "./cloud";

export const KEY = "ai-academy-v1";

export const uid = () => crypto.randomUUID();

export const money = (value) =>
  new Intl.NumberFormat("uz-UZ").format(value) + " so‘m";

export const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export function integer(value, min = 0) {
  const number = Number(value);

  if (
    value === "" ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > 1e12
  ) {
    throw Error("Miqdorni to‘g‘ri butun son sifatida kiriting.");
  }

  return number;
}

export const seed = {
  courses: [
    {
      id: "course-ai",
      title: "Sun’iy intellekt asoslari",
      price: 0,
      description: "AI Foundation",
    },
  ],

  users: [
    {
      id: "admin",
      name: "Sayyorbek",
      email: "admin@academy.uz",
      password: "Admin123!",
      role: "admin",
      active: true,
    },
    {
      id: "student",
      courseId: "course-ai",
      name: "Abdullayev Behzod",
      email: "student@academy.uz",
      password: "Student123!",
      role: "student",
      active: true,
    },
  ],

  lessons: [
    [
      "Kirish darsi: AI nima?",
      "Sun’iy intellekt bilan tanishing",
      12,
      "AI yordamida o‘zingizni tanishtiruvchi prompt yozing.",
    ],
    [
      "Prompt yozish asoslari",
      "Aniq savol — yaxshi natija",
      15,
      "Maqsad, kontekst va formatdan iborat prompt yozing.",
    ],
    [
      "AI yordamida matn yaratish",
      "G‘oyalarni so‘zlarga aylantiring",
      18,
      "AI yordamida mahsulot uchun qisqa matn tayyorlang.",
    ],
    [
      "Rasm generatsiya qilish",
      "Tasavvuringizga shakl bering",
      20,
      "Rasm yaratish uchun batafsil prompt tuzing.",
    ],
    [
      "Amaliy loyiha: Mini chatbot",
      "Birinchi loyihangizni yarating",
      25,
      "Chatbot loyihangiz va ishlash tartibini tushuntiring.",
    ],
  ].map((item, index) => ({
    id: "lesson-" + index,
    courseId: "course-ai",
    title: item[0],
    description: item[1],
    duration: item[2],
    task: item[3],
    video: "",
    fileId: "",
    published: true,

    questions: [
      {
        id: "q-" + index,

        text:
          index === 0
            ? "AI nimani anglatadi?"
            : "Yaxshi prompt nimadan boshlanadi?",

        options:
          index === 0
            ? [
                "Sun’iy intellekt",
                "Internet tezligi",
                "Kompyuter xotirasi",
                "Dastur hajmi",
              ]
            : [
                "Aniq maqsaddan",
                "Tasodifiy so‘zlardan",
                "Faqat emojidan",
                "Bo‘sh matndan",
              ],

        correct: 0,
      },
    ],
  })),

  progress: {},
  submissions: [],
  attempts: [],
  tickets: [],
  payments: [],
  testSessions: {},
};

export function migrate(input) {
  const data = {
    ...structuredClone(seed),
    ...input,
  };

  data.courses ??= structuredClone(seed.courses);
  data.payments ??= [];
  data.expenses ??= [];
  data.testSessions ??= {};
  data.certificates ??= [];

  data.lessons = data.lessons.map((lesson) => ({
    courseId: "course-ai",
    materials: [],
    ...lesson,
  }));

  if (!Array.isArray(data.enrollments)) {
    data.enrollments = data.users
      .filter((user) => user.role === "student")
      .map((user) => ({
        id: user.id + ":" + (user.courseId || "course-ai"),
        userId: user.id,
        courseId: user.courseId || "course-ai",

        fee: Number(
          user.courseFee ??
            data.courses.find(
              (course) =>
                course.id === (user.courseId || "course-ai")
            )?.price ??
            0
        ),

        createdAt: user.createdAt || new Date().toISOString(),
      }));
  }

  data.payments = data.payments.map((payment) => ({
    ...payment,

    courseId:
      payment.courseId ||
      data.users.find(
        (user) => user.id === payment.userId
      )?.courseId ||
      "course-ai",
  }));

  data.attempts = data.attempts.map((attempt) => ({
    ...attempt,

    courseId:
      attempt.courseId ||
      data.lessons.find(
        (lesson) => lesson.id === attempt.lessonId
      )?.courseId ||
      "course-ai",
  }));

  data.submissions = data.submissions.map((submission) => ({
    ...submission,

    courseId:
      submission.courseId ||
      data.lessons.find(
        (lesson) => lesson.id === submission.lessonId
      )?.courseId ||
      "course-ai",

    reviews: submission.reviews || [],

    lessonTitle:
      submission.lessonTitle ||
      data.lessons.find(
        (lesson) => lesson.id === submission.lessonId
      )?.title ||
      "Eski dars",
  }));

  data.schemaVersion = 5;

  return data;
}

export function read() {
  const raw = localStorage.getItem(KEY);

  if (!raw) {
    return migrate(structuredClone(seed));
  }

  let value;

  try {
    value = JSON.parse(raw);
  } catch {
    throw Error(
      "Saqlangan ma’lumot buzilgan. Brauzer ma’lumotlarini o‘chirmang; zaxiradan tiklang."
    );
  }

  if (
    !Array.isArray(value.users) ||
    !Array.isArray(value.lessons)
  ) {
    throw Error("Ma’lumot tuzilmasi noto‘g‘ri.");
  }

  return migrate(value);
}

export function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function enrollmentsFor(data, userId) {
  return data.enrollments.filter(
    (enrollment) => enrollment.userId === userId
  );
}

export function hasCourse(data, userId, courseId) {
  return data.enrollments.some(
    (enrollment) =>
      enrollment.userId === userId &&
      enrollment.courseId === courseId
  );
}

export function studentLessons(data, userId, courseId) {
  const ids = enrollmentsFor(data, userId).map(
    (enrollment) => enrollment.courseId
  );

  return data.lessons.filter(
    (lesson) =>
      ids.includes(lesson.courseId) &&
      (!courseId || lesson.courseId === courseId)
  );
}

export function attemptPassed(attempt) {
  // Test topshirilganini tekshiradi.
  // Keyingi dars uchun minimal ball belgilanmaydi.
  return testScore(attempt) !== null;
}

export function passed(data, userId, lessonId) {
  return data.attempts.some(
    (attempt) =>
      attempt.userId === userId &&
      attempt.lessonId === lessonId &&
      attemptPassed(attempt)
  );
}

export const completed = passed;

export function accessState(data, enrollment) {
  return lessonAccessState(data, enrollment);
}

export function unlocked(data, userId, lessonId) {
  return lessonUnlocked(data, userId, lessonId);
}

export function gradeAttempt(session, answers) {
  if (!session.questions.length) {
    throw Error("Savollar yo‘q.");
  }

  const hasUnanswered = session.questions.some(
    (question) =>
      !Number.isInteger(answers[question.id]) ||
      answers[question.id] < 0 ||
      answers[question.id] >= question.options.length
  );

  if (hasUnanswered) {
    throw Error("Barcha savollarga javob bering.");
  }

  const correctCount = session.questions.filter(
    (question) =>
      answers[question.id] === question.correct
  ).length;

  return {
    ...session,
    answers: { ...answers },
    correctCount,
    total: session.questions.length,
    score: (correctCount / session.questions.length) * 100,
    createdAt: new Date().toISOString(),
  };
}

export function recordAttempt(data, session, answers) {
  if (
    data.attempts.some(
      (attempt) => attempt.id === session.id
    )
  ) {
    return;
  }

  const key = session.userId + ":" + session.lessonId;

  if (data.testSessions[key]?.id !== session.id) {
    throw Error("Test sessiyasi o‘zgargan.");
  }

  if (!unlocked(data, session.userId, session.lessonId)) {
    throw Error("Dars yopilgan.");
  }

  data.attempts.push(gradeAttempt(session, answers));

  delete data.testSessions[key];
}

export function enrollmentSummary(data, enrollment) {
  const paid = data.payments
    .filter(
      (payment) =>
        payment.userId === enrollment.userId &&
        payment.courseId === enrollment.courseId &&
        !payment.voidedAt
    )
    .reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

  return {
    fee: enrollment.fee,
    paid,
    debt: Math.max(0, enrollment.fee - paid),
    credit: Math.max(0, paid - enrollment.fee),
  };
}

export function paymentSummary(data, user) {
  return enrollmentsFor(data, user.id).reduce(
    (result, enrollment) => {
      const summary = enrollmentSummary(data, enrollment);

      for (const key of Object.keys(result)) {
        result[key] += summary[key];
      }

      return result;
    },
    {
      fee: 0,
      paid: 0,
      debt: 0,
      credit: 0,
    }
  );
}

export function saveStudent(data, draft, selected) {
  const email = draft.email.trim().toLowerCase();
  const name = draft.name.trim();

  if (
    name.length < 3 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    draft.password.length < 8
  ) {
    throw Error(
      "Ism, email va kamida 8 belgili parol kiriting."
    );
  }

  if (
    data.users.some(
      (user) =>
        user.id !== draft.id &&
        user.email.toLowerCase() === email
    )
  ) {
    throw Error("Email band.");
  }

  const ids = [...new Set(selected)];

  if (
    !ids.length ||
    ids.some(
      (id) =>
        !data.courses.some(
          (course) => course.id === id
        )
    )
  ) {
    throw Error("Kamida bitta mavjud kursni tanlang.");
  }

  const removed = enrollmentsFor(data, draft.id).filter(
    (enrollment) => !ids.includes(enrollment.courseId)
  );

  for (const enrollment of removed) {
    const courseId = enrollment.courseId;

    const hasHistory =
      data.payments.some(
        (item) =>
          item.userId === draft.id &&
          item.courseId === courseId
      ) ||
      data.attempts.some(
        (item) =>
          item.userId === draft.id &&
          item.courseId === courseId
      ) ||
      data.submissions.some(
        (item) =>
          item.userId === draft.id &&
          item.courseId === courseId
      ) ||
      data.certificates.some(
        (item) =>
          item.userId === draft.id &&
          item.courseId === courseId
      ) ||
      data.lessons.some(
        (lesson) =>
          lesson.courseId === courseId &&
          data.progress[draft.id]?.[lesson.id]?.watched
      );

    if (hasHistory) {
      throw Error(
        "Tarixi yoki to‘lovi bor kursni olib tashlab bo‘lmaydi."
      );
    }
  }

  data.enrollments = data.enrollments.filter(
    (enrollment) =>
      enrollment.userId !== draft.id ||
      ids.includes(enrollment.courseId)
  );

  for (const courseId of ids) {
    if (!hasCourse(data, draft.id, courseId)) {
      data.enrollments.push({
        id: uid(),
        userId: draft.id,
        courseId,

        fee: integer(
          data.courses.find(
            (course) => course.id === courseId
          ).price
        ),

        createdAt: new Date().toISOString(),
      });
    }
  }

  const old = data.users.find(
    (user) => user.id === draft.id
  );

  const value = {
    ...draft,
    name,
    email,
    role: "student",
  };

  if (old) {
    Object.assign(old, value);
  } else {
    data.users.push(value);
  }
}

export function addPayment(data, payment) {
  if (
    data.payments.some(
      (item) => item.id === payment.id
    )
  ) {
    return;
  }

  const enrollment = data.enrollments.find(
    (item) =>
      item.userId === payment.userId &&
      item.courseId === payment.courseId
  );

  if (!enrollment) {
    throw Error("Talaba kursga biriktirilmagan.");
  }

  const amount = integer(payment.amount, 1);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(payment.date) ||
    payment.date > localDate() ||
    new Date(payment.date + "T00:00:00Z")
      .toISOString()
      .slice(0, 10) !== payment.date
  ) {
    throw Error("To‘lov sanasi noto‘g‘ri.");
  }

  if (amount > enrollmentSummary(data, enrollment).debt) {
    throw Error("To‘lov qolgan qarzdan oshmasligi kerak.");
  }

  data.payments.push({
    ...payment,
    amount,
    createdAt: new Date().toISOString(),
  });
}

export function submitPractice(data, submission) {
  if (
    data.submissions.some(
      (item) => item.id === submission.id
    )
  ) {
    return;
  }

  if (
    !unlocked(
      data,
      submission.userId,
      submission.lessonId
    )
  ) {
    throw Error("Darsga kirish yopilgan.");
  }

  if (submission.answer.trim().length < 5) {
    throw Error("Kamida 5 belgi yozing.");
  }

  if (
    data.submissions.some(
      (item) =>
        item.userId === submission.userId &&
        item.lessonId === submission.lessonId &&
        item.status === "pending"
    )
  ) {
    throw Error("Oldingi vazifa tekshirilmoqda.");
  }

  data.submissions.push({
    ...submission,
    answer: submission.answer.trim(),
    status: "pending",
    reviews: [],
    createdAt: new Date().toISOString(),
  });
}

export function reviewPractice(
  data,
  id,
  status,
  grade,
  feedback,
  adminId
) {
  if (!["approved", "rejected"].includes(status)) {
    throw Error("Natija holati noto‘g‘ri.");
  }

  const submission = data.submissions.find(
    (item) => item.id === id
  );

  if (!submission || submission.status !== "pending") {
    throw Error("Bu vazifa avval tekshirilgan.");
  }

  const score = integer(grade);

  if (score > 100) {
    throw Error("Baho 0–100 oralig‘ida bo‘lsin.");
  }

  Object.assign(submission, {
    status,
    grade: score,
    feedback,
    reviewedAt: new Date().toISOString(),
  });

  submission.reviews.push({
    status,
    grade: score,
    feedback,
    adminId,
    createdAt: submission.reviewedAt,
  });
}

export function courseResult(data, userId, courseId) {
  return calculateCourseResult(
    data,
    userId,
    courseId
  );
}

export function issueCertificate(data, userId, courseId) {
  return createCourseCertificate(
    data,
    userId,
    courseId
  );
}

const open = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open("academy-media", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("files");
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

export async function putFile(file) {
  if (cloudEnabled) {
    return uploadCloudFile(file);
  }

  const database = await open();
  const id = uid();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      "files",
      "readwrite"
    );

    transaction.objectStore("files").put(file, id);

    transaction.oncomplete = () => {
      database.close();
      resolve(id);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function getFile(id) {
  if (cloudEnabled) {
    return cloudFile(id);
  }

  const database = await open();

  return new Promise((resolve, reject) => {
    const request = database
      .transaction("files")
      .objectStore("files")
      .get(id);

    request.onsuccess = () => {
      database.close();
      resolve(request.result);
    };

    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

export async function downloadMaterial(material) {
  const blob = await getFile(material.fileId);

  if (!blob) {
    throw Error("Fayl topilmadi. Admin qayta yuklasin.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = material.name;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 15000);
}

export function saveStudentWithPayment(
  data,
  draft,
  selected,
  settings,
  adminId
) {
  const previous = new Set(
    enrollmentsFor(data, draft.id).map(
      (enrollment) => enrollment.courseId
    )
  );

  saveStudent(data, draft, selected);

  for (const courseId of selected) {
    if (previous.has(courseId)) {
      const existing = data.enrollments.find(
        (enrollment) =>
          enrollment.userId === draft.id &&
          enrollment.courseId === courseId
      );

      existing.accessMode =
        draft.accessMode === "deposit"
          ? "deposit"
          : "active";

      continue;
    }

    const enrollment = data.enrollments.find(
      (item) =>
        item.userId === draft.id &&
        item.courseId === courseId
    );

    const config = settings[courseId] || {
      mode: "trial",
    };

    enrollment.accessMode =
      config.mode === "active"
        ? "active"
        : config.mode === "deposit"
          ? "deposit"
          : "trial";

    let amount = 0;

    if (config.mode === "active") {
      amount = enrollment.fee;
    } else if (config.mode === "deposit") {
      amount = integer(config.amount, 1);

      if (amount >= enrollment.fee) {
        throw Error(
          "Depozit kurs narxidan kichik bo‘lsin. To‘liq to‘lov uchun “To‘langan”ni tanlang."
        );
      }
    }

    if (amount) {
      addPayment(data, {
        id: uid(),
        userId: draft.id,
        courseId,
        amount,
        date: localDate(),
        method: config.method || "Naqd",
        createdBy: adminId,
        note: "Talaba qo‘shilganda qabul qilingan to‘lov",
      });
    }
  }
}

export function updateProfile(
  data,
  id,
  fields,
  currentPassword
) {
  const user = data.users.find(
    (item) => item.id === id
  );

  if (!user || user.password !== currentPassword) {
    throw Error("Joriy parol noto‘g‘ri.");
  }

  const name = fields.name.trim();
  const email = fields.email.trim().toLowerCase();
  const phone = (fields.phone || "").trim();

  if (
    name.length < 3 ||
    !/^\S+@\S+\.\S+$/.test(email)
  ) {
    throw Error("Ism va emailni to‘g‘ri kiriting.");
  }

  if (
    phone &&
    !/^\+?[0-9 ()-]{7,20}$/.test(phone)
  ) {
    throw Error("Telefon raqamini tekshiring.");
  }

  if (
    data.users.some(
      (item) =>
        item.id !== id &&
        item.email.toLowerCase() === email
    )
  ) {
    throw Error("Bu login band.");
  }

  if (
    fields.password &&
    fields.password.length < 8
  ) {
    throw Error("Yangi parol kamida 8 belgi bo‘lsin.");
  }

  Object.assign(user, {
    name,
    email,
    phone,

    ...(fields.password
      ? { password: fields.password }
      : {}),

    ...(fields.avatarId
      ? { avatarId: fields.avatarId }
      : {}),
  });
}

export function periodStatistics(data, days) {
  const now = new Date();

  now.setHours(0, 0, 0, 0);

  const start = new Date(now);
  start.setDate(start.getDate() - days + 1);

  const buckets = Array.from(
    { length: days },
    (_, index) => {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      return {
        date: key,
        amount: 0,
        count: 0,
      };
    }
  );

  for (const payment of data.payments) {
    const bucket = buckets.find(
      (item) => item.date === payment.date
    );

    if (bucket && !payment.voidedAt) {
      bucket.amount += payment.amount;
      bucket.count++;
    }
  }

  return {
    buckets,

    total: buckets.reduce(
      (sum, bucket) => sum + bucket.amount,
      0
    ),

    count: buckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    ),

    from: buckets[0].date,
    to: buckets.at(-1).date,
  };
}




export function deleteLesson(data, lessonId) {
  const lesson = data.lessons.find(
    (item) => item.id === lessonId
  );

  if (!lesson) {
    throw Error("Dars topilmadi.");
  }

  data.lessons = data.lessons.filter(
    (item) => item.id !== lessonId
  );

  return data;
}