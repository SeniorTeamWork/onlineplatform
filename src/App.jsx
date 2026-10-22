import {
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";

import { useApp } from "./context/AppContext";

import Layout from "./components/Layout";

import Login from "./pages/Login";
import Course from "./pages/Course";
import Lesson from "./pages/Lesson";
import Certificate from "./pages/Certificate";
import Support from "./pages/Support";
import Profile from "./pages/Profile";

import Admin from "./pages/Admin";
import AdminTrials from "./pages/AdminTrials";
import AdminLessons from "./pages/AdminLessons";
import AdminStudents from "./pages/AdminStudents";
import AdminReviews from "./pages/AdminReviews";
import AdminSupport from "./pages/AdminSupport";
import StudentDetail from "./pages/StudentDetail";
import Finance from "./pages/Finance";

function Protected({ role }) {
  const { user } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/student"}
        replace
      />
    );
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route path="/login" element={<Login />} />

      <Route element={<Protected role="student" />}>
        <Route path="/student" element={<Layout />}>
          <Route index element={<Course />} />

          <Route
            path="course/:courseId"
            element={<Course />}
          />

          <Route
            path="lesson/:id"
            element={<Lesson />}
          />

          <Route
            path="certificate"
            element={<Certificate />}
          />

          <Route
            path="certificate/:courseId"
            element={<Certificate />}
          />

          <Route
            path="support"
            element={<Support />}
          />

          <Route
            path="profile"
            element={<Profile />}
          />
        </Route>
      </Route>

      <Route element={<Protected role="admin" />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<Admin />} />

          <Route
            path="lessons"
            element={<AdminLessons />}
          />

          <Route
            path="finance"
            element={<Finance />}
          />

          <Route
            path="trials"
            element={<AdminTrials />}
          />

          <Route
            path="students"
            element={<AdminStudents />}
          />

          <Route
            path="students/:studentId"
            element={<StudentDetail />}
          />

          <Route
            path="reviews"  
            element={<AdminReviews />}
          />

          <Route
            path="support"
            element={<AdminSupport />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <div className="empty">
            <h1>404</h1>
            <p>Sahifa topilmadi.</p>
            <Link to="/login">
              Bosh sahifaga qaytish
            </Link>
          </div>
        }
      />
    </Routes>
  );
}

// DO $$
// DECLARE
//   admin_email text := 'salom@gmail.com';
//   account auth.users%ROWTYPE;
//   doc jsonb;
//   user_list jsonb;
// BEGIN
//   SELECT * INTO account
//   FROM auth.users
//   WHERE lower(email) = lower(trim(admin_email));

//   IF account.id IS NULL THEN
//     RAISE EXCEPTION 'Bu email Authentication → Users ichida topilmadi';
//   END IF;

//   SELECT data INTO doc
//   FROM public.academy_state
//   WHERE id = 1
//   FOR UPDATE;

//   IF doc IS NULL THEN
//     RAISE EXCEPTION 'academy_state ichida id=1 yozuvi topilmadi';
//   END IF;

//   user_list := COALESCE(doc->'users', '[]'::jsonb);

//   IF EXISTS (
//     SELECT 1
//     FROM jsonb_array_elements(user_list) AS u
//     WHERE u->>'id' = account.id::text
//   ) THEN
//     SELECT jsonb_agg(
//       CASE
//         WHEN u->>'id' = account.id::text
//         THEN u || jsonb_build_object(
//           'role', 'admin',
//           'active', true
//         )
//         ELSE u
//       END
//       ORDER BY position
//     )
//     INTO user_list
//     FROM jsonb_array_elements(user_list)
//       WITH ORDINALITY AS items(u, position);
//   ELSE
//     user_list := user_list || jsonb_build_array(
//       jsonb_build_object(
//         'id', account.id,
//         'email', account.email,
//         'name', 'Administrator',
//         'role', 'admin',
//         'active', true,
//         'phone', '',
//         'createdAt', now()
//       )
//     );
//   END IF;

//   UPDATE public.academy_state
//   SET
//     data = jsonb_set(doc, '{users}', user_list),
//     revision = revision + 1
//   WHERE id = 1;
// END $$;