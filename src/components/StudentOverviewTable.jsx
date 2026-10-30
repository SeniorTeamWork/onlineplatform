import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { money } from "../services/db";

import {
  canAdmin,
} from "../services/adminAccess";

import {
  studentOverview,
} from "../services/adminOverview";

import useFiveStudentScroll from "../hooks/useFiveStudentScroll";

export default function StudentOverviewTable({
  data,
  students,
  onEdit,
  limitRows = false,
  highlightPayments = false,
}) {
  const {
    user,
    cloud,
    command,
    update,
    refresh,
    notify,
    saving,
  } = useApp();

  const [deleting, setDeleting] = useState(null);
  const lock = useRef(false);

  const canDelete = canAdmin(user, "students");

  const scrollRef = useFiveStudentScroll(
    JSON.stringify([
      limitRows,
      students.map((student) => student.id),
    ])
  );

  async function remove(student) {
    if (
      !canDelete ||
      saving ||
      lock.current
    ) {
      return;
    }

    const confirmed = window.confirm(
      `“${student.name}” talabani ro‘yxatdan o‘chirasizmi? ` +
      "Saytga kirishi bloklanadi. " +
      "To‘lov va o‘qish tarixi saqlanadi."
    );

    if (!confirmed) return;

    lock.current = true;
    setDeleting(student.id);

    try {
      if (cloud) {
        await refresh();

        await command("deleteStudent", {
          userId: student.id,
        });
      } else {
        const saved = await update((state) => {
          const target = state.users.find(
            (item) =>
              item.id === student.id &&
              item.role === "student"
          );

          if (!target) {
            throw Error("Talaba topilmadi.");
          }

          Object.assign(target, {
            role: "deleted",
            deletedRole: "student",
            active: false,
            deletedAt: new Date().toISOString(),
            deletedBy: user.id,
          });

          for (
            const [key, session] of
            Object.entries(
              state.testSessions || {}
            )
          ) {
            if (
              session?.userId === student.id
            ) {
              delete state.testSessions[key];
            }
          }
        });

        if (!saved) return;
      }

      notify("Talaba ro‘yxatdan o‘chirildi.");
    } catch (error) {
      notify(
        error.message || "Talaba o‘chirilmadi."
      );
    } finally {
      lock.current = false;
      setDeleting(null);
    }
  }

  return (
    <div
      ref={limitRows ? scrollRef : undefined}
      className={
        "panel table-scroll" +
        (
          limitRows
            ? " five-student-scroll"
            : ""
        )
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

            {(onEdit || canDelete) && (
              <th>Amallar</th>
            )}
          </tr>
        </thead>

        <tbody>
          {students.map((student) => {
            const summary = studentOverview(
              data,
              student
            );

            const paid =
              summary.courses.length > 0 &&
              summary.totals.fee > 0 &&
              summary.totals.debt === 0 &&
              summary.totals.paid >=
                summary.totals.fee;

            const paidClass =
              highlightPayments && paid
                ? "finance-amount finance-amount--paid"
                : "";

            const debtClass = highlightPayments
              ? summary.totals.debt > 0
                ? "finance-amount finance-amount--debt"
                : paid
                  ? "finance-amount finance-amount--paid"
                  : ""
              : "";

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
                  {summary.completed} /{" "}
                  {summary.total} yakunlangan

                  <small>
                    {summary.watched} ta video
                    ko‘rilgan
                  </small>
                </td>

                <td>
                  {summary.accountStatus}
                </td>

                {(onEdit || canDelete) && (
                  <td>
                    <div className="button-row">
                      {onEdit && (
                        <button
                          type="button"
                          className="secondary"
                          disabled={
                            deleting !== null ||
                            saving
                          }
                          onClick={() =>
                            onEdit(student)
                          }
                        >
                          Tahrirlash
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className="secondary danger"
                          disabled={
                            deleting !== null ||
                            saving
                          }
                          onClick={() =>
                            remove(student)
                          }
                        >
                          {deleting === student.id
                            ? "O‘chirilmoqda…"
                            : "O‘chirish"}
                        </button>
                      )}
                    </div>
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
      )}a
    </div>
  );
}