import {
  ADMIN_PAGES,
  isOwner,
  canAdmin,
  canEditStaff,
  validAdminPages,
} from "./adminAccess.js";

import {
  availableUsername,
} from "./identity.js";

export const ONLINE_WINDOW_MS = 90000;

function ownerAccount(user) {
  return (
    user?.role === "admin" &&
    !user.deletedAt &&
    !Object.prototype.hasOwnProperty.call(
      user,
      "adminPages"
    )
  );
}

function otherOwnerExists(users, exceptId) {
  return users.some(
    (user) =>
      user.id !== exceptId &&
      isOwner(user)
  );
}

function accounts(users) {
  return users.filter(
    (user) =>
      user.role === "admin" &&
      !user.deletedAt
  );
}

export function staffPages(actor, pages, owner) {
  if (typeof owner !== "boolean") {
    throw Error("Hisob turi noto‘g‘ri.");
  }

  if (owner) {
    if (!isOwner(actor)) {
      throw Error(
        "Administratorni faqat asosiy administrator tayinlay oladi."
      );
    }

    return null;
  }

  return validAdminPages(pages, actor);
}

export function staffSnapshot(
  users,
  presence,
  now = Date.now(),
  actor
) {
  const seen = new Map(
    presence.map((row) => [
      row.user_id,
      row.last_seen_at,
    ])
  );

  const staff = accounts(users).map((user) => {
    const owner = ownerAccount(user);

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

      canEdit: actor
        ? canEditStaff(actor, user)
        : false,

      canDelete: actor
        ? canEditStaff(actor, user) &&
          (
            !isOwner(user) ||
            otherOwnerExists(users, user.id)
          )
        : false,

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
    onlineWindowSeconds: 90,

    counts: {
      total: staff.length,
      active: staff.filter((u) => u.active).length,
      blocked: staff.filter((u) => !u.active).length,
      online: staff.filter((u) => u.online).length,
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
          last_seen_at: new Date().toISOString(),
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
    !canAdmin(actor, "staff")
  ) {
    throw Error(
      "Xodimlar bo‘limiga ruxsat yo‘q."
    );
  }

  const ids = accounts(state.users).map(
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

  return staffSnapshot(
    state.users,
    rows,
    Date.now(),
    actor
  );
}

export function mutateStaff(
  state,
  actor,
  action,
  body
) {
  if (!canAdmin(actor, "staff")) {
    throw Error(
      "Xodimlarni boshqarishga ruxsat yo‘q."
    );
  }

  if (
    !["editStaff", "deleteStaff"].includes(action)
  ) {
    throw Error("Noma’lum amal.");
  }

  const target = state.users.find(
    (item) =>
      item.id === body.userId &&
      item.role === "admin" &&
      !item.deletedAt
  );

  if (!target) {
    throw Error(
      "Xodim topilmadi. Ro‘yxatni yangilang."
    );
  }

  if (!canEditStaff(actor, target)) {
    throw Error(
      "Bu xodimni tahrirlashga ruxsat yo‘q."
    );
  }

  const targetOwner = ownerAccount(target);
  const now = new Date().toISOString();

  if (action === "deleteStaff") {
    if (
      isOwner(target) &&
      !otherOwnerExists(state.users, target.id)
    ) {
      throw Error(
        "Oxirgi faol administratorni o‘chirib bo‘lmaydi."
      );
    }

    Object.assign(target, {
      active: false,
      deletedAt: now,
      deletedBy: actor.id,
    });

    return { staffId: target.id };
  }

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (name.length < 3 || name.length > 120) {
    throw Error("Ism 3–120 belgi bo‘lsin.");
  }

  if (typeof body.active !== "boolean") {
    throw Error("Hisob holati noto‘g‘ri.");
  }

  const owner =
    body.owner === undefined
      ? targetOwner
      : body.owner;

  const adminPages = staffPages(
    actor,
    body.adminPages,
    owner
  );

  if (
    isOwner(target) &&
    (!owner || !body.active) &&
    !otherOwnerExists(state.users, target.id)
  ) {
    throw Error(
      "Oxirgi faol administratorning huquqini olib tashlab yoki hisobini bloklab bo‘lmaydi."
    );
  }

  const username = availableUsername(
    state,
    body.username,
    target.id
  );

  Object.assign(target, {
    name,
    username,
    active: body.active,
    updatedAt: now,
    updatedBy: actor.id,
  });

  if (owner) {
    delete target.adminPages;
  } else {
    target.adminPages = adminPages;
  }

  return { staffId: target.id };
}