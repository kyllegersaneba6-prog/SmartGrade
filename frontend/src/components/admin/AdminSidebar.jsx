import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings2, ShieldCheck, Users, LogOut, Settings, Circle, X } from 'lucide-react';
import clsx from 'clsx';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };


  const navItems = [
    { name: 'Global Analytics', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'System Configuration', path: '/admin/system-config', icon: Settings2 },
    { name: 'Security & Audit', path: '/admin/security', icon: ShieldCheck },
    { name: 'User & Roles', path: '/admin/users', icon: Users },
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
          'w-64 bg-sidebar text-white flex flex-col h-[100dvh] fixed top-0 left-0 shrink-0 z-50 sidebar-transition',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="p-6 pb-8">
          <h1 className="text-gold font-bold text-xl leading-tight uppercase tracking-wider">SmartGrade</h1>
          <p className="text-xs text-gray-400 tracking-wider font-semibold mt-1 uppercase">Super Admin Portal</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
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

        <div className="p-6 space-y-4 mb-2">
          <div className="flex items-center gap-2 text-xs text-green-400 font-medium mb-2">
            <Circle size={8} fill="currentColor" />
            System Status: Active
          </div>
          <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <Settings size={18} />
            Support
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>

        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
