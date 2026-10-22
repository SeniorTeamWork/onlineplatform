import { cloudEnabled, mediaUrl } from '../services/cloud';
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getFile, putFile, uid, unlocked, attemptPassed, recordAttempt, submitPractice, downloadMaterial } from "../services/db";
import "./Lesson.css";
function Player({
  lesson,
  onEnd,
  watermark
}) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      objectUrl;
    setSrc("");
    setError("");
    if (lesson.fileId) {
      (cloudEnabled ? mediaUrl(lesson.fileId) : getFile(lesson.fileId)).then(file => {
        if (!active) return;
        if (!file) {
          setError("Video bu brauzerda topilmadi. Admin videoni qayta yuklashi kerak.");
          return;
        }
        if (cloudEnabled) {
          setSrc(file);
          return;
        }
        objectUrl = URL.createObjectURL(file);
        setSrc(objectUrl);
      }).catch(() => active && setError("Video faylini ochib bo‘lmadi."));
    } else setSrc(lesson.video);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lesson.fileId, lesson.video]);
  return src && !error ? <div className="protected-video" onContextMenu={e => e.preventDefault()}>
      <div className="video-watermark">{watermark}</div>
      <video className="video" controls controlsList="nodownload noremoteplayback" disablePictureInPicture disableRemotePlayback playsInline onEnded={onEnd} onError={() => setError("Video ochilmadi. Manzil va formatni tekshiring.")} src={src} />
    </div> : <div className="video-empty">
      <PlayCircle size={52} />
      <h3>Bilim sari birinchi qadam</h3>
      <p>{error || "Admin ushbu dars videosini hali yuklamagan."}</p>
      <small>Video yuklangach, shu yerda tomosha qilasiz.</small>
    </div>;
}
export default function Lesson() {
  const {
    id
  } = useParams();
  return <LessonContent key={id} id={id} />;
}
function LessonContent({
  id
}) {
  const {
    data,
    user,
    update,
    notify
  } = useApp();
  const [tab, setTab] = useState("test"),
    [answer, setAnswer] = useState(""),
    [attachment, setAttachment] = useState(null),
    [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const lesson = data.lessons.find(l => l.id === id);
  if (!lesson || !unlocked(data, user.id, id)) return <div className="empty">
        Dars yopiq yoki mavjud emas. <Link to="/student">Kurslarim</Link>
      </div>; 
  const key = user.id + ":" + id,
    session = data.testSessions[key];
  const attempts = data.attempts.filter(a => a.userId === user.id && a.lessonId === id),
    latest = attempts[attempts.length - 1],
    practices = data.submissions.filter(s => s.userId === user.id && s.lessonId === id);
  function start() {
    update(d => {
      if (d.testSessions[key]) return;
      if (!lesson.questions.length) throw Error("Test mavjud emas.");
      d.testSessions[key] = {
        id: uid(),
        userId: user.id,
        lessonId: id,
        courseId: lesson.courseId,
        lessonTitle: lesson.title,
        startedAt: new Date().toISOString(),
        questions: structuredClone(lesson.questions),
        answers: {}
      };
    });
  }
  async function finish(e) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    await update(d => recordAttempt(d, session, d.testSessions[key]?.answers || {}));
    submitting.current = false;
  }
  async function practice(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      let material;
      if (attachment) {
        if (!/\.(pdf|xlsx?|png|jpe?g)$/i.test(attachment.name) || attachment.size > 20 * 1024 * 1024) throw Error("PDF, Excel yoki rasm tanlang (20 MB gacha).");
        material = {
          fileId: await putFile(attachment),
          name: attachment.name
        };
      }
      if (await update(d => submitPractice(d, {
        id: uid(),
        userId: user.id,
        courseId: lesson.courseId,
        lessonId: id,
        lessonTitle: lesson.title,
        answer,
        attachment: material
      }))) {
        setAnswer("");
        setAttachment(null);
        notify("Amaliy ish tarixga saqlandi.");
      }
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function download(m) {
    try {
      await downloadMaterial(m);
    } catch (e) {
      notify(e.message);
    }
  }
  return <>
      <Link className="back" to={"/student/course/" + lesson.courseId}>
        ← Kursga qaytish
      </Link>
      <h1>{lesson.title}</h1>
      {/* <p>{lesson.description}</p> */} <br />
      <Player lesson={lesson} watermark={user.name + " · " + user.email} onEnd={() => update(d => {
      d.progress[user.id] ??= {};
      d.progress[user.id][id] = {
        watched: true,
        watchedAt: new Date().toISOString()
      };
    })} />
      <p>
        {data.progress[user.id]?.[id]?.watched ? "✓ Video yakunlangan" : " "}
      </p>
      <div className="tabs" role="tablist" aria-label="Dars bo‘limlari">
        {[["test", "1. Test"], ["practice", "2. Amaliy"], ["materials", "3. Qo‘shimcha materiallar"]].map(([k, v]) => <button key={k} role="tab" aria-selected={tab === k} aria-controls={"panel-" + k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {v}
          </button>)}
      </div>
      <section className="panel task-panel" role="tabpanel" id={"panel-" + tab}>
        {tab === "test" ? <>
            <h2>Bilimingizni tekshiring</h2>
            {/* <p>
              O‘tish sharti: 70% dan yuqori. Natijalar tahrirlanmaydi; qayta
              urinish boshidan boshlanadi.
            </p> */}
            {session ? <form onSubmit={finish}>
                {session.questions.map((q, i) => <fieldset key={q.id}>
                    <legend>
                      {i + 1}. {q.text}
                    </legend>
                    {q.options.map((o, j) => <label className="test-option" key={j}>
                        <input type="radio" name={q.id} required checked={session.answers[q.id] === j} onChange={() => update(d => {
                if (d.testSessions[key]?.id === session.id) d.testSessions[key].answers[q.id] = j;
              })} />
                        {o}
                      </label>)}
                  </fieldset>)}
                <button className="primary">Testni topshirish</button>
              </form> : <>
                {latest && <p className="result">
                    Oxirgi natija: {latest.score.toFixed(2)}% ·{" "}
                    {attemptPassed(latest) ? "O‘tdingiz" : "O‘tmadingiz"}
                  </p>}
                <button className="primary" disabled={!lesson.questions.length} onClick={start}>
                  {latest ? "Testni boshidan boshlash" : "Testni boshlash"}
                </button>
              </>}
            <h3>Test tarixi</h3>
            {[...attempts].reverse().map(a => <details key={a.id} className="attempt-detail">
                <summary>
                  {a.score.toFixed(2)}% ·{" "}
                  {new Date(a.createdAt).toLocaleString("uz-UZ")}
                </summary>
                {a.questions?.map(q => <p key={q.id}>
                    {q.text}
                    <br />
                    Javobingiz: {q.options[a.answers?.[q.id]] ?? "—"}
                  </p>)}
              </details>)}
          </> : tab === "practice" ? <>
            <h2>Amaliy topshiriq</h2>
            <p>{lesson.task}</p>
            {practices.some(s => s.status === "pending") ? <p className="badge">Yuborilgan ish tekshirilmoqda.</p> : <form onSubmit={practice}>
                <label>
                  Javobingiz
                  <textarea required minLength={5} maxLength={10000} value={answer} onChange={e => setAnswer(e.target.value)} />
                </label>
                <label>
                  Ilova (ixtiyoriy, 20 MB gacha)
                  <input key={attachment?.name || "empty"} type="file" accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg" onChange={e => setAttachment(e.target.files[0] || null)} />
                </label>
                <button className="primary" disabled={busy}>
                  {busy ? "Saqlanmoqda…" : "Amaliy ishni topshirish"}
                </button>
              </form>}
            <h3>Amaliy ishlar tarixi</h3>
            {[...practices].reverse().map(s => <article className="submission" key={s.id}>
                <p>{s.answer}</p>
                {s.attachment && <button className="secondary" onClick={() => download(s.attachment)}>
                    {s.attachment.name} ↓
                  </button>}
                <p>{new Date(s.createdAt).toLocaleString("uz-UZ")}</p>
                <strong>
                  {{
              pending: "Tekshirilmoqda",
              approved: "Tasdiqlangan",
              rejected: "Qaytarilgan"
            }[s.status]}
                </strong>
                <p>Baho: {s.grade ?? "—"} / 100</p>
                <p>{s.feedback}</p>
              </article>)}
          </> : <>
            <h2>Qo‘shimcha materiallar</h2>
            <p>Dars uchun PDF va Excel fayllar.</p>
            {(lesson.materials || []).map(m => <div className="material-row" key={m.fileId}>
                <span>{m.name}</span>
                <button className="secondary" onClick={() => download(m)}>
                  Yuklab olish ↓
                </button>
              </div>)}
            {!lesson.materials?.length && <p>Hozircha material yuklanmagan.</p>}
          </>}
      </section>
    </>;
}
