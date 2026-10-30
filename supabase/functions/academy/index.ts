import { createClient } from "npm:@supabase/supabase-js@2";
import { deleteStudent } from "../_shared/deleteStudent.js";
import { applyLessonDeletion } from "../_shared/deleteLesson.js";
import {
  staffAction,
  mutateStaff,
  staffPages,
} from "../_shared/staff.js";
import { availableUsername } from "../_shared/identity.js";
import {
  view,
  applyUpdate,
  mayReadFile,
  applyAdminAction,
} from "../_shared/logic.js";
import {
  adminView,
  adminUpdate,
  adminCanReadFile,
  checkAdminAction,
  canAdmin,
  canEditStaff,
} from "../_shared/adminAccess.js";
import * as D from "../_shared/domain.js";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers });

function must(
  value: unknown,
  message = "Ruxsat berilmagan.",
) {
  if (!value) throw Error(message);
}

function clientView(state: any, user: any) {
  const result =
    user.role === "admin"
      ? adminView(state, user)
      : view(state, user);

  if (user.role !== "admin") {
    result.lessons.forEach((lesson: any) => {
      const original = state.lessons.find(
        (item: any) => item.id === lesson.id,
      );

      lesson.hasVideo = Boolean(
        original?.fileId || original?.video,
      );
    });
  }

  return result;
}

function authClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return response({ error: "POST required" }, 405);
  }

  let createdId: string | undefined;

  try {
    const body = await req.json();

    if (body.action === "login") {
      const invalid =
        "Login yoki parol noto‘g‘ri, yoki hisob faol emas.";

      const login = String(body.login || "")
        .trim()
        .toLowerCase();

      must(
        login.length > 0 &&
          login.length <= 254 &&
          typeof body.password === "string" &&
          body.password.length > 0 &&
          body.password.length <= 4096,
        invalid,
      );

      const loaded = await db
        .from("academy_state")
        .select("data")
        .eq("id", 1)
        .single();

      if (loaded.error) {
        throw Error("Kirish xizmati vaqtincha mavjud emas.");
      }

      const account = loaded.data.data.users.find(
        (item: any) =>
          login.includes("@")
            ? String(item.email || "").toLowerCase() === login
            : String(item.username || "").toLowerCase() === login,
      );

      const actual = account
        ? await db.auth.admin.getUserById(account.id)
        : null;

      const signed =
        await authClient().auth.signInWithPassword({
          email:
            actual?.data?.user?.email ||
            "unknown-account@academy.invalid",
          password: body.password,
        });

      must(
        !signed.error &&
          signed.data.session &&
          account?.active &&
          signed.data.user?.id === account.id,
        invalid,
      );

      return response({
        session: {
          access_token: signed.data.session!.access_token,
          refresh_token: signed.data.session!.refresh_token,
        },
      });
    }

    const token = req.headers
      .get("Authorization")
      ?.replace(/^Bearer /i, "");

    must(token, "Hisobga kiring.");

    const {
      data: auth,
      error: authError,
    } = await db.auth.getUser(token);

    must(
      !authError && auth.user,
      "Sessiya tugagan. Qayta kiring.",
    );

    const {
      data: row,
      error: loadError,
    } = await db
      .from("academy_state")
      .select("*")
      .eq("id", 1)
      .single();

    if (loadError) throw loadError;

    const state = row.data;
    state.expenses ??= [];

    const user = state.users.find(
      (account: any) => account.id === auth.user!.id,
    );

    must(
      user?.active,
      "Hisob faol emas yoki admin tomonidan biriktirilmagan.",
    );

    const admin = user.role === "admin";

    if (admin) {
      checkAdminAction(user, body.action);
    }

    if (
      body.action === "staffHeartbeat" ||
      body.action === "staffOverview"
    ) {
      return response(
        await staffAction(db, state, user, body.action),
      );
    }

    const emailChanged = user.email !== auth.user!.email;

    if (emailChanged) {
      user.email = auth.user!.email;
    }

    if (body.action === "read") {
      let revision = row.revision;

      if (emailChanged) {
        const saved = await db.rpc("academy_commit", {
          expected: row.revision,
          document: state,
          actor: user.id,
          operation: "sync-email",
        });

        if (saved.error) throw saved.error;
        revision = saved.data;
      }

      return response({
        data: clientView(state, user),
        revision,
      });
    }

    if (body.action === "upload") {
      const ext = String(body.name)
        .split(".")
        .pop()
        ?.toLowerCase();

      const video = ["mp4", "webm"].includes(ext || "");

      must(
        admin || !video,
        "Video faqat admin tomonidan yuklanadi.",
      );

      if (
        admin &&
        (video || ["pdf", "xls", "xlsx"].includes(ext || ""))
      ) {
        must(canAdmin(user, "lessons"));
      }

      must(
        Number.isSafeInteger(body.size) &&
          body.size > 0 &&
          (video || body.size <= 20 * 1024 * 1024),
        "Fayl hajmi noto‘g‘ri.",
      );

      must(
        [
          "mp4", "webm", "pdf", "xls", "xlsx",
          "jpg", "jpeg", "png", "webp",
        ].includes(ext || ""),
        "Fayl turi ruxsat etilmagan.",
      );

      const path =
        user.id + "/uploads/" +
        crypto.randomUUID() + "." + ext;

      const bucket = admin
        ? "academy-media"
        : "academy-student-media";

      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUploadUrl(path);

      if (error) throw error;

      return response({
        path,
        token: data.token,
        bucket,
        endpoint:
          Deno.env.get("SUPABASE_URL")!
            .replace(/\/$/, "")
            .replace(".supabase.co", ".storage.supabase.co") +
          "/storage/v1/upload/resumable/sign",
      });
    }

    // Video va materiallar havolasi.
    if (body.action === "media") {
      const path =
        typeof body.path === "string"
          ? body.path.trim()
          : "";

      must(
        path &&
          (
            admin
              ? adminCanReadFile(state, user, path)
              : mayReadFile(state, user, path)
          ),
        "Faylni ko‘rishga ruxsat yo‘q.",
      );

      // Dars fayllari xodim hisobidan mustaqil aniqlanadi.
      const lessonFile = state.lessons.some(
        (lesson: any) =>
          lesson.fileId === path ||
          lesson.materials?.some(
            (material: any) => material.fileId === path,
          ),
      );

      const owner = state.users.find(
        (account: any) =>
          account.id === path.split("/")[0],
      );

      const bucket =
        lessonFile || owner?.role === "admin"
          ? "academy-media"
          : "academy-student-media";

      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (error) throw error;

      must(data?.signedUrl, "Fayl havolasi bo‘sh.");

      return response({ url: data.signedUrl });
    }

    if (body.action === "setStaffPassword") {
      const target = state.users.find(
        (account: any) =>
          account.id === body.userId &&
          account.role === "admin" &&
          !account.deletedAt,
      );

      must(target, "Xodim topilmadi.");

      must(
        admin && canEditStaff(user, target),
        "Bu xodimning parolini o‘zgartirishga ruxsat yo‘q.",
      );

      must(
        typeof body.password === "string" &&
          body.password.length >= 8 &&
          body.password.length <= 128,
        "Yangi parol 8–128 belgi bo‘lsin.",
      );

      const changed = await db.auth.admin.updateUserById(
        target.id,
        { password: body.password },
      );

      if (changed.error) throw changed.error;

      must(
        changed.data.user?.id === target.id,
        "Auth hisobi mos kelmadi.",
      );

      return response({ ok: true, userId: target.id });
    }

    if (body.action === "setPassword") {
      must(admin);

      const target = state.users.find(
        (account: any) =>
          account.id === body.userId &&
          account.role === "student",
      );

      must(target, "Talaba topilmadi.");

      must(
        typeof body.password === "string" &&
          body.password.length >= 8 &&
          body.password.length <= 128,
        "Parol 8–128 belgi bo‘lsin.",
      );

      const changed = await db.auth.admin.updateUserById(
        target.id,
        { password: body.password },
      );

      if (changed.error) throw changed.error;

      must(
        changed.data.user?.id === target.id,
        "Auth hisobi mos kelmadi.",
      );

      return response({
        ok: true,
        username: target.username || "",
        userId: target.id,
      });
    }

    must(
      body.revision === row.revision,
      "Ma’lumot yangilangan. Sahifani yangilab, qayta saqlang.",
    );

    let result: any;

    if (body.action === "deleteStaff") {
      const deleted = mutateStaff(
        state,
        user,
        "deleteStaff",
        body,
      );

      const staffId = deleted.staffId;

      state.users = state.users.filter(
        (account: any) => account.id !== staffId,
      );

      const {
        data: savedRevision,
        error: deleteError,
      } = await db.rpc("academy_delete_staff", {
        p_expected: row.revision,
        p_document: state,
        p_actor: user.id,
        p_user_id: staffId,
      });

      if (deleteError) throw deleteError;

      return response({
        data: clientView(state, user),
        revision: savedRevision,
        staffId,
        ok: true,
      });
    } else if (body.action === "editStaff") {
      result = mutateStaff(
        state,
        user,
        "editStaff",
        body,
      );
    } else if (body.action === "deleteStudent") {
      result = deleteStudent(state, user, body.userId);
    } else if (body.action === "deleteLesson") {
      must(
        admin && canAdmin(user, "lessons"),
        "Darsni o‘chirish uchun kurslar va darslar bo‘limiga ruxsat kerak.",
      );

      result = applyLessonDeletion(state, body.lessonId);
    } else if (body.action === "watchLesson") {
      must(
        !admin && D.unlocked(state, user.id, body.lessonId),
        "Dars yopiq.",
      );

      state.progress[user.id] ??= {};
      state.progress[user.id][body.lessonId] = {
        watched: true,
        watchedAt: new Date().toISOString(),
      };
    } else if (body.action === "submitTest") {
      must(
        !admin && D.unlocked(state, user.id, body.lessonId),
        "Dars yopiq.",
      );

      const session =
        state.testSessions[user.id + ":" + body.lessonId];

      must(
        session && session.id === body.sessionId,
        "Test sessiyasi o‘zgargan. Sahifani yangilang.",
      );

      D.recordAttempt(state, session, body.answers || {});
    } else if (body.action === "createAdmin") {
      must(admin);

      const adminPages = staffPages(
        user,
        body.adminPages,
        body.owner ?? false,
      );

      const username = availableUsername(
        state,
        body.username,
      );

      must(
        typeof body.name === "string" &&
          body.name.trim().length >= 3 &&
          body.name.trim().length <= 120,
        "Ism 3–120 belgi bo‘lsin.",
      );

      must(
        typeof body.password === "string" &&
          body.password.length >= 8 &&
          body.password.length <= 128,
        "Parol 8–128 belgi bo‘lsin.",
      );

      const email = crypto.randomUUID() + "@academy.invalid";

      const created = await db.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
      });

      if (created.error) throw created.error;

      createdId = created.data.user.id;

      state.users.push({
        id: createdId,
        name: body.name.trim(),
        username,
        email,
        role: "admin",
        active: true,
        ...(adminPages === null ? {} : { adminPages }),
        createdAt: new Date().toISOString(),
      });
    } else if (
      body.action === "adminNote" ||
      body.action === "markTrialsSeen"
    ) {
      applyAdminAction(state, user, body.action, body);
    } else if (body.action === "update") {
      if (!admin) {
        for (const submission of body.next.submissions || []) {
          const existing = state.submissions.some(
            (item: any) => item.id === submission.id,
          );

          if (!existing && submission.attachment) {
            must(
              submission.attachment.fileId.startsWith(
                user.id + "/uploads/",
              ),
            );
          }
        }

        body.next.lessons?.forEach((lesson: any) => {
          delete lesson.hasVideo;
        });
      }

      applyUpdate(
        state,
        user,
        admin
          ? adminUpdate(state, user, body.next)
          : body.next,
      );
    } else if (body.action === "student") {
      must(admin);

      const { draft, selected, settings } = body;

      const existing = state.users.find(
        (account: any) => account.id === draft.id,
      );

      must(!existing || existing.role === "student");

      const username = availableUsername(
        state,
        draft.username,
        existing?.id,
      );

      const email =
        existing?.email ||
        crypto.randomUUID() + "@academy.invalid";

      const clean = {
        id: draft.id,
        name: draft.name,
        email,
        username,
        phone: draft.phone || "",
        notes: draft.notes || "",
        active: draft.active === true,
        accessMode:
          draft.accessMode === "deposit" ? "deposit" : "active",
        role: "student",
        password:
          existing ? "temporary-validation-only" : draft.password,
        createdAt:
          existing?.createdAt || new Date().toISOString(),
      };

      D.saveStudentWithPayment(
        structuredClone(state),
        clean,
        selected,
        settings || {},
        user.id,
      );

      if (!existing) {
        const { data, error } = await db.auth.admin.createUser({
          email,
          password: draft.password,
          email_confirm: true,
        });

        if (error) throw error;

        createdId = data.user.id;
        clean.id = createdId;
      }

      D.saveStudentWithPayment(
        state,
        clean,
        selected,
        settings || {},
        user.id,
      );

      state.users.forEach((account: any) => {
        delete account.password;
      });

      result = { studentId: clean.id };
    } else if (body.action === "profile") {
      const fields = body.fields;

      const username = availableUsername(
        state,
        fields.username,
        user.id,
      );

      const verified =
        await authClient().auth.signInWithPassword({
          email: user.email,
          password: String(fields.currentPassword || ""),
        });

      must(
        !verified.error &&
          verified.data.user?.id === user.id,
        "Joriy parol noto‘g‘ri.",
      );

      must(fields.name?.trim().length >= 3);

      must(
        !fields.phone ||
          /^\+?[0-9 ()-]{7,20}$/.test(fields.phone),
      );

      if (fields.avatarId) {
        must(
          fields.avatarId.startsWith(user.id + "/uploads/"),
        );
      }

      Object.assign(user, {
        username,
        name: fields.name.trim(),
        phone: fields.phone?.trim() || "",
        ...(fields.avatarId ? { avatarId: fields.avatarId } : {}),
      });
    } else if (body.action === "certificate") {
      result = {
        certificate: D.issueCertificate(
          state,
          user.id,
          body.courseId,
        ),
      };
    } else {
      throw Error("Noma’lum amal.");
    }

    const { data: revision, error } = await db.rpc(
      "academy_commit",
      {
        expected: row.revision,
        document: state,
        actor: user.id,
        operation: body.action,
      },
    );

    if (error) throw error;
    createdId = undefined;

    return response({
      data: clientView(state, user),
      revision,
      ...result,
    });
  } catch (error) {
    if (createdId) {
      await db.auth.admin.deleteUser(createdId);
    }

    return response(
      {
        error:
          error &&
          typeof error === "object" &&
          "message" in error
            ? String(error.message)
            : "Server xatosi",
      },
      400,
    );
  }
});