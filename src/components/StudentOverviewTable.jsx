import { Link } from "react-router-dom";

import { money } from "../services/db";

import {
  studentOverview,
} from "../services/adminOverview";

import useFiveStudentScroll from "../hooks/useFiveStudentScroll";

export default function StudentOverviewTable({
  data,
  students,
  onEdit,
  limitRows = false,
}) {
  const rowKey = JSON.stringify([
    limitRows,
    students.map((student) => student.id),
  ]);

  const scrollRef =
    useFiveStudentScroll(rowKey);

  return (
    <div
      ref={limitRows ? scrollRef : undefined}
      className={
        "panel table-scroll" +
        (limitRows
          ? " five-student-scroll"
          : "")
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
            const summary =
              studentOverview(
                data,
                student
              );

            return (
              <tr key={student.id}>
                <td>
                  <Link
                    className="purple"
                    to={
                      "/admin/students/" +
                      student.id
                    }
                  >
                    {student.name} →
                  </Link>

                  <small>
                    {student.phone}
                  </small>
                </td>

                <td>
                  {summary.courses
                    .map(
                      (enrollment) =>
                        data.courses.find(
                          (course) =>
                            course.id ===
                            enrollment.courseId
                        )?.title ||
                        "Nomsiz kurs"
                    )
                    .join(", ") || "—"}
                </td>

                <td>
                  {summary.status}
                </td>

                <td>
                  {money(
                    summary.totals.paid
                  )}
                </td>

                <td>
                  {money(
                    summary.totals.debt
                  )}
                </td>

                <td>
                  {summary.completed} /{" "}
                  {summary.total} yakunlangan

                  <small>
                    {summary.watched} ta
                    video ko‘rilgan
                  </small>
                </td>

                <td>
                  {summary.accountStatus}
                </td>

                {onEdit && (
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        onEdit(student)
                      }
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