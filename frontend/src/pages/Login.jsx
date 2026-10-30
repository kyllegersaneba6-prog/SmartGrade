import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import stiWestNegrosLogo from '../assets/sti-west-negros-logo.png';
import {
  User, Lock, AlertCircle, ArrowRight,
  Eye, EyeOff, ShieldCheck, BarChart3, ClipboardCheck, Users, TrendingUp
} from 'lucide-react';

const features = [
  { icon: <BarChart3 className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Grade Computation & Analytics', desc: 'Automated weighted grading with real-time analytics' },
  { icon: <ClipboardCheck className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Attendance Tracking', desc: 'Track student attendance with AM/PM session support' },
  { icon: <Users className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Class & Teacher Management', desc: 'Manage sections, subjects, and teacher assignments' },
  { icon: <TrendingUp className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Performance Reports', desc: 'Generate grade summaries with grade-point conversion' },
];

const OFFLINE_MESSAGE = 'You are currently offline. Please check your Wi-Fi or ethernet connection and try again.';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'teacher') navigate('/teacher/overview');
        else if (user.role === 'admin') navigate('/admin');
        else navigate('/superadmin');
      } catch {
        navigate('/superadmin');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // No internet — don't even attempt the request, so the user never sees an
    // "Invalid username" response caused by a failed database lookup.
    if (!navigator.onLine) {
      setError(OFFLINE_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'teacher') navigate('/teacher/overview');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/superadmin');
    } catch (err) {
      // The backend being unreachable surfaces as a raw browser error
      // ("Failed to fetch") — swap it for something users understand.
      const raw = String(err?.message || '').toLowerCase();
      const isNetwork = err instanceof TypeError
        || raw.includes('failed to fetch')
        || raw.includes('networkerror')
        || raw.includes('load failed');
      if (!navigator.onLine) {
        setError(OFFLINE_MESSAGE);
      } else if (isNetwork) {
        setError('Cannot connect to the server. Please check your connection and try again.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-900">
      {/* Background decorative elements (shared) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(209,166,56,0.04)_0%,transparent_60%)]" />
        <div className="absolute bottom-[-15%] right-[-8%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.04)_0%,transparent_60%)]" />
      </div>

      {/* ===== LEFT COLUMN — Login Form ===== */}
      <div
        className="w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10"
        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
      >
        <div
          className="w-full max-w-[420px] backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 md:p-10 shadow-2xl shadow-[#0c1925]/30"
          style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
        >
          {/* Brand logos */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/src/assets/logo.png" className="w-14 h-14 shrink-0 object-contain" alt="SmartGrade Logo" />
            <div className="min-w-0">
              <h1 className="text-amber-300 font-extrabold text-2xl tracking-wide">SmartGrade</h1>
              <p className="text-slate-300 text-sm mt-1">Academic Management System</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-800/50 rounded-xl flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative login-field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-white login-icon" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input block w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all outline-none"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative login-field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-white login-icon" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input block w-full pl-11 pr-11 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors login-icon"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-300 hover:bg-amber-300 text-black font-bold py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-gold/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">Institutional Access Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN — Hero Section (hidden below lg) ===== */}
      <div className="hidden lg:flex lg:w-[58%] bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        {/* Blurred campus photo background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/src/assets/STI_Background.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(0px)',
            transform: 'scale(1.05)',
          }}
        />
        {/* Dark overlay so text stays legible over the photo */}
        <div className="absolute inset-0 bg-slate-900/60" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg p-8">
          {/* Brand header */}
          <div className="flex items-center gap-4 mb-8">
            <img src={stiWestNegrosLogo} className="w-14 h-14 shrink-0 object-contain" alt="STI West Negros University Logo" />
            <span aria-hidden="true" className="h-12 w-px shrink-0 bg-white/50" />
            <img src="/src/assets/logo.png" className="w-14 h-14 shrink-0 object-contain" alt="SmartGrade Logo" />
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-wide stroke-text">SmartGrade</h2>
              <p className="text-white text-sm stroke-text-sm">Academic Management Platform</p>
            </div>
          </div>

          <p className="text-base text-white leading-relaxed mb-10 stroke-text-sm">
            SmartGrade unifies grade computation, attendance tracking, and
            behavioral analytics in one academic platform — with AI-powered
            insights that help teachers understand every learner.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-300/20 to-amber-600/10 border border-black/80 flex items-center justify-center shrink-0 group-hover:border-amber-300/40 group-hover:from-amber-300/30 group-hover:to-amber-600/20 transition-all shadow-md">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm stroke-text-sm">{feature.title}</h3>
                  <p className="text-gray-300 text-xs mt-0.5 stroke-text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-gray-500">
            <p className="text-white text-xs stroke-text-sm">
              &copy; 2026 SmartGrade Educational Systems. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


