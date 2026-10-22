import {
  enrollmentsFor,
  enrollmentSummary,
  paymentSummary,
  studentLessons,
  passed,
} from "./db";

export function trialEnrollments(data) {
  const studentIds = new Set(
    data.users
      .filter((user) => user.role === "student")
      .map((user) => user.id)
  );

  return data.enrollments.filter(
    (enrollment) =>
      studentIds.has(enrollment.userId) &&
      enrollmentSummary(data, enrollment).debt > 0
  );
}

export function fullyPaidStudent(data, student) {
  const courses = enrollmentsFor(data, student.id);

  return (
    student.active &&
    courses.length > 0 &&
    courses.every(
      (enrollment) =>
        enrollmentSummary(data, enrollment).debt === 0
    )
  );
}

export function studentOverview(data, student) {
  const courses = enrollmentsFor(data, student.id);
  const totals = paymentSummary(data, student);

  const lessons = studentLessons(
    data,
    student.id
  ).filter(
    (lesson) => lesson.published && !lesson.archived
  );

  const watched = lessons.filter(
    (lesson) =>
      data.progress[student.id]?.[lesson.id]?.watched
  ).length;

  const completed = lessons.filter(
    (lesson) =>
      data.progress[student.id]?.[lesson.id]?.watched &&
      passed(data, student.id, lesson.id)
  ).length;

  const deposit = courses.some((enrollment) => {
    const summary = enrollmentSummary(
      data,
      enrollment
    );

    return (
      summary.debt > 0 &&
      (
        summary.paid > 0 ||
        student.accessMode === "deposit"
      )
    );
  });

  const status = !courses.length
    ? "Kurs biriktirilmagan"
    : totals.debt === 0
      ? "To‘liq to‘langan"
      : totals.paid > 0
        ? "Depozit / qisman to‘langan"
        : "Sinov / depozit";

  const accountStatus = !student.active
    ? "Nofaol"
    : deposit
      ? "Depozit"
      : "Faol";

  return {
    courses,
    totals,
    watched,
    completed,
    total: lessons.length,
    status,
    accountStatus,
  };
}