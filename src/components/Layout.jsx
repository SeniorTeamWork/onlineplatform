import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Award, Headphones, LogOut, LayoutDashboard, Users, Clapperboard, ClipboardCheck, MessageSquare, Wallet, Menu, UserRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { enrollmentsFor } from "../services/db";
import Modal from "./Modal";
import "./Layout.css";
export function Brand() {
  return <div className="brand">
      <span>AI</span> Academy
    </div>;
}
export default function Layout() {
  const {
    data,
    user,
    cloud,
    logout
  } = useApp();
  const go = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  const [confirm, setConfirm] = useState(false),
    [menu, setMenu] = useState(false),
    [expanded, setExpanded] = useState(true);
  if (!user) return <Navigate to="/login" replace />;
  const admin = user.role === "admin";
  if (loading) return <div className="portal-loader" role="status"><div className="loader-orbit" /><h2>AI Academy</h2><p>Ma’lumotlar yuklanmoqda…</p></div>;
  const home = admin ? '/admin' : '/student';
  function back() {
    if (location.pathname === home) return;else if (location.pathname.includes('/student/lesson/')) {
      const l = data.lessons.find(l => location.pathname.endsWith('/' + l.id));
      go(l ? '/student/course/' + l.courseId : home);
    } else go(home);
  }
  const links = admin ? [["/admin", LayoutDashboard, "Umumiy ko‘rinish"], ["/admin/lessons", Clapperboard, "Kurslar va darslar"], ["/admin/students", Users, "Talabalar"], ["/admin/finance", Wallet, "Moliya"], ["/admin/reviews", ClipboardCheck, "Amaliy ishlar"], ["/admin/support", MessageSquare, "Murojaatlar"]] : [["/student", BookOpen, "Mening kurslarim"], ["/student/certificate", Award, "Sertifikatlar"], ["/student/support", Headphones, "Yordam"], ["/student/profile", UserRound, "Profil"]];
  return <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu ghost" onClick={() => setMenu(!menu)} aria-label="Menyu">
          <Menu />
        </button>
        <Brand />
        <div className="header-account">
          <span>{user.name}</span>
          <button className="secondary" onClick={() => setConfirm(true)}>
            <LogOut size={22} /> Log out
          </button>
        </div>
      </header>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <div className="sidebar-brand"><Brand /></div>
        <p className="nav-label">{admin ? "ADMIN PANEL" : "O‘QUVCHI PANELI"}</p>
        <nav>
          {links.map(([to, Icon, label]) => <div key={to}>
              <NavLink end to={to} onClick={() => {
            setMenu(false);
            if (to === "/student") setExpanded(true);
          }}>
                <Icon size={22} />
                {label}
              </NavLink>
              {to === "/student" && <>
                  <button className="text-btn course-toggle" onClick={() => setExpanded(!expanded)}>
                    {expanded ? "Kurslarni yashirish" : "Kurslarni ko‘rsatish"}
                  </button>
                  {expanded && <div className="subnav">
                      {enrollmentsFor(data, user.id).map(e => <NavLink key={e.id} to={"/student/course/" + e.courseId} onClick={() => setMenu(false)}>
                          {data.courses.find(c => c.id === e.courseId)?.title || "Kurs"}
                        </NavLink>)}
                    </div>}
                </>}
            </div>)}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">{cloud ? "Onlayn" : "Demo rejim"}</span>
          <p>Bilim sari yangi qadam.</p>
        </div>
      </aside>
      <div className="main-wrap">
        <main>
          <button type="button" className="back global-back" disabled={location.pathname === home} onClick={back}>← Orqaga qaytish</button>
          <Outlet />
        </main>
        <footer>© {new Date().getFullYear()} AI Academy</footer>
      </div>
      {confirm && <Modal title="Hisobdan chiqmoqchimisiz?" onClose={() => setConfirm(false)}>
          <p>Chiqishni tasdiqlaysizmi?</p>
          <div className="button-row">
            <button className="secondary" onClick={() => setConfirm(false)}>
              Yo‘q, qolaman
            </button>
            <button className="primary" onClick={async () => {
          if (!(await logout())) return;
          go("/login", {
            replace: true
          });
        }}>
              Ha, chiqish
            </button>
          </div>
        </Modal>}
    </div>;
}
