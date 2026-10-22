import { createClient } from "npm:@supabase/supabase-js@2";

import {
  view,
  applyUpdate,
  mayReadFile,
  applyAdminAction,
} from "../_shared/logic.js";

import {
  availableUsername,
} from "../_shared/identity.js";

import * as D from "../_shared/domain.js";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

const response = (
  value: unknown,
  status = 200
) =>
  new Response(JSON.stringify(value), {
    status,
    headers,
  });

function must(
  value: unknown,
  message = "Ruxsat berilmagan."
) {
  if (!value) {
    throw new Error(message);
  }
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
    }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return response(
      { error: "POST required" },
      405
    );
  }

  let createdId: string | undefined;

  try {
    const body = await req.json();

    // Login hali sessiyasi yo‘q foydalanuvchi uchun.
    // Parolni Supabase Auth tekshiradi.
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
        invalid
      );

      const loaded = await db
        .from("academy_state")
        .select("data")
        .eq("id", 1)
        .single();

      if (loaded.error) {
        throw new Error(
          "Kirish xizmati vaqtincha mavjud emas."
        );
      }

      const account =
        loaded.data.data.users.find((user: any) =>
          login.includes("@")
            ? String(user.email || "").toLowerCase() ===
              login
            : String(
                user.username || ""
              ).toLowerCase() === login
        );

      const signed =
        await authClient().auth.signInWithPassword({
          email:
            account?.email ||
            "unknown-account@academy.invalid",
          password: body.password,
        });

      must(
        !signed.error &&
          signed.data.session &&
          account?.active &&
          signed.data.user?.id === account.id,
        invalid
      );

      return response({
        session: {
          access_token:
            signed.data.session!.access_token,
          refresh_token:
            signed.data.session!.refresh_token,
        },
      });
    }

    // Boshqa amallar uchun haqiqiy sessiya shart.
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
      "Sessiya tugagan. Qayta kiring."
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
      (account: any) =>
        account.id === auth.user!.id
    );

    must(
      user?.active,
      "Hisob faol emas yoki admin tomonidan biriktirilmagan."
    );

    const admin = user.role === "admin";

    const emailChanged =
      user.email !== auth.user!.email;

    if (emailChanged) {
      user.email = auth.user!.email;
    }

    if (body.action === "read") {
      let revision = row.revision;

      if (emailChanged) {
        const saved = await db.rpc(
          "academy_commit",
          {
            expected: row.revision,
            document: state,
            actor: user.id,
            operation: "sync-email",
          }
        );

        if (saved.error) throw saved.error;

        revision = saved.data;
      }

      return response({
        data: view(state, user),
        revision,
      });
    }

    if (body.action === "upload") {
      const video =
        String(body.type).startsWith("video/");

      must(
        admin || !video,
        "Video faqat admin tomonidan yuklanadi."
      );

      must(
        Number.isInteger(body.size) &&
          body.size > 0 &&
          body.size <=
            (video ? 200 : 20) * 1024 * 1024,
        "Fayl hajmi noto‘g‘ri."
      );

      const extension = String(body.name)
        .split(".")
        .pop()
        ?.toLowerCase();

      must(
        [
          "mp4",
          "webm",
          "pdf",
          "xls",
          "xlsx",
          "jpg",
          "jpeg",
          "png",
          "webp",
        ].includes(extension || "")
      );

      const path =
        user.id +
        "/uploads/" +
        crypto.randomUUID() +
        "." +
        extension;

      const bucket = admin
        ? "academy-media"
        : "academy-student-media";

      const { data, error } =
        await db.storage
          .from(bucket)
          .createSignedUploadUrl(path);

      if (error) throw error;

      return response({
        path,
        token: data.token,
        bucket,
      });
    }

    if (body.action === "media") {
      must(
        typeof body.path === "string" &&
          mayReadFile(state, user, body.path)
      );

      const owner = state.users.find(
        (account: any) =>
          account.id === body.path.split("/")[0]
      );

      const bucket =
        owner?.role === "admin"
          ? "academy-media"
          : "academy-student-media";

      const { data, error } =
        await db.storage
          .from(bucket)
          .createSignedUrl(body.path, 3600);

      if (error) throw error;

      return response({
        url: data.signedUrl,
      });
    }

    if (body.action === "setPassword") {
      must(admin);

      const target = state.users.find(
        (account: any) =>
          account.id === body.userId &&
          account.role === "student"
      );

      must(target);

      must(
        typeof body.password === "string" &&
          body.password.length >= 8
      );

      const { error } =
        await db.auth.admin.updateUserById(
          target.id,
          { password: body.password }
        );

      if (error) throw error;

      return response({ ok: true });
    }

    must(
      body.revision === row.revision,
      "Ma’lumot yangilangan. Sahifani yangilab, qayta saqlang."
    );

    let result: any;

    if (body.action === "createAdmin") {
      must(admin);

      const username = availableUsername(
        state,
        body.username
      );

      must(
        typeof body.name === "string" &&
          body.name.trim().length >= 3,
        "Ism kamida 3 belgi bo‘lsin."
      );

      must(
        typeof body.password === "string" &&
          body.password.length >= 8,
        "Parol kamida 8 belgi bo‘lsin."
      );

      const email =
        crypto.randomUUID() + "@academy.invalid";

      const created =
        await db.auth.admin.createUser({
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
        createdAt: new Date().toISOString(),
      });
    } else if (
      body.action === "adminNote" ||
      body.action === "markTrialsSeen"
    ) {
      applyAdminAction(
        state,
        user,
        body.action,
        body
      );
    } else if (body.action === "update") {
      if (!admin) {
        for (
          const submission of
          body.next.submissions || []
        ) {
          const existing =
            state.submissions.some(
              (item: any) =>
                item.id === submission.id
            );

          if (!existing && submission.attachment) {
            must(
              submission.attachment.fileId.startsWith(
                user.id + "/uploads/"
              )
            );
          }
        }
      }

      applyUpdate(state, user, body.next);
    } else if (body.action === "student") {
      must(admin);

      const {
        draft,
        selected,
        settings,
      } = body;

      const existing = state.users.find(
        (account: any) =>
          account.id === draft.id
      );

      must(
        !existing || existing.role === "student"
      );

      const username = availableUsername(
        state,
        draft.username,
        existing?.id
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
          draft.accessMode === "deposit"
            ? "deposit"
            : "active",
        role: "student",
        password: existing
          ? "temporary-validation-only"
          : draft.password,
        createdAt:
          existing?.createdAt ||
          new Date().toISOString(),
      };

      D.saveStudentWithPayment(
        structuredClone(state),
        clean,
        selected,
        settings || {},
        user.id
      );

      if (!existing) {
        const { data, error } =
          await db.auth.admin.createUser({
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
        user.id
      );

      state.users.forEach((account: any) => {
        delete account.password;
      });

      result = {
        studentId: clean.id,
      };
    } else if (body.action === "profile") {
      const fields = body.fields;

      const username = availableUsername(
        state,
        fields.username,
        user.id
      );

      const verified =
        await authClient().auth.signInWithPassword({
          email: user.email,
          password: String(
            fields.currentPassword || ""
          ),
        });

      must(
        !verified.error &&
          verified.data.user?.id === user.id,
        "Joriy parol noto‘g‘ri."
      );

      must(fields.name?.trim().length >= 3);

      must(
        !fields.phone ||
          /^\+?[0-9 ()-]{7,20}$/.test(fields.phone)
      );

      if (fields.avatarId) {
        must(
          fields.avatarId.startsWith(
            user.id + "/uploads/"
          )
        );
      }

      Object.assign(user, {
        username,
        name: fields.name.trim(),
        phone: fields.phone?.trim() || "",
        ...(fields.avatarId
          ? { avatarId: fields.avatarId }
          : {}),
      });
    } else if (body.action === "certificate") {
      result = {
        certificate: D.issueCertificate(
          state,
          user.id,
          body.courseId
        ),
      };
    } else {
      throw new Error("Noma’lum amal.");
    }

    const {
      data: revision,
      error,
    } = await db.rpc("academy_commit", {
      expected: row.revision,
      document: state,
      actor: user.id,
      operation: body.action,
    });

    if (error) throw error;

    createdId = undefined;

    return response({
      data: view(state, user),
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
          error instanceof Error
            ? error.message
            : "Server xatosi",
      },
      400
    );
  }
});