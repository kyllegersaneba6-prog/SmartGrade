import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, FileBarChart, HelpCircle, LogOut, GraduationCap, X } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'My Classes', path: '/student/classes', icon: BookOpen },
    { name: 'Gradebook', path: '/student/gradebook', icon: ClipboardList },
    { name: 'Reports', path: '/student/reports', icon: FileBarChart },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={clsx(
          'w-64 bg-sidebar text-white flex flex-col h-screen sticky top-0 shrink-0 z-50',
          'fixed lg:static sidebar-transition',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="p-6 pb-8 flex items-center gap-3">
          <div className="bg-gold p-2 rounded-lg">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-gold font-bold text-xl leading-tight">SmartGrade</h1>
            <p className="text-xs text-gray-400 tracking-wider">STUDENT PORTAL</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.path === '/student'
              ? location.pathname === '/student'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
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

        <div className="border-t border-sidebar-hover mx-4 mb-2"></div>
        <div className="p-4 px-8 space-y-4 mb-4">
          <button className="flex items-center gap-3 text-gold hover:text-white transition-colors font-medium">
            <HelpCircle size={20} />
            Support
          </button>
          <button className="flex items-center gap-3 text-gold hover:text-white transition-colors font-medium">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
