import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useApp } from "../context/AppContext";

import {
  uid,
  enrollmentsFor,
  enrollmentSummary,
  addPayment,
  localDate,
  money,
  integer,
} from "../services/db";

import "./PaymentForm.css";

function formatAmount(value) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function PaymentForm({
  studentId,
  onSaved,
}) {
  const {
    data,
    user,
    update,
  } = useApp();

  const [selected, setSelected] = useState(
    studentId || ""
  );

  const [course, setCourse] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    setSelected(studentId || "");
    setCourse("");
    setQuery("");
    setOpen(false);
    setAmount("");
    setError("");
  }, [studentId]);

  useEffect(() => {
    function closeOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener(
      "pointerdown",
      closeOutside
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOutside
      );
    };
  }, []);

  const students = data.users.filter(
    (account) => account.role === "student"
  );

  const filteredStudents = students.filter(
    (student) =>
      student.name
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );

  const choices = enrollmentsFor(data, selected);

  const enrollment = choices.find(
    (item) => item.courseId === course
  );

  const debt = enrollment
    ? enrollmentSummary(data, enrollment).debt
    : 0;

  const amountNumber = Number(amount || 0);

  const amountError =
    enrollment && amountNumber > debt
      ? "Miqdor qolgan qarzdan oshmasligi kerak."
      : "";

  function chooseStudent(student) {
    setSelected(student.id);
    setQuery(student.name);
    setOpen(false);
    setActiveIndex(-1);
    setError("");

    const hasSelectedCourse = enrollmentsFor(
      data,
      student.id
    ).some(
      (item) => item.courseId === course
    );

    if (!hasSelectedCourse) {
      setCourse("");
    }
  }

  function searchStudent(event) {
    setQuery(event.target.value);
    setSelected("");
    setOpen(true);
    setActiveIndex(-1);
    setError("");
  }

  function handleSearchKey(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);

      setActiveIndex((index) =>
        Math.min(
          index + 1,
          filteredStudents.length - 1
        )
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);

      setActiveIndex((index) =>
        Math.max(index - 1, 0)
      );
    } else if (
      event.key === "Enter" &&
      open
    ) {
      event.preventDefault();

      const student =
        filteredStudents[activeIndex];

      if (student) {
        chooseStudent(student);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function changeAmount(event) {
    const value = event.target.value;

    // Nuqta, vergul va bo‘sh joy minglik ajratgich sifatida olinadi.
    if (!/^[\d.,\s]*$/.test(value)) return;

    const digits = value
      .replace(/[.,\s]/g, "")
      .replace(/^0+(?=\d)/, "");

    if (digits.length > 13) return;

    setAmount(digits);
    setError("");
  }

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    setError("");

    if (!selected || !enrollment) {
      setError("Talaba va kursni tanlang.");
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);

    setBusy(true);

    try {
      const value = integer(amount, 1);

      if (value > debt) {
        throw new Error(
          "Miqdor qolgan qarzdan oshmasligi kerak."
        );
      }

      const success = await update((next) =>
        addPayment(next, {
          id: uid(),
          userId: selected,
          courseId: course,
          amount: value,
          date: fields.get("date"),
          method: fields.get("method"),
          note: String(
            fields.get("note") || ""
          ).trim(),
          createdBy: user.id,
        })
      );

      if (success) {
        form.reset();
        setAmount("");
        setCourse("");
        onSaved?.();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        {!studentId && (
          <div
            className="payment-student-search"
            ref={searchRef}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget
                )
              ) {
                setOpen(false);
              }
            }}
          >
            <label htmlFor={listId + "-input"}>
              Talaba
            </label>

            <input
              id={listId + "-input"}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={
                open &&
                filteredStudents[activeIndex]
                  ? listId +
                    "-" +
                    filteredStudents[activeIndex].id
                  : undefined
              }
              autoComplete="off"
              placeholder="Talaba ismini yozing"
              value={query}
              onChange={searchStudent}
              onFocus={() => setOpen(true)}
              onKeyDown={handleSearchKey}
              required
            />

            {open && (
              <div
                id={listId}
                className="payment-student-options"
                role="listbox"
                aria-label="Talabalar"
              >
                {filteredStudents.map(
                  (student, index) => (
                    <button
                      key={student.id}
                      id={listId + "-" + student.id}
                      type="button"
                      role="option"
                      aria-selected={
                        selected === student.id
                      }
                      className={
                        "payment-student-option" +
                        (
                          activeIndex === index
                            ? " is-active"
                            : ""
                        )
                      }
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onMouseEnter={() =>
                        setActiveIndex(index)
                      }
                      onClick={() =>
                        chooseStudent(student)
                      }
                    >
                      <span>{student.name}</span>

                      {student.phone && (
                        <small>
                          {student.phone}
                        </small>
                      )}
                    </button>
                  )
                )}

                {!filteredStudents.length && (
                  <div className="payment-search-empty">
                    Talaba topilmadi.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <label>
          Kurs

          <select
            required
            value={course}
            onChange={(event) => {
              setCourse(event.target.value);
              setError("");
            }}
          >
            <option value="">
              Kursni tanlang
            </option>

            {data.courses.map((item) => {
              const assigned = choices.find(
                (choice) =>
                  choice.courseId === item.id
              );

              return (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={
                    !!selected && !assigned
                  }
                >
                  {item.title}

                  {assigned
                    ? " · qarz " +
                      money(
                        enrollmentSummary(
                          data,
                          assigned
                        ).debt
                      )
                    : selected
                      ? " · biriktirilmagan"
                      : ""}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Miqdor (so‘m)

          <input
            required
            name="amount"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Masalan: 170.000"
            value={formatAmount(amount)}
            onChange={changeAmount}
            aria-invalid={!!amountError}
          />

          {amountError && (
            <small className="danger">
              {amountError}
            </small>
          )}
        </label>

        <label>
          Sana

          <input
            name="date"
            type="date"
            required
            max={localDate()}
            defaultValue={localDate()}
          />
        </label>

        <label>
          Usul

          <select name="method">
            <option>Naqd</option>
            <option>Karta</option>
            <option>Bank o‘tkazmasi</option>
          </select>
        </label>

        <label>
          Izoh

          <input
            name="note"
            maxLength={1000}
          />
        </label>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="primary"
        disabled={
          busy ||
          !enrollment ||
          debt <= 0 ||
          amountNumber <= 0 ||
          !!amountError
        }
      >
        {busy
          ? "Saqlanmoqda…"
          : "To‘lovni saqlash"}
      </button>

      <p className="muted">
        To‘lov yozuvi qo‘lda kiritiladi;
        bu bank tranzaksiyasi emas.
      </p>
    </form>
  );
}