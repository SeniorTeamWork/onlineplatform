import { Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { useApp } from "./context/AppContext";
import { adminHome, canAdmin, isOwner } from "./services/adminAccess";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Course from "./pages/Course";
import Lesson from "./pages/Lesson";
import Certificate from "./pages/Certificate";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AdminLessons from "./pages/AdminLessons";
import AdminStudents from "./pages/AdminStudents";
import AdminTrials from "./pages/AdminTrials";
import AdminReviews from "./pages/AdminReviews";
import AdminSupport from "./pages/AdminSupport";
import StudentDetail from "./pages/StudentDetail";
import Finance from "./pages/Finance";
import AdminStaff from "./pages/AdminStaff";

import Statistics from "./components/Statistics";


function Protected({ role }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />
    );
  return <Outlet />;
}
function AdminPage({ page, children }) {
  const { user } = useApp();
  if (!canAdmin(user, page)) return <Navigate to={adminHome(user)} replace />;
  return children;
}
function OwnerPage({ children }) {
  const { user } = useApp();
  if (!isOwner(user)) return <Navigate to={adminHome(user)} replace />;
  return children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protected role="student" />}>
        <Route path="/student" element={<Layout />}>
          <Route index element={<Course />} />
          <Route path="course/:courseId" element={<Course />} />
          <Route path="lesson/:id" element={<Lesson />} />
          <Route path="certificate" element={<Certificate />} />
          <Route path="certificate/:courseId" element={<Certificate />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>
      <Route element={<Protected role="admin" />}>
        <Route path="/admin" element={<Layout />}>
          <Route
            index
            element={
              <AdminPage page="dashboard">
                <Admin />
              </AdminPage>
            }
          />
          <Route
            path="lessons"
            element={
              <AdminPage page="lessons">
                <AdminLessons />
              </AdminPage>
            }
          />
          <Route
            path="students"
            element={
              <AdminPage page="students">
                <AdminStudents />
              </AdminPage>
            }
          />
          <Route
            path="students/:studentId"
            element={
              <AdminPage page="students">
                <StudentDetail />
              </AdminPage>
            }
          />
          <Route
            path="finance"
            element={
              <AdminPage page="finance">
                <Finance />
              </AdminPage>
            }
          />
          <Route
            path="trials"
            element={
              <AdminPage page="trials">
                <AdminTrials />
              </AdminPage>
            }
          />
          <Route
            path="reviews"
            element={
              <AdminPage page="reviews">
                <AdminReviews />
              </AdminPage>
            }
          />
          <Route
            path="support"
            element={
              <AdminPage page="support">
                <AdminSupport />
              </AdminPage>
            }
          />
          <Route
            path="staff"
            element={
              <AdminPage page="staff">
                <AdminStaff />
              </AdminPage>
            }
          />

          <Route
            path="statistics"
            element={
              <AdminPage page="statistics">
                <Statistics />
              </AdminPage>
            }
          />
          <Route
            path="access-denied"
            element={
              <div className="empty">
                <h1>Ruxsat berilgan sahifa yo‘q</h1>
                <p>Asosiy administratorga murojaat qiling.</p>
              </div>
            }
          />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <div className="empty">
            <h1>404</h1>
            <p>Sahifa topilmadi.</p>
            <Link to="/login">Bosh sahifaga qaytish</Link>
          </div>
        }
      />
    </Routes>
  );
}
