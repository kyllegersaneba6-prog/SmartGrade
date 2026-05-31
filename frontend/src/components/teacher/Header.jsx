import { useState } from 'react';
import { Menu, RotateCw } from 'lucide-react';

const Header = ({ title, onMenuToggle, schoolYear, semester }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleReload = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('app:reload'));
    const done = () => { setRefreshing(false); window.removeEventListener('app:reload-done', done); };
    window.addEventListener('app:reload-done', done);
  };

  return (
    <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        <button onClick={onMenuToggle} className="text-gray-300 hover:text-white lg:hidden shrink-0">
          <Menu size={22} />
        </button>
        <h2 className="text-sm font-bold text-gold tracking-widest uppercase truncate hidden sm:block">Teacher Portal</h2>
        <span className="text-gray-500 hidden md:block">|</span>
        <h3 className="text-sm text-gray-300 truncate">{title}</h3>
        {schoolYear && semester && (
          <>
            <span className="text-gray-500 hidden md:block">|</span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/10 text-gray-300 whitespace-nowrap tracking-wider">{schoolYear} | {semester}</span>
          </>
        )}
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-gold/20 text-gold whitespace-nowrap">{JSON.parse(localStorage.getItem('user') || '{}')?.department}</span>
      </div>
      
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={handleReload} disabled={refreshing} className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/10 text-gold border border-gold/30 hover:bg-white/20 transition-colors">
            <RotateCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? '...' : 'Reload'}
          </button>
        </div>
    </header>
  );
};

export default Header;
