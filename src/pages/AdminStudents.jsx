import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { enrollmentsFor, paymentSummary, money } from "../services/db";
import StudentForm from "../components/StudentForm";
import "./Admin.css";
export default function AdminStudents() {
  const {
    data
  } = useApp();
  const go = useNavigate();
  const [query, setQuery] = useState(""),
    [draft, setDraft] = useState(undefined);
  const list = data.users.filter(u => u.role === "student" && (u.name + " " + u.email).toLowerCase().includes(query.toLowerCase()));
  return <>
      <div className="page-heading">
        <div>
          <h1>Talabalar</h1>
          <p>
            {data.users.filter(u => u.role === "student").length} talaba · har
            biri uchun shaxsiy bo‘lim
          </p>
        </div>
        <button className="primary" onClick={() => setDraft(null)}>
          + Talaba qo‘shish
        </button>
      </div>
      <input className="search-box" aria-label="Qidirish" placeholder="Ism yoki email orqali qidiring" value={query} onChange={e => setQuery(e.target.value)} />
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Talaba</th>
              <th>Kurslar</th>
              <th>Qarz</th>
              <th>Holat</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {list.map(u => <tr key={u.id}>
                <td>
                  <Link className="purple" to={"/admin/students/" + u.id}>
                    {u.name} →
                  </Link>
                  <small>{u.email}</small>
                </td>
                <td>
                  {enrollmentsFor(data, u.id).map(e => data.courses.find(c => c.id === e.courseId)?.title).join(", ") || "—"}
                </td>
                <td>{money(paymentSummary(data, u).debt)}</td>
                <td>{!u.active ? "Nofaol" : u.accessMode === "deposit" ? "Depozit" : "Faol"}</td>
                <td>
                  <button className="secondary" onClick={() => setDraft(u)}>
                    Tahrirlash
                  </button>
                </td>
              </tr>)}
          </tbody>
        </table>
        {!list.length && <p className="empty">Talabalar topilmadi.</p>}
      </div>
      {draft !== undefined && <StudentForm student={draft} onClose={() => setDraft(undefined)} onSaved={id => {
      setDraft(undefined);
      go("/admin/students/" + id);
    }} />}
    </>;
}
