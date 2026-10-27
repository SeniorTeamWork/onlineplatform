import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid } from "../services/db";
import "./Support.css";
export default function Support() {
  const {
    data,
    user,
    update,
    notify
  } = useApp();
  const [tab, setTab] = useState("message");
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const ok = await update(d => d.tickets.unshift({
      id: uid(),
      userId: user.id,
      subject: f.get("subject"),
      message: f.get("message").trim(),
      reply: "",
      createdAt: new Date().toISOString()
    }));
    if (!ok) return;
    form.reset();
    notify("Xabaringiz yuborildi. Javob shu sahifada chiqadi.");
  }
  return <>
      <div className="page-heading">
        <div>
          {/* <div className="eyebrow">BIZ SIZ BILAN BIRGAMIZ</div> */}
          <h1>Qo‘llab-quvvatlash</h1>
          <p>Savollaringiz bo'lsa bizga murojaat qiling!</p>
        </div>
        <MessageCircle className="purple" size={29} />
      </div>
      <div className="support-content">
        <div className="tabs">
          <button className={tab === "message" ? "active" : ""} onClick={() => setTab("message")}>
            Xabar yuborish
          </button>
          <button className={tab === "faq" ? "active" : ""} onClick={() => setTab("faq")}>
            Tez-tez so‘raladigan savollar
          </button>
        </div>
        {tab === "message" ? <>
            <form className="panel support-form" onSubmit={submit}>
              <h3>Bizga xabar yuboring</h3>
              <label>
                Mavzu
                <select name="subject" required defaultValue="">
                  <option value="" disabled>
                    Mavzuni tanlang
                  </option>
                  <option>Darslar bo‘yicha savol</option>
                  <option>Texnik muammo</option>
                  <option>Sertifikat</option>
                  <option>Boshqa</option>
                </select>
              </label>
              <label>
                Xabaringiz
                <textarea name="message" required minLength={5} maxLength={5000} placeholder="Savolingizni shu yerga yozing…" />
              </label>
              <button className="primary">
                <Send size={15} /> Yuborish
              </button>
            </form>
            <h3 className="section-title">Mening murojaatlarim</h3>
            {data.tickets.filter(t => t.userId === user.id).map(t => <article className="panel ticket" key={t.id}>
                  <div className="row">
                    <strong>{t.subject}</strong>
                    <span className={"badge " + (t.reply ? "green" : "")}>
                      {t.reply ? "Javob berildi" : "Kutilmoqda"}
                    </span>
                  </div>
                  <p>{t.message}</p>
                  {t.reply && <div className="reply">
                      <strong>Admin javobi</strong>
                      <p>{t.reply}</p>
                    </div>}
                  <small>{new Date(t.createdAt).toLocaleString("uz-UZ")}</small>
                </article>)}
            {!data.tickets.some(t => t.userId === user.id) && <p className="muted small">Hozircha murojaatlar yo‘q.</p>}
          </> : <div className="panel faq">
            {[["Keyingi dars qanday ochiladi?", "Shu kursdagi oldingi faol darslar testidan 70% dan yuqori oling. Aynan 70% yetarli emas. Videoni ko‘rish va vazifani tasdiqlash sertifikat uchun talab qilinadi."], ["Sertifikatni qanday olaman?", "Barcha e’lon qilingan darslarni yakunlasangiz, Sertifikat sahifasida PDF saqlash tugmasi ochiladi."], ["Nega boshqa qurilmada ma’lumot yo‘q?", "Hozir demo rejimi ishlamoqda. Ma’lumotlar va videolar faqat ushbu brauzerda saqlanadi. Supabase keyingi bosqichda ulanadi."], ["Parolni qanday tiklayman?", "Demo rejimida administratorga murojaat qiling. U hisobingiz parolini yangilashi mumkin."]].map(([q, a]) => <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>)}
          </div>}
      </div>
    </>;
}
