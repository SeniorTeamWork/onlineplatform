import { useState } from "react";

import { useApp } from "../context/AppContext";

export default function StudentPasswordForm({
  student,
}) {
  const {
    cloud,
    command,
    update,
    notify,
  } = useApp();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    if (password !== confirmation) {
      notify("Parollar bir xil emas.");

      return;
    }

    if (password.length < 8 || password.length > 128) {
      notify("Parol 8–128 belgi bo‘lsin.");

      return;
    }

    setBusy(true);

    try {
      if (cloud) {
        const result = await command("setPassword", {
          userId: student.id,
          password,
        });

        if (!result.ok) {
          throw Error("Parol saqlanmadi.");
        }
      } else {
        const saved = await update((data) => {
          const account = data.users.find(
            (item) => item.id === student.id
          );

          account.password = password;
        });

        if (!saved) return;
      }

      setPassword("");
      setConfirmation("");

      notify(
        "Yangi parol saqlandi. Login: " +
          (student.username || student.email)
      );
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel detail-panel">
      <h2>Talaba parolini o‘zgartirish</h2>

      <p>
        Login:{" "}
        <strong>
          {student.username || student.email}
        </strong>
      </p>

      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            Yangi parol

            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </label>

          <label>
            Parolni takrorlang

            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value)
              }
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
            : "Yangi parolni saqlash"}
        </button>
      </form>
    </section>
  );
}