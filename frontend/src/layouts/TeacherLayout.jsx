import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/teacher/Sidebar';
import Header from '../components/teacher/Header';

const getToken = () => localStorage.getItem('token');
const api = (url) => fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const TeacherLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState(null);

  useEffect(() => {
    api('http://localhost:5000/api/terms/active')
      .then(r => r.ok ? r.json() : null)
      .then(d => setActiveTerm(d))
      .catch(() => {});
  }, []);

  const schoolYear = activeTerm?.school_year || null;
  const semester = activeTerm?.semester || null;
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/teacher': return 'Dashboard';
      case '/teacher/dashboard': return 'Dashboard';
      case '/teacher/class-record': return 'Class Record';
      case '/teacher/attendance': return 'Attendance';
      case '/teacher/grade-summary': return 'Grade Summary';
      case '/teacher/analytics': return 'Analytics';
      default: return 'SmartGrade';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-[100dvh] overflow-hidden">
        <Header title={getTitle()} schoolYear={schoolYear} semester={semester} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
