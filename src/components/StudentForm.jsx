import { useState } from "react";

import { useApp } from "../context/AppContext";
import { availableUsername } from "../services/identity";

import {
  uid,
  enrollmentsFor,
  saveStudentWithPayment,
  money,
} from "../services/db";

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

  const [draft, setDraft] = useState(() =>
    student
      ? { ...student }
      : {
          id: uid(),
          name: "",
          username: "",
          email: "",
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

  const [error, setError] = useState("");

  function field(key, value) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function courseSetting(courseId, key, value) {
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
    setError("");

    let clean;

    try {
      const username = availableUsername(
        data,
        draft.username,
        draft.id
      );

      clean = {
        ...draft,
        username,
        email:
          student?.email ||
          username + "@academy.invalid",
      };
    } catch (err) {
      setError(err.message);
      return;
    }

    if (cloud) {
      try {
        const result = await command("student", {
          draft: clean,
          selected,
          settings,
        });

        onSaved(result.studentId);
      } catch (err) {
        setError(err.message);
      }

      return;
    }

    const success = await update((next) =>
      saveStudentWithPayment(
        next,
        clean,
        selected,
        settings,
        user.id
      )
    );

    if (success) {
      onSaved(draft.id);
    } else {
      setError(
        "Saqlanmadi. Ekrandagi xabarni tekshiring."
      );
    }
  }

  const existingEnrollments = enrollmentsFor(
    data,
    draft.id
  );

  const newCourseIds = selected.filter(
    (courseId) =>
      !existingEnrollments.some(
        (enrollment) =>
          enrollment.courseId === courseId
      )
  );

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
              required
              minLength={3}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={draft.username || ""}
              onChange={(event) =>
                field("username", event.target.value)
              }
            />
          </label>

          <label>
            {cloud
              ? student
                ? "Parol — Auth’da saqlanadi"
                : "Boshlang‘ich parol"
              : "Demo parol"}

            <input
              type="password"
              disabled={cloud && !!student}
              required={!cloud || !student}
              minLength={8}
              autoComplete="new-password"
              value={draft.password || ""}
              onChange={(event) =>
                field("password", event.target.value)
              }
            />
          </label>

          <label>
            Telefon

            <input
              type="tel"
              value={draft.phone || ""}
              onChange={(event) =>
                field("phone", event.target.value)
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
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  active: event.target.value !== "false",
                  accessMode:
                    event.target.value === "deposit"
                      ? "deposit"
                      : "active",
                }))
              }
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
                onChange={(event) =>
                  setSelected((previous) =>
                    event.target.checked
                      ? [...previous, course.id]
                      : previous.filter(
                          (id) => id !== course.id
                        )
                  )
                }
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

        {newCourseIds.map((courseId) => (
          <fieldset key={courseId}>
            <legend>
              {
                data.courses.find(
                  (course) => course.id === courseId
                )?.title
              }{" "}
              — dastlabki to‘lov
            </legend>

            <label>
              To‘lov holati

              <select
                value={
                  settings[courseId]?.mode || "trial"
                }
                onChange={(event) =>
                  courseSetting(
                    courseId,
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

            {settings[courseId]?.mode === "deposit" && (
              <label>
                Depozit miqdori (so‘m)

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={
                    settings[courseId]?.amount || ""
                  }
                  onChange={(event) =>
                    courseSetting(
                      courseId,
                      "amount",
                      event.target.value
                    )
                  }
                />
              </label>
            )}

            {["active", "deposit"].includes(
              settings[courseId]?.mode
            ) && (
              <label>
                To‘lov usuli

                <select
                  value={
                    settings[courseId]?.method ||
                    "Naqd"
                  }
                  onChange={(event) =>
                    courseSetting(
                      courseId,
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
          disabled={!selected.length}
        >
          Saqlash
        </button>
      </form>
    </Modal>
  );
}