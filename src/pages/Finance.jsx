import { useState } from "react";
import { Link } from "react-router-dom";

import Statistics from "../components/Statistics";

import { useApp } from "../context/AppContext";

import {
  paymentSummary,
  enrollmentSummary,
  money,
  localDate,
} from "../services/db";

import "./Admin.css";

export default function Finance() {
  const { data } = useApp();

  const [status, setStatus] = useState("all");
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const students = data.users.filter(
    (user) => user.role === "student"
  );

  const rows = students.map((student) => ({
    student,
    ...paymentSummary(data, student),
  }));

  const totals = rows.reduce(
    (result, row) => {
      for (const key of [
        "fee",
        "paid",
        "debt",
        "credit",
      ]) {
        result[key] += row[key];
      }

      return result;
    },
    {
      fee: 0,
      paid: 0,
      debt: 0,
      credit: 0,
    }
  );

  const periodPayments = data.payments.filter(
    (payment) =>
      !payment.voidedAt &&
      (!from || payment.date >= from) &&
      (!to || payment.date <= to)
  );

  const filtered = rows
    .filter((row) => {
      const matchesName = (
        row.student.name +
        " " +
        (row.student.email || "")
      )
        .toLowerCase()
        .includes(query.trim().toLowerCase());

      const matchesStudent =
        !studentId ||
        row.student.id === studentId;

      const matchesStatus =
        status === "all" ||
        (status === "paid" && row.paid > 0) ||
        (status === "unpaid" && row.paid === 0) ||
        (status === "debtors" && row.debt > 0) ||
        (status === "trial" && row.debt > 0);

      return (
        matchesName &&
        matchesStudent &&
        matchesStatus
      );
    })
    .map((row) => {
      const payments = periodPayments
        .filter(
          (payment) =>
            payment.userId === row.student.id
        )
        .sort((a, b) =>
          b.date.localeCompare(a.date)
        );

      return {
        ...row,
        payments,
        periodPaid: payments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        ),
      };
    });

  const periodTotal = filtered.reduce(
    (sum, row) => sum + row.periodPaid,
    0
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Moliya</h1>
        </div>
      </div>

      <div className="stats">
        <div className="panel stat">
          <strong style={{ fontSize: "30px" }}>
            {students.length}
          </strong>

          <span>Talabalar</span>
        </div>

        <div className="panel stat">
          <strong style={{ fontSize: "30px" }}>
            {money(totals.fee)}
          </strong>

          <span>To‘lanishi kerak</span>
        </div>

        <div className="panel stat">
          <strong style={{ fontSize: "30px" }}>
            {money(totals.paid)}
          </strong>

          <span>To‘langan</span>
        </div>

        <button
          type="button"
          className="panel stat"
          onClick={() => setStatus("debtors")}
        >
          <strong style={{ fontSize: "30px" }}>
            {
              rows.filter(
                (row) => row.debt > 0
              ).length
            }
          </strong>

          <span>Qarzdorlar →</span>
        </button>

        <div className="panel stat">
          <strong style={{ fontSize: "30px" }}>
            {money(totals.debt)}
          </strong>

          <span>Jami qarz</span>
        </div>
      </div>

      <Statistics />

      <section className="panel detail-panel">
        <h2>Kurslar statistikasi</h2>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kurs</th>
                <th>Sotilgan</th>
                <th>To‘lov</th>
                <th>Qarz</th>
              </tr>
            </thead>

            <tbody>
              {data.courses.map((course) => {
                const enrollments =
                  data.enrollments.filter(
                    (enrollment) =>
                      enrollment.courseId === course.id
                  );

                const summaries = enrollments.map(
                  (enrollment) =>
                    enrollmentSummary(data, enrollment)
                );

                return (
                  <tr key={course.id}>
                    <td>{course.title}</td>

                    <td>{enrollments.length}</td>

                    <td>
                      {money(
                        summaries.reduce(
                          (sum, summary) =>
                            sum + summary.paid,
                          0
                        )
                      )}
                    </td>

                    <td>
                      {money(
                        summaries.reduce(
                          (sum, summary) =>
                            sum + summary.debt,
                          0
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel detail-panel">
        <h2>Talabalar </h2>

        <div className="form-grid">
          <label>
            Ro‘yxat

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              <option value="all">
                Barcha talabalar
              </option>

              <option value="paid">
                To‘lov qilgan talabalar
              </option>

              <option value="unpaid">
                To‘lov qilmagan talabalar
              </option>

              <option value="debtors">
                Qarzdor talabalar
              </option>
              <option value="trial">
                Sinovdagi talabalar
              </option>
            </select>
          </label>

          {/* <label>
            Talabani tanlang

            <select
              value={studentId}
              onChange={(event) =>
                setStudentId(event.target.value)
              }
            >
              <option value="">
                Barcha talabalar
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.name}
                </option>
              ))}
            </select>
          </label> */}
        </div>

        <input
          aria-label="Talabani qidirish"
          placeholder="Talabani qidiring"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

        {/* <div className="form-grid">
          <label>
            Dan

            <input
              type="date"
              max={to || localDate()}
              value={from}
              onChange={(event) =>
                setFrom(event.target.value)
              }
            />
          </label>

          <label>
            Gacha

            <input
              type="date"
              min={from}
              max={localDate()}
              value={to}
              onChange={(event) =>
                setTo(event.target.value)
              }
            />
          </label>
        </div> */}

        {/* <p>
          Tanlangan davrdagi to‘lovlar:{" "}
          <strong>{money(periodTotal)}</strong>
        </p> */}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Kurs qiymati</th>
                <th>Jami to‘lov</th>
                <th>Davrdagi to‘lov</th>
                <th>Qarz</th>
                {/* <th>To‘lov tarixi</th> */}
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => (
                <tr key={row.student.id}>
                  <td>
                    <Link
                      className="purple"
                      to={
                        "/admin/students/" +
                        row.student.id
                      }
                    >
                      {row.student.name} →
                    </Link>
                  </td>

                  <td>{money(row.fee)}</td>

                  <td>{money(row.paid)}</td>

                  <td>{money(row.periodPaid)}</td>

                  <td>{money(row.debt)}</td>

                  {/* <td>
                    {row.payments.length ? (
                      <details>
                        <summary>
                          {row.payments.length} ta to‘lov
                        </summary>

                        {row.payments.map((payment) => (
                          <div
                            className="submission"
                            key={payment.id}
                          >
                            <strong>
                              {money(payment.amount)}
                            </strong>

                            <small>
                              Sana: {payment.date}
                            </small>

                            <small>
                              {
                                data.courses.find(
                                  (course) =>
                                    course.id ===
                                    payment.courseId
                                )?.title
                              }
                            </small>

                            <small>
                              Usul: {payment.method}
                            </small>
                          </div>
                        ))}
                      </details>
                    ) : (
                      <span>
                        {from || to
                          ? "Bu davrda to‘lov yo‘q"
                          : "To‘lov qilinmagan"}
                      </span>
                    )}
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <p>Natija yo‘q.</p>
          )}
        </div>
      </section>
    </>
  );
}