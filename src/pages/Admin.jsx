import Statistics from "../components/Statistics";
import { useState } from "react";
import { Wallet } from "lucide-react";
import Modal from "../components/Modal";
import PaymentForm from "../components/PaymentForm";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { paymentSummary, money, accessState } from "../services/db";
import CourseManager from "../components/CourseManager";
import "./Admin.css";
export default function Admin() {
  const {
    data,
    notify
  } = useApp();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const students = data.users.filter(u => u.role === "student");
  const totals = students.reduce((a, u) => {
    const v = paymentSummary(data, u);
    a.fee += v.fee;
    a.paid += v.paid;
    a.debt += v.debt;
    return a;
  }, {
    fee: 0,
    paid: 0,
    debt: 0
  });
  const trials = data.enrollments.filter(e => accessState(data, e) !== 'active');
  return <>
      <div className="page-heading">
        <div>
          <h1>Umumiy ko‘rinish</h1>
          <p>Ta’lim jarayoni va o‘quvchilar natijalari bir joyda.</p>
        </div>
        <div className="button-row">
          <button className="primary" onClick={() => setPaymentOpen(true)}>
            <Wallet size={22} /> To‘lov qo‘shish
          </button>
          <CourseManager open={coursesOpen} onOpenChange={setCoursesOpen} />
          <Link className="primary" to="/admin/lessons">
            + Yangi dars
          </Link>
        </div>
      </div>
      <div className="stats">
        {[[money(totals.fee), "To‘lanishi kerak", "/admin/finance"], [money(totals.paid), "To‘lov qilindi", "/admin/finance"], [money(totals.debt), "Qolgan qarz", "/admin/finance"], [new Set(trials.map(e => e.userId)).size, "Sinovdagi talabalar", "#trials"]].map(([n, t, to]) => t === "Kurslar" ? <button className="panel stat" key={t} onClick={() => setCoursesOpen(true)}>
              <strong>{n}</strong>
              <span>{t} →</span>
            </button> : <Link className="panel stat" key={t} to={to}>
              <strong>{n}</strong>
              <span>{t} →</span>
            </Link>)}
      </div>
      <Statistics />
      <section id="trials" className="panel detail-panel"><h2>Sinov va depozitdagi talabalar</h2><div className="table-scroll"><table><thead><tr><th>Talaba</th><th>Kurs</th><th>Holat</th><th>Qolgan qarz</th></tr></thead><tbody>{trials.map(e => {
              const u = data.users.find(u => u.id === e.userId);
              return <tr key={e.id}><td><Link className="purple" to={'/admin/students/' + e.userId}>{u?.name}</Link></td><td>{data.courses.find(c => c.id === e.courseId)?.title}</td><td>{accessState(data, e) === 'deposit' ? 'Depozit' : 'Sinov'}</td><td>{money(Math.max(0, e.fee - data.payments.filter(p => p.userId === e.userId && p.courseId === e.courseId && !p.voidedAt).reduce((n, p) => n + p.amount, 0)))}</td></tr>;
            })}</tbody></table>{!trials.length && <p>Sinovdagi talabalar yo‘q.</p>}</div></section>
      <section className="panel detail-panel">
        <h2>Talabalar</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ism</th>
                <th>Kurslar</th>
                <th>To‘lov</th>
                <th>Qarz</th>
              </tr>
            </thead>
            <tbody>
              {students.map(u => {
              const s = paymentSummary(data, u);
              return <tr key={u.id}>
                    <td>
                      <Link className="purple" to={"/admin/students/" + u.id}>
                        {u.name} →
                      </Link>
                    </td>
                    <td>
                      {data.enrollments.filter(e => e.userId === u.id).length}
                    </td>
                    <td>{money(s.paid)}</td>
                    <td>{money(s.debt)}</td>
                  </tr>;
            })}
            </tbody>
          </table>
        </div>
      </section>
      {paymentOpen && <Modal title="To‘lov qo‘shish" onClose={() => setPaymentOpen(false)}>
          <PaymentForm onSaved={() => {
        setPaymentOpen(false);
        notify("To‘lov saqlandi. Dashboard va moliya yangilandi.");
      }} />
        </Modal>}
    </>;
}
