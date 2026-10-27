import { useState } from "react";

import {
  BookOpen,
  Plus,
  Search,
  Users,
  Pencil,
  ArrowLeft,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { uid, money, integer } from "../services/db";

import { MoneyInput } from "./FormattedInputs";
import Modal from "./Modal";

import "./CourseManager.css";

export default function CourseManager({
  open,
  onOpenChange,
}) {
  const { data, update, notify } = useApp();

  const [localOpen, setLocalOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const visible = open ?? localOpen;

  function show(value) {
    (onOpenChange || setLocalOpen)(value);

    if (!value) {
      setDraft(null);
      setQuery("");
    }
  }

  function create() {
    setDraft({
      id: uid(),
      title: "",
      price: "",
      description: "",
    });

    show(true);
  }

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    const title = draft.title.trim();

    if (title.length < 2) {
      notify(
        "Kurs nomi kamida 2 belgidan iborat bo‘lsin."
      );
      return;
    }

    setBusy(true);

    try {
      const saved = await update((next) => {
        const price = integer(draft.price);

        if (
          next.courses.some(
            (course) =>
              course.id !== draft.id &&
              course.title.toLowerCase() ===
                title.toLowerCase()
          )
        ) {
          throw Error("Bu nomdagi kurs mavjud.");
        }

        const course = {
          ...draft,
          title,
          price,
          description: draft.description.trim(),
        };

        const index = next.courses.findIndex(
          (item) => item.id === draft.id
        );

        if (index < 0) {
          next.courses.push(course);
        } else {
          next.courses[index] = course;
        }
      });

      if (saved) {
        setDraft(null);
        setQuery("");
        notify("Kurs saqlandi.");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  const courses = data.courses.filter((course) =>
    (course.title + " " + course.description)
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          setDraft(null);
          show(true);
        }}
      >
        <BookOpen size={22} />
        Kurslar ({data.courses.length})
      </button>

      <button
        type="button"
        className="secondary"
        onClick={create}
      >
        <Plus size={22} />
        Yangi kurs
      </button>

      {visible && (
        <Modal
          title={
            draft
              ? "Kurs ma’lumotlari"
              : "Kurslarni boshqarish"
          }
          onClose={() => show(false)}
        >
          {draft ? (
            <>
              <button
                className="text-btn course-back"
                type="button"
                onClick={() => setDraft(null)}
              >
                <ArrowLeft size={20} />
                Kurslar ro‘yxatiga
              </button>

              <form onSubmit={save}>
                <label>
                  Kurs nomi
                  <input
                    autoFocus
                    required
                    minLength={2}
                    maxLength={150}
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        title: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Narxi (so‘m)
                  <MoneyInput
                    required
                    min={0}
                    max={1000000000000}
                    value={draft.price}
                    placeholder="Masalan: 1.500.000"
                    onValueChange={(value) =>
                      setDraft({
                        ...draft,
                        price: value,
                      })
                    }
                  />
                </label>

                <label>
                  Tavsif
                  <textarea
                    maxLength={3000}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        description: event.target.value,
                      })
                    }
                  />
                </label>

                <p className="muted">
                  Yangi narx avvalgi talabalar bilan
                  kelishilgan narxni o‘zgartirmaydi.
                </p>

                <div className="button-row">
                  <button
                    type="submit"
                    className="primary"
                    disabled={busy}
                  >
                    {busy ? "Saqlanmoqda…" : "Saqlash"}
                  </button>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setDraft(null)}
                  >
                    Bekor qilish
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="course-modal-toolbar">
                <div className="course-search">
                  <Search size={22} />

                  <input
                    aria-label="Kurslarni qidirish"
                    placeholder="Kurs nomi bo‘yicha qidiring…"
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                  />
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={create}
                >
                  <Plus size={22} />
                  Yangi kurs
                </button>
              </div>

              <p className="muted">
                {courses.length} ta kurs · narxlar va
                o‘quvchilar
              </p>

              <div className="course-modal-list">
                {courses.map((course) => (
                  <article
                    className="course-manage-card"
                    key={course.id}
                  >
                    <div className="course-manage-icon">
                      <BookOpen size={26} />
                    </div>

                    <div className="course-manage-body">
                      <h3>{course.title}</h3>

                      <p>
                        {course.description ||
                          "Tavsif kiritilmagan"}
                      </p>

                      <div className="course-card-meta">
                        <strong>
                          {money(course.price)}
                        </strong>

                        <span>
                          <Users size={20} />{" "}
                          {
                            data.enrollments.filter(
                              (enrollment) =>
                                enrollment.courseId ===
                                course.id
                            ).length
                          }{" "}
                          talaba
                        </span>

                        <span>
                          {
                            data.lessons.filter(
                              (lesson) =>
                                lesson.courseId ===
                                  course.id &&
                                !lesson.archived
                            ).length
                          }{" "}
                          dars
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setDraft({ ...course })
                      }
                    >
                      <Pencil size={20} />
                      Tahrirlash
                    </button>
                  </article>
                ))}
              </div>

              {!courses.length && (
                <div className="empty">
                  {query
                    ? "Qidiruvga mos kurs topilmadi."
                    : "Hali kurs yo‘q. Yangi kurs yarating."}
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}