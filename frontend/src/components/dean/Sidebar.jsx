import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BarChart2, FileText, Download, Settings2, X, Users } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navItems = [
    { name: 'Compliance Dashboard', path: '/dean/dashboard', icon: LayoutDashboard },
    { name: 'Student Sections', path: '/dean/sections', icon: Users },
    { name: 'Teacher Submissions', path: '/dean/submissions', icon: CheckSquare },
    { name: 'Institutional Analytics', path: '/dean/analytics', icon: BarChart2 },
    { name: 'Report Generator', path: '/dean/reports', icon: FileText },
    { name: 'Template Settings', path: '/dean/settings', icon: Settings2 },
  ];

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={clsx(
          'w-64 bg-sidebar text-white flex flex-col h-dvh fixed top-0 left-0 shrink-0 z-50 sidebar-transition',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="p-6 pb-8">
          <h1 className="text-gold font-bold text-xl leading-tight uppercase tracking-wider">SmartGrade</h1>
          <p className="text-xs text-gray-400 tracking-wider font-semibold mt-1 uppercase">DEAN PORTAL</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-6 py-3 transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-gold font-medium border-l-4 border-gold'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white border-l-4 border-transparent'
                )}
              >
                <item.icon size={20} className={isActive ? 'text-gold' : 'text-gray-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

      </div>
    </>
  );
};

export default Sidebar;
