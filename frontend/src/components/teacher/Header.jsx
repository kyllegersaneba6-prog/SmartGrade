import { Menu } from 'lucide-react';

const Header = ({ title, onMenuToggle, schoolYear, semester }) => {
  return (
    <header className="h-16 bg-sidebar flex items-center justify-between px-4 md:px-6 lg:px-8 text-white border-b border-sidebar-hover shadow-sm fixed top-0 left-0 right-0 z-50 shrink-0">
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
    </header>
  );
};

export default Header;
