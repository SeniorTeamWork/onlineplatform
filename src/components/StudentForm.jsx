import { useState } from "react";

import { useApp } from "../context/AppContext";
import { availableUsername } from "../services/identity";

import {
  uid,
  enrollmentsFor,
  saveStudentWithPayment,
  money,
} from "../services/db";

import {
  PhoneInput,
  MoneyInput,
} from "./FormattedInputs";

import Modal from "./Modal";

export default function StudentForm({
  student,
  onClose,
  onSaved,
}) {
  const {
    data,
    user,
    update,
    cloud,
    command,
  } = useApp();

  const [settings, setSettings] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(() =>
    student
      ? { ...student }
      : {
          id: uid(),
          name: "",
          email: "",
          username: "",
          password: "",
          phone: "",
          notes: "",
          role: "student",
          active: true,
          createdAt: new Date().toISOString(),
        }
  );

  const [selected, setSelected] = useState(() =>
    student
      ? enrollmentsFor(data, student.id).map(
          (enrollment) => enrollment.courseId
        )
      : []
  );

  const existingEnrollments = enrollmentsFor(
    data,
    draft.id
  );

  const newCourses = selected.filter(
    (id) =>
      !existingEnrollments.some(
        (enrollment) => enrollment.courseId === id
      )
  );

  function field(key, value) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function paymentSetting(courseId, key, value) {
    setSettings((previous) => ({
      ...previous,
      [courseId]: {
        ...previous[courseId],
        [key]: value,
      },
    }));
  }

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setError("");
    setBusy(true);

    try {
      const username = availableUsername(
        data,
        draft.username,
        draft.id
      );

      const clean = {
        ...draft,
        username,
        email:
          student?.email ||
          username + "@academy.invalid",
      };

      if (cloud) {
        const result = await command("student", {
          draft: clean,
          selected,
          settings,
        });

        onSaved(result.studentId);
      } else {
        const saved = await update((next) =>
          saveStudentWithPayment(
            next,
            clean,
            selected,
            settings,
            user.id
          )
        );

        if (saved) {
          onSaved(draft.id);
        } else {
          setError(
            "Saqlanmadi. Ekrandagi xabarni tekshiring."
          );
        }
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={
        student
          ? "Talaba va kurslarni tahrirlash"
          : "Yangi talaba"
      }
      onClose={onClose}
    >
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            To‘liq ism
            <input
              required
              minLength={3}
              value={draft.name}
              onChange={(event) =>
                field("name", event.target.value)
              }
            />
          </label>

          <label>
            Login
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              minLength={3}
              maxLength={40}
              required
              value={draft.username || ""}
              onChange={(event) =>
                field("username", event.target.value)
              }
            />
          </label>

          <label>
            {cloud
              ? student
                ? "Parol (Authda saqlanadi)"
                : "Boshlang‘ich parol"
              : "Demo parol"}

            <input
              type="password"
              autoComplete="new-password"
              disabled={cloud && Boolean(student)}
              required={!cloud || !student}
              minLength={8}
              value={draft.password || ""}
              onChange={(event) =>
                field("password", event.target.value)
              }
            />
          </label>

          <label>
            Telefon
            <PhoneInput
              value={draft.phone || ""}
              onValueChange={(value) =>
                field("phone", value)
              }
            />
          </label>

          <label>
            Holat
            <select
              aria-label="Talaba holati"
              value={
                !draft.active
                  ? "false"
                  : draft.accessMode === "deposit"
                    ? "deposit"
                    : "true"
              }
              onChange={(event) => {
                const value = event.target.value;

                setDraft((previous) => ({
                  ...previous,
                  active: value !== "false",
                  accessMode:
                    value === "deposit"
                      ? "deposit"
                      : "active",
                }));
              }}
            >
              <option value="true">Faol</option>
              <option value="false">Nofaol</option>
              <option value="deposit">Depozit</option>
            </select>
          </label>

          <label>
            Izoh
            <textarea
              value={draft.notes || ""}
              onChange={(event) =>
                field("notes", event.target.value)
              }
            />
          </label>
        </div>

        {draft.active &&
          draft.accessMode === "deposit" && (
            <p className="result">
              Depozit: to‘lov kiritilmaguncha faqat
              birinchi dars ochiq. Qisman to‘lov ham
              kursni davom ettirish uchun yetarli;
              qolgan qarz moliyada saqlanadi.
            </p>
          )}

        <fieldset>
          <legend>
            Kurslarni tanlang — bir nechtasini
            belgilash mumkin
          </legend>

          {data.courses.map((course) => (
            <label
              key={course.id}
              className="check-card"
            >
              <input
                type="checkbox"
                checked={selected.includes(course.id)}
                onChange={(event) => {
                  const checked = event.target.checked;

                  setSelected((previous) =>
                    checked
                      ? [...previous, course.id]
                      : previous.filter(
                          (id) => id !== course.id
                        )
                  );
                }}
              />

              <span>
                {course.title}

                <small>
                  {money(
                    existingEnrollments.find(
                      (enrollment) =>
                        enrollment.courseId === course.id
                    )?.fee ?? course.price
                  )}
                </small>
              </span>
            </label>
          ))}
        </fieldset>

        {newCourses.map((id) => (
          <fieldset key={id}>
            <legend>
              {
                data.courses.find(
                  (course) => course.id === id
                )?.title
              }
              {" — "}dastlabki to‘lov
            </legend>

            <label>
              To‘lov holati
              <select
                value={settings[id]?.mode || "trial"}
                onChange={(event) =>
                  paymentSetting(
                    id,
                    "mode",
                    event.target.value
                  )
                }
              >
                <option value="trial">
                  Sinov — to‘lov olinmagan
                </option>

                <option value="deposit">
                  Depozit — qisman to‘lov
                </option>

                <option value="active">
                  To‘langan — to‘liq to‘lov
                </option>
              </select>
            </label>

            {settings[id]?.mode === "deposit" && (
              <label>
                Depozit miqdori (so‘m)
                <MoneyInput
                  required
                  min={1}
                  value={settings[id]?.amount || ""}
                  onValueChange={(value) =>
                    paymentSetting(id, "amount", value)
                  }
                />
              </label>
            )}

            {["active", "deposit"].includes(
              settings[id]?.mode
            ) && (
              <label>
                To‘lov usuli
                <select
                  value={settings[id]?.method || "Naqd"}
                  onChange={(event) =>
                    paymentSetting(
                      id,
                      "method",
                      event.target.value
                    )
                  }
                >
                  <option>Naqd</option>
                  <option>Karta</option>
                  <option>Bank o‘tkazmasi</option>
                </select>
              </label>
            )}

            <p>
              To‘lovsiz faqat birinchi dars ochiladi.
              Shu kurs uchun istalgan musbat to‘lov
              kiritilgach, qolgan darslar video va test
              shartlariga ko‘ra ketma-ket ochiladi.
              Bepul kurslar uchun to‘lov talab
              qilinmaydi.
            </p>
          </fieldset>
        ))}

        <p>
          Tarixi yoki to‘lovi bor kursni olib tashlab
          bo‘lmaydi. Yangi kurs uchun amaldagi narx
          saqlanadi.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary"
          disabled={busy || !selected.length}
        >
          {busy ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </form>
    </Modal>
  );
}