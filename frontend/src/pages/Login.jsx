import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, AlertCircle, GraduationCap, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'teacher') {
          navigate('/teacher/dashboard');
        } else if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/superadmin');
        }
      } catch (e) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/superadmin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FDFCF8] relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,#FDF6E3_0%,transparent_60%)] opacity-80 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full bg-[radial-gradient(circle,#FCF5DF_0%,transparent_60%)] opacity-80 pointer-events-none"></div>
      
      {/* Subtle concentric rings like in the image (optional, approximated with repeating radial gradient) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-radial-gradient(circle at 0% 0%, transparent 0, transparent 40px, #D1A638 40px, #D1A638 41px)' }}></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-radial-gradient(circle at 100% 100%, transparent 0, transparent 40px, #D1A638 40px, #D1A638 41px)' }}></div>

      {/* Main Form Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="max-w-[420px] w-full bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-[#F0EBE1] p-10 flex flex-col items-center relative">
          
          {/* Logo & Title */}
          <img src="/logo.png" className="w-24 h-24 object-contain mb-4" alt="SmartGrade Logo" />
          <h1 className="text-gold font-extrabold text-3xl tracking-wide mb-1">SmartGrade</h1>
         

          {error && (
            <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-bold text-[#4A4A4A] mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#A09682]" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-[#FDFBF7] border border-[#EBE1CD] rounded-xl text-sm font-medium text-[#1A1A1A] placeholder-[#A09682] focus:ring-2 focus:ring-[#D1A638] focus:border-[#D1A638] transition-all outline-none shadow-sm"
                  placeholder="Enter your academic ID"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#4A4A4A] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#A09682]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3.5 bg-[#FDFBF7] border border-[#EBE1CD] rounded-xl text-sm font-medium text-[#1A1A1A] placeholder-[#A09682] focus:ring-2 focus:ring-[#D1A638] focus:border-[#D1A638] transition-all outline-none shadow-sm tracking-widest"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A09682] hover:text-[#4A4A4A] transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <a href="#" className="text-xs font-bold text-[#826A28] hover:text-[#D1A638] transition-colors">
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1 pb-2">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-[#EBE1CD] text-[#D1A638] focus:ring-[#D1A638] bg-[#FDFBF7] cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-[#5A5A5A] cursor-pointer">
                Remember me on this device
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D1A638] hover:bg-[#C2982B] text-[#3A2E12] font-bold py-3.5 px-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(209,166,56,0.35)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#3A2E12] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="text-[15px]">Sign In</span>
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="w-full border-t border-[#EBE1CD] my-6"></div>

          {/* Bottom Card Info */}
          <div className="flex items-center justify-center gap-2 text-[#A09682]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold">Institutional Access Only</span>
          </div>
        </div>


      </div>

      {/* Main Footer */}
      <div className="w-full bg-[#EBE3D3] py-5 px-8 border-t border-[#DED4C1] flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
          <span className="text-gold font-extrabold text-sm tracking-wide">SmartGrade</span>
          <span className="text-[#6B624E] text-xs font-medium">
            &copy; 2026 SmartGrade Educational Systems. All rights reserved.
          </span>
        </div>
        <div className="flex gap-6 text-xs font-bold text-[#6B624E]">
          <a href="#" className="hover:text-[#3A2E12] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#3A2E12] transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-[#3A2E12] transition-colors">Contact Support</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
