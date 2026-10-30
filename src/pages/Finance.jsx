import { useState } from "react";
import { Link } from "react-router-dom";

import {
  canAdmin,
} from "../services/adminAccess";


import Statistics from "../components/Statistics";

import { useApp } from "../context/AppContext";

import {
  paymentSummary,
  enrollmentSummary,
  money,
} from "../services/db";

import "./Admin.css";

function amountClass(debt, fullyPaid) {
  if (debt > 0) {
    return "finance-amount finance-amount--debt";
  }

  if (fullyPaid) {
    return "finance-amount finance-amount--paid";
  }

  return "";
}

export default function Finance() {
  const { data, user } = useApp();

  const [status, setStatus] = useState("all");
  const [studentId] = useState("");
  const [query, setQuery] = useState("");
  const [from] = useState("");
  const [to] = useState("");

  const students = data.users.filter(
    (user) => user.role === "student"
  );

  const rows = students.map((student) => ({
    student,
    ...paymentSummary(data, student),
  }));

  const totals = rows.reduce(
    (result, row) => {
      for (const key of ["fee", "paid", "debt", "credit"]) {
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
        !studentId || row.student.id === studentId;

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
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        ...row,
        payments,
        periodPaid: payments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        ),
      };
    });

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Moliya</h1>
        </div>
      </div>


{canAdmin(user, "statistics") && (
  <>


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
            {rows.filter((row) => row.debt > 0).length}
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
                const enrollments = data.enrollments.filter(
                  (enrollment) =>
                    enrollment.courseId === course.id
                );

                const summaries = enrollments.map(
                  (enrollment) =>
                    enrollmentSummary(data, enrollment)
                );

                const coursePaid = summaries.reduce(
                  (sum, summary) => sum + summary.paid,
                  0
                );

                const courseDebt = summaries.reduce(
                  (sum, summary) => sum + summary.debt,
                  0
                );

                const courseFee = summaries.reduce(
                  (sum, summary) =>
                    sum + Number(summary.fee),
                  0
                );

                const fullyPaid =
                  enrollments.length > 0 &&
                  courseFee > 0 &&
                  courseDebt === 0 &&
                  coursePaid >= courseFee;

                return (
                  <tr key={course.id}>
                    <td>{course.title}</td>

                    <td>{enrollments.length}</td>

                    <td>
                      <span
                        className={
                          fullyPaid
                            ? "finance-amount finance-amount--paid"
                            : ""
                        }
                      >
                        {money(coursePaid)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={amountClass(
                          courseDebt,
                          fullyPaid
                        )}
                      >
                        {money(courseDebt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

        </>
)}

      <section className="panel detail-panel">
        <h2>Talabalar</h2>

        <div className="form-grid">
          <label>
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
        </div>

        <input
          aria-label="Talabani qidirish"
          placeholder="Talabani qidiring"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
        />

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Kurs qiymati</th>
                <th>Jami to‘lov</th>
                <th>Davrdagi to‘lov</th>
                <th>Qarz</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => {
                const fullyPaid =
                  row.fee > 0 &&
                  row.debt === 0 &&
                  row.paid >= row.fee;

                return (
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

                    <td>
                      <span
                        className={
                          fullyPaid
                            ? "finance-amount finance-amount--paid"
                            : ""
                        }
                      >
                        {money(row.paid)}
                      </span>
                    </td>

                    <td>{money(row.periodPaid)}</td>

                    <td>
                      <span
                        className={amountClass(
                          row.debt,
                          fullyPaid
                        )}
                      >
                        {money(row.debt)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filtered.length && <p>Natija yo‘q.</p>}
        </div>
      </section>
    </>
  );
}