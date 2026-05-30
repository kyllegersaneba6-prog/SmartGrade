import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, BookOpen, Settings, X, User, LogOut } from 'lucide-react';
import clsx from 'clsx';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setUserData(JSON.parse(userStr)); } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Teacher Management', path: '/admin/teachers', icon: Users },
    { name: 'Manage Sections', path: '/admin/sections', icon: GraduationCap },
    { name: 'Manage Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
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
          'w-64 bg-sidebar text-white flex flex-col h-dvh fixed top-0 left-0 shrink-0 z-50 sidebar-transition',
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
          <div className="flex items-center gap-2.5 mb-2">
            <img src="/logo.png" className="w-10 h-10 object-contain" alt="SmartGrade Logo" />
            <h1 className="text-gold font-bold text-xl leading-tight uppercase tracking-wider">SmartGrade</h1>
          </div>
          <p className="text-xs text-gray-400 tracking-wider font-semibold uppercase">Admin Portal</p>
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

        <div className="p-4 border-t border-sidebar-hover">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userData?.full_name || userData?.name || 'User'}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold uppercase tracking-wider inline-block w-fit">{userData?.system_role || userData?.role || ''}</span>
            </div>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300 shrink-0 self-center" title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
