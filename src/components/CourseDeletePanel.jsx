import { useRef, useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";

import { useApp } from "../context/AppContext";
import { canAdmin } from "../services/adminAccess";
import { applyCourseDeletion } from "../services/deleteCourse";

import Modal from "./Modal";
import "./CourseDeletePanel.css";

function SlideToDelete({ disabled, onConfirm }) {
  const track = useRef(null);
  const drag = useRef(null);
  const value = useRef(0);

  const [position, setPosition] = useState(0);
  const [dragging, setDragging] = useState(false);

  function change(next) {
    value.current = next;
    setPosition(next);
  }

  function reset() {
    drag.current = null;
    setDragging(false);
    change(0);
  }

  function begin(event) {
    if (disabled || !event.isPrimary || event.button !== 0) {
      return;
    }

    const width = track.current?.clientWidth || 0;
    const travel = width - 64;

    if (travel <= 0) return;

    event.preventDefault();

    drag.current = {
      id: event.pointerId,
      start: event.clientX,
      travel,
    };

    change(0);
    setDragging(true);

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const current = drag.current;

    if (
      disabled ||
      !current ||
      current.id !== event.pointerId
    ) {
      return;
    }

    const next = Math.max(
      0,
      Math.min(
        1,
        (event.clientX - current.start) / current.travel
      )
    );

    change(next);
  }

  function finish(event) {
    const current = drag.current;

    if (!current || current.id !== event.pointerId) return;

    // Qo‘yib yuborilgan nuqtani ham hisobga olamiz.
    const finalPosition = Math.max(
      0,
      Math.min(
        1,
        (event.clientX - current.start) / current.travel
      )
    );

    const confirmed = !disabled && finalPosition >= 0.99;

    reset();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (confirmed) onConfirm();
  }

  function keyboard(event) {
    if (disabled) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      change(Math.min(1, value.current + 0.1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      change(Math.max(0, value.current - 0.1));
    } else if (event.key === "Escape") {
      event.preventDefault();
      reset();
    } else if (event.key === "Enter" && value.current >= 0.99) {
      event.preventDefault();
      reset();
      onConfirm();
    }
  }

  return (
    <div
      ref={track}
      className={
        "course-delete-slider" +
        (dragging ? " is-dragging" : "")
      }
      style={{ "--slide": position }}
    >
      <div className="course-delete-slider-fill" />

      <span className="course-delete-slider-label" aria-live="polite">
        {disabled
          ? "O‘chirilmoqda…"
          : position >= 0.99
            ? "Tasdiqlash uchun qo‘yib yuboring"
            : "O‘chirish uchun o‘ngga suring"}
      </span>

      <button
        type="button"
        className="course-delete-slider-thumb"
        role="slider"
        aria-label="Kursni o‘chirishni tasdiqlash"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        aria-valuetext={`${Math.round(position * 100)} foiz`}
        aria-describedby="course-delete-keyboard-help"
        disabled={disabled}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={reset}
        onLostPointerCapture={() => {
          if (drag.current) reset();
        }}
        onKeyDown={keyboard}
        onBlur={reset}
      >
        <ArrowRight size={23} />
      </button>

      <span
        id="course-delete-keyboard-help"
        className="course-delete-sr"
      >
        Klaviaturada o‘ng strelka bilan oxirigacha suring,
        keyin Enter bosing. Escape bekor qiladi.
      </span>
    </div>
  );
}

export default function CourseDeletePanel({ disabled = false }) {
  const {
    data,
    user,
    cloud,
    command,
    update,
    saving,
    notify,
  } = useApp();

  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lock = useRef(false);

  if (!canAdmin(user, "lessons")) return null;

  const blocked = disabled || saving || busy;

  const lessonCount = selected
    ? data.lessons.filter(
        (lesson) => lesson.courseId === selected.id
      ).length
    : 0;

  function close() {
    if (lock.current) return;

    setSelected(null);
    setError("");
  }

  async function remove() {
    if (!selected || blocked || lock.current) return;

    const courseId = selected.id;

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      if (cloud) {
        await command("deleteCourse", { courseId });
      } else {
        const saved = await update((state) => {
          applyCourseDeletion(state, courseId);
        });

        if (!saved) {
          throw Error(
            "Kurs o‘chirilmadi. Sahifani yangilab, qayta urinib ko‘ring."
          );
        }
      }

      setSelected(null);
      notify("Kurs va uning barcha darslari o‘chirildi.");
    } catch (failure) {
      setError(
        failure.message ||
          "Kursni o‘chirishda xatolik yuz berdi."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <section className="course-delete-list">
        {data.courses.map((course) => {
          const count = data.lessons.filter(
            (lesson) => lesson.courseId === course.id
          ).length;

          return (
            <article
              className="course-delete-card"
              key={course.id}
            >
              <div className="course-delete-card-info">
                <h3>{course.title}</h3>
                <p>{count} ta dars</p>
              </div>

              <button
                type="button"
                className="course-delete-trigger"
                disabled={blocked}
                onClick={() => {
                  setSelected(course);
                  setError("");
                }}
              >
                <Trash2 size={17} />
                O‘chirish
              </button>
            </article>
          );
        })}
      </section>

      {selected && (
        <Modal
          title="Kursni o‘chirish"
          onClose={close}
        >
          <div className="course-delete-content" aria-busy={busy}>
            <div className="course-delete-icon">
              <Trash2 size={28} />
            </div>

            <h3>{selected.title}</h3>

            <p>
              Ushbu kurs va ichidagi <strong>{lessonCount} ta dars</strong>,
              ularga tegishli test natijalari, amaliy ishlar
              va o‘qish jarayoni o‘chiriladi.
            </p>

            <p className="course-delete-warning">
              Bu amalni ortga qaytarib bo‘lmaydi.
            </p>

            {error && (
              <p className="course-delete-error" role="alert">
                {error}
              </p>
            )}

            <SlideToDelete
              disabled={busy || saving || disabled}
              onConfirm={remove}
            />

            <button
              type="button"
              className="course-delete-cancel"
              disabled={busy}
              onClick={close}
            >
              Bekor qilish
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}