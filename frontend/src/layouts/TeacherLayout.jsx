import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TeacherProvider, useTeacher } from '../contexts/TeacherContext';
import Sidebar from '../components/teacher/TeacherSidebar';
import NotificationDropdown from '../components/common/NotificationDropdown';
import { Archive, X, Menu } from 'lucide-react';

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
      <div className="lg:pl-[272px] flex flex-col h-[100dvh] overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm shrink-0" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
           
          
            <h3 className="text-xs sm:text-sm text-white truncate font-medium">{getTitle()}</h3>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gold/20 text-amber-400 whitespace-nowrap">{JSON.parse(localStorage.getItem('user') || '{}')?.department}</span>
           {currentTerm && (
              <>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-amber-400 whitespace-nowrap tracking-wider">{currentTerm.school_year} | {currentTerm.semester}</span>
              </>
            )}
            
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationDropdown items={[]} />
          </div>
        </header>
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



