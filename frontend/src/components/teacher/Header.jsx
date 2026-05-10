import { Search, Bell, HelpCircle } from 'lucide-react';

const Header = ({ title }) => {
  return (
    <header className="h-20 bg-sidebar flex items-center justify-between px-8 text-white border-b border-sidebar-hover">
      <h2 className="text-xl font-medium text-gold">{title}</h2>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students or records..."
            className="pl-10 pr-4 py-2 bg-sidebar-hover text-sm rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold w-72"
          />
        </div>
        
        <div className="flex items-center gap-4 text-gray-300">
          <button className="hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-sidebar"></span>
          </button>
          <button className="hover:text-white transition-colors">
            <HelpCircle size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gold-light border-2 border-gold overflow-hidden ml-2 flex items-center justify-center text-sidebar font-bold text-xs">
            TR
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
