import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TeacherProvider, useTeacher } from '../contexts/TeacherContext';
import Sidebar from '../components/teacher/Sidebar';
import Header from '../components/teacher/Header';
import { Archive, X } from 'lucide-react';

const TeacherLayoutInner = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isArchiveMode, currentTerm, setViewTerm } = useTeacher();

  const getTitle = () => {
    switch (location.pathname) {
      case '/teacher': return 'Dashboard';
      case '/teacher/dashboard': return 'Dashboard';
      case '/teacher/class-record': return 'Class Record';
      case '/teacher/attendance': return 'Attendance';
      case '/teacher/grade-summary': return 'Grade Summary';
      case '/teacher/analytics': return 'Analytics';
      case '/teacher/settings': return 'Settings';
      default: return 'SmartGrade';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-[100dvh] overflow-hidden">
        <Header title={getTitle()} onMenuToggle={() => setSidebarOpen(true)} />
        {isArchiveMode && currentTerm && (
          <div className="bg-amber-600/90 text-white px-4 md:px-6 lg:px-8 py-2 flex items-center justify-between text-xs font-semibold shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Archive size={14} />
              <span>Viewing: <strong>{currentTerm.school_year} — {currentTerm.semester}</strong> — Read Only</span>
            </div>
            <button
              onClick={() => setViewTerm(null)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            >
              <X size={12} /> Exit Archive
            </button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const TeacherLayout = () => (
  <TeacherProvider>
    <TeacherLayoutInner />
  </TeacherProvider>
);

export default TeacherLayout;
