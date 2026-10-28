import { useRef, useState } from "react";

import { Pencil, Trash2, Plus, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { useApp } from "../context/AppContext";
import { cloudEnabled, uploadCloudFile } from "../services/cloud";
import { uid, putFile } from "../services/db";
import CourseManager from "../components/CourseManager";
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
  materials: [],
});
export default function AdminLessons() {
  const { data, update, command, notify, saving } = useApp();
  const [draft, setDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [materials, setMaterials] = useState([null, null, null]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileOwner = useRef(null);
  const deleting = useRef(false);
  const [deletingId, setDeletingId] = useState(null);
  function edit(lesson) {
    if (busy || saving || deleting.current) return;
    setDraft({
      ...structuredClone(lesson),
      fileId: lesson.fileId || "",
      video: lesson.video || "",
    });
    fileOwner.current = null;
    setFileInputKey((value) => value + 1);
    setFile(null);
    setMaterials([null, null, null]);
    setError("");
    setProgress(0);
  }
  function field(key, value) {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }
  function question(id, key, value) {
    setDraft((previous) => ({
      ...previous,
      questions: previous.questions.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    }));
  }
  function addQuestion() {
    const newQuestion = {
      id: uid(),
      text: "",
      options: ["", "", "", ""],
      correct: 0,
    };
    setDraft((previous) => ({
      ...previous,
      questions: [...previous.questions, newQuestion],
    }));
  }
  function clearVideo() {
    setFile(null);
    fileOwner.current = null;
    setFileInputKey((value) => value + 1);
    setDraft((previous) => ({
      ...previous,
      fileId: "",
      video: "",
    }));
  }
  async function save(event) {
    event.preventDefault();
    if (busy || saving || deleting.current) return;
    setError("");
    if (file && fileOwner.current !== draft.id) {
      setError("Ushbu dars uchun videoni qayta tanlang.");
      return;
    }
    if (!data.courses.some((course) => course.id === draft.courseId)) {
      setError("Kursni tanlang.");
      return;
    }
    if (draft.video && !/^https:\/\//i.test(draft.video)) {
      setError("Video manzili https:// bilan boshlanishi kerak.");
      return;
    }
    if (file && (!/\.(mp4|webm)$/i.test(file.name) || file.size <= 0)) {
      setError("Bo‘sh bo‘lmagan MP4 yoki WebM video tanlang.");
      return;
    }
    if (draft.published && !draft.questions.length) {
      setError("Faol dars uchun kamida bitta test savoli kiriting.");
      return;
    }
    if (
      !draft.title.trim() ||
      !draft.task.trim() ||
      draft.questions.some(
        (item) =>
          !item.text.trim() || item.options.some((option) => !option.trim()),
      )
    ) {
      setError("Bo‘sh matn yoki javoblarni to‘ldiring.");
      return;
    }
    const selectedMaterials = materials.filter(Boolean);
    if (
      selectedMaterials.some(
        (material) =>
          !/\.(pdf|xlsx?)$/i.test(material.name) ||
          material.size <= 0 ||
          material.size > 20 * 1024 * 1024,
      )
    ) {
      setError(
        "PDF yoki Excel fayl tanlang. Har biri 20 MB gacha bo‘lishi kerak.",
      );
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const next = {
        ...draft,
        title: draft.title.trim(),
        duration: Number(draft.duration),
        fileId: String(draft.fileId || "").trim(),
        video: String(draft.video || "").trim(),
      };
      if (file) {
        next.fileId = cloudEnabled
          ? await uploadCloudFile(file, setProgress)
          : await putFile(file);
        next.video = "";
      }
      next.materials = [...(draft.materials || [])];
      for (const material of selectedMaterials) {
        next.materials.push({
          fileId: await putFile(material),
          name: material.name,
          size: material.size,
        });
      }
      const saved = await update((state) => {
        const duplicate = state.lessons.find(
          (lesson) =>
            lesson.id !== next.id &&
            ((next.fileId && lesson.fileId === next.fileId) ||
              (!next.fileId && next.video && lesson.video === next.video)),
        );
        if (duplicate) {
          throw Error(
            "Bu video “" +
              duplicate.title +
              "” darsiga biriktirilgan. " +
              "Ushbu dars uchun boshqa video tanlang " +
              "yoki videoni olib tashlang.",
          );
        }
        const index = state.lessons.findIndex(
          (lesson) => lesson.id === next.id,
        );
        if (index < 0) {
          state.lessons.push(next);
        } else {
          state.lessons[index] = next;
        }
      });
      if (saved) {
        setDraft(null);
        notify("Dars saqlandi.");
      }
    } catch (saveError) {
      setError(saveError.message || "Fayl saqlanmadi.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(lesson) {
    if (busy || saving || deleting.current) return;
    const confirmed = window.confirm(
      `“${lesson.title}” darsi va unga tegishli test natijalari, amaliy ishlar, ` +
        `test sessiyalari va progress o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.`,
    );
    if (!confirmed) return;
    deleting.current = true;
    setDeletingId(lesson.id);
    try {
      if (cloudEnabled) {
        await command("deleteLesson", { lessonId: lesson.id });
      } else {
        const saved = await update((state) => {
          state.lessons = state.lessons.filter((item) => item.id !== lesson.id);
          state.attempts = (state.attempts || []).filter(
            (item) => item.lessonId !== lesson.id,
          );
          state.submissions = (state.submissions || []).filter(
            (item) => item.lessonId !== lesson.id,
          );
          for (const [key, session] of Object.entries(
            state.testSessions || {},
          )) {
            if (session?.lessonId === lesson.id) delete state.testSessions[key];
          }
          for (const progress of Object.values(state.progress || {})) {
            if (progress && typeof progress === "object")
              delete progress[lesson.id];
          }
        });
        if (!saved) return;
      }
      setDraft((previous) => (previous?.id === lesson.id ? null : previous));
      notify("Dars muvaffaqiyatli o‘chirildi.");
    } catch (error) {
      notify(error.message || "Darsni o‘chirishda xatolik yuz berdi.");
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  }
  function move(index, direction) {
    if (busy || saving || deleting.current) return;
    update((state) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= state.lessons.length) {
        return;
      }
      [state.lessons[index], state.lessons[nextIndex]] = [
        state.lessons[nextIndex],
        state.lessons[index],
      ];
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Darslar va testlar</h1>
          <p>Video, amaliy vazifa va testlarni boshqaring.</p>
        </div>
        <div className="button-row">
          <CourseManager />
          <button
            type="button"
            className="primary"
            onClick={() =>
              edit({
                ...blank(),
                courseId: data.courses[0]?.id || "",
              })
            }
          >
            <Plus size={16} />
            Yangi dars
          </button>
        </div>
      </div>
      <div className="admin-lessons">
        {data.lessons.map((lesson, index) => (
          <article className="panel admin-lesson" key={lesson.id}>
            <span className="lesson-number">{index + 1}</span>
            <div className="grow">
              <h3>{lesson.title}</h3>
              <small>
                {
                  data.courses.find((course) => course.id === lesson.courseId)
                    ?.title
                }
              </small>
              <p>
                {lesson.duration} daqiqa
                {" · "}
                {lesson.questions.length} ta savol
                {" · "}
                {lesson.fileId || lesson.video ? "Video bor" : "Video yo‘q"}
              </p>
              {/* <span className={"badge " + (lesson.published ? "green" : "")}>
                {lesson.archived
                  ? "Arxivda"
                  : lesson.published
                    ? "Faol"
                    : "Nofaol"}
              </span> */}
            </div>
            <div className="actions">
              {/* <button
                type="button"
                disabled={busy || saving || deletingId !== null}
                onClick={() => {
                  if (!lesson.published && !lesson.questions.length) {
                    notify("Avval test kiriting.");
                    return;
                  }
                  update((state) => {
                    const item = state.lessons.find(
                      (entry) => entry.id === lesson.id,
                    );
                    item.published = !item.published;
                    if (item.published) {
                      item.archived = false;
                    }
                  });
                }}
              >
                {lesson.published ? "Nofaollash" : "Faollash"}
              </button> */}
              <button
                type="button"
                aria-label="Yuqoriga"
                disabled={busy || saving || deletingId !== null || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                aria-label="Pastga"
                disabled={
                  busy ||
                  saving ||
                  deletingId !== null ||
                  index === data.lessons.length - 1
                }
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                aria-label="Tahrirlash"
                disabled={busy || saving || deletingId !== null}
                onClick={() => edit(lesson)}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                aria-label="O‘chirish"
                disabled={busy || saving || deletingId !== null}
                className="danger"
                onClick={() => remove(lesson)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {draft && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            className="modal lesson-editor-modal"
          >
            <button
              type="button"
              disabled={busy}
              className="ghost lesson-close-fixed"
              onClick={() => setDraft(null)}
              aria-label="Yopish"
            >
              ×
            </button>
            <div className="lesson-editor-scroll">
              <h2 id="edit-title">Darsni sozlash</h2>
              <form onSubmit={save}>
                <label>
                  Kurs
                  <select
                    required
                    disabled={data.lessons.some(
                      (lesson) => lesson.id === draft.id,
                    )}
                    value={draft.courseId || ""}
                    onChange={(event) => field("courseId", event.target.value)}
                  >
                    <option value="">Kursni tanlang</option>
                    {data.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Dars nomi
                  <input
                    required
                    maxLength={150}
                    value={draft.title}
                    onChange={(event) => field("title", event.target.value)}
                  />
                </label>
                <label>
                  Qisqa tavsif
                  <input
                    required
                    value={draft.description}
                    onChange={(event) =>
                      field("description", event.target.value)
                    }
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Davomiyligi (daqiqa)
                    <input
                      type="number"
                      min="1"
                      max="600"
                      required
                      value={draft.duration}
                      onChange={(event) =>
                        field("duration", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Holati
                    <select
                      value={String(draft.published)}
                      onChange={(event) =>
                        field("published", event.target.value === "true")
                      }
                    >
                      <option value="false">Nofaol</option>
                      <option value="true">Faol</option>
                    </select>
                  </label>
                </div>
                <label>
                  Video yuklash (MP4 yoki WebM)
                  <input
                    key={draft.id + ":" + fileInputKey}
                    disabled={busy}
                    type="file"
                    accept=".mp4,.webm,video/mp4,video/webm"
                    onChange={(event) => {
                      fileOwner.current = draft.id;
                      setFile(event.target.files[0] || null);
                    }}
                  />
                </label>
                {(draft.fileId || draft.video || file) && (
                  <div className="row small">
                    <span>{file ? file.name : "Saqlangan video mavjud"}</span>
                    <button
                      type="button"
                      className="text-btn"
                      disabled={busy}
                      onClick={clearVideo}
                    >
                      Videoni olib tashlash
                    </button>
                  </div>
                )}
                <label>
                  Yoki to‘g‘ridan-to‘g‘ri HTTPS video URL (MP4/WebM)
                  <input
                    type="url"
                    placeholder="https://example.com/video.mp4"
                    disabled={busy}
                    value={draft.video}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFile(null);
                      fileOwner.current = null;
                      setFileInputKey((previous) => previous + 1);
                      setDraft((previous) => ({
                        ...previous,
                        video: value,
                        fileId: "",
                      }));
                    }}
                  />
                </label>
                <small className="muted">
                  YouTube sahifa havolasi emas, video fayl manzilini kiriting.
                </small>
                <label>
                  Amaliy vazifa
                  <textarea
                    required
                    value={draft.task}
                    onChange={(event) => field("task", event.target.value)}
                  />
                </label>
                <div className="form-group">
                  <label>
                    Qo‘shimcha materiallar (PDF, Excel; har biri 20 MB gacha)
                  </label>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="material-upload">
                      <label htmlFor={`lesson-material-${index}`}>
                        {index + 1}-material
                      </label>
                      <input
                        id={`lesson-material-${index}`}
                        type="file"
                        accept=".pdf,.xls,.xlsx"
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] || null;
                          setMaterials((previous) =>
                            previous.map((item, itemIndex) =>
                              itemIndex === index ? selectedFile : item,
                            ),
                          );
                          event.target.value = "";
                        }}
                      />
                      {materials[index] && (
                        <p>
                          {materials[index].name}
                          {" — "}
                          {(materials[index].size / (1024 * 1024)).toFixed(
                            2,
                          )}{" "}
                          MB
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              setMaterials((previous) =>
                                previous.map((item, itemIndex) =>
                                  itemIndex === index ? null : item,
                                ),
                              )
                            }
                          >
                            Olib tashlash
                          </button>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {(draft.materials || []).map((material) => (
                  <div className="material-row" key={material.fileId}>
                    <span>{material.name}</span>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        field(
                          "materials",
                          draft.materials.filter(
                            (item) => item.fileId !== material.fileId,
                          ),
                        )
                      }
                    >
                      Olib tashlash
                    </button>
                  </div>
                ))}
                <h3>Test savollari</h3>
                <button
                  type="button"
                  className="secondary lesson-question-fixed"
                  onClick={addQuestion}
                >
                  + Savol
                </button>
                {draft.questions.map((item, index) => (
                  <div className="question-editor" key={item.id}>
                    <div className="row">
                      <strong>{index + 1}-savol</strong>
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() =>
                          field(
                            "questions",
                            draft.questions.filter(
                              (entry) => entry.id !== item.id,
                            ),
                          )
                        }
                      >
                        O‘chirish
                      </button>
                    </div>
                    <label>
                      Savol matni
                      <input
                        required
                        value={item.text}
                        onChange={(event) =>
                          question(item.id, "text", event.target.value)
                        }
                      />
                    </label>
                    {item.options.map((option, optionIndex) => (
                      <label className="option-editor" key={optionIndex}>
                        <input
                          aria-label={optionIndex + 1 + "-variant to‘g‘ri"}
                          type="radio"
                          name={"correct-" + item.id}
                          checked={item.correct === optionIndex}
                          onChange={() =>
                            question(item.id, "correct", optionIndex)
                          }
                        />
                        <input
                          aria-label={optionIndex + 1 + "-javob"}
                          required
                          placeholder={optionIndex + 1 + "-variant"}
                          value={option}
                          onChange={(event) =>
                            question(
                              item.id,
                              "options",
                              item.options.map((value, index) =>
                                index === optionIndex
                                  ? event.target.value
                                  : value,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <small>To‘g‘ri javob yonidagi doirani belgilang.</small>
                  </div>
                ))}
                {busy && file && (
                  <p role="status">Video yuklanmoqda: {progress}%</p>
                )}
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="primary" disabled={busy}>
                  <Upload size={16} />
                  {busy ? "Saqlanmoqda…" : "Darsni saqlash"}
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
