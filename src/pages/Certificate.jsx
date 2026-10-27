import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Check,
  Download,
  LoaderCircle,
  Sparkles,
} from "lucide-react";

import { useApp } from "../context/AppContext";

import {
  enrollmentsFor,
  courseResult,
  issueCertificate,
} from "../services/db";

import { createCertificatePdf } from "../services/certificate";

import "./Certificate.css";

const PREPARATION_TIME = 23000;

const STEPS = [
  "Testlar yakunlanganini tekshirish",
  "O‘rtacha natijani hisoblash",
  "Sertifikat darajasini aniqlash",
  "Sertifikatni tayyorlash",
];

function Confetti() {
  return (
    <div className="ac-confetti" aria-hidden="true">
      {Array.from({ length: 48 }, (_, index) => (
        <i
          key={index}
          style={{
            "--piece-left": `${(index * 37) % 100}%`,
            "--piece-delay": `${(index % 8) * 0.08}s`,
            "--piece-duration": `${1.6 + (index % 5) * 0.14}s`,
            "--piece-drift": `${((index % 9) - 4) * 24}px`,
            "--piece-turn": `${180 + index * 31}deg`,
            "--piece-color": `var(--ac-confetti-${index % 4})`,
          }}
        />
      ))}
    </div>
  );
}

