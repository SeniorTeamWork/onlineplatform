// Called only after authentication, lesson-page permission and revision checks.
// The caller persists the whole document atomically through academy_commit.
export function applyLessonDeletion(state, lessonId) {
  if (typeof lessonId !== "string" || !lessonId.trim()) {
    throw Error("Dars ID noto‘g‘ri.");
  }

  const lesson = state.lessons.find((item) => item.id === lessonId);
  if (!lesson) throw Error("Dars topilmadi. Sahifani yangilang.");

  state.lessons = state.lessons.filter((item) => item.id !== lessonId);
  state.attempts = (state.attempts || []).filter(
    (item) => item.lessonId !== lessonId,
  );
  state.submissions = (state.submissions || []).filter(
    (item) => item.lessonId !== lessonId,
  );

  for (const [key, session] of Object.entries(state.testSessions || {})) {
    if (session?.lessonId === lessonId) delete state.testSessions[key];
  }

  for (const progress of Object.values(state.progress || {})) {
    if (progress && typeof progress === "object") delete progress[lessonId];
  }

  return { deletedLessonId: lessonId };
}
