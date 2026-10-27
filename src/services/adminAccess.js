export const ADMIN_PAGES = [
  {
    id: "dashboard",
    title: "Umumiy ko‘rinish",
    path: "/admin",
  },
  {
    id: "lessons",
    title: "Kurslar va darslar",
    path: "/admin/lessons",
  },
  {
    id: "students",
    title: "Talabalar",
    path: "/admin/students",
  },
  {
    id: "finance",
    title: "Moliya",
    path: "/admin/finance",
  },
  {
    id: "trials",
    title: "Sinovdagi talabalar",
    path: "/admin/trials",
  },
  {
    id: "reviews",
    title: "Amaliy ishlar",
    path: "/admin/reviews",
  },
  {
    id: "support",
    title: "Murojaatlar",
    path: "/admin/support",
  },
];

const equal = (first, second) =>
  JSON.stringify(first) === JSON.stringify(second);

function assert(
  condition,
  message = "Ushbu amal uchun ruxsat yo‘q."
) {
  if (!condition) throw Error(message);
}

export function isOwner(user) {
  return (
    user?.role === "admin" &&
    user.active === true &&
    !Object.prototype.hasOwnProperty.call(
      user,
      "adminPages"
    )
  );
}

export function canAdmin(user, pageId) {
  return (
    user?.role === "admin" &&
    user.active === true &&
    ADMIN_PAGES.some((page) => page.id === pageId) &&
    (
      isOwner(user) ||
      (
        Array.isArray(user.adminPages) &&
        user.adminPages.includes(pageId)
      )
    )
  );
}

export function adminHome(user) {
  return (
    ADMIN_PAGES.find((page) =>
      canAdmin(user, page.id)
    )?.path || "/admin/access-denied"
  );
}

export function validAdminPages(pages) {
  assert(
    Array.isArray(pages) &&
      pages.length > 0 &&
      pages.every(
        (id) =>
          typeof id === "string" &&
          ADMIN_PAGES.some((page) => page.id === id)
      ),
    "Kamida bitta mavjud sahifani tanlang."
  );

  return [...new Set(pages)];
}

function any(user, pages) {
  return pages.some((page) => canAdmin(user, page));
}

export function checkAdminAction(user, action) {
  assert(
    user?.role === "admin" &&
    user.active === true
  );

  if (action === "createAdmin") {
    assert(
      isOwner(user),
      "Yangi adminni faqat asosiy admin yaratishi mumkin."
    );

    return;
  }

  const permissions = {
    student: ["students"],
    setPassword: ["students"],
    adminNote: ["students"],
    markTrialsSeen: ["dashboard", "trials"],
  };

  if (permissions[action]) {
    assert(any(user, permissions[action]));
  }
}

const PAGE_DATA = {
  dashboard: [
    "users",
    "courses",
    "lessons",
    "enrollments",
    "payments",
    "attempts",
    "submissions",
    "progress",
  ],

  lessons: [
    "users",
    "courses",
    "lessons",
    "enrollments",
    "testSessions",
  ],

  students: [
    "users",
    "courses",
    "lessons",
    "enrollments",
    "payments",
    "attempts",
    "submissions",
    "certificates",
    "progress",
  ],

  finance: [
    "users",
    "courses",
    "enrollments",
    "payments",
    "expenses",
  ],

  trials: [
    "users",
    "courses",
    "lessons",
    "enrollments",
    "payments",
    "attempts",
    "submissions",
    "progress",
  ],

  reviews: [
    "users",
    "courses",
    "lessons",
    "submissions",
  ],

  support: [
    "users",
    "tickets",
  ],
};

const TABLES = [
  "users",
  "courses",
  "lessons",
  "enrollments",
  "payments",
  "attempts",
  "submissions",
  "certificates",
  "progress",
  "testSessions",
  "expenses",
  "tickets",
];

export function adminView(data, user) {
  const result = structuredClone(data);

  result.users.forEach((account) => {
    delete account.password;
  });

  if (isOwner(user)) return result;

  const visible = new Set(
    ADMIN_PAGES
      .filter((page) => canAdmin(user, page.id))
      .flatMap((page) => PAGE_DATA[page.id])
  );

  for (const key of TABLES) {
    if (!visible.has(key)) {
      result[key] = ["progress", "testSessions"].includes(key)
        ? {}
        : [];
    }
  }

  result.users = data.users
    .filter(
      (account) =>
        account.id === user.id ||
        (
          visible.has("users") &&
          account.role === "student"
        )
    )
    .map((account) => {
      const copy = structuredClone(account);

      delete copy.password;

      if (
        copy.id !== user.id &&
        !canAdmin(user, "students")
      ) {
        delete copy.notes;
        delete copy.adminNote;
      }

      return copy;
    });

  return result;
}

export function adminUpdate(state, user, next) {
  assert(
    next &&
    typeof next === "object" &&
    !Array.isArray(next)
  );

  if (isOwner(user)) return next;

  const base = adminView(state, user);
  const expanded = structuredClone(state);

  expanded.users.forEach((account) => {
    delete account.password;
  });

  const write = {
    courses: ["lessons"],
    lessons: ["lessons"],
    testSessions: ["lessons"],
    enrollments: ["students"],
    payments: ["dashboard", "students", "finance"],
    submissions: ["reviews"],
    tickets: ["support"],
    expenses: ["finance"],
  };

  const keys = new Set([
    ...Object.keys(base),
    ...Object.keys(next),
  ]);

  for (const key of keys) {
    if (equal(base[key], next[key])) continue;

    assert(write[key] && any(user, write[key]));

    expanded[key] = next[key];
  }

  return expanded;
}

export function adminCanReadFile(state, user, path) {
  if (isOwner(user)) return true;
  if (user.avatarId === path) return true;

  const visible = adminView(state, user);

  return (
    visible.users.some(
      (account) => account.avatarId === path
    ) ||
    visible.lessons.some(
      (lesson) =>
        lesson.fileId === path ||
        lesson.materials?.some(
          (material) => material.fileId === path
        )
    ) ||
    visible.submissions.some(
      (submission) =>
        submission.attachment?.fileId === path
    )
  );
}