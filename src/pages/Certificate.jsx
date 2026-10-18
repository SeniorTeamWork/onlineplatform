import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { enrollmentsFor, courseResult, issueCertificate } from '../services/db';
import { downloadCertificate } from '../services/certificate';
import './Certificate.css';
export default function Certificate() {
  const {
    data,
    user,
    update,
    notify,
    cloud,
    command
  } = useApp();
  const [busy, setBusy] = useState('');
  async function download(courseId) {
    setBusy(courseId);
    try {
      let cert = data.certificates.find(c => c.userId === user.id && c.courseId === courseId);
      if (cloud) {
        const result = await command("certificate", {
          courseId
        });
        await downloadCertificate(result.certificate);
        return;
      }
      if (!cert && !(await update(d => {
        cert = issueCertificate(d, user.id, courseId);
      }))) return;
      await downloadCertificate(cert);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy('');
    }
  }
  return <><h1>Mening sertifikatlarim</h1><p>Barcha kurs sertifikatlari shu sahifada.</p><div className="certificate-grid">{enrollmentsFor(data, user.id).map(e => {
        const c = data.courses.find(c => c.id === e.courseId),
          r = courseResult(data, user.id, e.courseId),
          cert = data.certificates.find(c => c.userId === user.id && c.courseId === e.courseId);
        return <article className="panel cert-item" key={e.id}><div className="certificate"><div className="cert-brand">AI Academy</div><h2>SERTIFIKAT</h2><h3>{cert?.name || user.name}</h3><p>{cert?.title || c?.title}</p><strong>Yakuniy baho: {(cert?.score ?? r.average).toFixed(2)}%</strong><p>{cert ? 'Berilgan sana: ' + new Date(cert.createdAt).toLocaleDateString('uz-UZ') : r.ready ? 'Sertifikat tayyor' : 'Namuna — kurs hali yakunlanmagan'}</p></div><div className="cert-actions"><p>Test: {r.tests}/{r.lessons.length} · Video: {r.watched}/{r.lessons.length} · Amaliy: {r.practical}/{r.lessons.length}</p><button className="primary" disabled={!!busy || !cert && !r.ready} onClick={() => download(e.courseId)}>{busy === e.courseId ? 'Tayyorlanmoqda…' : 'Sertifikatni yuklab olish'}</button></div></article>;
      })}</div></>;
}
