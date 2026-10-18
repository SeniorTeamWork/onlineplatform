import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Lock, Play, Clock, Sparkles, BookOpen, Award } from "lucide-react";
import { useApp } from "../context/AppContext";
import { studentLessons, hasCourse, enrollmentsFor, courseResult, accessState, completed, unlocked } from "../services/db";
import "./Course.css";
export default function Course() {
  const {
    data,
    user
  } = useApp();
  const {
    courseId
  } = useParams();
  const enrollments = enrollmentsFor(data, user.id);
  if (!courseId && enrollments.length === 1) return <Navigate replace to={'/student/course/' + enrollments[0].courseId} />;
  if (!courseId) return <><div className="page-heading"><div><h1>Mening kurslarim</h1><p>Davom etish uchun kursni tanlang.</p></div></div><div className="course-grid">{enrollments.map(e => {
        const c = data.courses.find(c => c.id === e.courseId),
          r = courseResult(data, user.id, e.courseId);
        return <Link className="panel course-card" key={e.id} to={'/student/course/' + e.courseId}><span className="badge">{accessState(data, e) === 'active' ? 'To‘langan' : accessState(data, e) === 'deposit' ? 'Depozit' : 'Sinov'}</span><h2>{c?.title}</h2><p>{c?.description}</p><div className="progress"><i style={{
              width: (r.lessons.length ? r.tests / r.lessons.length * 100 : 0) + '%'
            }} /></div><p>{r.tests}/{r.lessons.length} dars</p><strong>Kursni ochish →</strong></Link>;
      })}</div>{!enrollments.length && <p>Kurs biriktirilmagan.</p>}</>;
  if (!hasCourse(data, user.id, courseId)) return <p>Kursga kirish yopiq.</p>;
  const course = data.courses.find(c => c.id === courseId),
    enrollment = enrollments.find(e => e.courseId === courseId);
  const list = studentLessons(data, user.id, courseId).filter(l => l.published);
  const count = list.filter(l => completed(data, user.id, l.id)).length;
  const percent = list.length ? Math.round(count / list.length * 100) : 0;
  return <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SIZNING BILIM SARI YO‘LINGIZ</div>
          <h1>
            {course?.title || "Mening kursim"}
          </h1>
          <p>
            Yangi bilimlar, yangi imkoniyatlar. Bugun ham bir qadam oldinga.
          </p>
        </div>
        <span className="pill">
          <Sparkles size={14} />{" "}
          {course?.title}
        </span>
      </div>
      <section className="course-hero">
        <div>
          <span className="hero-tag">AMALIY ONLAYN KURS</span>
          <h2>
            {course?.title}
          </h2>
          <p>{course?.description}</p>
          <div className="hero-details">
            <span>
              <BookOpen size={14} /> {list.length} ta dars
            </span>
            <span>
              <Clock size={14} />{" "}
              {list.reduce((s, l) => s + Number(l.duration), 0)} daqiqa
            </span>
            <span>
              <Award size={14} /> Sertifikat
            </span>
          </div>
        </div>
        <div className="hero-ai">
          AI<small>THE FUTURE IS YOURS</small>
        </div>
      </section>
      {accessState(data, enrollment) !== 'active' && <div className="panel detail-panel"><strong>{accessState(data, enrollment) === 'deposit' ? 'Depozit rejimi' : 'Sinov rejimi'}</strong><p>{accessState(data, enrollment) === 'deposit' ? 'Qisman to‘lov qabul qilingan. Qolgan darslar oldingi video yakunlanib, testdan 70% dan yuqori natija olingach ochiladi. Qolgan qarz moliyada saqlanadi.' : 'Faqat birinchi dars ochiq. Shu kurs uchun istalgan musbat to‘lov kiritilgach, qolgan darslar video va test shartlariga ko‘ra ketma-ket ochiladi.'}</p></div>}
      <div className="course-columns">
        <div>
          <section className="panel progress-card">
            <div className="row">
              <strong>Umumiy progress</strong>
              <span className="purple">{percent}%</span>
            </div>
            <div className="progress">
              <i style={{
              width: percent + "%"
            }} />
            </div>
            <div className="row muted small">
              <span>
                {count}/{list.length} dars yakunlandi
              </span>
              <span>
                {percent === 100 ? "Ajoyib natija!" : "Davom eting, siz uddalaysiz!"}
              </span>
            </div>
          </section>
          <div className="section-heading">
            <h3>Kurs dasturi</h3>
            <span>{list.length} ta dars</span>
          </div>
          <div className="lesson-list">
            {list.map((l, i) => {
            const done = completed(data, user.id, l.id);
            const open = unlocked(data, user.id, l.id);
            return <article className={"lesson-row " + (open && !done ? "current" : "") + (open ? "" : " locked")} key={l.id}>
                  <span className={"lesson-number " + (done ? "done" : "")}>
                    {done ? <Check size={16} /> : String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="lesson-text">
                    <h3>{l.title}</h3>
                    <p>
                      <Play size={11} /> Video dars <b>·</b> {l.duration} daqiqa{" "}
                      <b>·</b> Vazifa va test
                    </p>
                  </div>
                  {open ? <Link className={done ? "done-link" : "primary compact"} to={"/student/lesson/" + l.id}>
                      {done ? "Qayta ko‘rish" : "Darsni boshlash"}
                      <ArrowRight size={14} />
                    </Link> : <Lock size={17} />}
                </article>;
          })}
            {!list.length && <div className="empty">Hozircha darslar e’lon qilinmagan.</div>}
          </div>
        </div>
        <aside>
          <div className="panel next-card">
            <span className="small-icon">
              <Sparkles size={20} />
            </span>
            <h3>O‘zingizga ishoning.</h3>
            <p>
              Har bir yangi ko‘nikma sizga yangi eshiklarni ochadi. Bugungi
              kichik qadam — ertangi katta natija.
            </p>
            <div className="quote-line" />
            <small>O‘RGANISHNI TO‘XTATMANG</small>
          </div>
          <div className="certificate-teaser">
            <Award size={29} />
            <h3>Mehnatingiz e’tirofi</h3>
            <p>
              Barcha dars va vazifalarni yakunlang, shaxsiy sertifikatingizni
              oling.
            </p>
            <Link to="/student/certificate">
              Sertifikat haqida <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
      </div>
    </>;
}
