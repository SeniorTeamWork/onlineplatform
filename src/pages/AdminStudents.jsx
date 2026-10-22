import { useState } from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useApp } from "../context/AppContext";
import { fullyPaidStudent } from "../services/adminOverview";

import AdminAccountForm from "../components/AdminAccountForm";
import StudentOverviewTable from "../components/StudentOverviewTable";
import StudentForm from "../components/StudentForm";

import "./Admin.css";

export default function AdminStudents() {
  const { data } = useApp();

  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(undefined);
  const [adminOpen, setAdminOpen] = useState(false);

  const onlyPaid = params.get("filter") === "paid";

  const students = data.users.filter(
    (user) => user.role === "student"
  );

  const list = students.filter(
    (student) =>
      (!onlyPaid ||
        fullyPaidStudent(data, student)) &&
      [student.name, student.username]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase())
  );

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
          <button
            type="button"
            className="secondary"
            onClick={() => setAdminOpen(true)}
          >
            + Admin qo‘shish
          </button>

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
          value={onlyPaid ? "paid" : "all"}
          onChange={(event) =>
            setParams(
              event.target.value === "paid"
                ? { filter: "paid" }
                : {}
            )
          }
        >
          <option value="all">
            Barcha talabalar
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
      />

      {adminOpen && (
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