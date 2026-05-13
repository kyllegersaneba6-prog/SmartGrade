import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Search, Bell, History, Zap, Download, User, Menu } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getTitle = () => {
    switch (location.pathname) {
      case '/admin': return 'Global Analytics';
      case '/admin/system-config': return 'System Configuration';
      case '/admin/security': return 'Security & Audit Logs';
      case '/admin/users': return 'User & Role Management';
      default: return 'Super Admin Portal';
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-light font-sans text-text-main">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — matches Dean header style */}
        <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
            <h2 className="text-sm font-bold text-gold tracking-widest uppercase hidden sm:block">Super Admin Console</h2>
            <span className="text-gray-500 hidden md:block">|</span>
            <h3 className="text-sm text-gray-300 truncate">{getTitle()}</h3>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Global Search..."
                className="pl-9 pr-4 py-1.5 bg-sidebar-hover text-xs rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold w-40 lg:w-56 border border-sidebar-active"
              />
            </div>

            {/* Action buttons */}
            <button className="flex items-center gap-1.5 bg-gold hover:bg-gold-hover text-sidebar font-bold px-3 lg:px-4 py-1.5 rounded-full text-xs transition-colors">
              <Zap size={13} />
              <span className="hidden sm:inline">Compute</span>
            </button>
            <button className="text-gold border border-gold hover:bg-gold-light hover:text-sidebar px-3 lg:px-4 py-1.5 rounded-full text-xs font-bold transition-colors items-center gap-1.5 hidden sm:flex">
              <Download size={13} />
              Export
            </button>

            {/* Icons */}
            <div className="flex items-center gap-3 md:gap-4 text-gray-300">
              <button className="hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <button className="hover:text-white transition-colors hidden sm:block">
                <History size={18} />
              </button>
              <button className="hover:text-white transition-colors hidden sm:block">
                <User size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
