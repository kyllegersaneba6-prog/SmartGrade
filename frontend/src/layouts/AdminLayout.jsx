import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Search, Bell, History, Zap, Download, User, Menu } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };


  const getTitle = () => {
    switch (location.pathname) {
      case '/admin': return 'Dashboard';
      case '/admin/system-config': return 'System Configuration';
      case '/admin/security': return 'Security & Audit Logs';
      case '/admin/users': return 'User & Role Management';
      default: return 'Super Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-[100dvh] overflow-hidden">
        {/* Top Bar — matches Dean header style */}
        <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
            <h2 className="text-[10px] sm:text-sm font-bold text-gold tracking-widest uppercase hidden md:block whitespace-nowrap">Super Admin Console</h2>
            <span className="text-gray-600 hidden md:block">|</span>
            <h3 className="text-xs sm:text-sm text-gray-300 truncate font-medium">{getTitle()}</h3>
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
            <div className="flex items-center gap-2 sm:gap-4 text-gray-300">
              <button className="hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <button className="hover:text-white transition-colors hidden sm:block">
                <History size={18} />
              </button>
              <div className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hover:text-white transition-colors hidden sm:block focus:outline-none"
                >
                  <User size={18} />
                </button>
                
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setUserMenuOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-2xl py-2 z-30 border border-gray-100 overflow-hidden transform origin-top-right transition-all">
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</p>
                        <p className="text-sm font-bold text-sidebar truncate">Admin User</p>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-semibold"
                      >
                        <Zap size={14} className="rotate-180" />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
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
