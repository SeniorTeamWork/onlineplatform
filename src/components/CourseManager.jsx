import { useState } from "react";
import { BookOpen, Plus, Search, Users, Pencil, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, money, integer } from "../services/db";
import Modal from "./Modal";
import "./CourseManager.css";
export default function CourseManager({
  open,
  onOpenChange
}) {
  const {
    data,
    update,
    notify
  } = useApp();
  const [localOpen, setLocalOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const visible = open ?? localOpen;
  function show(value) {
    (onOpenChange || setLocalOpen)(value);
    if (!value) {
      setDraft(null);
      setQuery("");
    }
  }
  function create() {
    setDraft({
      id: uid(),
      title: "",
      price: "",
      description: ""
    });
    show(true);
  }
  async function save(e) {
    e.preventDefault();
    const title = draft.title.trim();
    if (title.length < 2) return notify("Kurs nomi kamida 2 belgidan iborat bo‘lsin.");
    const ok = await update(d => {
      const price = integer(draft.price);
      if (d.courses.some(c => c.id !== draft.id && c.title.toLowerCase() === title.toLowerCase())) throw Error("Bu nomdagi kurs mavjud.");
      const course = {
        ...draft,
        title,
        price,
        description: draft.description.trim()
      };
      const index = d.courses.findIndex(c => c.id === draft.id);
      if (index < 0) d.courses.push(course);else d.courses[index] = course;
    });
    if (ok) {
      setDraft(null);
      setQuery("");
      notify("Kurs saqlandi.");
    }
  }
  const courses = data.courses.filter(c => (c.title + " " + c.description).toLowerCase().includes(query.trim().toLowerCase()));
  return <>
      <button type="button" className="secondary" onClick={() => {
      setDraft(null);
      show(true);
    }}>
        <BookOpen size={22} /> Kurslar ({data.courses.length})
      </button>
      <button type="button" className="secondary" onClick={create}>
        <Plus size={22} /> Yangi kurs
      </button>
      {visible && <Modal title={draft ? "Kurs ma’lumotlari" : "Kurslarni boshqarish"} onClose={() => show(false)}>
          {draft ? <>
              <button className="text-btn course-back" type="button" onClick={() => setDraft(null)}>
                <ArrowLeft size={20} /> Kurslar ro‘yxatiga
              </button>
              <form onSubmit={save}>
                <label>
                  Kurs nomi
                  <input autoFocus required minLength={2} maxLength={150} value={draft.title} onChange={e => setDraft({
              ...draft,
              title: e.target.value
            })} />
                </label>
                <label>
                  Narxi (so‘m)
                  <input required type="number" min="0" max="1000000000000" step="1" value={draft.price} onChange={e => setDraft({
              ...draft,
              price: e.target.value
            })} />
                </label>
                <label>
                  Tavsif
                  <textarea maxLength={3000} value={draft.description} onChange={e => setDraft({
              ...draft,
              description: e.target.value
            })} />
                </label>
                <p className="muted">
                  Yangi narx avvalgi talabalar bilan kelishilgan narxni
                  o‘zgartirmaydi.
                </p>
                <div className="button-row">
                  <button className="primary">Saqlash</button>
                  <button type="button" className="secondary" onClick={() => setDraft(null)}>
                    Bekor qilish
                  </button>
                </div>
              </form>
            </> : <>
              <div className="course-modal-toolbar">
                <div className="course-search">
                  <Search size={22} />
                  <input aria-label="Kurslarni qidirish" placeholder="Kurs nomi bo‘yicha qidiring…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <button className="primary" onClick={create}>
                  <Plus size={22} /> Yangi kurs
                </button>
              </div>
              <p className="muted">
                {courses.length} ta kurs · narxlar va o‘quvchilar
              </p>
              <div className="course-modal-list">
                {courses.map(c => <article className="course-manage-card" key={c.id}>
                    <div className="course-manage-icon">
                      <BookOpen size={26} />
                    </div>
                    <div className="course-manage-body">
                      <h3>{c.title}</h3>
                      <p>{c.description || "Tavsif kiritilmagan"}</p>
                      <div className="course-card-meta">
                        <strong>{money(c.price)}</strong>
                        <span>
                          <Users size={20} />{" "}
                          {data.enrollments.filter(e => e.courseId === c.id).length}{" "}
                          talaba
                        </span>
                        <span>
                          {data.lessons.filter(l => l.courseId === c.id && !l.archived).length}{" "}
                          dars
                        </span>
                      </div>
                    </div>
                    <button className="secondary" onClick={() => setDraft({
              ...c
            })}>
                      <Pencil size={20} /> Tahrirlash
                    </button>
                  </article>)}
              </div>
              {!courses.length && <div className="empty">
                  {query ? "Qidiruvga mos kurs topilmadi." : "Hali kurs yo‘q. Yangi kurs yarating."}
                </div>}
            </>}
        </Modal>}
    </>;
}
