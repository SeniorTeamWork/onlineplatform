import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useApp } from "../context/AppContext";
import { trialEnrollments } from "../services/adminOverview";
import StudentOverviewTable from "../components/StudentOverviewTable";

import "./Admin.css";

export default function AdminTrials() {
  const {
    data,
    user,
    cloud,
    command,
    update,
  } = useApp();

  const [query, setQuery] = useState("");
  const [marking, setMarking] = useState(false);
  const [failed, setFailed] = useState(false);

  const started = useRef(false);
  const saving = useRef(false);

  const trials = trialEnrollments(data);

  const studentIds = new Set(
    trials.map((enrollment) => enrollment.userId)
  );

  const search = query.trim().toLowerCase();

  const students = data.users.filter(
    (student) =>
      student.role === "student" &&
      studentIds.has(student.id) &&
      [
        student.name,
        student.username,
        student.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
  );

  const unreadEnrollmentIds = trials
    .filter(
      (enrollment) =>
        !(user?.trialSeenIds || []).includes(
          enrollment.id
        )
    )
    .map((enrollment) => enrollment.id);

  const unreadKey = JSON.stringify(
    unreadEnrollmentIds
  );

  const markRead = useCallback(async () => {
    if (!user || saving.current) return;

    const enrollmentIds = JSON.parse(unreadKey);

    if (!enrollmentIds.length) {
      setFailed(false);
      return;
    }

    saving.current = true;
    setMarking(true);
    setFailed(false);

    try {
      if (cloud) {
        await command("markTrialsSeen", {
          enrollmentIds,
        });
      } else {
        const success = await update((next) => {
          const admin = next.users.find(
            (account) => account.id === user.id
          );

          if (!admin || admin.role !== "admin") {
            throw new Error("Admin hisobi topilmadi.");
          }

          admin.trialSeenIds = [
            ...new Set([
              ...(admin.trialSeenIds || []),
              ...enrollmentIds,
            ]),
          ];
        });

        if (!success) {
          throw new Error(
            "Bildirishnomalarni saqlab bo‘lmadi."
          );
        }
      }
    } catch {
      setFailed(true);
    } finally {
      saving.current = false;
      setMarking(false);
    }
  }, [
    user,
    unreadKey,
    cloud,
    command,
    update,
  ]);

  useEffect(() => {
    if (started.current || !user) return;

    started.current = true;
    void markRead();
  }, [user, markRead]);

  return (
    <>
      <Link className="back" to="/admin">
        ← Orqaga qaytish
      </Link>

      <div className="page-heading">
        <div>
          <h1>Sinovdagi talabalar</h1>

          <p>
            Jami {studentIds.size} ta talaba.
            To‘lov kiritilmagan pullik kurslarda
            faqat birinchi dars ochiq.
          </p>
        </div>
      </div>

      {marking && (
        <p role="status" aria-live="polite">
          Bildirishnomalar o‘qilgan deb
          belgilanmoqda…
        </p>
      )}

      {failed && (
        <div className="panel detail-panel">
          <p role="alert">
            Bildirishnomalarni o‘qilgan deb
            belgilab bo‘lmadi.
          </p>

          <button
            type="button"
            className="secondary"
            onClick={markRead}
            disabled={marking}
          >
            Qayta urinish
          </button>
        </div>
      )}

      <input
        type="search"
        className="search-box"
        aria-label="Sinovdagi talabalarni qidirish"
        placeholder="Ism, login yoki telefon orqali qidiring"
        value={query}
        onChange={(event) =>
          setQuery(event.target.value)
        }
      />

      {search && (
        <p>
          Qidiruv natijasi: {students.length} ta
          talaba.
        </p>
      )}

      <StudentOverviewTable
        data={data}
        students={students}
      />
    </>
  );
}