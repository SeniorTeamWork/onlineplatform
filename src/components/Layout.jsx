import { useEffect, useState } from "react";

import {
  NavLink,
  Outlet,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  BookOpen,
  Award,
  Headphones,
  LogOut,
  LayoutDashboard,
  Users,
  Clapperboard,
  ClipboardCheck,
  MessageSquare,
  Wallet,
  Menu,
  UserRound,
} from "lucide-react";

import { useApp } from "../context/AppContext";
import { enrollmentsFor } from "../services/db";

import logo from '../assets/tat.png'

import Modal from "./Modal";
import "./Layout.css";

export function Brand() {
  return (
    <div className="brand">
       <img src="../assets/tat.png" alt="" />
    </div>
  );
}

export default function Layout() {
  const {
    data,
    user,
    cloud,
    logout,
  } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const admin = user.role === "admin";
  const home = admin ? "/admin" : "/student";

  const enrollments = enrollmentsFor(data, user.id);

  if (loading) {
    return (
      <div className="portal-loader" role="status">
        <div className="loader-orbit" />
        <h2>AI Academy</h2>
        <p>Ma’lumotlar yuklanmoqda…</p>
      </div>
    );
  }

  function back() {
    if (location.pathname === home) {
      return;
    }

    if (location.pathname.includes("/student/lesson/")) {
      const lesson = data.lessons.find((item) =>
        location.pathname.endsWith("/" + item.id)
      );

      navigate(
        lesson
          ? "/student/course/" + lesson.courseId
          : home
      );

      return;
    }

    navigate(home);
  }

  const links = admin
    ? [
        ["/admin", LayoutDashboard, "Umumiy ko‘rinish"],
        ["/admin/lessons", Clapperboard, "Kurslar va darslar"],
        ["/admin/students", Users, "Talabalar"],
        ["/admin/finance", Wallet, "Moliya"],
        ["/admin/reviews", ClipboardCheck, "Amaliy ishlar"],
        ["/admin/support", MessageSquare, "Murojaatlar"],
      ]
    : [
        ["/student", BookOpen, "Mening kurslarim"],
        ["/student/certificate", Award, "Sertifikatlar"],
        ["/student/support", Headphones, "Yordam"],
        ["/student/profile", UserRound, "Profil"],
      ];

  async function signOut() {
    const success = await logout();

    if (!success) return;

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <img style={{width: '100px'}} src={logo} alt="" />
        <button
          type="button"
          className="mobile-menu ghost"
          onClick={() => setMenu(!menu)}
          aria-label="Menyuni ochish yoki yopish"
          aria-expanded={menu}
          aria-controls="main-sidebar"
    
        >
          <Menu />
        </button>

        <Brand />

        <div className="header-account">
          {/* <span>{user.name}</span> */}

          <button
            type="button"
            className="secondary red-design"
            onClick={() => setConfirm(true)}
          >
            <LogOut size={22} />
            Log out
          </button>
        </div>
      </header>

      <aside
        id="main-sidebar"
        className={"sidebar " + (menu ? "open" : "")}
      >
        <div className="sidebar-brand">
          <Brand />
        </div>

        <p className="nav-label">
          {admin ? "ADMIN PANEL" : "O‘QUVCHI PANELI"}
        </p>

        <nav>
          {links.map(([to, Icon, label]) => (
            <div key={to}>
              <NavLink
                end
                to={to}
                onClick={() => setMenu(false)}
              >
                <Icon size={22} />
                {label}
              </NavLink>

              {to === "/student" && (
                <div className="subnav">
                  {enrollments.map((enrollment) => {
                    const course = data.courses.find(
                      (item) => item.id === enrollment.courseId
                    );

                    return (
                      <NavLink
                        key={enrollment.id}
                        to={
                          "/student/course/" + enrollment.courseId
                        }
                        onClick={() => setMenu(false)}
                      >
                        {course?.title || "Kurs"}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

       
      </aside>

      <div className="main-wrap">
        <main>
          <button
            type="button"
            className="back global-back"
            disabled={location.pathname === home}
            onClick={back}
          >
            ← Orqaga qaytish
          </button>

          <Outlet />
        </main>

      
      </div>

      {confirm && (
        <Modal
          title="Hisobdan chiqmoqchimisiz?"
          onClose={() => setConfirm(false)}
        >
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => setConfirm(false)}
            >
              Yo‘q, qolaman
            </button>

            <button
              type="button"
              style={{padding: '12px'}}
              className="red-design"
              onClick={signOut}
            >
              Ha, chiqish
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}