import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, GraduationCap, BookOpen, Settings, X, User, LogOut } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Manage Sections', path: '/admin/sections', icon: GraduationCap },
  { name: 'Manage Subjects', path: '/admin/subjects', icon: BookOpen },
  { name: 'Teacher Management', path: '/admin/teachers', icon: Users },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminSidebar = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setUserData(JSON.parse(userStr)); } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_view_term');
    window.location.href = '/login';
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0c1925]/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={clsx(
          'fixed bottom-0 left-0 top-0 z-40 flex w-64 shrink-0 flex-col text-white transition-[width,transform] duration-300 ease-in-out lg:w-56',
          isCollapsed && 'lg:w-[72px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Close navigation"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={clsx(
            'hidden h-16 w-full shrink-0 items-center gap-3 px-5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300 lg:flex',
            isCollapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <img src="/src/assets/logo.png" className="h-8 w-8 shrink-0 object-contain" alt="" />
          <span className={clsx('whitespace-nowrap text-lg font-extrabold tracking-wide text-white', isCollapsed && 'lg:hidden')}>SmartGrade</span>
        </button>
        <div className="flex h-16 shrink-0 items-center gap-3 px-5 lg:hidden">
          <img src="/src/assets/logo.png" className="h-8 w-8 shrink-0 object-contain" alt="SmartGrade Logo" />
          <span className="whitespace-nowrap text-lg font-extrabold tracking-wide text-white">SmartGrade</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                aria-label={item.name}
                aria-current={isActive ? 'page' : undefined}
                title={isCollapsed ? item.name : undefined}
                className={clsx(
                  'group mx-1 flex min-h-11 items-center gap-3 whitespace-nowrap rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-semibold transition-colors',
                  isCollapsed && 'lg:mx-0 lg:justify-center lg:px-0',
                  isActive
                    ? 'border-gold bg-[#24384b] text-amber-300 shadow-sm'
                    : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon
                  size={19}
                  aria-hidden="true"
                  className={clsx('shrink-0 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-amber-300' : 'text-slate-300 group-hover:text-white')}
                />
                <span className={clsx('overflow-hidden text-ellipsis transition-transform duration-200 origin-left group-hover:scale-110', isCollapsed && 'lg:hidden')}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className={clsx('border-t border-white/15 p-3', isCollapsed && 'lg:p-2')}>
          <div className={clsx('flex min-w-0 items-center gap-3 rounded-xl px-2 py-2', isCollapsed && 'lg:flex-col lg:gap-1 lg:px-0')}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300/15 ring-1 ring-amber-200/20">
              <User size={16} aria-hidden="true" className="text-amber-300" />
            </div>
            <div className={clsx('min-w-0 flex-1', isCollapsed && 'lg:hidden')}>
              <p className="break-words whitespace-normal text-xs font-semibold leading-tight text-white">{userData?.full_name || userData?.name || 'User'}</p>
              <span className="mt-1 inline-block w-fit rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                {userData?.system_role || userData?.role || 'Admin'}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-300 transition-colors hover:bg-rose-400/10 hover:text-rose-200"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out</h3>
            <p className="text-sm text-gray-900 mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md" style={{ background: '#ef4444' }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
