import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, SearchX } from 'lucide-react';

const resolveHome = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const role = user?.role || user?.system_role;
    if (role === 'teacher') return { path: '/teacher/overview', label: 'Go to overview' };
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F3F6FA 50%, #E2E8F0 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(12,25,37,0.04)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(245,166,35,0.06)_0%,transparent_60%)]" />
      </div>

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl p-8 md:p-10 text-center shadow-[0_18px_50px_-10px_rgba(71,85,105,0.45)]"
        style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F3F6FA 50%, #E2E8F0 100%)' }}
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/src/assets/logo.png" className="w-16 h-16 object-contain mb-3" alt="SmartGrade Logo" />
          <h1 className="text-[#0c1925] font-extrabold text-xl tracking-wide">SmartGrade</h1>
          <p className="text-gray-500 text-xs mt-1">Academic Management System</p>
        </div>

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
          <SearchX className="w-7 h-7 text-amber-600" />
        </div>

        <p className="text-[#0c1925] font-extrabold text-6xl tracking-tight leading-none mb-3">404</p>
        <h2 className="text-[#0c1925] font-bold text-xl mb-2">Page not found</h2>
        <p className="text-gray-500 text-sm mb-5">
          The page you are looking for does not exist or may have moved.
        </p>

        <code className="block max-w-full truncate rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs text-gray-600 mb-7">
          {path}
        </code>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate(home.path)}
            className="flex-1 bg-amber-300 hover:bg-amber-400 text-[#0c1925] font-bold py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{home.label}</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={goBack}
            className="flex-1 bg-white hover:bg-gray-100 border border-gray-300 text-[#0c1925] font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
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
