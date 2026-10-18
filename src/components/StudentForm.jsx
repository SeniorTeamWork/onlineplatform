import { useState } from "react";
import { useApp } from "../context/AppContext";
import { uid, enrollmentsFor, saveStudentWithPayment, money } from "../services/db";
import Modal from "./Modal";
export default function StudentForm({
  student,
  onClose,
  onSaved
}) {
  const {
    data,
    user,
    update,
    cloud,
    command
  } = useApp();
  const [settings, setSettings] = useState({});
  const [draft, setDraft] = useState(() => student ? {
    ...student
  } : {
    id: uid(),
    name: "",
    email: "",
    password: "",
    phone: "",
    notes: "",
    role: "student",
    active: true,
    createdAt: new Date().toISOString()
  });
  const [selected, setSelected] = useState(() => student ? enrollmentsFor(data, student.id).map(e => e.courseId) : []);
  const [error, setError] = useState("");
  function field(k, v) {
    setDraft({
      ...draft,
      [k]: v
    });
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    if (cloud) {
      try {
        const result = await command('student', {
          draft,
          selected,
          settings
        });
        onSaved(result.studentId);
      } catch (e) {
        setError(e.message);
      }
      return;
    }
    const ok = await update(d => saveStudentWithPayment(d, draft, selected, settings, user.id));
    if (ok) onSaved(draft.id);else setError("Saqlanmadi. Ekrandagi xabarni tekshiring.");
  }
  return <Modal title={student ? "Talaba va kurslarni tahrirlash" : "Yangi talaba"} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label>
            To‘liq ism
            <input required minLength={3} value={draft.name} onChange={e => field("name", e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" disabled={cloud && !!student} required value={draft.email} onChange={e => field("email", e.target.value)} />
          </label>
          <label>
            {cloud ? student ? "Parol (Authda saqlanadi)" : "Boshlang‘ich parol" : "Demo parol"}
            <input type="password" disabled={cloud && !!student} required={!cloud || !student} minLength={8} value={draft.password || ""} onChange={e => field("password", e.target.value)} />
          </label>
          <label>
            Telefon
            <input type="tel" value={draft.phone || ""} onChange={e => field("phone", e.target.value)} />
          </label>
          <label>
            Holat
            <select aria-label="Talaba holati" value={!draft.active ? 'false' : draft.accessMode === 'deposit' ? 'deposit' : 'true'} onChange={e => setDraft({
            ...draft,
            active: e.target.value !== 'false',
            accessMode: e.target.value === 'deposit' ? 'deposit' : 'active'
          })}>
              <option value="true">Faol</option>
              <option value="false">Nofaol</option>
              <option value="deposit">Depozit</option>
            </select>
          </label>
          <label>
            Izoh
            <textarea value={draft.notes || ""} onChange={e => field("notes", e.target.value)} />
          </label>
        </div>
        {draft.active && draft.accessMode === 'deposit' && <p className="result">Depozit: to‘lov kiritilmaguncha faqat birinchi dars ochiq. Qisman to‘lov ham kursni davom ettirish uchun yetarli; qolgan qarz moliyada saqlanadi.</p>}
        <fieldset>
          <legend>Kurslarni tanlang — bir nechtasini belgilash mumkin</legend>
          {data.courses.map(c => <label key={c.id} className="check-card">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />
              <span>
                {c.title}
                <small>
                  {money(enrollmentsFor(data, draft.id).find(e => e.courseId === c.id)?.fee ?? c.price)}
                </small>
              </span>
            </label>)}
        </fieldset>
        {selected.filter(id => !enrollmentsFor(data, draft.id).some(e => e.courseId === id)).map(id => <fieldset key={id}><legend>{data.courses.find(c => c.id === id)?.title} — dastlabki to‘lov</legend><label>To‘lov holati<select value={settings[id]?.mode || 'trial'} onChange={e => setSettings({
            ...settings,
            [id]: {
              ...settings[id],
              mode: e.target.value
            }
          })}><option value="trial">Sinov — to‘lov olinmagan</option><option value="deposit">Depozit — qisman to‘lov</option><option value="active">To‘langan — to‘liq to‘lov</option></select></label>{settings[id]?.mode === 'deposit' && <label>Depozit miqdori (so‘m)<input type="number" min="1" step="1" required value={settings[id]?.amount || ''} onChange={e => setSettings({
            ...settings,
            [id]: {
              ...settings[id],
              amount: e.target.value
            }
          })} /></label>}{['active', 'deposit'].includes(settings[id]?.mode) && <label>To‘lov usuli<select value={settings[id]?.method || 'Naqd'} onChange={e => setSettings({
            ...settings,
            [id]: {
              ...settings[id],
              method: e.target.value
            }
          })}><option>Naqd</option><option>Karta</option><option>Bank o‘tkazmasi</option></select></label>}<p>To‘lovsiz faqat birinchi dars ochiladi. Shu kurs uchun istalgan musbat to‘lov kiritilgach, qolgan darslar video va test shartlariga ko‘ra ketma-ket ochiladi. Bepul kurslar uchun to‘lov talab qilinmaydi.</p></fieldset>)}
        <p>
          Tarixi yoki to‘lovi bor kursni olib tashlab bo‘lmaydi. Yangi kurs
          uchun amaldagi narx saqlanadi.
        </p>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={!selected.length}>
          Saqlash
        </button>
      </form>
    </Modal>;
}
