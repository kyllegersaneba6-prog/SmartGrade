import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import TeacherLayout from './layouts/TeacherLayout';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import TeacherOverview from './pages/teacher/TeacherOverview';
import ClassRecord from './pages/teacher/ClassRecord';
import Attendance from './pages/teacher/Attendance';
import BehavioralAnalytics from './pages/teacher/BehavioralAnalytics';
import GradeSummary from './pages/teacher/GradeSummary';
import TeacherSettings from './pages/teacher/TeacherSettings';
import MyClassList from './pages/teacher/MyClassList';

import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Audit from './pages/superadmin/audit';
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
import CreateSuperAdminUser from './pages/superadmin/CreateSuperAdminUser';
import ManageDepartments from './pages/superadmin/ManageDepartments';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTeachers from './pages/admin/AdminTeachers';
import CreateAdminTeacher from './pages/admin/CreateAdminTeacher';
import AdminSettings from './pages/admin/AdminSettings';

import Login from './pages/Login';
import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let userRole;
  try {
    const user = JSON.parse(userStr);
    userRole = user?.role || user?.system_role;
  } catch {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    const destination = ({ teacher: '/teacher', admin: '/admin', superadmin: '/superadmin' })[userRole] || '/login';
    return <Navigate to={destination} replace />;
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
  } catch {
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
          <Route index element={<SuperAdminDashboard />} />
          <Route path="audit" element={<Audit />} />
          <Route path="admins" element={<SuperAdminUsers />} />
          <Route path="admins/create" element={<CreateSuperAdminUser />} />
          <Route path="departments" element={<ManageDepartments />} />
          <Route path="settings" element={<SuperAdminSettings />} />
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
          <Route index element={<TeacherOverview />} />
          <Route path="overview" element={<TeacherOverview />} />
          <Route path="class-record" element={<ClassRecord />} />
          <Route path="my-class-list" element={<MyClassList />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="analytics" element={<BehavioralAnalytics />} />
          <Route path="grade-summary" element={<GradeSummary />} />
          <Route path="settings" element={<TeacherSettings />} />
        </Route>

        {/* Unknown URLs (including unknown child routes) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


