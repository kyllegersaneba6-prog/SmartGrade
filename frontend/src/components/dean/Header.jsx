import { Search, Bell, MonitorPlay, User } from 'lucide-react';

const Header = ({ title }) => {
  return (
    <header className="h-16 bg-sidebar flex items-center justify-between px-8 text-white border-b border-sidebar-hover shadow-sm z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-gold tracking-widest uppercase">Reviewer Console</h2>
        <span className="text-gray-500">|</span>
        <h3 className="text-sm text-gray-300">{title}</h3>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teacher or department..."
            className="pl-9 pr-4 py-1.5 bg-sidebar-hover text-xs rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold w-64 border border-sidebar-active"
          />
        </div>
        
        <button className="text-gold border border-gold hover:bg-gold-light hover:text-sidebar px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
          Quick Audit
        </button>

        <div className="flex items-center gap-4 text-gray-300">
          <button className="hover:text-white transition-colors relative">
            <Bell size={18} />
          </button>
          <button className="hover:text-white transition-colors">
            <MonitorPlay size={18} />
          </button>
          <button className="hover:text-white transition-colors">
            <User size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
