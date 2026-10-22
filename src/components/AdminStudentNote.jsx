import { useState } from "react";
import { useApp } from "../context/AppContext";

export default function AdminStudentNote({ student }) {
  const { cloud, command, update, notify } = useApp();

  const [text, setText] = useState(student.adminNote || "");
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      if (cloud) {
        await command("adminNote", {
          userId: student.id,
          note: text,
        });
      } else {
        const success = await update((data) => {
          const target = data.users.find(
            (user) => user.id === student.id
          );

          target.adminNote = text.trim();
        });

        if (!success) return;
      }

      notify("Shaxsiy izoh saqlandi.");
    } catch {
      // Xatolikni AppContext ko‘rsatadi.
      // Kiritilgan matn yo‘qolmaydi.
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel detail-panel">
      <h2>Admin uchun shaxsiy izoh</h2>

      <p>Bu izoh o‘quvchiga ko‘rinmaydi.</p>

      <form onSubmit={save}>
        <label>
          Izoh
          <textarea
            value={text}
            maxLength={5000}
            rows={5}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <button
          type="submit"
          className="primary"
          disabled={saving}
        >
          {saving ? "Saqlanmoqda…" : "Izohni saqlash"}
        </button>
      </form>
    </section>
  );
}