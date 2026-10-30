import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TeacherProvider, useTeacher } from '../contexts/TeacherContext';
import Sidebar from '../components/teacher/TeacherSidebar';
import NotificationDropdown from '../components/common/NotificationDropdown';
import { useDeptLabel } from '../utils/deptLabel';
import { Archive, X, Menu } from 'lucide-react';

const TeacherLayoutInner = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('teacher_sidebar_collapsed') === 'true');
  const { isArchiveMode, currentTerm, setViewTerm } = useTeacher();
  const deptLabel = useDeptLabel();

  useEffect(() => {
    localStorage.setItem('teacher_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getTitle = () => {
    switch (location.pathname) {
      case '/teacher': return 'Overview';
      case '/teacher/overview': return 'Overview';
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
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div style={{ '--teacher-sidebar-width': sidebarCollapsed ? '72px' : '224px' }} className={`flex h-[100dvh] flex-col overflow-hidden transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[224px]'}`}>
        <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 text-sidebar shadow-sm md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sidebar transition-colors hover:bg-gray-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-sidebar sm:text-base">{getTitle()}</h1>
            </div>
            <span className="hidden whitespace-nowrap rounded-full border border-[#0c1925] bg-[#0c1925] px-3 py-1 text-[12px] font-bold text-amber-300 sm:inline-flex">{deptLabel}</span>
            {currentTerm && (
              <span className="hidden whitespace-nowrap rounded-full border border-[#0c1925] bg-[#0c1925] px-2.5 py-1 text-[12px] font-semibold tracking-wide text-amber-300 md:inline-flex">
                {currentTerm.school_year} · {currentTerm.semester}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
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



