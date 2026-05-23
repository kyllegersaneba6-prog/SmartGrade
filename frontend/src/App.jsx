import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DeanLayout from './layouts/DeanLayout';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

// Dean Pages
import DeanDashboard from './pages/dean/Dashboard';
import StudentSections from './pages/dean/StudentSections';
import TeacherSubmissions from './pages/dean/TeacherSubmissions';
import InstitutionalAnalytics from './pages/dean/InstitutionalAnalytics';
import ReportGenerator from './pages/dean/ReportGenerator';
import TemplateSettings from './pages/dean/TemplateSettings';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import MyClasses from './pages/teacher/MyClasses';

import Gradebook from './pages/teacher/Gradebook';
import Attendance from './pages/teacher/Attendance';
import TeacherReports from './pages/teacher/Reports';

// Admin Pages
import GlobalAnalytics from './pages/admin/GlobalAnalytics';
import SecurityAudit from './pages/admin/SecurityAudit';
import UserRoles from './pages/admin/UserRoles';
import CreateUser from './pages/admin/CreateUser';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentMyClasses from './pages/student/MyClasses';
import StudentGradebook from './pages/student/Gradebook';
import StudentReports from './pages/student/Reports';
import Login from './pages/Login';


// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Check if roles match
    if (allowedRole === 'sysadmin') {
      if (user?.role !== 'sysadmin' && user?.role !== 'admin') {
        if (user?.role === 'dean') return <Navigate to="/dean" replace />;
        if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
        if (user?.role === 'student') return <Navigate to="/student" replace />;
        return <Navigate to="/login" replace />;
      }
    } else {
      if (user?.role !== allowedRole) {
        if (user?.role === 'dean') return <Navigate to="/dean" replace />;
        if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
        if (user?.role === 'student') return <Navigate to="/student" replace />;
        if (user?.role === 'sysadmin' || user?.role === 'admin') return <Navigate to="/superadmin" replace />;
        return <Navigate to="/login" replace />;
      }
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
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
              <Navigate to={
                (() => {
                  try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    if (user?.role === 'dean') return '/dean';
                    if (user?.role === 'teacher') return '/teacher';
                    if (user?.role === 'student') return '/student';
                    return '/superadmin';
                  } catch (e) {
                    return '/superadmin';
                  }
                })()
              } replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        
        {/* Dean Routes */}
        <Route 
          path="/dean" 
          element={
            <ProtectedRoute allowedRole="dean">
              <DeanLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DeanDashboard />} />
          <Route path="dashboard" element={<DeanDashboard />} />
          <Route path="sections" element={<StudentSections />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="analytics" element={<InstitutionalAnalytics />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="settings" element={<TemplateSettings />} />
        </Route>

        {/* Teacher Routes */}
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="classes" element={<MyClasses />} />

          <Route path="gradebook" element={<Gradebook />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="reports" element={<TeacherReports />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/superadmin" 
          element={
            <ProtectedRoute allowedRole="sysadmin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GlobalAnalytics />} />
          <Route path="security" element={<SecurityAudit />} />
          <Route path="users" element={<UserRoles />} />
          <Route path="users/create" element={<CreateUser />} />
        </Route>

        {/* Student Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="classes" element={<StudentMyClasses />} />
          <Route path="classes/:classId" element={<StudentGradebook />} />
          <Route path="reports" element={<StudentReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
