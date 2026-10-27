import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlayCircle, Lock, Check, Play } from "lucide-react";

import { useApp } from "../context/AppContext";
import { cloudEnabled, mediaUrl } from "../services/cloud";

import {
  getFile,
  putFile,
  uid,
  unlocked,
  recordAttempt,
  submitPractice,
  downloadMaterial,
  completed,
} from "../services/db";

import "./Lesson.css";

function Player({ lesson, onEnd, watermark }) {
  const fileId =
    typeof lesson.fileId === "string" ? lesson.fileId.trim() : "";

  const videoUrl =
    typeof lesson.video === "string" ? lesson.video.trim() : "";

  const sourceKey = JSON.stringify([lesson.id, fileId, videoUrl]);

  const [media, setMedia] = useState({
    key: "",
    src: "",
    error: "",
  });

  useEffect(() => {
    let active = true;
    let objectUrl;

    setMedia({
      key: sourceKey,
      src: "",
      error: "",
    });

    async function load() {
      try {
        if (!fileId && !videoUrl) return;

        let src = videoUrl;

        if (fileId) {
          const file = await (
            cloudEnabled ? mediaUrl(fileId) : getFile(fileId)
          );

          if (!active) return;
          if (!file) throw Error("Video fayli topilmadi.");

          if (cloudEnabled) {
            src = file;
          } else {
            objectUrl = URL.createObjectURL(file);
            src = objectUrl;
          }
        }

        if (active) {
          setMedia({
            key: sourceKey,
            src,
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setMedia({
            key: sourceKey,
            src: "",
            error: error.message || "Video ochilmadi.",
          });
        }
      }
    }

    load();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [sourceKey, fileId, videoUrl]);

  const current =
    media.key === sourceKey ? media : { src: "", error: "" };

  const hasVideo = Boolean(fileId || videoUrl);

  if (!hasVideo || !current.src || current.error) {
    return (
      <div className="video-empty">
        <PlayCircle size={52} />

        <h3>
          {!hasVideo
            ? "Video hali yuklanmagan"
            : current.error
              ? "Video ochilmadi"
              : "Video yuklanmoqda…"}
        </h3>

        <p>
          {!hasVideo
            ? "Ushbu darsga video joylashtirilgach, shu yerda ko‘rinadi."
            : current.error || "Iltimos, kuting."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="protected-video"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="video-watermark">{watermark}</div>

      <video
        key={sourceKey}
        className="video"
        src={current.src}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        onEnded={onEnd}
        onError={() =>
          setMedia({
            key: sourceKey,
            src: "",
            error: "Video ochilmadi. Manzil va formatni tekshiring.",
          })
        }
      />
    </div>
  );
}

export default function Lesson() {
  const { id } = useParams();

  return <LessonContent key={id} id={id} />;
}

function LessonContent({ id }) {
  const {
    data,
    user,
    update,
    notify,
    cloud,
    command,
  } = useApp();

  const [tab, setTab] = useState("test");
  const [answer, setAnswer] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testAnswers, setTestAnswers] = useState({});

  const submitting = useRef(false);
  const watching = useRef(false);

  const lesson = data.lessons.find((item) => item.id === id);

  if (!lesson || !unlocked(data, user.id, id)) {
    return (
      <div className="empty">
        Dars yopiq yoki mavjud emas.{" "}
        <Link to="/student/course">Kurslarim</Link>
      </div>
    );
  }

  const key = user.id + ":" + id;
  const session = data.testSessions[key];

  const attempts = data.attempts.filter(
    (attempt) =>
      attempt.userId === user.id &&
      attempt.lessonId === id
  );

  const latest = attempts[attempts.length - 1];

  const practices = data.submissions.filter(
    (submission) =>
      submission.userId === user.id &&
      submission.lessonId === id
  );

  const courseLessons = data.lessons.filter(
    (item) =>
      item.courseId === lesson.courseId &&
      item.published &&
      !item.archived
  );

  const currentIndex = courseLessons.findIndex(
    (item) => item.id === id
  );

  const nextLesson = courseLessons[currentIndex + 1];

  async function start() {
    if (busy) return;

    setTestAnswers({});
    setBusy(true);

    try {
      await update((draft) => {
        if (draft.testSessions[key]) return;

        if (!lesson.questions.length) {
          throw Error("Test mavjud emas.");
        }

        draft.testSessions[key] = {
          id: uid(),
          userId: user.id,
          lessonId: id,
          courseId: lesson.courseId,
          lessonTitle: lesson.title,
          startedAt: new Date().toISOString(),
          questions: structuredClone(lesson.questions),
          answers: {},
        };
      });
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish(event) {
    event.preventDefault();

    if (submitting.current || !session) return;

    submitting.current = true;
    setBusy(true);

    try {
      const answers = {
        ...session.answers,
        ...testAnswers,
      };

      if (cloud) {
        await command("submitTest", {
          lessonId: id,
          sessionId: session.id,
          answers,
        });
      } else {
        await update((draft) => {
          recordAttempt(draft, session, answers);
        });
      }
    } catch (error) {
      notify(error.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function watched() {
    if (
      watching.current ||
      data.progress[user.id]?.[id]?.watched
    ) {
      return;
    }

    watching.current = true;

    try {
      if (cloud) {
        await command("watchLesson", {
          lessonId: id,
        });
      } else {
        await update((draft) => {
          draft.progress[user.id] ??= {};

          draft.progress[user.id][id] = {
            watched: true,
            watchedAt: new Date().toISOString(),
          };
        });
      }
    } catch (error) {
      notify(error.message);
    } finally {
      watching.current = false;
    }
  }

  async function practice(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);

    try {
      let material;

      if (attachment) {
        if (
          !/\.(pdf|xlsx?|png|jpe?g)$/i.test(attachment.name) ||
          attachment.size > 20 * 1024 * 1024
        ) {
          throw Error(
            "PDF, Excel yoki rasm tanlang (20 MB gacha)."
          );
        }

        material = {
          fileId: await putFile(attachment),
          name: attachment.name,
        };
      }

      const saved = await update((draft) => {
        submitPractice(draft, {
          id: uid(),
          userId: user.id,
          courseId: lesson.courseId,
          lessonId: id,
          lessonTitle: lesson.title,
          answer,
          attachment: material,
        });
      });

      if (saved) {
        setAnswer("");
        setAttachment(null);
        notify("Amaliy ish tarixga saqlandi.");
      }
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function download(material) {
    try {
      await downloadMaterial(material);
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <>
      <Link
        className="back"
        to={"/student/course/" + lesson.courseId}
      >
        ← Kursga qaytish
      </Link>

      <h1>{lesson.title}</h1>
      <p>{lesson.description}</p>

      <div className="lesson-media-grid">
        <div className="lesson-main-video">
          <Player
            key={JSON.stringify([
              lesson.id,
              lesson.fileId,
              lesson.video,
            ])}
            lesson={lesson}
            watermark={
              user.name + " · " + (user.username || user.id)
            }
            onEnd={watched}
          />

          {(lesson.fileId || lesson.video) && (
            <p>
              {data.progress[user.id]?.[id]?.watched
                ? "✓ Video yakunlangan"
                : "Video oxirigacha ko‘rilgach holat saqlanadi."}
            </p>
          )}

          {/* {nextLesson &&
            unlocked(data, user.id, nextLesson.id) && (
              <Link
                className="primary"
                to={"/student/lesson/" + nextLesson.id}
              >
                Keyingi dars →
              </Link>
            )} */}
        </div>

        <aside className="panel lesson-playlist">
          <h2>Darslar ro‘yxati</h2>

          <nav aria-label="Kurs darslari">
            {courseLessons.map((item, index) => {
              const open = unlocked(data, user.id, item.id);
              const done = completed(data, user.id, item.id);

              const content = (
                <>
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="playlist-title">
                    {item.title}
                  </span>

                  {done ? (
                    <Check size={18} />
                  ) : open ? (
                    <Play size={18} />
                  ) : (
                    <Lock size={18} />
                  )}
                </>
              );

              return open ? (
                <Link
                  key={item.id}
                  className={
                    "playlist-item" +
                    (item.id === id ? " current" : "")
                  }
                  aria-current={
                    item.id === id ? "page" : undefined
                  }
                  to={"/student/lesson/" + item.id}
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={item.id}
                  className="playlist-item locked"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            })}
          </nav>

          <p className="muted">
            Test bali darslarni ochishga ta’sir qilmaydi.
            Natijalar sertifikat uchun hisoblanadi.
          </p>
        </aside>
      </div>

      <div
        className="tabs"
        role="tablist"
        aria-label="Dars bo‘limlari"
      >
        {[
          ["test", "1. Test"],
          ["practice", "2. Amaliy"],
          ["materials", "3. Qo‘shimcha materiallar"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            role="tab"
            aria-selected={tab === value}
            aria-controls={"panel-" + value}
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section
        className="panel task-panel"
        role="tabpanel"
        id={"panel-" + tab}
      >
        {tab === "test" ? (
          <>
            <h2>Bilimingizni tekshiring</h2>

           <br />

            {session ? (
              <form onSubmit={finish}>
                {session.questions.map((question, index) => (
                  <fieldset key={question.id}>
                    
                    <legend>
                      {index + 1}. {question.text}
                    </legend>

                    {question.options.map((option, optionIndex) => (
                      <label
                        className="test-option"
                        key={optionIndex}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          required
                          disabled={busy}
                          checked={
                            (
                              testAnswers[question.id] ??
                              session.answers[question.id]
                            ) === optionIndex
                          }
                          onChange={() => {
                            setTestAnswers((previous) => ({
                              ...previous,
                              [question.id]: optionIndex,
                            }));

                            update((draft) => {
                              if (
                                draft.testSessions[key]?.id ===
                                session.id
                              ) {
                                draft.testSessions[key].answers[
                                  question.id
                                ] = optionIndex;
                              }
                            });
                          }}
                        />

                        {option}
                      </label>
                    ))}
                  </fieldset>
                ))}

                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                >
                  {busy
                    ? "Saqlanmoqda…"
                    : "Testni topshirish"}
                </button>
              </form>
            ) : (
              <>
                {latest && (
                  <p className="result">
                    Oxirgi natija:{" "}
                    {Number(latest.score).toFixed(2)}%
                    {" · "}
                    Test yakunlandi
                  </p>
                )}

                <button
                  type="button"
                  className="primary"
                  disabled={busy || !lesson.questions.length}
                  onClick={start}
                >
                  {latest
                    ? "Testni boshidan boshlash"
                    : "Testni boshlash"}
                </button>
              </>
            )}

            <h3>Test tarixi</h3>

            {[...attempts].reverse().map((attempt) => (
              <details
                key={attempt.id}
                className="attempt-detail"
              >
                <summary>
                  {Number(attempt.score).toFixed(2)}%
                  {" · "}
                  {new Date(attempt.createdAt).toLocaleString(
                    "uz-UZ"
                  )}
                </summary>

                {attempt.questions?.map((question) => (
                  <p key={question.id}>
                    {question.text}
                    <br />
                    Javobingiz:{" "}
                    {question.options[
                      attempt.answers?.[question.id]
                    ] ?? "—"}
                  </p>
                ))}
              </details>
            ))}
          </>
        ) : tab === "practice" ? (
          <>
            <h2>Amaliy topshiriq</h2>
            <p>{lesson.task}</p>

            {practices.some(
              (submission) => submission.status === "pending"
            ) ? (
              <p className="badge">
                Yuborilgan ish tekshirilmoqda.
              </p>
            ) : (
              <form onSubmit={practice}>
                <label>
                  Javobingiz
                  <textarea
                    required
                    minLength={5}
                    maxLength={10000}
                    value={answer}
                    onChange={(event) =>
                      setAnswer(event.target.value)
                    }
                  />
                </label>

                <label>
                  Ilova (ixtiyoriy, 20 MB gacha)
                  <input
                    key={attachment?.name || "empty"}
                    type="file"
                    accept=".pdf,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={(event) =>
                      setAttachment(
                        event.target.files[0] || null
                      )
                    }
                  />
                </label>

                <button
                  type="submit"
                  className="primary"
                  disabled={busy}
                >
                  {busy
                    ? "Saqlanmoqda…"
                    : "Amaliy ishni topshirish"}
                </button>
              </form>
            )}

            <h3>Amaliy ishlar tarixi</h3>

            {[...practices].reverse().map((submission) => (
              <article
                className="submission"
                key={submission.id}
              >
                <p>{submission.answer}</p>

                {submission.attachment && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      download(submission.attachment)
                    }
                  >
                    {submission.attachment.name} ↓
                  </button>
                )}

                <p>
                  {new Date(
                    submission.createdAt
                  ).toLocaleString("uz-UZ")}
                </p>

                <strong>
                  {
                    {
                      pending: "Tekshirilmoqda",
                      approved: "Tasdiqlangan",
                      rejected: "Qaytarilgan",
                    }[submission.status]
                  }
                </strong>

                <p>Baho: {submission.grade ?? "—"} / 100</p>
                <p>{submission.feedback}</p>
              </article>
            ))}
          </>
        ) : (
          <>
            <h2>Qo‘shimcha materiallar</h2>
            <p>Dars uchun PDF va Excel fayllar.</p>

            {(lesson.materials || []).map((material) => (
              <div
                className="material-row"
                key={material.fileId}
              >
                <span>{material.name}</span>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => download(material)}
                >
                  Yuklab olish ↓
                </button>
              </div>
            ))}

            {!lesson.materials?.length && (
              <p>Hozircha material yuklanmagan.</p>
            )}
          </>
        )}
      </section>
    </>
  );
}