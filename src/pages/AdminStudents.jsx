import { useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useApp } from "../context/AppContext";

import {
  accessState,
  enrollmentSummary,
  enrollmentsFor,
  paymentSummary,
} from "../services/db";

import { fullyPaidStudent } from "../services/adminOverview";
import { isOwner } from "../services/adminAccess";

import AdminAccountForm from "../components/AdminAccountForm";
import StudentOverviewTable from "../components/StudentOverviewTable";
import StudentForm from "../components/StudentForm";

import "./Admin.css";

const FILTERS = [
  "all",
  "payments",
  "unpaid",
  "debtors",
  "trial",
  "paid",
];

export default function AdminStudents() {
  const { data, user } = useApp();

  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(undefined);
  const [adminOpen, setAdminOpen] = useState(false);

  const requested = params.get("filter") || "all";

  const status = FILTERS.includes(requested)
    ? requested
    : "all";

  const students = data.users.filter(
    (account) => account.role === "student"
  );

  const list = students.filter((student) => {
    const matchesName = [
      student.name,
      student.username,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase());

    if (!matchesName) return false;
    if (status === "all") return true;

    const summary = paymentSummary(data, student);

    if (status === "payments") {
      return summary.paid > 0;
    }

    if (status === "unpaid") {
      return summary.paid === 0;
    }

    if (status === "debtors") {
      return summary.debt > 0;
    }

    if (status === "paid") {
      return fullyPaidStudent(data, student);
    }

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
  });

  function changeFilter(value) {
    const next = new URLSearchParams(params);

    if (value === "all") {
      next.delete("filter");
    } else {
      next.set("filter", value);
    }

    setParams(next);
  }

  return (
    <>
      <Link className="back" to="/admin">
        ← Orqaga qaytish
      </Link>

      <div className="page-heading">
        <div>
          <h1>Talabalar</h1>

          <p>
            {students.length} talaba · har biri uchun
            shaxsiy bo‘lim
          </p>
        </div>

        <div className="button-row">
          {isOwner(user) && (
            <button
              type="button"
              className="secondary"
              onClick={() => setAdminOpen(true)}
            >
              + Admin qo‘shish
            </button>
          )}

          <button
            type="button"
            className="primary"
            onClick={() => setDraft(null)}
          >
            + Talaba qo‘shish
          </button>
        </div>
      </div>

      <input
        className="search-box"
        aria-label="Qidirish"
        placeholder="Ism yoki login orqali qidiring"
        value={query}
        onChange={(event) =>
          setQuery(event.target.value)
        }
      />

      <label className="admin-filter">
        Ro‘yxat

        <select
          value={status}
          onChange={(event) =>
            changeFilter(event.target.value)
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

      <StudentOverviewTable
        data={data}
        students={list}
        onEdit={setDraft}
        highlightPayments
      />

      {adminOpen && isOwner(user) && (
        <AdminAccountForm
          onClose={() => setAdminOpen(false)}
        />
      )}

      {draft !== undefined && (
        <StudentForm
          student={draft}
          onClose={() => setDraft(undefined)}
          onSaved={(id) => {
            setDraft(undefined);
            navigate("/admin/students/" + id);
          }}
        />
      )}
    </>
  );
}