import Avatar from "../components/Avatar";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { enrollmentsFor, enrollmentSummary, paymentSummary, studentLessons, attemptPassed, money, integer, downloadMaterial } from "../services/db";
import StudentForm from "../components/StudentForm";
import PaymentForm from "../components/PaymentForm";
import Modal from "../components/Modal";
import { downloadCertificate } from "../services/certificate";
import "./StudentDetail.css";
export default function StudentDetail() {
  const {
    studentId
  } = useParams();
  const {
    data,
    user,
    update,
    notify,
    cloud,
    command
  } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [edit, setEdit] = useState(false),
    [voiding, setVoiding] = useState(null),
    [feeEdit, setFeeEdit] = useState(null);
  const student = data.users.find(u => u.id === studentId && u.role === "student");
  if (!student) return <div className="empty">
        Talaba topilmadi. <Link to="/admin/students">Ortga</Link>
      </div>;
  const totals = paymentSummary(data, student),
    enrollments = enrollmentsFor(data, studentId),
    lessons = studentLessons(data, studentId),
    attempts = data.attempts.filter(a => a.userId === studentId),
    submissions = data.submissions.filter(s => s.userId === studentId),
    payments = data.payments.filter(p => p.userId === studentId);
  async function voidPayment(e) {
    e.preventDefault();
    const reason = new FormData(e.currentTarget).get("reason").trim();
    if (reason.length < 5) return notify("Kamida 5 belgili sabab yozing.");
    if (await update(d => {
      const p = d.payments.find(p => p.id === voiding.id);
      if (p.voidedAt) throw Error("Avval bekor qilingan.");
      p.voidedAt = new Date().toISOString();
      p.voidReason = reason;
      p.voidedBy = user.id;
    })) setVoiding(null);
  }
  async function fee(e) {
    e.preventDefault();
    const n = new FormData(e.currentTarget).get("fee");
    if (await update(d => {
      const enrollment = d.enrollments.find(e => e.id === feeEdit.id);
      const value = integer(n);
      if (value < enrollmentSummary(d, enrollment).paid) throw Error("Narx to‘langan summadan kam bo‘lolmaydi.");
      enrollment.fee = value;
    })) setFeeEdit(null);
  }
  async function download(m) {
    try {
      await downloadMaterial(m);
    } catch (e) {
      notify(e.message);
    }
  }
  return <>
      <Link className="back" to="/admin/students">
        ← Talabalar
      </Link>
      <div className="page-heading">
        <div>
          <Avatar user={student} /><h1>{student.name}</h1>
          <p>
            {student.email} · {student.phone || "Telefon kiritilmagan"}
          </p>
          <p>
            {!student.active ? "Nofaol" : student.accessMode === "deposit" ? "Depozit" : "Faol"} · {student.notes}
          </p>
        </div>
        <button className="primary" onClick={() => setEdit(true)}>
          Ma’lumot va kurslarni tahrirlash
        </button>
      </div>
      <section className="panel detail-panel"><h2>Hisob ma’lumotlari</h2><p>Login: <strong>{student.email}</strong></p><p>Telefon: {student.phone || 'Kiritilmagan'}</p><p hidden={cloud}>Demo paroli: <strong>{showPassword ? student.password : '••••••••'}</strong> <button className="secondary" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Yashirish' : 'Ko‘rsatish'}</button></p>{cloud && <button className="secondary" onClick={async () => {
        const password = window.prompt('Yangi parol (kamida 8 belgi):');
        if (!password) return;
        try {
          await command('setPassword', {
            userId: student.id,
            password
          });
          notify('Yangi parol saqlandi.');
        } catch {}
      }}>Yangi parol belgilash</button>}<p className="muted">Faqat demo rejimi. Supabase Auth parollarni admin uchun ochib bermaydi; u yerda parolni tiklash ishlatiladi.</p></section>
      <div className="stats">
        {[[enrollments.length, "Sotib olingan kurs"], [lessons.filter(l => data.progress[studentId]?.[l.id]?.watched).length, "Ko‘rilgan video"], [money(totals.paid), "To‘langan"], [money(totals.debt), "Qarz"]].map(([n, l]) => <div className="panel stat" key={l}>
            <strong>{n}</strong>
            <span>{l}</span>
          </div>)}
      </div>
      <section className="panel detail-panel">
        <h2>Kurslar va hisob-kitob</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs</th>
                <th>Kelishilgan narx</th>
                <th>To‘lov</th>
                <th>Qarz</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map(e => {
              const s = enrollmentSummary(data, e);
              return <tr key={e.id}>
                    <td>
                      {data.courses.find(c => c.id === e.courseId)?.title}
                    </td>
                    <td>{money(s.fee)}</td>
                    <td>{money(s.paid)}</td>
                    <td>
                      {money(s.debt)}
                      {s.credit > 0 && <small>Ortiqcha: {money(s.credit)}</small>}
                    </td>
                    <td>
                      <button className="secondary" onClick={() => setFeeEdit(e)}>
                        Narxni tahrirlash
                      </button>
                    </td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel detail-panel">
        <h2>To‘lov qo‘shish</h2>
        <PaymentForm studentId={studentId} />
        <h3>To‘lov tarixi</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Kurs</th>
                <th>Miqdor</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {[...payments].reverse().map(p => <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>
                    {data.courses.find(c => c.id === p.courseId)?.title}
                    <small>{p.note}</small>
                  </td>
                  <td>{money(p.amount)}</td>
                  <td>
                    {p.voidedAt ? "Bekor qilingan" : "Qayd etilgan"}
                    <small>{p.voidReason}</small>
                  </td>
                  <td>
                    {!p.voidedAt && <button className="secondary" onClick={() => setVoiding(p)}>
                        Bekor qilish
                      </button>}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel detail-panel">
        <h2>Ko‘rilgan darslar</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs / dars</th>
                <th>Video</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map(l => <tr key={l.id}>
                  <td>
                    {l.title}
                    <small>
                      {data.courses.find(c => c.id === l.courseId)?.title}
                    </small>
                  </td>
                  <td>
                    {data.progress[studentId]?.[l.id]?.watched ? "Yakunlangan" : "Yakunlanmagan"}
                  </td>
                  <td>
                    {data.progress[studentId]?.[l.id]?.watchedAt ? new Date(data.progress[studentId][l.id].watchedAt).toLocaleString("uz-UZ") : "—"}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel detail-panel">
        <h2>Test natijalari tarixi</h2>
        {!attempts.length && <p>Hali test topshirilmagan.</p>}
        {[...attempts].reverse().map(a => <details className="attempt-detail" key={a.id}>
            <summary>
              {a.lessonTitle || data.lessons.find(l => l.id === a.lessonId)?.title || "Eski dars"}{" "}
              · {a.score.toFixed(2)}% · {attemptPassed(a) ? "O‘tdi" : "O‘tmadi"}
            </summary>
            <p>{new Date(a.createdAt).toLocaleString("uz-UZ")}</p>
            {a.questions?.map((q, i) => <div className="submission" key={q.id}>
                <strong>
                  {i + 1}. {q.text}
                </strong>
                <p>Talaba: {q.options[a.answers?.[q.id]] ?? "—"}</p>
                <p>To‘g‘ri javob: {q.options[q.correct]}</p>
              </div>)}
          </details>)}
      </section>
      <section className="panel detail-panel">
        <h2>Amaliy natijalar tarixi</h2>
        {!submissions.length && <p>Hali topshirilmagan.</p>}
        {[...submissions].reverse().map(s => <article className="submission" key={s.id}>
            <h3>{s.lessonTitle}</h3>
            <p>{s.answer}</p>
            {s.attachment && <button className="secondary" onClick={() => download(s.attachment)}>
                {s.attachment.name} ↓
              </button>}
            <p>{new Date(s.createdAt).toLocaleString("uz-UZ")}</p>
            <span className="badge">
              {{
            pending: "Tekshirilmoqda",
            approved: "Tasdiqlangan",
            rejected: "Qaytarilgan"
          }[s.status]}
            </span>
            <p>Baho: {s.grade ?? "—"} / 100</p>
            <p>Admin izohi: {s.feedback || "—"}</p>
          </article>)}
        <Link className="primary inline-button" to="/admin/reviews">
          Amaliy ishlarni tekshirish
        </Link>
      </section>
      <section className="panel detail-panel">
        <h2>Berilgan sertifikatlar</h2>
        {data.certificates.filter(c => c.userId === studentId).map(c => <div className="row" key={c.id}>
              <span>
                {c.title} · {c.score.toFixed(2)}%
              </span>
              <button className="secondary" onClick={() => downloadCertificate(c).catch(e => notify(e.message))}>
                PDF yuklash
              </button>
            </div>)}
      </section>
      {edit && <StudentForm student={student} onClose={() => setEdit(false)} onSaved={() => setEdit(false)} />}{" "}
      {voiding && <Modal title="To‘lovni bekor qilish" onClose={() => setVoiding(null)}>
          <form onSubmit={voidPayment}>
            <p>
              {money(voiding.amount)} hisobdan chiqariladi, yozuv tarixda
              saqlanadi.
            </p>
            <label>
              Sabab
              <textarea name="reason" required minLength={5} />
            </label>
            <button className="primary">Ha, bekor qilish</button>
          </form>
        </Modal>}
      {feeEdit && <Modal title="Kelishilgan narx" onClose={() => setFeeEdit(null)}>
          <form onSubmit={fee}>
            <label>
              Narx (so‘m)
              <input type="number" min="0" step="1" required name="fee" defaultValue={feeEdit.fee} />
            </label>
            <button className="primary">Saqlash</button>
          </form>
        </Modal>}
    </>;
}
