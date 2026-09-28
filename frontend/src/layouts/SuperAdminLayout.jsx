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
      default: return 'Settings';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <SuperAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[274px] flex flex-col h-[100dvh] overflow-hidden">
        <header className="h-16 lg-210 flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm shrink-0" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
            <h3 className="text-xs sm:text-sm text-white truncate font-medium">{getTitle()}</h3>
             <span className="text-[10px] bg-gold/20 text-amber-400 border border-gold/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">SUPER ADMIN PORTAL</span>
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


