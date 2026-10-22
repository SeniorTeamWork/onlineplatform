import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

import { useApp } from "../context/AppContext";

import {
  paymentSummary,
  enrollmentSummary,
  money,
} from "../services/db";

import {
  fullyPaidStudent,
  trialEnrollments,
} from "../services/adminOverview";

import useFiveStudentScroll from "../hooks/useFiveStudentScroll";

import Statistics from "../components/Statistics";
import StudentOverviewTable from "../components/StudentOverviewTable";
import Modal from "../components/Modal";
import PaymentForm from "../components/PaymentForm";

import "./Admin.css";

export default function Admin() {
  const {
    data,
    user,
    notify,
  } = useApp();

  const [paymentOpen, setPaymentOpen] =
    useState(false);

  const [trialName, setTrialName] =
    useState("");

  const [trialCourse, setTrialCourse] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [studentCourse, setStudentCourse] =
    useState("");

  const students = data.users.filter(
    (student) =>
      student.role === "student"
  );

  const totals = students.reduce(
    (result, student) => {
      const summary = paymentSummary(
        data,
        student
      );

      result.fee += summary.fee;
      result.paid += summary.paid;
      result.debt += summary.debt;

      return result;
    },
    {
      fee: 0,
      paid: 0,
      debt: 0,
    }
  );

  const trials = trialEnrollments(data);

  const unseen = trials.filter(
    (enrollment) =>
      !(user.trialSeenIds || []).includes(
        enrollment.id
      )
  );

  const unseenCount = new Set(
    unseen.map(
      (enrollment) =>
        enrollment.userId
    )
  ).size;

  const activeCount = students.filter(
    (student) =>
      fullyPaidStudent(data, student)
  ).length;

  const trialCount = new Set(
    trials.map(
      (enrollment) =>
        enrollment.userId
    )
  ).size;

  const trialRows = students
    .filter((student) =>
      student.name
        .toLowerCase()
        .includes(
          trialName.trim().toLowerCase()
        )
    )
    .map((student) => ({
      student,

      enrollments: trials.filter(
        (enrollment) =>
          enrollment.userId === student.id &&
          (
            !trialCourse ||
            enrollment.courseId === trialCourse
          )
      ),
    }))
    .filter(
      (row) =>
        row.enrollments.length > 0
    );

  const filteredStudents = students.filter(
    (student) =>
      student.name
        .toLowerCase()
        .includes(
          studentName.trim().toLowerCase()
        ) &&
      (
        !studentCourse ||
        data.enrollments.some(
          (enrollment) =>
            enrollment.userId === student.id &&
            enrollment.courseId === studentCourse
        )
      )
  );

  const trialRowKey = JSON.stringify(
    trialRows.map((row) => [
      row.student.id,

      row.enrollments.map(
        (enrollment) => enrollment.id
      ),
    ])
  );

  const trialRef =
    useFiveStudentScroll(trialRowKey);

  const cards = [
    [
      students.length,
      "Umumiy talabalar",
      "/admin/students",
    ],
    [
      activeCount,
      "Faol talabalar",
      "/admin/students?filter=paid",
    ],
    [
      money(totals.fee),
      "To‘lanishi kerak",
      "/admin/finance",
    ],
    [
      money(totals.paid),
      "To‘lov qilindi",
      "/admin/finance",
    ],
    [
      money(totals.debt),
      "Qolgan qarz",
      "/admin/finance",
    ],
    [
      trialCount,
      "Sinovdagi talabalar",
      "/admin/trials",
    ],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Umumiy ko‘rinish</h1>

          <p>
            Ta’lim jarayoni va o‘quvchilar
            natijalari bir joyda.
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={() =>
              setPaymentOpen(true)
            }
          >
            <Wallet size={22} />
            To‘lov qo‘shish
          </button>
        </div>
      </div>

      <div className="stats">
        {cards.map(
          ([number, title, to]) => (
            <Link
              className="panel stat"
              key={title}
              to={to}
            >
              <strong style={{fontSize: '30px'}} >{number}</strong>

              <span>{title} →</span>

              {title ===
                "Sinovdagi talabalar" &&
                unseenCount > 0 && (
                  <span
                    className="badge"
                    role="status"
                  >
                    🔔 {unseenCount} ta
                    yangi talaba
                  </span>
                )}
            </Link>
          )
        )}
      </div>

      <Statistics />

      <section
        id="trials"
        className="panel detail-panel"
      >
        <h2>Sinovdagi talabalar</h2>

        <div className="overview-filters">
          <label>
            Ism bo‘yicha

            <input
              type="search"
              placeholder="Talaba ismini kiriting"
              value={trialName}
              onChange={(event) =>
                setTrialName(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Kurs bo‘yicha

            <select
              value={trialCourse}
              onChange={(event) =>
                setTrialCourse(
                  event.target.value
                )
              }
            >
              <option value="">
                Barcha kurslar
              </option>

              {data.courses.map(
                (course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.title}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <div
          className="table-scroll five-student-scroll"
          ref={trialRef}
        >
          <table>
            <thead>
              <tr>
                <th>Talaba</th>
                <th>Kurs</th>
                <th>Holat</th>
                <th>Qolgan qarz</th>
              </tr>
            </thead>

            <tbody>
              {trialRows.map(
                ({
                  student,
                  enrollments,
                }) => {
                  const summaries =
                    enrollments.map(
                      (enrollment) =>
                        enrollmentSummary(
                          data,
                          enrollment
                        )
                    );

                  const deposit =
                    student.accessMode ===
                      "deposit" ||
                    summaries.some(
                      (summary) =>
                        summary.paid > 0
                    );

                  const debt =
                    summaries.reduce(
                      (sum, summary) =>
                        sum + summary.debt,
                      0
                    );

                  const courseNames =
                    enrollments
                      .map(
                        (enrollment) =>
                          data.courses.find(
                            (course) =>
                              course.id ===
                              enrollment.courseId
                          )?.title ||
                          "Nomsiz kurs"
                      )
                      .join(", ");

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
                          {student.name}
                        </Link>
                      </td>

                      <td>
                        {courseNames}
                      </td>

                      <td>
                        {deposit
                          ? "Depozit"
                          : "Sinov"}
                      </td>

                      <td>
                        {money(debt)}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        <br />

        {!trialRows.length && (
          <p>
            {trials.length
              ? "Filtrga mos talabalar topilmadi."
              : "Sinovdagi talabalar yo‘q."}
          </p>
        )}
      </section>

      <section className="panel detail-panel">
        <h2>Talabalar</h2>

        <br />

        <div className="overview-filters">
          <label>
            Ism bo‘yicha

            <input
              type="search"
              placeholder="Talaba ismini kiriting"
              value={studentName}
              onChange={(event) =>
                setStudentName(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Kurs bo‘yicha

            <select
              value={studentCourse}
              onChange={(event) =>
                setStudentCourse(
                  event.target.value
                )
              }
            >
              <option value="">
                Barcha kurslar
              </option>

              {data.courses.map(
                (course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.title}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        <StudentOverviewTable
          data={data}
          students={filteredStudents}
          limitRows
        />
      </section>

      {paymentOpen && (
        <Modal
          title="To‘lov qo‘shish"
          onClose={() =>
            setPaymentOpen(false)
          }
        >
          <PaymentForm
            onSaved={() => {
              setPaymentOpen(false);

              notify(
                "To‘lov saqlandi. Dashboard va moliya yangilandi."
              );
            }}
          />
        </Modal>
      )}
    </>
  );
}