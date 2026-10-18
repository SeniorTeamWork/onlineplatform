import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { reviewPractice, downloadMaterial } from "../services/db";
import "./Admin.css";
export default function AdminReviews() {
  const {
    data,
    user,
    update,
    notify
  } = useApp();
  const [filter, setFilter] = useState("pending");
  const list = data.submissions.filter(s => filter === "all" || s.status === filter);
  function review(e, s) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    update(d => reviewPractice(d, s.id, f.get("status"), f.get("grade"), f.get("feedback").trim(), user.id));
  }
  return <>
      <h1>Amaliy ishlarni tekshirish</h1>
      <div className="tabs">
        {[["pending", "Kutilayotgan"], ["approved", "Tasdiqlangan"], ["rejected", "Qaytarilgan"], ["all", "Barchasi"]].map(([k, v]) => <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
            {v}
          </button>)}
      </div>
      {!list.length && <div className="panel empty">Amaliy ishlar yo‘q.</div>}
      {[...list].reverse().map(s => <article className="panel detail-panel" key={s.id}>
          <Link className="purple" to={"/admin/students/" + s.userId}>
            {data.users.find(u => u.id === s.userId)?.name} →
          </Link>
          <h2>{s.lessonTitle}</h2>
          <p className="answer-text">{s.answer}</p>
          {s.attachment && <button className="secondary" onClick={() => downloadMaterial(s.attachment).catch(e => notify(e.message))}>
              {s.attachment.name} ↓
            </button>}
          <p>{new Date(s.createdAt).toLocaleString("uz-UZ")}</p>
          {s.status === "pending" ? <form onSubmit={e => review(e, s)}>
              <div className="form-grid">
                <label>
                  Baho (0–100)
                  <input name="grade" type="number" required min="0" max="100" step="1" />
                </label>
                <label>
                  Natija
                  <select name="status">
                    <option value="approved">Tasdiqlash</option>
                    <option value="rejected">Qayta ishlashga yuborish</option>
                  </select>
                </label>
              </div>
              <label>
                Izoh
                <textarea name="feedback" required minLength={3} />
              </label>
              <button className="primary">Natijani saqlash</button>
            </form> : <>
              <p>
                Baho: {s.grade ?? "—"} / 100 ·{" "}
                {s.status === "approved" ? "Tasdiqlangan" : "Qaytarilgan"}
              </p>
              <p>{s.feedback}</p>
              <p>Bu natija tarixga saqlangan va qayta tahrirlanmaydi.</p>
            </>}
        </article>)}
    </>;
}
