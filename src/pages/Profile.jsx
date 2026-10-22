import { useState } from "react";

import { supabase } from "../services/supabase";
import { useApp } from "../context/AppContext";

import {
  putFile,
  updateProfile,
} from "../services/db";

import { availableUsername } from "../services/identity";
import Avatar from "../components/Avatar";

export default function Profile() {
  const {
    user,
    data,
    update,
    notify,
    cloud,
    command,
  } = useApp();

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    const form = event.currentTarget;
    const values = new FormData(form);

    setBusy(true);

    try {
      const fields = {
        name: values.get("name"),
        email: user.email,
        username: availableUsername(
          data,
          values.get("username"),
          user.id
        ),
        phone: values.get("phone"),
        password: values.get("password"),
      };

      if (
        fields.password !== values.get("confirm")
      ) {
        throw new Error(
          "Yangi parollar bir xil emas."
        );
      }

      if (file) {
        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];

        if (
          !allowed.includes(file.type) ||
          file.size > 3 * 1024 * 1024
        ) {
          throw new Error(
            "JPG, PNG yoki WebP rasm tanlang. Maksimal hajm: 3 MB."
          );
        }

        fields.avatarId = await putFile(file);
      }

      let saved;

      if (cloud) {
        const auth =
          await supabase.auth.signInWithPassword({
            email: user.email,
            password: values.get("current"),
          });

        if (auth.error) throw auth.error;

        await command("profile", {
          fields: {
            username: fields.username,
            currentPassword: values.get("current"),
            name: fields.name,
            phone: fields.phone,
            avatarId: fields.avatarId,
          },
        });

        if (fields.password) {
          const result =
            await supabase.auth.updateUser({
              password: fields.password,
            });

          if (result.error) {
            throw new Error(
              "Profil saqlandi, ammo parol yangilanmadi: " +
                result.error.message
            );
          }
        }

        saved = true;
      } else {
        saved = await update((next) => {
          updateProfile(
            next,
            user.id,
            fields,
            values.get("current")
          );

          next.users.find(
            (account) => account.id === user.id
          ).username = availableUsername(
            next,
            fields.username,
            user.id
          );
        });
      }

      if (saved) {
        form.elements.current.value = "";
        form.elements.password.value = "";
        form.elements.confirm.value = "";

        setFile(null);
        notify("Profil saqlandi.");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Mening profilim</h1>
          <p>
            Shaxsiy ma’lumotlar va hisob sozlamalari
          </p>
        </div>
      </div>

      <section className="panel detail-panel profile-panel">
        <Avatar user={user} />

        <form onSubmit={save}>
          <label>
            Profil rasmi

            <input
              key={file?.name || "none"}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                setFile(
                  event.target.files[0] || null
                )
              }
            />
          </label>

          <div className="form-grid">
            <label>
              Ism va familiya

              <input
                name="name"
                defaultValue={user.name}
                required
                minLength={3}
              />
            </label>

            <label>
              Telefon raqami

              <input
                name="phone"
                type="tel"
                defaultValue={user.phone || ""}
              />
            </label>

            <label>
              Login

              <input
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={user.username || ""}
                required
                minLength={3}
                maxLength={40}
              />
            </label>

            <label>
              Joriy parol

              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>

            <label>
              Yangi parol (ixtiyoriy)

              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
              />
            </label>

            <label>
              Yangi parolni takrorlang

              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>

          <button
            type="submit"
            className="primary"
            disabled={busy}
          >
            {busy
              ? "Saqlanmoqda…"
              : "O‘zgarishlarni saqlash"}
          </button>
        </form>
      </section>
    </>
  );
}