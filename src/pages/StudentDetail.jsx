import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useApp } from "../context/AppContext";

import {
  enrollmentsFor,
  enrollmentSummary,
  paymentSummary,
  studentLessons,
  attemptPassed,
  money,
  integer,
  downloadMaterial,
} from "../services/db";

import { downloadCertificate } from "../services/certificate";

import StudentPasswordForm from "../components/StudentPasswordForm";
import AdminStudentNote from "../components/AdminStudentNote";
import Avatar from "../components/Avatar";
import StudentForm from "../components/StudentForm";
import PaymentForm from "../components/PaymentForm";
import Modal from "../components/Modal";
import { MoneyInput } from "../components/FormattedInputs";

import "./StudentDetail.css";

export default function StudentDetail() {
  const { studentId } = useParams();

  const { data, user, update, notify } = useApp();

  const [edit, setEdit] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const [feeEdit, setFeeEdit] = useState(null);

  const student = data.users.find(
    (account) =>
      account.id === studentId &&
      account.role === "student"
  );

  if (!student) {
    return (
      <div className="empty">
        Talaba topilmadi.{" "}
        <Link to="/admin/students">Ortga</Link>
      </div>
    );
  }

  const totals = paymentSummary(data, student);
  const enrollments = enrollmentsFor(data, studentId);
  const lessons = studentLessons(data, studentId);

  const attempts = data.attempts.filter(
    (attempt) => attempt.userId === studentId
  );

  const submissions = data.submissions.filter(
    (submission) => submission.userId === studentId
  );

  const payments = data.payments.filter(
    (payment) => payment.userId === studentId
  );

  async function voidPayment(event) {
    event.preventDefault();

    const reason = String(
      new FormData(event.currentTarget).get("reason") || ""
    ).trim();

    if (reason.length < 5) {
      notify("Kamida 5 belgili sabab yozing.");
      return;
    }

    const saved = await update((draft) => {
      const payment = draft.payments.find(
        (item) => item.id === voiding.id
      );

      if (payment.voidedAt) {
        throw Error("Avval bekor qilingan.");
      }

      payment.voidedAt = new Date().toISOString();
      payment.voidReason = reason;
      payment.voidedBy = user.id;
    });

    if (saved) setVoiding(null);
  }

  async function fee(event) {
    event.preventDefault();

    const amount = new FormData(
      event.currentTarget
    ).get("fee");

    const saved = await update((draft) => {
      const enrollment = draft.enrollments.find(
        (item) => item.id === feeEdit.id
      );

      const value = integer(amount);

      if (
        value <
        enrollmentSummary(draft, enrollment).paid
      ) {
        throw Error(
          "Narx to‘langan summadan kam bo‘lolmaydi."
        );
      }

      enrollment.fee = value;
    });

    if (saved) setFeeEdit(null);
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
      <Link className="back" to="/admin/students">
        ← Talabalar
      </Link>

      <div className="page-heading">
        <div>
          <Avatar user={student} />
          <h1>{student.name}</h1>

          <p>
            {student.username || "Login belgilanmagan"}
            {" · "}
            {student.phone || "Telefon kiritilmagan"}
          </p>

          <p>
            {!student.active
              ? "Nofaol"
              : student.accessMode === "deposit"
                ? "Depozit"
                : "Faol"}
            {" · "}
            {student.notes}
          </p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setEdit(true)}
        >
          Ma’lumot va kurslarni tahrirlash
        </button>
      </div>

      <StudentPasswordForm
        key={"password-" + student.id}
        student={student}
      />

      <AdminStudentNote
        key={"note-" + student.id}
        student={student}
      />

      <div className="stats">
        {[
          [enrollments.length, "Sotib olingan kurs"],
          [
            lessons.filter(
              (lesson) =>
                data.progress[studentId]?.[lesson.id]?.watched
            ).length,
            "Ko‘rilgan video",
          ],
          [money(totals.paid), "To‘langan"],
          [money(totals.debt), "Qarz"],
        ].map(([value, label]) => (
          <div className="panel stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section className="panel detail-panel">
        <h2>Kurslar va hisob-kitob</h2>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs</th>
                <th>Kelishilgan narx</th>
                <th>To‘lov</th>
                <th>Qarz</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {enrollments.map((enrollment) => {
                const summary = enrollmentSummary(
                  data,
                  enrollment
                );

                return (
                  <tr key={enrollment.id}>
                    <td>
                      {
                        data.courses.find(
                          (course) =>
                            course.id === enrollment.courseId
                        )?.title
                      }
                    </td>

                    <td>{money(summary.fee)}</td>
                    <td>{money(summary.paid)}</td>

                    <td>
                      {money(summary.debt)}

                      {summary.credit > 0 && (
                        <small>
                          Ortiqcha: {money(summary.credit)}
                        </small>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setFeeEdit(enrollment)}
                      >
                        Narxni tahrirlash
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel detail-panel">
        <h2>To‘lov qo‘shish</h2>

        <PaymentForm
          key={studentId}
          studentId={studentId}
        />

        <h3>To‘lov tarixi</h3>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Kurs</th>
                <th>Miqdor</th>
                <th>Holat</th>
                <th>Amal</th>
              </tr>
            </thead>

            <tbody>
              {[...payments].reverse().map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>

                  <td>
                    {
                      data.courses.find(
                        (course) =>
                          course.id === payment.courseId
                      )?.title
                    }

                    <small>{payment.note}</small>
                  </td>

                  <td>{money(payment.amount)}</td>

                  <td>
                    {payment.voidedAt
                      ? "Bekor qilingan"
                      : "Qayd etilgan"}

                    <small>{payment.voidReason}</small>
                  </td>

                  <td>
                    {!payment.voidedAt && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setVoiding(payment)}
                      >
                        Bekor qilish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel detail-panel">
        <h2>Ko‘rilgan darslar</h2>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs / dars</th>
                <th>Video</th>
                <th>Sana</th>
              </tr>
            </thead>

            <tbody>
              {lessons.map((lesson) => {
                const progress =
                  data.progress[studentId]?.[lesson.id];

                return (
                  <tr key={lesson.id}>
                    <td>
                      {lesson.title}

                      <small>
                        {
                          data.courses.find(
                            (course) =>
                              course.id === lesson.courseId
                          )?.title
                        }
                      </small>
                    </td>

                    <td>
                      {progress?.watched
                        ? "Yakunlangan"
                        : "Yakunlanmagan"}
                    </td>

                    <td>
                      {progress?.watchedAt
                        ? new Date(
                            progress.watchedAt
                          ).toLocaleString("uz-UZ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel detail-panel">
        <h2>Test natijalari tarixi</h2>

        {!attempts.length && (
          <p>Hali test topshirilmagan.</p>
        )}

        {[...attempts].reverse().map((attempt) => (
          <details
            className="attempt-detail"
            key={attempt.id}
          >
            <summary>
              {attempt.lessonTitle ||
                data.lessons.find(
                  (lesson) => lesson.id === attempt.lessonId
                )?.title ||
                "Eski dars"}
              {" · "}
              {Number(attempt.score).toFixed(2)}%
              {" · "}
              {attemptPassed(attempt) ? "O‘tdi" : "O‘tmadi"}
            </summary>

            <p>
              {new Date(
                attempt.createdAt
              ).toLocaleString("uz-UZ")}
            </p>

            {attempt.questions?.map((question, index) => (
              <div
                className="submission"
                key={question.id}
              >
                <strong>
                  {index + 1}. {question.text}
                </strong>

                <p>
                  Talaba:{" "}
                  {question.options[
                    attempt.answers?.[question.id]
                  ] ?? "—"}
                </p>

                <p>
                  To‘g‘ri javob:{" "}
                  {question.options[question.correct]}
                </p>
              </div>
            ))}
          </details>
        ))}
      </section>

      <section className="panel detail-panel">
        <h2>Amaliy natijalar tarixi</h2>

        {!submissions.length && (
          <p>Hali topshirilmagan.</p>
        )}

        {[...submissions].reverse().map((submission) => (
          <article
            className="submission"
            key={submission.id}
          >
            <h3>{submission.lessonTitle}</h3>
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

            <span className="badge">
              {
                {
                  pending: "Tekshirilmoqda",
                  approved: "Tasdiqlangan",
                  rejected: "Qaytarilgan",
                }[submission.status]
              }
            </span>

            <p>Baho: {submission.grade ?? "—"} / 100</p>

            <p>
              Admin izohi: {submission.feedback || "—"}
            </p>
          </article>
        ))}

        <Link
          className="primary inline-button"
          to="/admin/reviews"
        >
          Amaliy ishlarni tekshirish
        </Link>
      </section>

      <section className="panel detail-panel">
        <h2>Berilgan sertifikatlar</h2>

        {data.certificates
          .filter(
            (certificate) => certificate.userId === studentId
          )
          .map((certificate) => (
            <div className="row" key={certificate.id}>
              <span>
                {certificate.title}
                {" · "}
                {Number(certificate.score).toFixed(2)}%
              </span>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  downloadCertificate(certificate).catch(
                    (error) => notify(error.message)
                  )
                }
              >
                PDF yuklash
              </button>
            </div>
          ))}
      </section>

      {edit && (
        <StudentForm
          student={student}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}

      {voiding && (
        <Modal
          title="To‘lovni bekor qilish"
          onClose={() => setVoiding(null)}
        >
          <form onSubmit={voidPayment}>
            <p>
              {money(voiding.amount)} hisobdan chiqariladi,
              yozuv tarixda saqlanadi.
            </p>

            <label>
              Sabab
              <textarea
                name="reason"
                required
                minLength={5}
              />
            </label>

            <button
              type="submit"
              className="primary"
            >
              Ha, bekor qilish
            </button>
          </form>
        </Modal>
      )}

      {feeEdit && (
        <Modal
          title="Kelishilgan narx"
          onClose={() => setFeeEdit(null)}
        >
          <form onSubmit={fee}>
            <label>
              Narx (so‘m)
              <MoneyInput
                key={feeEdit.id}
                name="fee"
                min={0}
                required
                defaultValue={feeEdit.fee}
              />
            </label>

            <button
              type="submit"
              className="primary"
            >
              Saqlash
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}