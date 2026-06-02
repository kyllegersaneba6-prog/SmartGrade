import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SuperAdminSidebar from '../components/superadmin/SuperAdminSidebar';
import { Menu } from 'lucide-react';

const SuperAdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const getTitle = () => {
    switch (location.pathname) {
      case '/superadmin': return 'Dashboard';
      case '/superadmin/security': return 'Security & Audit Logs';
      case '/superadmin/users': return 'Admin Management';
      case '/superadmin/users/create': return 'Create New Admin';
      case '/superadmin/departments': return 'Departments & Courses';
      default: return 'Super Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-[100dvh] overflow-hidden pt-16">
        <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm fixed top-0 left-0 right-0 z-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
            <h2 className="text-[10px] sm:text-sm font-bold text-gold tracking-widest uppercase hidden md:block whitespace-nowrap">Super Admin Portal</h2>
            <span className="text-gray-600 hidden md:block">|</span>
            <h3 className="text-xs sm:text-sm text-gray-300 truncate font-medium">{getTitle()}</h3>
          </div>

        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
