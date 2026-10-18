import { useApp } from "../context/AppContext";
import "./Admin.css";
export default function AdminSupport() {
  const {
    data,
    update,
    notify
  } = useApp();
  async function reply(e, id) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("reply").trim();
    const ok = await update(d => {
      d.tickets.find(t => t.id === id).reply = value;
    });
    if (!ok) return;
    notify("Javob saqlandi. O‘quvchi yordam sahifasida ko‘radi.");
  }
  return <>
      <div className="page-heading">
        <div>
          <h1>Murojaatlar</h1>
          <p>O‘quvchilar savollariga shu yerdan javob bering.</p>
        </div>
      </div>
      {!data.tickets.length && <div className="panel empty">Hozircha murojaatlar yo‘q.</div>}
      {data.tickets.map(t => <article className="panel review" key={t.id}>
          <div className="row">
            <h3>{t.subject}</h3>
            <span className={"badge " + (t.reply ? "green" : "")}>
              {t.reply ? "Javob berildi" : "Yangi"}
            </span>
          </div>
          <p className="muted small">
            {data.users.find(u => u.id === t.userId)?.name} ·{" "}
            {new Date(t.createdAt).toLocaleString("uz-UZ")}
          </p>
          <div className="answer-text">{t.message}</div>
          <form onSubmit={e => reply(e, t.id)}>
            <textarea aria-label="Admin javobi" name="reply" required minLength={3} defaultValue={t.reply} placeholder="Javobingizni yozing…" />
            <button className="primary">Javobni saqlash</button>
          </form>
        </article>)}
    </>;
}
