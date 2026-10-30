import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../contexts/AdminContext';
import AdminSidebar from '../components/admin/AdminSidebar';
import NotificationDropdown from '../components/common/NotificationDropdown';
import { useDeptLabel } from '../utils/deptLabel';
import { Menu, X, Archive } from 'lucide-react';

const AdminLayoutInner = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const { currentTerm, isArchiveMode, setViewTerm } = useAdmin();
  const deptLabel = useDeptLabel();

  useEffect(() => {
    localStorage.setItem('admin_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getTitle = () => {
    switch (location.pathname) {
      case '/admin': return 'Dashboard';
      case '/admin/teachers': return 'Teacher Management';
      case '/admin/teachers/create': return 'Create New Teacher';
      case '/admin/sections': return 'Manage Sections';
      case '/admin/subjects': return 'Manage Subjects';
      case '/admin/bulk-students': return 'Bulk Student Import';
      case '/admin/settings': return 'Settings';
      default: return 'Admin';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div
        style={{ '--admin-sidebar-width': sidebarCollapsed ? '72px' : '224px' }}
        className={`flex h-[100dvh] flex-col overflow-hidden transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[224px]'}`}
      >
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
            <h1 className="truncate text-sm font-bold text-sidebar sm:text-base">{getTitle()}</h1>
            <span className="hidden whitespace-nowrap rounded-full border border-[#0c1925] bg-[#0c1925] px-3 py-1 text-[12px] font-bold text-amber-300 sm:inline-flex">
              {deptLabel}
            </span>
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
          <div className="flex shrink-0 items-center justify-between bg-amber-600/90 px-4 py-2 text-xs font-semibold text-white shadow-sm md:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Archive size={14} />
              <span>Viewing: <strong>{currentTerm.school_year} — {currentTerm.semester}</strong> — Read Only</span>
            </div>
            <button
              type="button"
              onClick={() => setViewTerm(null)}
              className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 transition-colors hover:bg-white/30"
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

const AdminLayout = () => (
  <AdminProvider>
    <AdminLayoutInner />
  </AdminProvider>
);

export default AdminLayout;
