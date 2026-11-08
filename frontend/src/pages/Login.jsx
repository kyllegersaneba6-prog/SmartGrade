import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';
import { checkBackendAvailability } from '../utils/backendAvailability';
import stiWestNegrosLogo from '../assets/sti-west-negros-logo.png';
import {
  User, Lock, AlertCircle, ArrowRight,
  Eye, EyeOff, ShieldCheck, BarChart3, ClipboardCheck, Users, TrendingUp, Sparkles
} from 'lucide-react';

const features = [
  { icon: <Users className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Class List & Student Management', desc: 'Organize sections and subjects, and import student lists' },
  { icon: <ClipboardCheck className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Attendance Tracking', desc: 'Record attendance by AM/PM session and lecture or laboratory schedule' },
  { icon: <BarChart3 className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Class Record & Weighted Grading', desc: 'Set grading components, record scores, and calculate weighted term grades' },
  { icon: <Sparkles className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Analytics & Student Insights', desc: 'Review grades, attendance, and submissions, with AI-generated summaries' },
  { icon: <TrendingUp className="w-5 h-5 text-amber-300 stroke-icon" />, title: 'Grade Summaries & Exports', desc: 'Prepare semester grade summaries and export class records or grades to XLSX/PDF' },
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
        void checkBackendAvailability();
        setError('Cannot connect to the server. Please check your connection and try again.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex font-sans" style={{ height: '100dvh', backgroundColor: '#FFFFFF' }}>

      {/* ===== LEFT COLUMN — Login Form ===== */}
      <div
        className="h-full min-h-0 w-full lg:w-[42%] flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-10 relative z-10"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div
          className="my-auto w-full max-w-[420px] rounded-2xl p-8 md:p-10 shadow-[0_18px_50px_-10px_rgba(71,85,105,0.45)]"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Brand logos */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/src/assets/logo.png" className="w-14 h-14 shrink-0 object-contain" alt="SmartGrade Logo" />
            <div className="min-w-0">
               <h1 className="text-[#0c1925] font-extrabold text-2xl tracking-wide">SmartGrade</h1>
               <p className="text-gray-500 text-sm mt-1">Academic Management System</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative login-field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-900 login-icon" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="login-input block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#0c1925] placeholder-gray-400 focus:ring-2 focus:ring-[#0c1925]/20 focus:border-[#0c1925] transition-all outline-none"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative login-field">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-900 login-icon" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input block w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#0c1925] placeholder-gray-400 focus:ring-2 focus:ring-[#0c1925]/20 focus:border-[#0c1925] transition-all outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors login-icon"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-300 hover:bg-amber-400 text-[#0c1925] font-bold py-3 px-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0c1925] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">Institutional Access Only</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT COLUMN — Hero Section (hidden below lg) ===== */}
      <div className="hidden h-full min-h-0 lg:flex lg:w-[58%] bg-slate-900 relative overflow-hidden items-center justify-center p-12">
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
        <div className="absolute inset-0 bg-gray-800/60" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg p-8">
          {/* Brand header */}
          <div className="flex items-center gap-4 mb-8">
            <img src={stiWestNegrosLogo} className="w-14 h-14 shrink-0 object-contain" alt="STI West Negros University Logo" />
            <span aria-hidden="true" className="h-12 w-px shrink-0 bg-white/50" />
            <img src="/src/assets/logo.png" className="w-14 h-14 shrink-0 object-contain" alt="SmartGrade Logo" />
            <div>
              <h2 className="text-3xl font-extrabold text-white tracking-wide stroke-text">SmartGrade</h2>
              <p className="text-white text-sm stroke-text-sm">Academic Management System</p>
            </div>
          </div>

          <p className="text-base text-white leading-relaxed mb-10 stroke-text-sm">
            Manage class lists, attendance, grading, and academic reports in one
            system. Teachers can review student performance and generate
            AI-assisted summaries when needed.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-lg bg-amber-300/20 border border-amber-300/40 flex items-center justify-center shrink-0 shadow-md">
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


