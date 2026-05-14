import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DeanLayout from './layouts/DeanLayout';
import TeacherLayout from './layouts/TeacherLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';

// Dean Pages
import DeanDashboard from './pages/dean/Dashboard';
import TeacherSubmissions from './pages/dean/TeacherSubmissions';
import InstitutionalAnalytics from './pages/dean/InstitutionalAnalytics';
import ReportGenerator from './pages/dean/ReportGenerator';
import TemplateSettings from './pages/dean/TemplateSettings';

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard';
import MyClasses from './pages/teacher/MyClasses';
import TeacherAnalytics from './pages/teacher/Analytics';
import Gradebook from './pages/teacher/Gradebook';
import TeacherReports from './pages/teacher/Reports';

// Admin Pages
import GlobalAnalytics from './pages/admin/GlobalAnalytics';
import SystemConfiguration from './pages/admin/SystemConfiguration';
import SecurityAudit from './pages/admin/SecurityAudit';
import UserRoles from './pages/admin/UserRoles';

// Student Pages
import StudentDashboard from './pages/student/Dashboard';
import StudentMyClasses from './pages/student/MyClasses';
import StudentGradebook from './pages/student/Gradebook';
import StudentReports from './pages/student/Reports';
import Login from './pages/Login';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
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
          element={<Navigate to={token ? "/admin" : "/login"} replace />} 
        />

        
        {/* Dean Routes */}
        <Route path="/dean" element={<DeanLayout />}>
          <Route index element={<DeanDashboard />} />
          <Route path="dashboard" element={<DeanDashboard />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="analytics" element={<InstitutionalAnalytics />} />
          <Route path="reports" element={<ReportGenerator />} />
          <Route path="settings" element={<TemplateSettings />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="classes" element={<MyClasses />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="gradebook" element={<Gradebook />} />
          <Route path="reports" element={<TeacherReports />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GlobalAnalytics />} />
          <Route path="system-config" element={<SystemConfiguration />} />
          <Route path="security" element={<SecurityAudit />} />
          <Route path="users" element={<UserRoles />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="classes" element={<StudentMyClasses />} />
          <Route path="gradebook" element={<StudentGradebook />} />
          <Route path="reports" element={<StudentReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
