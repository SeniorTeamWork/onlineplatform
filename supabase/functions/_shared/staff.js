import {
  ADMIN_PAGES,
  isOwner,
  validAdminPages,
} from "./adminAccess.js";

import {
  availableUsername,
} from "./identity.js";

export const ONLINE_WINDOW_MS = 90000;

function staffAccounts(users) {
  return users.filter(
    (user) =>
      user.role === "admin" &&
      !user.deletedAt
  );
}

export function staffSnapshot(
  users,
  presence,
  now = Date.now()
) {
  const seen = new Map(
    presence.map((row) => [
      row.user_id,
      row.last_seen_at,
    ])
  );

  const staff = staffAccounts(users).map((user) => {
    const owner =
      !Object.prototype.hasOwnProperty.call(
        user,
        "adminPages"
      );

    const timestamp = Date.parse(
      seen.get(user.id) || ""
    );

    const valid =
      Number.isFinite(timestamp) &&
      timestamp <= now;

    const active = user.active === true;

    return {
      id: user.id,
      name: user.name || "Ism kiritilmagan",
      username: user.username || "",
      active,
      owner,
      createdAt: user.createdAt || null,

      lastSeenAt: valid
        ? new Date(timestamp).toISOString()
        : null,

      online:
        active &&
        valid &&
        now - timestamp < ONLINE_WINDOW_MS,

      pages: ADMIN_PAGES.filter(
        (page) =>
          owner ||
          (
            Array.isArray(user.adminPages) &&
            user.adminPages.includes(page.id)
          )
      ).map(({ id, title, path }) => ({
        id,
        title,
        path,
      })),
    };
  });

  return {
    staff,
    serverTime: new Date(now).toISOString(),
    onlineWindowSeconds:
      ONLINE_WINDOW_MS / 1000,

    counts: {
      total: staff.length,

      active: staff.filter(
        (user) => user.active
      ).length,

      blocked: staff.filter(
        (user) => !user.active
      ).length,

      online: staff.filter(
        (user) => user.online
      ).length,
    },
  };
}

export async function staffAction(
  db,
  state,
  actor,
  action
) {
  if (
    !actor?.active ||
    actor.role !== "admin" ||
    actor.deletedAt
  ) {
    throw Error("Faqat faol admin uchun.");
  }

  if (action === "staffHeartbeat") {
    const { error } = await db
      .from("academy_staff_presence")
      .upsert(
        {
          user_id: actor.id,
          last_seen_at:
            new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      throw Error(
        "Xodim faolligini saqlab bo‘lmadi."
      );
    }

    return { ok: true };
  }

  if (
    action !== "staffOverview" ||
    !isOwner(actor)
  ) {
    throw Error(
      "Xodimlar ro‘yxatini faqat asosiy admin ko‘ra oladi."
    );
  }

  const ids = staffAccounts(state.users).map(
    (user) => user.id
  );

  const rows = [];

  for (
    let offset = 0;
    offset < ids.length;
    offset += 200
  ) {
    const { data, error } = await db
      .from("academy_staff_presence")
      .select("user_id,last_seen_at")
      .in(
        "user_id",
        ids.slice(offset, offset + 200)
      );

    if (error) {
      throw Error(
        "Xodimlar faolligi yuklanmadi."
      );
    }

    rows.push(...(data || []));
  }

  return staffSnapshot(state.users, rows);
}

export function mutateStaff(
  state,
  actor,
  action,
  body
) {
  if (!isOwner(actor)) {
    throw Error("Faqat asosiy admin uchun.");
  }

  if (
    !["editStaff", "deleteStaff"].includes(action)
  ) {
    throw Error("Noma’lum amal.");
  }

  const target = state.users.find(
    (item) => item.id === body.userId
  );

  if (
    !target ||
    target.role !== "admin" ||
    target.deletedAt
  ) {
    throw Error(
      "Xodim topilmadi. Ro‘yxatni yangilang."
    );
  }

  if (
    target.id === actor.id ||
    !Object.prototype.hasOwnProperty.call(
      target,
      "adminPages"
    )
  ) {
    throw Error(
      "Asosiy admin hisobini bu bo‘limdan o‘zgartirib bo‘lmaydi."
    );
  }

  const now = new Date().toISOString();

  if (action === "deleteStaff") {
    target.active = false;
    target.deletedAt = now;
    target.deletedBy = actor.id;

    return { staffId: target.id };
  }

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (
    name.length < 3 ||
    name.length > 120
  ) {
    throw Error("Ism 3–120 belgi bo‘lsin.");
  }

  if (typeof body.active !== "boolean") {
    throw Error("Hisob holati noto‘g‘ri.");
  }

  const username = availableUsername(
    state,
    body.username,
    target.id
  );

  const adminPages = validAdminPages(
    body.adminPages
  );

  Object.assign(target, {
    name,
    username,
    adminPages,
    active: body.active,
    updatedAt: now,
    updatedBy: actor.id,
  });

  return { staffId: target.id };
}