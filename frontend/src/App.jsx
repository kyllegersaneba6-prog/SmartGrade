import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import TeacherDashboard from './pages/teacher/Dashboard';
import ClassRecord from './pages/teacher/ClassRecord';
import Attendance from './pages/teacher/Attendance';
import BehavioralAnalytics from './pages/teacher/BehavioralAnalytics';
import GradeSummary from './pages/teacher/GradeSummary';

import GlobalAnalytics from './pages/superadmin/GlobalAnalytics';
import SecurityAudit from './pages/superadmin/SecurityAudit';
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
import CreateSuperAdminUser from './pages/superadmin/CreateSuperAdminUser';
import ManageDepartments from './pages/superadmin/ManageDepartments';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTeachers from './pages/admin/AdminTeachers';
import CreateAdminTeacher from './pages/admin/CreateAdminTeacher';
import AdminSections from './pages/admin/AdminSections';
import AdminSubjects from './pages/admin/AdminSubjects';
import AdminSettings from './pages/admin/AdminSettings';

import Login from './pages/Login';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const userRole = user?.role || user?.system_role;

    if (!allowedRoles.includes(userRole)) {
      if (userRole === 'teacher') return <Navigate to="/teacher" replace />;
      if (userRole === 'admin') return <Navigate to="/admin" replace />;
      if (userRole === 'superadmin') return <Navigate to="/superadmin" replace />;
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const getRedirectPath = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = user?.role || user?.system_role;
    if (role === 'teacher') return '/teacher';
    if (role === 'admin') return '/admin';
    return '/superadmin';
  } catch (e) {
    return '/superadmin';
  }
};

function App() {
  const token = localStorage.getItem('token');
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            token ? (
              <Navigate to={getRedirectPath()} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Superadmin Routes */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GlobalAnalytics />} />
          <Route path="security" element={<SecurityAudit />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="users/create" element={<CreateSuperAdminUser />} />
          <Route path="departments" element={<ManageDepartments />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="teachers/create" element={<CreateAdminTeacher />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="subjects" element={<AdminSubjects />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="class-record" element={<ClassRecord />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="analytics" element={<BehavioralAnalytics />} />
          <Route path="grade-summary" element={<GradeSummary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
