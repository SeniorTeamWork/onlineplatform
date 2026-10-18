import { useState } from "react";
import { useApp } from "../context/AppContext";
import { uid, enrollmentsFor, enrollmentSummary, addPayment, localDate, money } from "../services/db";
export default function PaymentForm({
  studentId,
  onSaved
}) {
  const {
    data,
    user,
    update
  } = useApp();
  const [selected, setSelected] = useState(studentId || ""),
    [course, setCourse] = useState(""),
    [busy, setBusy] = useState(false);
  const choices = enrollmentsFor(data, selected);
  const enrollment = choices.find(e => e.courseId === course);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    const ok = await update(d => addPayment(d, {
      id: uid(),
      userId: selected,
      courseId: course,
      amount: f.get("amount"),
      date: f.get("date"),
      method: f.get("method"),
      note: f.get("note").trim(),
      createdBy: user.id
    }));
    setBusy(false);
    if (ok) {
      form.reset();
      setCourse("");
      onSaved?.();
    }
  }
  return <form onSubmit={save}>
      <div className="form-grid">
        {!studentId && <label>
            Talaba
            <select required value={selected} onChange={e => {
          setSelected(e.target.value);
          setCourse("");
        }}>
              <option value="">Talabani tanlang</option>
              {data.users.filter(u => u.role === "student").map(u => <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </option>)}
            </select>
          </label>}
        <label>
          Kurs
          <select required value={course} onChange={e => setCourse(e.target.value)}>
            <option value="">Kursni tanlang</option>
            {choices.map(e => <option key={e.id} value={e.courseId}>
                {data.courses.find(c => c.id === e.courseId)?.title} · qarz{" "}
                {money(enrollmentSummary(data, e).debt)}
              </option>)}
          </select>
        </label>
        <label>
          Miqdor (so‘m)
          <input required name="amount" type="number" min="1" step="1" max={enrollment ? enrollmentSummary(data, enrollment).debt : undefined} />
        </label>
        <label>
          Sana
          <input name="date" type="date" required max={localDate()} defaultValue={localDate()} />
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
          <input name="note" maxLength={1000} />
        </label>
      </div>
      <button className="primary" disabled={busy || !enrollment || !enrollmentSummary(data, enrollment).debt}>
        To‘lovni saqlash
      </button>
      <p className="muted">
        To‘lov yozuvi qo‘lda kiritiladi; bu bank tranzaksiyasi emas.
      </p>
    </form>;
}
