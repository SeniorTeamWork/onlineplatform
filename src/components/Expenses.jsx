import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { uid, integer, money, localDate } from '../services/db';
import Modal from './Modal';
export default function Expenses() {
  const {
    data,
    user,
    update
  } = useApp();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const ok = await update(d => {
      d.expenses ??= [];
      d.expenses.push({
        id: uid(),
        title: f.get('title').trim(),
        amount: integer(f.get('amount'), 1),
        date: f.get('date'),
        note: f.get('note').trim(),
        createdBy: user.id,
        createdAt: new Date().toISOString()
      });
    });
    setBusy(false);
    if (ok) setOpen(false);
  }
  const rows = data.expenses || [];
  const income = data.payments.filter(p => !p.voidedAt).reduce((n, p) => n + p.amount, 0),
    out = rows.reduce((n, p) => n + p.amount, 0);
  return <section className="panel detail-panel"><div className="row"><h2>Kirim va chiqim</h2><button className="primary" onClick={() => setOpen(true)}>+ Chiqim qo‘shish</button></div><div className="stats"><div className="stat"><strong>{money(income)}</strong><span>Kirim</span></div><div className="stat"><strong>{money(out)}</strong><span>Chiqim</span></div><div className="stat"><strong>{money(income - out)}</strong><span>Qoldiq</span></div></div><div className="table-scroll"><table><thead><tr><th>Sana</th><th>Xarajat</th><th>Summa</th><th>Izoh</th></tr></thead><tbody>{[...rows].reverse().map(r => <tr key={r.id}><td>{r.date}</td><td>{r.title}</td><td>{money(r.amount)}</td><td>{r.note}</td></tr>)}</tbody></table></div>{!rows.length && <p>Chiqimlar kiritilmagan.</p>}{open && <Modal title="Chiqim qo‘shish" onClose={() => setOpen(false)}><form onSubmit={save}><label>Xarajat nomi<input name="title" required minLength={2} /></label><label>Summa (so‘m)<input type="number" name="amount" min="1" step="1" required /></label><label>Sana<input type="date" name="date" required defaultValue={localDate()} max={localDate()} /></label><label>Izoh<textarea name="note" /></label><button className="primary" disabled={busy}>Saqlash</button></form></Modal>}</section>;
}
