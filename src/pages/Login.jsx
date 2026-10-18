import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck, BookOpen, Mail, LockKeyhole } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Brand } from "../components/Layout";
import "./Login.css";
export default function Login() {
  const {
    user,
    cloud,
    login
  } = useApp();
  const go = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
  async function submit(e) {
    e.preventDefault();
    try {
      const u = await login(email, password, remember);
      go(u.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(err.message);
    }
  }
  return <div className="login-page">
      <div className="login-brand">
        <Brand />
        <span>Yangi imkoniyatlar shu yerdan boshlanadi</span>
      </div>
      <div className="login-grid">
        <section className="login-story">
          <div className="eyebrow">
            <Sparkles size={14} /> KELAJAK KO‘NIKMALARINI O‘RGANING
          </div>
          <h1>
            AI bilan
            <br />
            <em>kelajagingizni</em>
            <br />
            yarating.
          </h1>
          <p>
            Amaliy bilimlar. Real loyihalar.
            <br />
            Sizning muvaffaqiyatingiz uchun.
          </p>
          <div className="ai-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="float-icon one">
              <Sparkles />
            </div>
            <div className="float-icon two">
              <BookOpen />
            </div>
            <div className="ai-cube">
              AI<span>your next chapter</span>
            </div>
            <div className="art-base" />
          </div>
          <div className="story-note">
            <span>✦</span> Birinchi qadamingiz — eng muhim qadam.
          </div>
        </section>
        <section className="login-form-wrap">
          <form className="login-form" onSubmit={submit}>
            <div className="small-icon">
              <LockKeyhole size={21} />
            </div>
            <h2>Tizimga kirish</h2>
            <p>Hisobingizga kiring, o‘rganishni davom ettiring.</p>
            <label>
              Email yoki login
              <div className="input-icon">
                <Mail size={17} />
                <input type="email" autoComplete="username" placeholder="siz@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </label>
            <label>
              Parol
              <div className="input-icon">
                <LockKeyhole size={17} />
                <input type={show ? "text" : "password"} autoComplete="current-password" placeholder="Parolingizni kiriting" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="eye" aria-label="Parolni ko‘rsatish" onClick={() => setShow(!show)}>
                  {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <div className="login-options">
              <label className="check">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />{" "}
                Meni eslab qolish
              </label>
              <button type="button" className="text-btn" onClick={() => setError("Demo parollar quyida. Yangi hisob yoki parol uchun administratorga murojaat qiling.")}>
                Parolni unutdingizmi?
              </button>
            </div>
            {error && <p className="error" role="alert">
                {error}
              </p>}
            <button className="primary login-submit">
              Kirish <ArrowRight size={17} />
            </button>
            <div className="demo-access" hidden={cloud}>
              <span>DEMO HISOBNI TANLANG</span>
              <div>
                <button type="button" onClick={() => {
                setEmail("student@academy.uz");
                setPassword("Student123!");
              }}>
                  <BookOpen size={15} /> O‘quvchi
                </button>
                <button type="button" onClick={() => {
                setEmail("admin@academy.uz");
                setPassword("Admin123!");
              }}>
                  <ShieldCheck size={15} /> Admin
                </button>
              </div>
              <small>Sinov rejimi • Ma’lumotlar shu brauzerda saqlanadi</small>
            </div>
          </form>
          <p className="form-bottom">
            <ShieldCheck size={14} /> Bilim sari ishonchli qadam
          </p>
        </section>
      </div>
      <div className="login-footer">
        © 2026 AI Academy <span>O‘zingizga sarmoya kiriting.</span>
      </div>
    </div>;
}
