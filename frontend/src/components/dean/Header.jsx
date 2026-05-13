import { Search, Bell, MonitorPlay, User, Menu } from 'lucide-react';

const Header = ({ title, onMenuToggle }) => {
  return (
    <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm z-10">
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        <button onClick={onMenuToggle} className="text-gray-300 hover:text-white lg:hidden shrink-0">
          <Menu size={22} />
        </button>
        <h2 className="text-sm font-bold text-gold tracking-widest uppercase truncate hidden sm:block">Reviewer Console</h2>
        <span className="text-gray-500 hidden md:block">|</span>
        <h3 className="text-sm text-gray-300 truncate">{title}</h3>
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teacher or department..."
            className="pl-9 pr-4 py-1.5 bg-sidebar-hover text-xs rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold w-48 lg:w-64 border border-sidebar-active"
          />
        </div>
        
        <button className="text-gold border border-gold hover:bg-gold-light hover:text-sidebar px-3 lg:px-4 py-1.5 rounded-full text-xs font-bold transition-colors hidden sm:block">
          Quick Audit
        </button>

        <div className="flex items-center gap-3 md:gap-4 text-gray-300">
          <button className="hover:text-white transition-colors relative">
            <Bell size={18} />
          </button>
          <button className="hover:text-white transition-colors hidden sm:block">
            <MonitorPlay size={18} />
          </button>
          <button className="hover:text-white transition-colors hidden sm:block">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
