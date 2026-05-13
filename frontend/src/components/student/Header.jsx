import { Search, Bell, Settings, Menu } from 'lucide-react';

const Header = ({ title, onMenuToggle }) => {
  return (
    <header className="h-16 lg:h-20 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuToggle} className="text-gray-300 hover:text-white lg:hidden shrink-0">
          <Menu size={22} />
        </button>
        <h2 className="text-lg lg:text-xl font-medium text-gold truncate">{title}</h2>
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative hidden md:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search metrics..."
            className="pl-10 pr-4 py-2 bg-sidebar-hover text-sm rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold w-48 lg:w-72"
          />
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 text-gray-300">
          <button className="hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-sidebar"></span>
          </button>
          <button className="hover:text-white transition-colors hidden sm:block">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gold-light border-2 border-gold overflow-hidden ml-1 lg:ml-2 flex items-center justify-center text-sidebar font-bold text-xs">
            SJ
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
