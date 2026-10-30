import { canAdmin } from "./adminAccess.js";

export function deleteStudent(
  state,
  actor,
  userId
) {
  if (!canAdmin(actor, "students")) {
    throw Error(
      "Talabalarni boshqarishga ruxsat yo‘q."
    );
  }

  const target = state.users.find(
    (item) =>
      item.id === userId &&
      item.role === "student" &&
      !item.deletedAt
  );

  if (!target) {
    throw Error(
      "Talaba topilmadi. Ro‘yxatni yangilang."
    );
  }

  target.active = false;
  target.deletedAt = new Date().toISOString();
  target.deletedBy = actor.id;
  target.deletedRole = "student";
  target.role = "deleted";

  for (
    const [key, session] of
    Object.entries(state.testSessions || {})
  ) {
    if (session?.userId === target.id) {
      delete state.testSessions[key];
    }
  }

  return { studentId: target.id };
}