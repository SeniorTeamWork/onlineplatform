import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { periodStatistics, money } from '../services/db';
export default function Statistics() {
  const {
    data
  } = useApp();
  const [days, setDays] = useState(7);
  const s = periodStatistics(data, days),
    max = Math.max(1, ...s.buckets.map(b => b.amount));
  return <section className="panel detail-panel"><div className="row"><h2>To‘lovlar statistikasi</h2><label>Davr<select value={days} onChange={e => setDays(Number(e.target.value))}><option value="7">1 haftalik</option><option value="30">1 oylik</option></select></label></div><p>{s.from} — {s.to}</p><div className="stats"><div className="stat"><strong>{money(s.total)}</strong><span>Qabul qilingan to‘lovlar</span></div><div className="stat"><strong>{s.count}</strong><span>To‘lovlar soni</span></div></div><div className="chart-bars" aria-label="Kunlar bo‘yicha to‘lovlar">{s.buckets.map(b => <div className="chart-column" key={b.date} title={b.date + ': ' + money(b.amount)}><div className="chart-space"><div className="chart-fill" style={{
            height: b.amount / max * 100 + '%'
          }} /></div><span>{b.date.slice(8)}</span></div>)}</div><details><summary>Kunlik summalarni ko‘rish</summary><div className="table-scroll"><table><thead><tr><th>Sana</th><th>To‘lovlar</th><th>Summa</th></tr></thead><tbody>{s.buckets.map(b => <tr key={b.date}><td>{b.date}</td><td>{b.count}</td><td>{money(b.amount)}</td></tr>)}</tbody></table></div></details></section>;
}
