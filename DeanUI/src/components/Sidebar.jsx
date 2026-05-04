import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BarChart2, FileText, Settings, LogOut, Download, Settings2 } from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Compliance Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Teacher Submissions', path: '/submissions', icon: CheckSquare },
    { name: 'Institutional Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Report Generator', path: '/reports', icon: FileText },
    { name: 'Template Settings', path: '/settings', icon: Settings2 },
  ];

  return (
    <div className="w-64 bg-sidebar text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 pb-8">
        <h1 className="text-gold font-bold text-xl leading-tight uppercase tracking-wider">SmartGrade</h1>
        <p className="text-xs text-gray-400 tracking-wider font-semibold mt-1 uppercase">Reviewer Module</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
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
        <button className="w-full bg-gold hover:bg-gold-hover text-sidebar font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4">
          <Download size={18} /> Export Reports
        </button>
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <Settings size={18} />
          Settings
        </button>
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
