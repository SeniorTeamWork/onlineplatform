import Expenses from '../components/Expenses';
import Statistics from "../components/Statistics";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { paymentSummary, enrollmentSummary, money, localDate } from "../services/db";
import PaymentForm from "../components/PaymentForm";
import "./Admin.css";
export default function Finance() {
  const {
    data
  } = useApp();
  const [debtors, setDebtors] = useState(false),
    [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const students = data.users.filter(u => u.role === "student");
  const rows = students.map(u => ({
    u,
    ...paymentSummary(data, u)
  }));
  const totals = rows.reduce((a, r) => {
    for (const k of ["fee", "paid", "debt", "credit"]) a[k] += r[k];
    return a;
  }, {
    fee: 0,
    paid: 0,
    debt: 0,
    credit: 0
  });
  const payments = data.payments.filter(p => !p.voidedAt && (!from || p.date >= from) && (!to || p.date <= to));
  const filtered = rows.filter(r => (!debtors || r.debt > 0) && (r.u.name + " " + r.u.email).toLowerCase().includes(query.toLowerCase()));
  return <>
      <div className="page-heading">
        <div>
          <h1>Moliya</h1>
          <p>Kurslar bo‘yicha to‘lovlar va qarzdorlik nazorati</p>
        </div>
      </div>
      <div className="stats">
        <div className="panel stat">
          <strong>{students.length}</strong>
          <span>Talabalar</span>
        </div>
        <div className="panel stat">
          <strong>{money(totals.fee)}</strong>
          <span>Jami shartnoma qiymati</span>
        </div>
        <div className="panel stat">
          <strong>{money(totals.paid)}</strong>
          <span>To‘langan</span>
        </div>
        <button className="panel stat" onClick={() => setDebtors(true)}>
          <strong>{rows.filter(r => r.debt > 0).length}</strong>
          <span>Qarzdorlar →</span>
        </button>
        <div className="panel stat">
          <strong>{money(totals.debt)}</strong>
          <span>Jami qarz</span>
        </div>
        <div className="panel stat">
          <strong>{money(totals.credit)}</strong>
          <span>Avvalgi ortiqcha to‘lov</span>
        </div>
      </div>
      <section className="panel detail-panel">
        <h2>To‘lov qo‘shish</h2>
        <PaymentForm />
      </section>
      <section className="panel detail-panel">
        <div className="row">
          <h2>{debtors ? "Barcha qarzdorlar" : "Talabalar balansi"}</h2>
          <button className="secondary" onClick={() => setDebtors(!debtors)}>
            {debtors ? "Barchasi" : "Faqat qarzdorlar"}
          </button>
        </div>
        <input aria-label="Qarzdorlarni qidirish" placeholder="Talabani qidiring" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Kurs qiymati</th>
                <th>To‘lov</th>
                <th>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => <tr key={r.u.id}>
                  <td>
                    <Link className="purple" to={"/admin/students/" + r.u.id}>
                      {r.u.name} →
                    </Link>
                  </td>
                  <td>{money(r.fee)}</td>
                  <td>{money(r.paid)}</td>
                  <td>{money(r.debt)}</td>
                </tr>)}
            </tbody>
          </table>
          {!filtered.length && <p>Natija yo‘q.</p>}
        </div>
      </section>
      <section className="panel detail-panel">
        <h2>Kurslar statistikasi</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs</th>
                <th>Sotilgan</th>
                <th>To‘lov</th>
                <th>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map(c => {
              const es = data.enrollments.filter(e => e.courseId === c.id),
                s = es.map(e => enrollmentSummary(data, e));
              return <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{es.length}</td>
                    <td>{money(s.reduce((n, x) => n + x.paid, 0))}</td>
                    <td>{money(s.reduce((n, x) => n + x.debt, 0))}</td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
      </section>
      <Statistics />
      <section className="panel detail-panel">
        <h2>To‘lov qilganlar ro‘yxati</h2>
        <div className="form-grid">
          <label>
            Dan
            <input type="date" max={to || localDate()} value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label>
            Gacha
            <input type="date" min={from} max={localDate()} value={to} onChange={e => setTo(e.target.value)} />
          </label>
        </div>
        <p>
          Tanlangan davr:{" "}
          <strong>{money(payments.reduce((n, p) => n + p.amount, 0))}</strong>
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Talaba / kurs</th>
                <th>Miqdor</th>
                <th>Usul</th>
              </tr>
            </thead>
            <tbody>
              {[...payments].sort((a, b) => b.date.localeCompare(a.date)).map(p => <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>
                      <Link to={"/admin/students/" + p.userId}>
                        {data.users.find(u => u.id === p.userId)?.name}
                      </Link>
                      <small>
                        {data.courses.find(c => c.id === p.courseId)?.title}
                      </small>
                    </td>
                    <td>{money(p.amount)}</td>
                    <td>{p.method}</td>
                  </tr>)}
            </tbody>
          </table>
          {!payments.length && <p>To‘lovlar yo‘q.</p>}
        </div>
      </section>
      <Expenses />
    </>;
}
