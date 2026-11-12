import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TeacherProvider, useTeacher } from '../contexts/TeacherContext';
import Sidebar from '../components/teacher/TeacherSidebar';
import NotificationDropdown from '../components/common/NotificationDropdown';
import { useDeptLabel } from '../utils/deptLabel';
import { Archive, Menu } from 'lucide-react';

const TeacherLayoutInner = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('teacher_sidebar_collapsed') === 'true');
  const { isArchiveMode, currentTerm } = useTeacher();
  const deptLabel = useDeptLabel();

  useEffect(() => {
    localStorage.setItem('teacher_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getTitle = () => {
    switch (location.pathname) {
      case '/teacher': return 'Overview';
      case '/teacher/overview': return 'Overview';
      case '/teacher/class-record': return 'Class Record';
      case '/teacher/my-class-list': return 'My Class List';
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
            <span className="hidden whitespace-nowrap rounded-md border border-gray-300 bg-gray-100 px-3 py-1 text-[12px] font-bold text-gray-900 sm:inline-flex">{deptLabel}</span>
            {currentTerm && (
              <span className="hidden whitespace-nowrap rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-[12px] font-semibold tracking-wide text-gray-900 md:inline-flex">
                {currentTerm.school_year} · {currentTerm.semester}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationDropdown />
          </div>
        </header>
        {isArchiveMode && currentTerm && (
          <div className="bg-amber-300 text-gray-900 px-4 md:px-6 lg:px-8 py-2 flex items-center text-[14px] leading-[18px] font-semibold shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Archive size={14} />
              <span>Viewing: <strong>{currentTerm.school_year} — {currentTerm.semester}</strong> — Read Only</span>
            </div>
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-auto bg-gray-50">
          <div className={`p-4 md:p-6 lg:p-8 ${isArchiveMode ? 'archive-readonly-content' : ''}`}>
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



