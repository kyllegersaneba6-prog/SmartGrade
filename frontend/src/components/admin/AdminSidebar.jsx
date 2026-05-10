import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings2, ShieldCheck, Users, LogOut, Settings, Circle } from 'lucide-react';
import clsx from 'clsx';

const AdminSidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Global Analytics', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'System Configuration', path: '/admin/system-config', icon: Settings2 },
    { name: 'Security & Audit', path: '/admin/security', icon: ShieldCheck },
    { name: 'User & Roles', path: '/admin/users', icon: Users },
  ];

  return (
    <div className="w-64 bg-sidebar text-white flex flex-col h-screen sticky top-0">
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
        <button className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
