import CourseManager from "../components/CourseManager";
import { useState } from "react";
import { Pencil, Trash2, Plus, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, putFile } from "../services/db";
import "./Admin.css";
const blank = () => ({
  id: uid(),
  title: "",
  description: "",
  duration: 15,
  task: "",
  video: "",
  fileId: "",
  published: false,
  questions: [],
  materials: []
});
export default function AdminLessons() {
  const {
    data,
    update,
    notify
  } = useApp();
  const [draft, setDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState("");
  function edit(l) {
    setDraft(structuredClone(l));
    setFile(null);
    setMaterials([]);
    setError("");
  }
  function field(k, v) {
    setDraft({
      ...draft,
      [k]: v
    });
  }
  function question(id, k, v) {
    setDraft({
      ...draft,
      questions: draft.questions.map(q => q.id === id ? {
        ...q,
        [k]: v
      } : q)
    });
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    if (!data.courses.some(c => c.id === draft.courseId)) {
      setError("Kursni tanlang.");
      return;
    }
    if (draft.video && !/^https:\/\//i.test(draft.video)) {
      setError("Video manzili https:// bilan boshlanishi kerak.");
      return;
    }
    if (file && (!file.type.startsWith("video/") || file.size > 200 * 1024 * 1024)) {
      setError("200 MB gacha video fayl tanlang.");
      return;
    }
    if (draft.published && !draft.questions.length) {
      setError("Faol dars uchun kamida bitta test savoli kiriting.");
      return;
    }
    if (!draft.title.trim() || !draft.task.trim() || draft.questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) {
      setError("Bo‘sh matn yoki javoblarni to‘ldiring.");
      return;
    }
    if (materials.some(f => !/\.(pdf|xlsx?)$/i.test(f.name) || f.size > 20 * 1024 * 1024)) {
      setError("PDF yoki Excel fayl tanlang (har biri 20 MB gacha).");
      return;
    }
    setBusy(true);
    try {
      const next = {
        ...draft,
        title: draft.title.trim(),
        duration: Number(draft.duration)
      };
      if (file) {
        next.fileId = await putFile(file);
        next.video = "";
      }
      next.materials = [...(draft.materials || [])];
      for (const file of materials) next.materials.push({
        fileId: await putFile(file),
        name: file.name,
        size: file.size
      });
      const ok = await update(d => {
        const i = d.lessons.findIndex(l => l.id === next.id);
        if (i < 0) d.lessons.push(next);else d.lessons[i] = next;
      });
      if (ok) {
        setDraft(null);
        notify("Dars saqlandi.");
      }
    } catch {
      setError("Fayl saqlanmadi. Brauzer xotirasi yoki fayl hajmini tekshiring.");
    } finally {
      setBusy(false);
    }
  }
  function remove(l) {
    if (!confirm("“" + l.title + "” darsi arxivlansinmi? Barcha natijalar tarixi saqlanadi.")) return;
    update(d => {
      const item = d.lessons.find(x => x.id === l.id);
      item.published = false;
      item.archived = true;
      // Topshirilgan testlar tarixini saqlab qolamiz.
      Object.keys(d.testSessions).forEach(k => {
        if (d.testSessions[k].lessonId === l.id) delete d.testSessions[k];
      });
      // Video, test va amaliy ishlar tarixi saqlanadi.
    });
  }
  function move(i, by) {
    update(d => {
      const j = i + by;
      if (j < 0 || j >= d.lessons.length) return;
      [d.lessons[i], d.lessons[j]] = [d.lessons[j], d.lessons[i]];
    });
  }
  return <>
      <div className="page-heading">
        <div>
          <h1>Darslar va testlar</h1>
          <p>Video, amaliy vazifa va testlarni boshqaring.</p>
        </div>
        <div className="button-row">
          <CourseManager />
          <button className="primary" onClick={() => edit({
          ...blank(),
          courseId: data.courses[0]?.id || ""
        })}>
            <Plus size={16} /> Yangi dars
          </button>
        </div>
      </div>
      <div className="admin-lessons">
        {data.lessons.map((l, i) => <article className="panel admin-lesson" key={l.id}>
            <span className="lesson-number">{i + 1}</span>
            <div className="grow">
              <h3>{l.title}</h3>
              <small>
                {data.courses.find(c => c.id === l.courseId)?.title}
              </small>
              <p>
                {l.duration} daqiqa · {l.questions.length} ta savol ·{" "}
                {l.fileId || l.video ? "Video bor" : "Video yo‘q"}
              </p>
              <span className={"badge " + (l.published ? "green" : "")}>
                {l.archived ? "Arxivda" : l.published ? "Faol" : "Nofaol"}
              </span>
            </div>
            <div className="actions">
              <button type="button" onClick={() => {
            if (!l.published && !l.questions.length) {
              notify("Avval test kiriting.");
              return;
            }
            update(d => {
              const item = d.lessons.find(x => x.id === l.id);
              item.published = !item.published;
              if (item.published) item.archived = false;
            });
          }}>
                {l.published ? "Nofaollash" : "Faollash"}
              </button>
              <button aria-label="Yuqoriga" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={15} />
              </button>
              <button aria-label="Pastga" disabled={i === data.lessons.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown size={15} />
              </button>
              <button aria-label="Tahrirlash" onClick={() => edit(l)}>
                <Pencil size={15} />
              </button>
              <button aria-label="O‘chirish" className="danger" onClick={() => remove(l)}>
                <Trash2 size={15} />
              </button>
            </div>
          </article>)}
      </div>
      {draft && <div className="modal-backdrop">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-title" className="modal">
            <div className="row">
              <h2 id="edit-title">Darsni sozlash</h2>
              <button disabled={busy} className="ghost" onClick={() => setDraft(null)} aria-label="Yopish">
                ×
              </button>
            </div>
            <form onSubmit={save}>
              <label>
                Kurs
                <select required disabled={data.lessons.some(l => l.id === draft.id)} value={draft.courseId || ""} onChange={e => field("courseId", e.target.value)}>
                  <option value="">Kursni tanlang</option>
                  {data.courses.map(c => <option key={c.id} value={c.id}>
                      {c.title}
                    </option>)}
                </select>
              </label>
              <label>
                Dars nomi
                <input required maxLength={150} value={draft.title} onChange={e => field("title", e.target.value)} />
              </label>
              <label>
                Qisqa tavsif
                <input required value={draft.description} onChange={e => field("description", e.target.value)} />
              </label>
              <div className="form-grid">
                <label>
                  Davomiyligi (daqiqa)
                  <input type="number" min="1" max="600" required value={draft.duration} onChange={e => field("duration", e.target.value)} />
                </label>
                <label>
                  Holati
                  <select value={String(draft.published)} onChange={e => field("published", e.target.value === "true")}>
                    <option value="false">Nofaol</option>
                    <option value="true">Faol</option>
                  </select>
                </label>
              </div>
              <label>
                Video yuklash (maks. 200 MB)
                <input type="file" accept="video/*" onChange={e => setFile(e.target.files[0] || null)} />
              </label>
              {draft.fileId && <div className="row small">
                  <span>Saqlangan video mavjud</span>
                  <button type="button" className="text-btn" onClick={() => field("fileId", "")}>
                    Videoni olib tashlash
                  </button>
                </div>}
              <label>
                Yoki to‘g‘ridan-to‘g‘ri HTTPS video URL (MP4/WebM)
                <input type="url" placeholder="https://example.com/video.mp4" value={draft.video} onChange={e => setDraft({
              ...draft,
              video: e.target.value,
              fileId: ""
            })} />
              </label>
              <small className="muted">
                YouTube sahifa havolasi emas, video fayl manzilini kiriting.
              </small>
              <label>
                Amaliy vazifa
                <textarea required value={draft.task} onChange={e => field("task", e.target.value)} />
              </label>
              <label>
                Qo‘shimcha materiallar (PDF, Excel; har biri 20 MB gacha)
                <input type="file" multiple accept=".pdf,.xls,.xlsx" onChange={e => setMaterials(Array.from(e.target.files))} />
              </label>
              {(draft.materials || []).map(m => <div className="material-row" key={m.fileId}>
                  <span>{m.name}</span>
                  <button type="button" className="secondary" onClick={() => field("materials", draft.materials.filter(x => x.fileId !== m.fileId))}>
                    Olib tashlash
                  </button>
                </div>)}
              <div className="row">
                <h3>Test savollari</h3>
                <button type="button" className="secondary" onClick={() => field("questions", [...draft.questions, {
              id: uid(),
              text: "",
              options: ["", "", "", ""],
              correct: 0
            }])}>
                  + Savol
                </button>
              </div>
              {draft.questions.map((q, i) => <div className="question-editor" key={q.id}>
                  <div className="row">
                    <strong>{i + 1}-savol</strong>
                    <button type="button" className="text-btn" onClick={() => field("questions", draft.questions.filter(x => x.id !== q.id))}>
                      O‘chirish
                    </button>
                  </div>
                  <label>
                    Savol matni
                    <input required value={q.text} onChange={e => question(q.id, "text", e.target.value)} />
                  </label>
                  {q.options.map((o, j) => <label className="option-editor" key={j}>
                      <input aria-label={j + 1 + "-variant to‘g‘ri"} type="radio" name={"correct-" + q.id} checked={q.correct === j} onChange={() => question(q.id, "correct", j)} />
                      <input aria-label={j + 1 + "-javob"} required placeholder={j + 1 + "-variant"} value={o} onChange={e => question(q.id, "options", q.options.map((v, k) => k === j ? e.target.value : v))} />
                    </label>)}
                  <small>To‘g‘ri javob yonidagi doirani belgilang.</small>
                </div>)}
              {error && <p className="error" role="alert">
                  {error}
                </p>}
              <button className="primary" disabled={busy}>
                <Upload size={16} />
                {busy ? "Saqlanmoqda…" : "Darsni saqlash"}
              </button>
            </form>
          </section>
        </div>}
    </>;
}
