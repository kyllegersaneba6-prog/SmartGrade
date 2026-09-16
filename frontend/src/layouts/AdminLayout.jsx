import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../contexts/AdminContext';
import AdminSidebar from '../components/admin/AdminSidebar';
import { Menu, X, Archive } from 'lucide-react';

const AdminLayoutInner = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeTerm, currentTerm, isArchiveMode, setViewTerm } = useAdmin();

  const getTitle = () => {
    switch (location.pathname) {
      case '/admin': return 'Dashboard';
      case '/admin/teachers': return 'Teacher Management';
      case '/admin/teachers/create': return 'Create New Teacher';
      case '/admin/sections': return 'Manage Sections';
      case '/admin/subjects': return 'Manage Subjects';
      default: return 'Admin Portal';
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans text-text-main">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col h-screen pt-16">
        <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm fixed top-0 left-0 right-0 z-50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300 hover:text-white lg:hidden shrink-0">
              <Menu size={22} />
            </button>
            <h2 className="text-[10px] sm:text-sm font-bold text-gold tracking-widest uppercase hidden md:block whitespace-nowrap">Admin Portal</h2>
            <span className="text-gray-600 hidden md:block">|</span>
            <h3 className="text-xs sm:text-sm text-gray-300 truncate font-medium">{getTitle()}</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gold/20 text-gold whitespace-nowrap">{JSON.parse(localStorage.getItem('user') || '{}')?.department}</span>
            {currentTerm && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap border ${
                isArchiveMode ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {isArchiveMode && <Archive size={10} className="inline mr-1" />}
                {currentTerm.school_year} — {currentTerm.semester}
              </span>
            )}
          </div>

        </header>

        {isArchiveMode && currentTerm && (
          <div className="bg-amber-600/90 text-white px-4 md:px-6 lg:px-8 py-2 flex items-center justify-between text-xs font-semibold shadow-sm">
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

        <main className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8">
          <Outlet />
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
