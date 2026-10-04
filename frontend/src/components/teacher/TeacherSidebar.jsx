import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, LayoutDashboard, Users, BookOpen, FileText, Download, X, FileSpreadsheet, CalendarCheck, LogOut, User, Settings } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck },
  { name: 'Class Record', path: '/teacher/class-record', icon: FileSpreadsheet },
  { name: 'Analytics', path: '/teacher/analytics', icon: BarChart3 },
  { name: 'Grade Summary', path: '/teacher/grade-summary', icon: FileText },
  { name: 'Settings', path: '/teacher/settings', icon: Settings },
];

const TeacherSidebar = ({ isOpen, onClose }) => {
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
    window.location.href = '/login';
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0c1925]/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={clsx(
          'w-68 text-white flex flex-col fixed top-0 left-0 bottom-0 shrink-0 z-40 sidebar-transition',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <div className="flex flex-row items-center gap-2 p-6">
            <img src="/src/assets/logo.png" className="w-8 h-8 object-contain" alt="SmartGrade Logo" />
            <span className="text-amber-400 font-bold text-xl tracking-wide">SmartGrade</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-6 py-3 transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[#0a316a] text-amber-400 font-medium border-l-4 border-gold'
                    : ' hover:bg-[#0a316a] hover:text-white border-l-4 border-transparent'
                )}
              >
                <Icon size={20} className={isActive ? 'text-amber-400' : 'text-white'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t-2 border-white border-sidebar-hover">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{userData?.full_name || userData?.name || 'User'}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/20 text-amber-400 uppercase tracking-wider inline-block w-fit">{userData?.system_role || userData?.role || ''}</span>
            </div>
            <button onClick={() => setShowLogoutModal(true)} className="text-red-400 hover:text-red-300 shrink-0 self-center" title="Sign out">
              <LogOut size={18} />
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

export default TeacherSidebar;
