import { Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { useApp } from "./context/AppContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Course from "./pages/Course";
import Lesson from "./pages/Lesson";
import Certificate from "./pages/Certificate";
import Support from "./pages/Support";
import Admin from "./pages/Admin";
import AdminLessons from "./pages/AdminLessons";
import AdminStudents from "./pages/AdminStudents";
import AdminReviews from "./pages/AdminReviews";
import AdminSupport from "./pages/AdminSupport";
import StudentDetail from "./pages/StudentDetail";
import Finance from "./pages/Finance";
import Profile from "./pages/Profile";
function Protected({
  role
}) {
  const {
    user
  } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/student"} replace />;
  return <Outlet />;
}
export default function App() {
  return <Routes>
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
          <Route index element={<Admin />} />
          <Route path="lessons" element={<AdminLessons />} />
          <Route path="finance" element={<Finance />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/:studentId" element={<StudentDetail />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="support" element={<AdminSupport />} />
        </Route>
      </Route>
      <Route path="*" element={<div className="empty">
            <h1>404</h1>
            <p>Sahifa topilmadi.</p>
            <Link to="/login">Bosh sahifaga qaytish</Link>
          </div>} />
    </Routes>;
}
