import { Link } from "react-router-dom";

import { money } from "../services/db";
import { studentOverview } from "../services/adminOverview";

import useFiveStudentScroll from "../hooks/useFiveStudentScroll";

export default function StudentOverviewTable({
  data,
  students,
  onEdit,
  limitRows = false,
  highlightPayments = false,
}) {
  const scrollRef = useFiveStudentScroll(
    JSON.stringify([
      limitRows,
      students.map((student) => student.id),
    ])
  );

  return (
    <div
      ref={limitRows ? scrollRef : undefined}
      className={
        "panel table-scroll" +
        (limitRows ? " five-student-scroll" : "")
      }
    >
      <table>
        <thead>
          <tr>
            <th>Talaba</th>
            <th>Kurslar</th>
            <th>To‘lov holati</th>
            <th>To‘langan summa</th>
            <th>Qarz</th>
            <th>Darslar</th>
            <th>Hisob holati</th>

            {onEdit && <th>Amal</th>}
          </tr>
        </thead>

        <tbody>
          {students.map((student) => {
            const summary = studentOverview(
              data,
              student
            );

            const fullyPaid =
              summary.courses.length > 0 &&
              summary.totals.fee > 0 &&
              summary.totals.debt === 0 &&
              summary.totals.paid >= summary.totals.fee;

            const paidClass =
              highlightPayments && fullyPaid
                ? "finance-amount finance-amount--paid"
                : "";

            let debtClass = "";

            if (highlightPayments) {
              if (summary.totals.debt > 0) {
                debtClass =
                  "finance-amount finance-amount--debt";
              } else if (fullyPaid) {
                debtClass =
                  "finance-amount finance-amount--paid";
              }
            }

            return (
              <tr key={student.id}>
                <td>
                  <Link
                    className="purple"
                    to={"/admin/students/" + student.id}
                  >
                    {student.name} →
                  </Link>

                  <small>{student.phone}</small>
                </td>

                <td>
                  {summary.courses
                    .map(
                      (enrollment) =>
                        data.courses.find(
                          (course) =>
                            course.id ===
                            enrollment.courseId
                        )?.title || "Nomsiz kurs"
                    )
                    .join(", ") || "—"}
                </td>

                <td>{summary.status}</td>

                <td>
                  <span className={paidClass}>
                    {money(summary.totals.paid)}
                  </span>
                </td>

                <td>
                  <span className={debtClass}>
                    {money(summary.totals.debt)}
                  </span>
                </td>

                <td>
                  {summary.completed} / {summary.total}
                  {" "}yakunlangan

                  <small>
                    {summary.watched} ta video ko‘rilgan
                  </small>
                </td>

                <td>{summary.accountStatus}</td>

                {onEdit && (
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onEdit(student)}
                    >
                      Tahrirlash
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {!students.length && (
        <p className="empty">
          Talabalar topilmadi.
        </p>
      )}
    </div>
  );
}