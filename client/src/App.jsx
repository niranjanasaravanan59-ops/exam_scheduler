import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './features/auth/authSlice';
import Layout from './components/layout/Layout';

import LoginPage from './pages/LoginPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminExams from './pages/admin/AdminExams';
import AdminPublicationOverview from './pages/admin/AdminPublicationOverview';
import AdminResults from './pages/admin/AdminResults';
import AdminResultDetail from './pages/admin/AdminResultDetail';
import AdminUsers from './pages/admin/AdminUsers';

import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyExams from './pages/faculty/FacultyExams';
import FacultyExamDetail from './pages/faculty/FacultyExamDetail';
import FacultyImport from './pages/faculty/FacultyImport';
import FacultyMarks from './pages/faculty/FacultyMarks';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentResults from './pages/student/StudentResults';

// ─── Guards ────────────────────────────────────────────────────────────────────

function RequireAuth({ children, role }) {
  const { user } = useSelector((s) => s.auth);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Layout>{children}</Layout>;
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) dispatch(fetchMe());
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/exams"     element={<RequireAuth role="admin"><AdminExams /></RequireAuth>} />
      <Route path="/admin/publication-overview" element={<RequireAuth role="admin"><AdminPublicationOverview /></RequireAuth>} />
      <Route path="/admin/results"   element={<RequireAuth role="admin"><AdminResults /></RequireAuth>} />
      <Route path="/admin/results/:examId" element={<RequireAuth role="admin"><AdminResultDetail /></RequireAuth>} />
      <Route path="/admin/users"     element={<RequireAuth role="admin"><AdminUsers /></RequireAuth>} />

      {/* Faculty routes */}
      <Route path="/faculty/dashboard" element={<RequireAuth role="faculty"><FacultyDashboard /></RequireAuth>} />
      <Route path="/faculty/exams"     element={<RequireAuth role="faculty"><FacultyExams /></RequireAuth>} />
      <Route path="/faculty/exams/:examId" element={<RequireAuth role="faculty"><FacultyExamDetail /></RequireAuth>} />
      <Route path="/faculty/import"    element={<RequireAuth role="faculty"><FacultyImport /></RequireAuth>} />
      <Route path="/faculty/marks"     element={<RequireAuth role="faculty"><FacultyMarks /></RequireAuth>} />

      {/* Student routes */}
      <Route path="/student/dashboard" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
      <Route path="/student/schedule"  element={<RequireAuth role="student"><StudentSchedule /></RequireAuth>} />
      <Route path="/student/results"   element={<RequireAuth role="student"><StudentResults /></RequireAuth>} />

      {/* Default redirects */}
      <Route path="/" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/login" replace />
      } />
      <Route path="*" element={
        user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}