function Preparation({ elapsed, documentReady }) {
  const percent = Math.min(
    99,
    Math.floor((elapsed / PREPARATION_TIME) * 100)
  );

  // Belgilar muvaffaqiyatli tayyorlangan PDF bo‘lgandagina qo‘yiladi.
  const completedSteps = documentReady
    ? Math.min(4, Math.floor(elapsed / 5500))
    : 0;

  return (
    <div
      className="ac-stage"
      role="status"
      aria-label="Sertifikat tayyorlanmoqda"
    >
      <div className="ac-orbit">
        <div className="ac-orbit-ring" />
        <Award size={44} strokeWidth={1.6} />
      </div>

      <h2>Sertifikatingiz tayyorlanmoqda</h2>

      <p className="ac-description">
        Mehnatingiz natijasi chiroyli e’tirofga aylanmoqda.
      </p>

      <div
        className="ac-progress"
        role="progressbar"
        aria-label="Tayyorlanish jarayoni"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <div className="ac-progress-caption">
        <span>Iltimos, sahifani yopmang</span>
        <strong>{percent}%</strong>
      </div>

      <ul className="ac-checklist">
        {STEPS.map((label, index) => {
          const done = index < completedSteps;
          const current = index === completedSteps;

          return (
            <li
              key={label}
              className={
                done
                  ? "ac-step is-done"
                  : current
                    ? "ac-step is-current"
                    : "ac-step"
              }
            >
              <span className="ac-step-icon">
                {done ? (
                  <Check size={18} strokeWidth={3} />
                ) : current ? (
                  <LoaderCircle
                    size={18}
                    className="ac-spin"
                  />
                ) : (
                  <span className="ac-step-dot" />
                )}
              </span>

              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CertificateCard({ enrollment }) {
  const {
    data,
    user,
    update,
    notify,
    cloud,
    command,
  } = useApp();

  const courseId = enrollment.courseId;

  const course = data.courses.find(
    (item) => item.id === courseId
  );

  const result = courseResult(data, user.id, courseId);

  const storedCertificate = data.certificates.find(
    (item) =>
      item.userId === user.id &&
      item.courseId === courseId
  );

  const [phase, setPhase] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [documentReady, setDocumentReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const mounted = useRef(false);
  const running = useRef(false);
  const currentUrl = useRef("");
  const timers = useRef(new Set());

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();

      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = "";
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "preparing") return undefined;

    const startedAt = Date.now();

    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  // Avval olingan sertifikat kutish animatsiyasisiz ochiladi.
  useEffect(() => {
    if (
      !storedCertificate ||
      !result.allTestsDone ||
      phase !== "idle"
    ) {
      return undefined;
    }

    let active = true;

    async function loadExisting() {
      try {
        setError("");

        const bytes = await createCertificatePdf(
          storedCertificate
        );

        if (!active || !mounted.current) return;

        const url = URL.createObjectURL(
          new Blob([bytes], { type: "application/pdf" })
        );

        if (currentUrl.current) {
          URL.revokeObjectURL(currentUrl.current);
        }

        currentUrl.current = url;

        setPreview({
          url,
          id: storedCertificate.id,
        });

        setPhase("ready");
      } catch (loadError) {
        if (!active || !mounted.current) return;

        setError(
          loadError.message ||
          "Sertifikatni ochib bo‘lmadi."
        );
      }
    }

    loadExisting();

    return () => {
      active = false;
    };
  }, [
    storedCertificate,
    result.allTestsDone,
    phase,
    retry,
  ]);

  function wait(milliseconds) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        resolve();
      }, milliseconds);

      timers.current.add(timer);
    });
  }

  async function receiveCertificate() {
    if (running.current || !result.ready) return;

    running.current = true;

    setError("");
    setDocumentReady(false);
    setPhase("preparing");

    const startedAt = Date.now();

    try {
      let certificate = storedCertificate;

      if (cloud) {
        const response = await command("certificate", {
          courseId,
        });

        certificate = response?.certificate;
      } else if (!certificate) {
        const saved = await update((draft) => {
          certificate = issueCertificate(
            draft,
            user.id,
            courseId
          );
        });

        if (!saved) {
          throw new Error("Sertifikat saqlanmadi.");
        }
      }

      if (
        !certificate ||
        certificate.userId !== user.id ||
        certificate.courseId !== courseId
      ) {
        throw new Error(
          "Sertifikat ma’lumotlarini olishda xatolik yuz berdi."
        );
      }

      const bytes = await createCertificatePdf(certificate);

      if (!mounted.current) return;

      setDocumentReady(true);

      // Hisoblash serverda bajariladi.
      // Ushbu kutish foydalanuvchi so‘ragan taqdimot animatsiyasi.
      const remaining = Math.max(
        0,
        PREPARATION_TIME - (Date.now() - startedAt)
      );

      await wait(remaining);

      if (!mounted.current) return;

      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/pdf",
        })
      );

      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
      }

      currentUrl.current = url;

      setPreview({
        url,
        id: certificate.id,
      });

      setPhase("celebrating");

      await wait(2200);

      if (mounted.current) {
        setPhase("ready");
      }
    } catch (receiveError) {
      if (!mounted.current) return;

      const message =
        receiveError.message ||
        "Sertifikatni tayyorlab bo‘lmadi.";

      setError(message);
      setPhase("idle");
      notify(message);
    } finally {
      running.current = false;
    }
  }

  if (!result.allTestsDone) {
    return (
      <article className="ac-card">
        <div className="ac-stage">
          <div className="ac-icon">
            <Award size={42} strokeWidth={1.6} />
          </div>

          <span className="ac-course-name">
            {course?.title || "Kurs"}
          </span>

          <h2>Sertifikatingiz sizni kutmoqda</h2>

          <p className="ac-description">
            Barcha dars testlarini yakunlang.
            Har bir yangi bilim sizni maqsadingizga
            yaqinlashtiradi.
          </p>

          <p className="ac-count">
            {result.tests}/{result.lessons.length} ta
            dars testi yakunlangan
          </p>

          <Link
            className="ac-button"
            to={"/student/course/" + courseId}
          >
            O‘rganishni davom ettirish
          </Link>
        </div>
      </article>
    );
  }

  if (phase === "preparing") {
    return (
      <article className="ac-card">
        <Preparation
          elapsed={elapsed}
          documentReady={documentReady}
        />
      </article>
    );
  }

  if (phase === "celebrating") {
    return (
      <article className="ac-card">
        <div className="ac-stage ac-celebration" role="status">
          <Confetti />

          <div className="ac-success-icon">
            <Award size={54} strokeWidth={1.6} />
          </div>

          <h2>Tabriklaymiz!</h2>

          <p className="ac-description">
            Siz uddaladingiz!
            Sertifikatingiz tayyor.
          </p>

          <Sparkles
            className="ac-sparkle"
            size={32}
            aria-hidden="true"
          />
        </div>
      </article>
    );
  }

  if (phase === "ready" && preview) {
    const safeId = String(preview.id).replace(
      /[\\/:*?"<>|]/g,
      "-"
    );

    return (
      <article className="ac-card ac-document-card">
        <iframe
          className="ac-pdf"
          title={`${course?.title || "Kurs"} sertifikati`}
          src={`${preview.url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
          loading="lazy"
        />

        <div className="ac-download-row">
          <a
            className="ac-button"
            href={preview.url}
            download={`IT-TAT-sertifikat-${safeId}.pdf`}
          >
            <Download size={21} />
            Sertifikatni yuklab olish
          </a>
        </div>
      </article>
    );
  }

  if (storedCertificate) {
    return (
      <article className="ac-card">
        <div className="ac-stage" role="status">
          {error ? (
            <>
              <p className="ac-error">{error}</p>

              <button
                type="button"
                className="ac-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Qayta urinish
              </button>
            </>
          ) : (
            <>
              <LoaderCircle
                size={38}
                className="ac-spin"
              />

              <p>Sertifikat ochilmoqda…</p>
            </>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="ac-card">
      <div className="ac-stage">
        <div className="ac-icon">
          <Award size={42} strokeWidth={1.6} />
        </div>

        <span className="ac-course-name">
          {course?.title || "Kurs"}
        </span>

        <h2>
          {result.ready
            ? "Mehnatingiz e’tirofga loyiq!"
            : "Yana bir qadam oldinga"}
        </h2>

        <p className="ac-description">
          {result.ready
            ? "Barcha testlarni yakunladingiz. Shaxsiy sertifikatingizni oling."
            : result.average < 60
              ? "Sertifikat olish uchun o‘rtacha ball kamida 60 bo‘lishi kerak. Mavzularni takrorlab, yana urinib ko‘ring."
              : "Hisob holatini administrator bilan tekshiring."}
        </p>

        {error && (
          <p className="ac-error" role="alert">
            {error}
          </p>
        )}

        {result.ready ? (
          <button
            type="button"
            className="ac-button"
            onClick={receiveCertificate}
          >
            <Award size={22} />
            Sertifikatni olish
          </button>
        ) : (
          <Link
            className="ac-button"
            to={"/student/course/" + courseId}
          >
            Kursga qaytish
          </Link>
        )}
      </div>
    </article>
  );
}

export default function Certificate() {
  const { data, user } = useApp();

  const enrollments = enrollmentsFor(data, user.id);

  return (
    <section className="ac-page">
      <Link className="ac-back" to="/student/course">
        ← Orqaga qaytish
      </Link>

      <header className="ac-heading">
        <h1>Mening sertifikatlarim</h1>
      </header>

      <div className="ac-list">
        {enrollments.map((enrollment) => (
          <CertificateCard
            key={`${user.id}:${enrollment.id}`}
            enrollment={enrollment}
          />
        ))}
      </div>

      {!enrollments.length && (
        <div className="ac-card">
          <div className="ac-stage">
            <div className="ac-icon">
              <Award size={42} />
            </div>

            <h2>Bilim sari ilk qadam</h2>

            <p className="ac-description">
              Sizga kurs biriktirilgach, uning
              sertifikat holati shu yerda ko‘rinadi.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}