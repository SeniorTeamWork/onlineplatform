import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";

import { useApp } from "../context/AppContext";

import {
  paymentSummary,
  enrollmentSummary,
  enrollmentsFor,
  accessState,
  money,
} from "../services/db";

import {
  fullyPaidStudent,
  trialEnrollments,
} from "../services/adminOverview";

import Statistics from "../components/Statistics";
import StudentOverviewTable from "../components/StudentOverviewTable";
import Modal from "../components/Modal";
import PaymentForm from "../components/PaymentForm";

import "./Admin.css";

export default function Admin() {
  const { data, user, notify } = useApp();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [studentFilter, setStudentFilter] = useState("all");
  const [studentName, setStudentName] = useState("");
  const [studentCourse, setStudentCourse] = useState("");

  const students = data.users.filter(
    (student) => student.role === "student"
  );

  const totals = students.reduce(
    (result, student) => {
      const summary = paymentSummary(data, student);

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
      !(user.trialSeenIds || []).includes(enrollment.id)
  );

  const unseenCount = new Set(
    unseen.map((enrollment) => enrollment.userId)
  ).size;

  const activeCount = students.filter((student) =>
    fullyPaidStudent(data, student)
  ).length;

  const trialCount = new Set(
    trials.map((enrollment) => enrollment.userId)
  ).size;

  const filteredStudents = students.filter((student) => {
    const matchesName = String(student.name || "")
      .toLowerCase()
      .includes(studentName.trim().toLowerCase());

    const matchesCourse =
      !studentCourse ||
      data.enrollments.some(
        (enrollment) =>
          enrollment.userId === student.id &&
          enrollment.courseId === studentCourse
      );

    if (!matchesName || !matchesCourse) {
      return false;
    }

    if (studentFilter === "all") {
      return true;
    }

    const summary = paymentSummary(data, student);

    if (studentFilter === "payments") {
      return summary.paid > 0;
    }

    if (studentFilter === "unpaid") {
      return summary.paid === 0;
    }

    if (studentFilter === "debtors") {
      return summary.debt > 0;
    }

    if (studentFilter === "paid") {
      return fullyPaidStudent(data, student);
    }

    if (studentFilter === "trial") {
      return enrollmentsFor(data, student.id).some(
        (enrollment) => {
          const state = accessState(data, enrollment);

          const balance = enrollmentSummary(
            data,
            enrollment
          );

          return (
            balance.debt > 0 &&
            (state === "trial" || state === "deposit")
          );
        }
      );
    }

    return true;
  });

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
            Ta’lim jarayoni va o‘quvchilar natijalari
            bir joyda.
          </p>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={() => setPaymentOpen(true)}
          >
            <Wallet size={22} />
            To‘lov qo‘shish
          </button>
        </div>
      </div>

      <div className="stats">
        {cards.map(([number, title, to]) => (
          <Link
            className="panel stat"
            key={title}
            to={to}
          >
            <strong style={{ fontSize: "30px" }}>
              {number}
            </strong>

            <span>{title} →</span>

            {title === "Sinovdagi talabalar" &&
              unseenCount > 0 && (
                <span
                  className="badge"
                  role="status"
                >
                  🔔 {unseenCount} ta yangi talaba
                </span>
              )}
          </Link>
        ))}
      </div>

      <Statistics />

      <section className="panel detail-panel">
        <h2>Talabalar</h2>

        <br />

        <div className="overview-filters">
          <label>
            Ro‘yxat

            <select
              value={studentFilter}
              onChange={(event) =>
                setStudentFilter(event.target.value)
              }
            >
              <option value="all">
                Barcha talabalar
              </option>

              <option value="payments">
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

              <option value="paid">
                To‘liq to‘lagan faol talabalar
              </option>
            </select>
          </label>

          <label>
            Ism bo‘yicha

            <input
              type="search"
              placeholder="Talaba ismini kiriting"
              value={studentName}
              onChange={(event) =>
                setStudentName(event.target.value)
              }
            />
          </label>

          <label>
            Kurs bo‘yicha

            <select
              value={studentCourse}
              onChange={(event) =>
                setStudentCourse(event.target.value)
              }
            >
              <option value="">
                Barcha kurslar
              </option>

              {data.courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <StudentOverviewTable
          data={data}
          students={filteredStudents}
          highlightPayments
          limitRows
        />
      </section>

      {paymentOpen && (
        <Modal
          title="To‘lov qo‘shish"
          onClose={() => setPaymentOpen(false)}
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