import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import {
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  BookOpen,
  UserRound,
  LockKeyhole,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { Brand } from "../components/Layout";

import logo from '../assets/tat.png'
import "./Login.css";

export default function Login() {
  const { user, cloud, login } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/student"}
        replace
      />
    );
  }

  async function submit(event) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const account = await login(
        username,
        password,
        remember
      );

      navigate(
        account.role === "admin" ? "/admin" : "/student"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      {/* <div className="login-brand">
        <Brand />
        <span>Yangi imkoniyatlar shu yerdan boshlanadi</span>
      </div> */}

      <div className="login-grid">
        <section className="login-story">
          {/* <div className="eyebrow">
            <Sparkles size={18} />
            KELAJAK KO‘NIKMALARINI O‘RGANING
          </div> */}

          <h1>
            <em>
              IT TAT
            </em>
            <br />

            bilan
            kelajagingizni

            yarating.
          </h1>

          {/* <p>
            Amaliy bilimlar. Real loyihalar.
            <br />
            Sizning muvaffaqiyatingiz uchun.
          </p> */}

          {/* <div className="ai-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            <div className="float-icon one">
              <Sparkles />
            </div>

            <div className="float-icon two">
              <BookOpen />
            </div>

            <div className="ai-cube">
              AI
              <span>yangi bosqichingiz</span>
            </div>

            <div className="art-base" />
          </div> */}

<img src={logo} alt="logo" style={{width: '350px'}} />


          {/* <div className="story-note">
            <span>✦</span>
            Birinchi qadamingiz — eng muhim qadam.
          </div> */}
        </section>

        <section className="login-form-wrap">
          <form className="login-form" onSubmit={submit}>
            <div className="small-icon">
              <LockKeyhole size={21} />
            </div>

            <h2 style={{textAlign: 'center'}}>Tizimga kirish</h2>

            {/* <p>
              Hisobingizga kiring, o‘rganishni davom ettiring.
            </p> */}

            <label>
              Login

              <div className="input-icon">
                <UserRound size={18} />

                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Masalan: sayyorbek"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  required
                />
              </div>
            </label>

            <label>
              Parol

              <div className="input-icon">
                <LockKeyhole size={18} />

                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Parolingizni kiriting"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="eye"
                  aria-label={
                    show
                      ? "Parolni yashirish"
                      : "Parolni ko‘rsatish"
                  }
                  onClick={() => setShow(!show)}
                >
                  {show ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) =>
                    setRemember(event.target.checked)
                  }
                />
                Meni eslab qolish
              </label>

              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  setError(
                    "Parolni tiklash uchun administratorga murojaat qiling."
                  )
                }
              >
                Parolni unutdingizmi?
              </button>
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="primary login-submit"
              disabled={busy}
            >
              {busy ? "Kirilmoqda…" : "Kirish"}
              <ArrowRight size={18} />
            </button>

            <div className="demo-access" hidden={cloud}>
              <span>DEMO HISOBNI TANLANG</span>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setUsername("student@academy.uz");
                    setPassword("Student123!");
                  }}
                >
                  <BookOpen size={18} />
                  O‘quvchi
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsername("admin@academy.uz");
                    setPassword("Admin123!");
                  }}
                >
                  <ShieldCheck size={18} />
                  Admins
                </button>
              </div>

              <small>
                Sinov rejimi • Ma’lumotlar shu brauzerda saqlanadi
              </small>
            </div>
          </form>

          {/* <p className="form-bottom">
            <ShieldCheck size={18} />
            Bilim sari ishonchli qadam
          </p> */}
        </section>
      </div>

      {/* <div className="login-footer">
        © {new Date().getFullYear()} AI Academy
        <span>O‘zingizga sarmoya kiriting.</span>
      </div> */}
    </div>
  );
}