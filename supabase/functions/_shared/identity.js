export function normalizeUsername(value) {
  const username = String(value || "").trim().toLowerCase();

  if (!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(username)) {
    throw new Error(
      "Login 3–40 belgidan iborat bo‘lsin: lotin harflari, raqam, nuqta, pastki chiziq yoki tire."
    );
  }

  return username;
}

export function availableUsername(state, value, exceptId) {
  const username = normalizeUsername(value);

  const taken = state.users.some(
    (user) =>
      user.id !== exceptId &&
      String(user.username || "").toLowerCase() === username
  );

  if (taken) {
    throw new Error("Bu login band. Boshqa login tanlang.");
  }

  return username;
}