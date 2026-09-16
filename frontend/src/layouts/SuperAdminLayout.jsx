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
      <div className="lg:pl-[276px] flex flex-col h-[100dvh] overflow-hidden pt-16">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm fixed top-0 left-0 right-0 z-50 shrink-0" style={{ backgroundColor: '#0f4a82' }}>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
           <div className="flex flex-row items-center gap-2 hidden md:flex"> <img src="/src/assets/logo.png" className="w-8 h-8 object-contain" alt="SmartGrade Logo" /> <span className="text-gold font-bold text-xl tracking-wide">SmartGrade</span>  </div>
            <span className="text-white/50 hidden md:block">|</span>
            <h3 className="text-xs sm:text-sm text-white truncate font-medium">{getTitle()}</h3>
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
