export function applyCourseDeletion(state, courseId) {
  if (typeof courseId !== "string" || !courseId.trim()) {
    throw Error("Kurs ID noto‘g‘ri.");
  }

  const course = state.courses.find(
    (item) => item.id === courseId
  );

  if (!course) {
    throw Error("Kurs topilmadi. Sahifani yangilang.");
  }

  const lessonIds = new Set(
    (state.lessons || [])
      .filter((lesson) => lesson.courseId === courseId)
      .map((lesson) => lesson.id)
  );

  const belongs = (item) =>
    item.courseId === courseId ||
    lessonIds.has(item.lessonId);

  // To‘lov va sertifikat yozuvlari saqlanadi.
  for (const payment of state.payments || []) {
    if (payment.courseId === courseId) {
      payment.courseTitle ||= course.title;
    }
  }

  for (const certificate of state.certificates || []) {
    if (certificate.courseId === courseId) {
      certificate.courseTitle ||= course.title;
    }
  }

  state.courses = state.courses.filter(
    (item) => item.id !== courseId
  );

  state.lessons = (state.lessons || []).filter(
    (item) => !lessonIds.has(item.id)
  );

  state.enrollments = (state.enrollments || []).filter(
    (item) => item.courseId !== courseId
  );

  state.attempts = (state.attempts || []).filter(
    (item) => !belongs(item)
  );

  state.submissions = (state.submissions || []).filter(
    (item) => !belongs(item)
  );

  for (const [key, session] of Object.entries(
    state.testSessions || {}
  )) {
    if (session && belongs(session)) {
      delete state.testSessions[key];
    }
  }

  for (const progress of Object.values(state.progress || {})) {
    if (!progress || typeof progress !== "object") continue;

    for (const lessonId of lessonIds) {
      delete progress[lessonId];
    }
  }

  for (const account of state.users || []) {
    if (Array.isArray(account.trialNoticeSeenLessonIds)) {
      account.trialNoticeSeenLessonIds =
        account.trialNoticeSeenLessonIds.filter(
          (id) => !lessonIds.has(id)
        );
    }
  }

  return {
    deletedCourseId: courseId,
    deletedLessonCount: lessonIds.size,
  };
}