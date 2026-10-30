import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, SearchX } from 'lucide-react';

const resolveHome = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const role = user?.role || user?.system_role;
    if (role === 'teacher') return { path: '/teacher', label: 'Go to dashboard' };
    if (role === 'admin') return { path: '/admin', label: 'Go to dashboard' };
    if (role === 'superadmin') return { path: '/superadmin', label: 'Go to dashboard' };
  } catch {
    // No valid session stored — fall through to the login page.
  }
  return { path: '/login', label: 'Go to login' };
};

const NotFound = () => {
  const navigate = useNavigate();
  const home = resolveHome();
  const path = `${window.location.pathname}${window.location.search}`;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(home.path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans bg-slate-900 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(209,166,56,0.04)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.04)_0%,transparent_60%)]" />
      </div>

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700/50 p-8 md:p-10 text-center shadow-2xl shadow-[#0c1925]/30"
        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/src/assets/logo.png" className="w-16 h-16 object-contain mb-3" alt="SmartGrade Logo" />
          <h1 className="text-amber-300 font-extrabold text-xl tracking-wide">SmartGrade</h1>
          <p className="text-slate-300 text-xs mt-1">Academic Management System</p>
        </div>

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-300/10 border border-amber-300/20 flex items-center justify-center">
          <SearchX className="w-7 h-7 text-amber-300" />
        </div>

        <p className="text-amber-300 font-extrabold text-6xl tracking-tight leading-none mb-3">404</p>
        <h2 className="text-white font-bold text-xl mb-2">Page not found</h2>
        <p className="text-slate-400 text-sm mb-5">
          The page you are looking for does not exist or may have moved.
        </p>

        <code className="block max-w-full truncate rounded-lg bg-slate-800/60 border border-slate-700/50 px-3 py-2 text-xs text-slate-400 mb-7">
          {path}
        </code>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate(home.path)}
            className="flex-1 bg-amber-300 hover:bg-amber-300 text-black font-bold py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-gold/25"
          >
            <span>{home.label}</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={goBack}
            className="flex-1 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
