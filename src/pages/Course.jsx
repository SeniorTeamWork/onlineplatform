import {
  Link,
  Navigate,
  useParams,
} from "react-router-dom";

import {
  ArrowRight,
  Check,
  Lock,
  Play,
  Clock,
  Sparkles,
  BookOpen,
  Award,
} from "lucide-react";

import { useApp } from "../context/AppContext";

import {
  studentLessons,
  hasCourse,
  enrollmentsFor,
  courseResult,
  accessState,
  completed,
  unlocked,
} from "../services/db";

import "./Course.css";

export default function Course() {
  const { data, user } = useApp();
  const { courseId } = useParams();

  const enrollments = enrollmentsFor(data, user.id);

  if (!courseId && enrollments.length === 1) {
    return (
      <Navigate
        replace
        to={"/student/course/" + enrollments[0].courseId}
      />
    );
  }

  if (!courseId) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Mening kurslarim</h1>
            <p>Davom etish uchun kursni tanlang.</p>
          </div>
        </div>

        <div className="course-grid">
          {enrollments.map((enrollment) => {
            const course = data.courses.find(
              (item) => item.id === enrollment.courseId
            );

            const result = courseResult(
              data,
              user.id,
              enrollment.courseId
            );

            const state = accessState(data, enrollment);

            const progress = result.lessons.length
              ? (result.tests / result.lessons.length) * 100
              : 0;

            return (
              <Link
                className="panel course-card"
                key={enrollment.id}
                to={
                  "/student/course/" + enrollment.courseId
                }
              >
                <span className="badge">
                  {state === "active"
                    ? "To‘langan"
                    : state === "deposit"
                      ? "Depozit"
                      : "Sinov"}
                </span>

                <h2>{course?.title}</h2>
                <p>{course?.description}</p>

                <div className="progress">
                  <i
                    style={{
                      width: progress + "%",
                    }}
                  />
                </div>

                <p>
                  {result.tests}/{result.lessons.length} dars
                </p>

                <strong>Kursni ochish →</strong>
              </Link>
            );
          })}
        </div>

        {!enrollments.length && (
          <p>Kurs biriktirilmagan.</p>
        )}
      </>
    );
  }

  if (!hasCourse(data, user.id, courseId)) {
    return <p>Kursga kirish yopiq.</p>;
  }

  const course = data.courses.find(
    (item) => item.id === courseId
  );

  const enrollment = enrollments.find(
    (item) => item.courseId === courseId
  );
  

  const list = studentLessons(
    data,
    user.id,
    courseId
  ).filter((lesson) => lesson.published);

  const count = list.filter((lesson) =>
    completed(data, user.id, lesson.id)
  ).length;

  const percent = list.length
    ? Math.round((count / list.length) * 100)
    : 0;

  const state = accessState(data, enrollment);

  return (
    <>
      <div className="page-heading">
        <div>
          {/* <div className="eyebrow">
            SIZNING BILIM SARI YO‘LINGIZ
          </div> */}

          <h1>{course?.title || "Mening kursim"}</h1>

          {/* <p>
            Yangi bilimlar, yangi imkoniyatlar.
            Bugun ham bir qadam oldinga.
          </p> */}
        </div>

        {/* <span className="pill">
          <Sparkles size={18} />
          {course?.title}
        </span> */}
      </div>

      <section className="course-hero">
        <div>
          <span className="hero-tag">
            AMALIY ONLAYN KURS
          </span>

          <h2>{course?.title}</h2>

          <p>{course?.description}</p>

          <div className="hero-details">
            <span>
              <BookOpen size={18} />
              {list.length} ta dars
            </span>

            <span>
              <Clock size={18} />

              {list.reduce(
                (sum, lesson) =>
                  sum + Number(lesson.duration),
                0
              )}{" "}
              daqiqa
            </span>

            <span>
              <Award size={18} />
              Sertifikat
            </span>
          </div>
        </div>

        <div className="hero-ai">
          <strong>
            {course?.title || "Onlayn kurs"}
          </strong>

          <small>kursi .</small>
        </div>
      </section>

      {state === "deposit" && (
        <div className="panel depozit red-design detail-panel">
          <strong>Depozit!</strong>
        </div>
      )}

      <div className="course-columns">
        <div>
          <section className="panel progress-card">
            <div className="row">
              <strong>Umumiy progress</strong>

              <span className="purple">
                {percent}%
              </span>
            </div>

            <div className="progress">
              <i
                style={{
                  width: percent + "%",
                }}
              />
            </div>

            <div className="row muted small">
              <span>
                {count}/{list.length} dars yakunlandi
              </span>

              <span>
                {percent === 100
                  ? "Ajoyib natija!"
                  : "Davom eting, siz uddalaysiz!"}
              </span>
            </div>
          </section>

          <div className="section-heading">
            <h3>Kurs dasturi</h3>
            <span>{list.length} ta dars</span>
          </div>

          <div className="lesson-list">
            {list.map((lesson, index) => {
              const done = completed(
                data,
                user.id,
                lesson.id
              );

              const open = unlocked(
                data,
                user.id,
                lesson.id
              );

              return (
                <article
                  className={
                    "lesson-row " +
                    (open && !done ? "current" : "") +
                    (open ? "" : " locked")
                  }
                  key={lesson.id}
                >
                  <span
                    className={
                      "lesson-number " +
                      (done ? "done" : "")
                    }
                  >
                    {done ? (
                      <Check size={18} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>

                  <div className="lesson-text">
                    <h3>{lesson.title}</h3>

                    <p>
                      <Play size={18} />
                      Video dars
                      <b>·</b>
                      {lesson.duration} daqiqa
                      <b>·</b>
                      Vazifa va test
                    </p>
                  </div>

                  {open ? (
                    <Link
                      className={
                        done
                          ? "done-link"
                          : "primary compact"
                      }
                      to={"/student/lesson/" + lesson.id}
                    >
                      {done
                        ? "Qayta ko‘rish"
                        : "Darsni boshlash"}

                      <ArrowRight size={18} />
                    </Link>
                  ) : (
                    <Lock size={18} />
                  )}
                </article>
              );
            })}

            {!list.length && (
              <div className="empty">
                Hozircha darslar e’lon qilinmagan.
              </div>
            )}
          </div>
        </div>

        <aside>
          <div className="panel next-card">
            <span className="small-icon">
              <Sparkles size={20} />
            </span>

            <h3>O‘zingizga ishoning.</h3>

            <p>
              Har bir yangi ko‘nikma sizga yangi eshiklarni
              ochadi. Bugungi kichik qadam — ertangi katta
              natija.
            </p>

            <div className="quote-line" />

            {/* <small>
              O‘RGANISHNI TO‘XTATMANG
            </small> */}
          </div>

          <div className="certificate-teaser">
            <Award size={29} />

            <h3>Mehnatingiz e’tirofi</h3>

            <p>
              Barcha dars va vazifalarni yakunlang,
              shaxsiy sertifikatingizni oling.
            </p>

            <Link to="/student/certificate">
              Sertifikat haqida
              <ArrowRight size={18} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}