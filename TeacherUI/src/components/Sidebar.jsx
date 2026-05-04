import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart2, BookOpen, FileText, Settings, LogOut, GraduationCap } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'My Classes', path: '/classes', icon: Users },
    { name: 'Analytics Central', path: '/analytics', icon: BarChart2 },
    { name: 'Gradebook', path: '/gradebook', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  return (
    <div className="w-64 bg-sidebar text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 pb-8 flex items-center gap-3">
        <div className="bg-gold p-2 rounded-lg">
          <GraduationCap size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-gold font-bold text-xl leading-tight">SmartGrade</h1>
          <p className="text-xs text-gray-400 tracking-wider">ACADEMIC PORTAL</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
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

      <div className="p-4 px-8 space-y-4 mb-4">
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
          <Settings size={20} />
          Settings
        </button>
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
