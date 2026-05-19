import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart2, BookOpen, FileText, Settings, LogOut, Download, X, MessageSquare } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'My Classes', path: '/teacher/classes', icon: Users },
  { name: 'Analytics Central', path: '/teacher/analytics', icon: BarChart2 },
  { name: 'Gradebook', path: '/teacher/gradebook', icon: BookOpen },
  { name: 'Reports', path: '/teacher/reports', icon: FileText },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const handleFeedbackClick = () => {
    const feedbackList = JSON.parse(localStorage.getItem('smartgrade_feedback') || '[]');
    feedbackList.push(new Date().toISOString());
    localStorage.setItem('smartgrade_feedback', JSON.stringify(feedbackList));
    window.dispatchEvent(new Event('feedback_added'));
    alert('Feedback submitted!');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

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
          <h1 className="text-gold font-bold text-xl leading-tight uppercase tracking-wider">SmartGrade</h1>
          <p className="text-xs text-gray-400 tracking-wider font-semibold mt-1 uppercase">TEACHER PORTAL</p>
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
                  'flex items-center gap-3 px-6 py-3 transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-gold font-medium border-l-4 border-gold'
                    : 'text-gray-300 hover:bg-sidebar-hover hover:text-white border-l-4 border-transparent'
                )}
              >
                <Icon size={20} className={isActive ? 'text-gold' : 'text-gray-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-4 mb-2">

          <button 
            onClick={handleFeedbackClick}
            className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium w-full"
          >
            <MessageSquare size={18} />
            Feedback
          </button>
          <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
            <Settings size={18} />
            Settings
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

export default Sidebar;
