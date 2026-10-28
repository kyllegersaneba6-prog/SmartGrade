import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import SuperAdminSidebar from '../components/superadmin/SuperAdminSidebar';

const SuperAdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('superadmin_sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('superadmin_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const getTitle = () => {
    switch (location.pathname) {
      case '/superadmin': return 'Dashboard';
      case '/superadmin/security': return 'Security & Audit Logs';
      case '/superadmin/users': return 'Admin Management';
      case '/superadmin/users/create': return 'Create New Admin';
      case '/superadmin/departments': return 'Departments & Courses';
      case '/superadmin/settings': return 'Settings';
      default: return 'Super Admin';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className={`flex h-[100dvh] flex-col overflow-hidden transition-[padding] duration-300 ${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[224px]'}`}>
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
            <span className="hidden whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800 sm:inline-flex">
              System Administration
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
