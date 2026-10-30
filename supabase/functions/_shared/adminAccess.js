export const ADMIN_PAGES = [
  {
    id: "dashboard",
    title: "Umumiy ko‘rinish",
    path: "/admin",
  },
  {
    id: "statistics",
    title: "Statistika",
    path: "/admin/statistics",
  },
  {
    id: "staff",
    title: "Xodimlar",
    path: "/admin/staff",
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

const equal = (a, b) =>
  JSON.stringify(a) === JSON.stringify(b);

function assert(
  value,
  message = "Ushbu amal uchun ruxsat yo‘q."
) {
  if (!value) throw Error(message);
}

export function isOwner(user) {
  return (
    user?.role === "admin" &&
    user.active === true &&
    !user.deletedAt &&
    !Object.prototype.hasOwnProperty.call(
      user,
      "adminPages"
    )
  );
}

export function canAdmin(user, page) {
  return (
    user?.role === "admin" &&
    user.active === true &&
    !user.deletedAt &&
    ADMIN_PAGES.some((item) => item.id === page) &&
    (
      isOwner(user) ||
      (
        Array.isArray(user.adminPages) &&
        user.adminPages.includes(page)
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

export function validAdminPages(pages, actor) {
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

  if (actor) {
    assert(
      pages.every((id) => canAdmin(actor, id)),
      "O‘zingizda yo‘q ruxsatni bera olmaysiz."
    );
  }

  return [...new Set(pages)];
}

function any(user, pages) {
  return pages.some((page) => canAdmin(user, page));
}

export function checkAdminAction(user, action) {
  assert(
    user?.role === "admin" &&
    user.active === true &&
    !user.deletedAt
  );

  const permissions = {
    createAdmin: ["staff"],
    staffOverview: ["staff"],
    editStaff: ["staff"],
    deleteStaff: ["staff"],

    student: ["students"],
    deleteStudent: ["students"],
    setPassword: ["students"],
    adminNote: ["students"],

    markTrialsSeen: ["dashboard", "trials"],
  };

  if (permissions[action]) {
    assert(any(user, permissions[action]));
  }
}

const PAGE_DATA = {
  staff: [],

  statistics: ["payments"],

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

  support: ["users", "tickets"],
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
  if (isOwner(user) || user.avatarId === path) {
    return true;
  }

  const visible = adminView(state, user);

  return (
    visible.users.some(
      (account) => account.avatarId === path
    ) ||
    visible.lessons.some(
      (lesson) =>
        lesson.fileId === path ||
        lesson.materials?.some(
          (file) => file.fileId === path
        )
    ) ||
    visible.submissions.some(
      (item) => item.attachment?.fileId === path
    )
  );
}

export function canEditStaff(actor, target) {
  if (
    !canAdmin(actor, "staff") ||
    !target ||
    target.role !== "admin" ||
    target.deletedAt
  ) {
    return false;
  }

  if (isOwner(actor)) return true;

  if (
    target.id === actor.id ||
    !Object.prototype.hasOwnProperty.call(
      target,
      "adminPages"
    )
  ) {
    return false;
  }

  return (
    Array.isArray(target.adminPages) &&
    target.adminPages.every((id) =>
      canAdmin(actor, id)
    )
  );
}