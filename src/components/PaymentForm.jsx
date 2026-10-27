import {
  useEffect,
  useId,
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
} from "../services/db";

import { MoneyInput } from "./FormattedInputs";

export default function PaymentForm({
  studentId,
  onSaved,
}) {
  const {
    data,
    user,
    update,
    notify,
  } = useApp();

  const listId = useId();

  const [selected, setSelected] = useState(
    studentId || ""
  );

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [course, setCourse] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (studentId) {
      setSelected(studentId);
      setCourse("");
      setAmount("");
    }
  }, [studentId]);

  const students = data.users.filter(
    (account) => account.role === "student"
  );

  const matches = students.filter((student) =>
    String(student.name || "")
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

  function chooseStudent(student) {
    setSelected(student.id);
    setQuery(student.name);
    setCourse("");
    setAmount("");
    setSearchOpen(false);
  }

  async function save(event) {
    event.preventDefault();

    if (busy) return;

    if (!selected) {
      notify("Ro‘yxatdan talabani tanlang.");
      return;
    }

    const form = event.currentTarget;
    const fields = new FormData(form);

    setBusy(true);

    try {
      const saved = await update((draft) =>
        addPayment(draft, {
          id: uid(),
          userId: selected,
          courseId: course,
          amount: fields.get("amount"),
          date: fields.get("date"),
          method: fields.get("method"),
          note: String(fields.get("note") || "").trim(),
          createdBy: user.id,
        })
      );

      if (saved) {
        form.reset();
        setCourse("");
        setAmount("");
        onSaved?.();
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save}>
      <div className="form-grid">
        {!studentId && (
          <div
            style={{ position: "relative" }}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget
                )
              ) {
                setSearchOpen(false);
              }
            }}
          >
            <label>
              Talaba

              <input
                type="search"
                required
                autoComplete="off"
                placeholder="Talaba ismini yozing"
                value={query}
                role="combobox"
                aria-expanded={searchOpen}
                aria-controls={listId}
                aria-autocomplete="list"
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected("");
                  setCourse("");
                  setAmount("");
                  setSearchOpen(true);
                }}
              />
            </label>

            {searchOpen && (
              <div
                id={listId}
                role="listbox"
                className="panel"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  maxHeight: "260px",
                  overflowY: "auto",
                  padding: "8px",
                }}
              >
                {matches.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    role="option"
                    aria-selected={
                      selected === student.id
                    }
                    className="secondary"
                    style={{
                      display: "block",
                      width: "100%",
                      marginBottom: "6px",
                      textAlign: "left",
                    }}
                    onClick={() =>
                      chooseStudent(student)
                    }
                  >
                    {student.name}
                  </button>
                ))}

                {!matches.length && (
                  <p>Talaba topilmadi.</p>
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
              setAmount("");
            }}
          >
            <option value="">Kursni tanlang</option>

            {data.courses.map((item) => {
              const assigned = choices.find(
                (choice) =>
                  choice.courseId === item.id
              );

              return (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={!assigned}
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
                    : " · talabaga biriktirilmagan"}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Miqdor (so‘m)

          <MoneyInput
            name="amount"
            required
            min={1}
            max={debt}
            disabled={!enrollment || debt <= 0}
            value={amount}
            placeholder="Masalan: 500.000"
            onValueChange={setAmount}
          />
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

      <button
        type="submit"
        className="primary"
        disabled={
          busy ||
          !selected ||
          !enrollment ||
          debt <= 0
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