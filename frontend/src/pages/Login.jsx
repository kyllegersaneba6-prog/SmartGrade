import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, AlertCircle, ArrowRight,
  Eye, EyeOff, ShieldCheck, BarChart3, ClipboardCheck, Users, TrendingUp
} from 'lucide-react';

const features = [
  { icon: <BarChart3 className="w-5 h-5 text-gold" />, title: 'Grade Computation & Analytics', desc: 'Automated weighted grading with real-time analytics' },
  { icon: <ClipboardCheck className="w-5 h-5 text-gold" />, title: 'Attendance Tracking', desc: 'Track student attendance with AM/PM session support' },
  { icon: <Users className="w-5 h-5 text-gold" />, title: 'Class & Teacher Management', desc: 'Manage sections, subjects, and teacher assignments' },
  { icon: <TrendingUp className="w-5 h-5 text-gold" />, title: 'Performance Reports', desc: 'Generate grade summaries with grade-point conversion' },
];

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
        if (user.role === 'teacher') navigate('/teacher/dashboard');
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
    setLoading(true);

    try {
      const response = await fetch(`http://${window.location.hostname}:5000/api/auth/login`, {
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

      if (data.user.role === 'teacher') navigate('/teacher/dashboard');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/superadmin');
    } catch (err) {
      setError(err.message);
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
      <div className="w-full lg:w-[42%] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10">
        <div className="w-full max-w-[420px] bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 md:p-10 shadow-2xl shadow-black/30">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src="/src/assets/logo.png" className="w-20 h-20 object-contain mb-4" alt="SmartGrade Logo" />
            <h1 className="text-gold font-extrabold text-2xl tracking-wide">SmartGrade</h1>
            <p className="text-slate-400 text-sm mt-1">Academic Management Platform</p>
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
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all outline-none"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-gold focus:ring-gold/50 cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-400 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-xs font-semibold text-gold hover:text-gold-hover transition-colors">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-hover text-slate-900 font-bold py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-gold/25"
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
      <div className="hidden lg:flex lg:w-[58%] bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 relative overflow-hidden items-center justify-center p-12">
        {/* Abstract Geometric Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-[-15%] right-[-10%] w-[80vh] h-[80vh] rounded-full bg-[radial-gradient(circle,rgba(209,166,56,0.15)_0%,transparent_60%)]" />
          <div className="absolute bottom-[-20%] left-[-15%] w-[70vh] h-[70vh] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_60%)]" />
          <div className="absolute top-[30%] left-[25%] w-[40vh] h-[40vh] rounded-full bg-[radial-gradient(circle,rgba(209,166,56,0.08)_0%,transparent_60%)]" />
          <div className="absolute bottom-[30%] right-[20%] w-[25vh] h-[25vh] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.1)_0%,transparent_60%)]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Decorative diagonal accent lines */}
        <svg className="absolute top-0 right-0 w-[120%] h-[120%] opacity-[0.06]" viewBox="0 0 400 400" preserveAspectRatio="none">
          <line x1="0" y1="400" x2="400" y2="0" stroke="#D1A638" strokeWidth="1" />
          <line x1="100" y1="400" x2="400" y2="100" stroke="#818cf8" strokeWidth="0.5" />
          <line x1="200" y1="400" x2="400" y2="200" stroke="#D1A638" strokeWidth="0.5" />
          <line x1="300" y1="400" x2="400" y2="300" stroke="#818cf8" strokeWidth="0.3" />
          <line x1="0" y1="300" x2="300" y2="0" stroke="#D1A638" strokeWidth="0.3" />
        </svg>

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Brand header */}
          <div className="flex items-center gap-4 mb-8">
            <img src="/src/assets/logo.png" className="w-16 h-16 object-contain" alt="SmartGrade Logo" />
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-wide">SmartGrade</h2>
              <p className="text-slate-400 text-sm">Academic Management Platform</p>
            </div>
          </div>

          <p className="text-base text-slate-300 leading-relaxed mb-10">
            Empowering educators with intelligent tools for grade computation,
            attendance tracking, and comprehensive class management.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-yellow-600/10 border border-gold/20 flex items-center justify-center shrink-0 group-hover:border-gold/40 group-hover:from-gold/30 group-hover:to-yellow-600/20 transition-all">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-700/50">
            <p className="text-slate-500 text-xs">
              &copy; 2026 SmartGrade Educational Systems. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
