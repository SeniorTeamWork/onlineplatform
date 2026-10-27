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

import {
  canAdmin,
  adminHome,
} from "../services/adminAccess";

import Modal from "./Modal";

import "./Layout.css";

export function Brand() {
  return (
    <div className="brand">
      <span>AI</span> Academy
    </div>
  );
}

export default function Layout() {
  const { data, user, cloud, logout } = useApp();

  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setLoading(false),
      1000
    );

    return () => clearTimeout(timer);
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const admin = user.role === "admin";

  if (loading) {
    return (
      <div className="portal-loader" role="status">
        <div className="loader-orbit" />
        {/* <h2>AI Academy</h2> */}
        <p>Ma’lumotlar yuklanmoqda…</p>
      </div>
    );
  }

  const home = admin
    ? adminHome(user)
    : "/student";

  function back() {
    if (location.pathname === home) return;

    if (
      location.pathname.includes("/student/lesson/")
    ) {
      const lesson = data.lessons.find(
        (item) =>
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

  const adminLinks = [
    [
      "/admin",
      LayoutDashboard,
      "Umumiy ko‘rinish",
      "dashboard",
    ],
    [
      "/admin/lessons",
      Clapperboard,
      "Kurslar va darslar",
      "lessons",
    ],
    [
      "/admin/students",
      Users,
      "Talabalar",
      "students",
    ],
    [
      "/admin/finance",
      Wallet,
      "Moliya",
      "finance",
    ],
    [
      "/admin/reviews",
      ClipboardCheck,
      "Amaliy ishlar",
      "reviews",
    ],
    [
      "/admin/support",
      MessageSquare,
      "Murojaatlar",
      "support",
    ],
    [
      "/admin/trials",
      Users,
      "Sinovdagi talabalar",
      "trials",
    ],
  ];

  const studentLinks = [
    ["/student", BookOpen, "Mening kurslarim"],
    ["/student/certificate", Award, "Sertifikatlar"],
    ["/student/support", Headphones, "Yordam"],
    ["/student/profile", UserRound, "Profil"],
  ];

  const links = admin
    ? adminLinks.filter(
        ([, , , page]) => canAdmin(user, page)
      )
    : studentLinks;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="mobile-menu ghost"
          onClick={() => setMenu(!menu)}
          aria-label="Menyu"
        >
          <Menu />
        </button>

        <Brand />

        <div className="header-account">
          <span>{user.name}</span>

          <button
            type="button"
            className="secondary"
            onClick={() => setConfirm(true)}
          >
            <LogOut size={22} />
            Log out
          </button>
        </div>
      </header>

      <aside
        className={
          "sidebar " + (menu ? "open" : "")
        }
      >
        <div className="sidebar-brand">
          <Brand />
        </div>

        <p className="nav-label">
          {admin
            ? "ADMIN PANEL"
            : "O‘QUVCHI PANELI"}
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
                  {enrollmentsFor(data, user.id).map(
                    (enrollment) => (
                      <NavLink
                        key={enrollment.id}
                        to={
                          "/student/course/" +
                          enrollment.courseId
                        }
                        onClick={() => setMenu(false)}
                      >
                        {data.courses.find(
                          (course) =>
                            course.id ===
                            enrollment.courseId
                        )?.title || "Kurs"}
                      </NavLink>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <span className="badge">
            {cloud ? "Onlayn" : "Demo rejim"}
          </span>

          <p>Bilim sari yangi qadam.</p>
        </div>
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

        {/* <footer>
          © {new Date().getFullYear()} AI Academy
        </footer> */}
      </div>

      {confirm && (
        <Modal
          title="Hisobdan chiqmoqchimisiz?"
          onClose={() => setConfirm(false)}
        >
          <p>Chiqishni tasdiqlaysizmi?</p>

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
              className="primary"
              onClick={async () => {
                if (!(await logout())) return;

                navigate("/login", {
                  replace: true,
                });
              }}
            >
              Ha, chiqish
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}