export function firstTrialLesson(data, courseId) {
  return (data.lessons || []).find(
    (lesson) =>
      lesson.courseId === courseId &&
      lesson.published &&
      !lesson.archived
  );
}

export function readyTrialLessons(data, userId) {
  const student = (data.users || []).find(
    (account) =>
      account.id === userId &&
      account.role === "student" &&
      !account.deletedAt
  );

  if (!student) return [];

  const courseIds = new Set(
    (data.enrollments || [])
      .filter((item) => item.userId === userId)
      .map((item) => item.courseId)
  );

  return [...courseIds].flatMap((courseId) => {
    const lesson = firstTrialLesson(data, courseId);

    if (!lesson) return [];

    const progress = data.progress?.[userId]?.[lesson.id];

    const started = Boolean(
      progress?.trialStartedAt || progress?.watched
    );

    const tested = (data.attempts || []).some(
      (attempt) =>
        attempt.userId === userId &&
        attempt.lessonId === lesson.id
    );

    return started && tested ? [lesson.id] : [];
  });
}

export function unreadTrialLessons(data, userId) {
  const student = (data.users || []).find(
    (account) => account.id === userId
  );

  const seen = new Set(
    student?.trialNoticeSeenLessonIds || []
  );

  return readyTrialLessons(data, userId).filter(
    (id) => !seen.has(id)
  );
}

export function markTrialNoticeSeen(data, userId) {
  const student = (data.users || []).find(
    (account) =>
      account.id === userId &&
      account.role === "student" &&
      !account.deletedAt
  );

  if (!student) {
    throw Error("Talaba topilmadi.");
  }

  const unread = unreadTrialLessons(data, userId);

  if (!unread.length) return false;

  student.trialNoticeSeenLessonIds = [
    ...new Set([
      ...(student.trialNoticeSeenLessonIds || []),
      ...unread,
    ])
  ];

  return true;
}