import React, { useState } from 'react';
import { User, Key, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateUser = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    system_role: '',
    permissions_profile: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'system_role') {
      if (value === 'sysadmin') {
        setFormData({ ...formData, system_role: value, permissions_profile: 'manage' });
      } else if (value === 'teacher' || value === 'dean') {
        setFormData({ ...formData, system_role: value, permissions_profile: 'create_update' });
      } else if (value === 'student') {
        setFormData({ ...formData, system_role: value, permissions_profile: 'read_only' });
      } else {
        setFormData({ ...formData, [name]: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.department || !formData.system_role || !formData.permissions_profile || !formData.password) {
      setError('All five fields (Full Name, Department, System Role, Permissions Profile, and Password) are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        navigate('/admin/users');
      } else {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New User</h1>
        <p className="text-gray-600">Provision a new administrative or faculty account within the SmartGrade ecosystem.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#e5e0d5] p-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
          {/* Left Column: Identity Details */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-[#c8b89a]" />
              <h2 className="text-lg font-bold text-gray-900">Identity Details</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Name
                </label>
                <input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter Your Full Name" 
                  className="w-full px-4 py-3 bg-[#fbf8f1] border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent text-gray-800 placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Department
                </label>
                <input 
                  type="text" 
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  autoComplete="off"
                  placeholder="e.g., IT Admin, Registrar, Dean, Admissions, etc" 
                  className="w-full px-4 py-3 bg-[#fbf8f1] border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent text-gray-800 placeholder-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Access Control */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Key size={20} className="text-[#c8b89a]" />
              <h2 className="text-lg font-bold text-gray-900">Access Control</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  System Role
                </label>
                <div className="relative">
                  <select 
                    name="system_role"
                    value={formData.system_role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#fbf8f1] border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent text-gray-800"
                  >
                    <option value="" disabled className="text-gray-400">Select an access level</option>
                    <option value="sysadmin">Super Admin</option>
                    <option value="dean">College Dean</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Initial Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    placeholder="••••••••••••" 
                    className="w-full px-4 py-3 bg-[#fbf8f1] border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent text-gray-800 placeholder-gray-400 pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  Must contain 12+ characters, one symbol, and one uppercase letter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Permissions */}
        <div className="pt-6 border-t border-[#f0ede6] mb-8">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Account Limitations &amp; Permissions (Auto-assigned)
          </label>
          <div className="relative">
            <select 
              name="permissions_profile"
              value={formData.permissions_profile}
              disabled
              className="w-full px-4 py-3 bg-gray-100 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none text-gray-700 cursor-not-allowed"
            >
              <option value="" disabled className="text-gray-400">Select permissions profile...</option>
              <option value="read_only">Read-Only</option>
              <option value="create_update">Create & Update</option>
              <option value="manage">Full-Control</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-500 text-sm font-semibold px-2">
            {error}
          </div>
        )}
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-6 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/admin/users')}
            className="text-[#1d4ed8] font-medium hover:text-blue-800 px-4 py-2"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#d5a034', color: '#1a2233' }}
          >
            <UserPlus size={18} />
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>

      {/* Policy Compliance */}
      <div className="bg-[#f3f4f6] rounded-xl p-5 border border-[#e5e7eb] flex gap-4 items-start mb-12">
        <div className="bg-[#e0e7ff] p-2 rounded-lg text-[#3b82f6] shrink-0 mt-0.5">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="font-bold text-[#1e3a8a] mb-1">Policy Compliance</h3>
          <p className="text-sm text-[#3b82f6] leading-relaxed">
            All user creation events are logged under the <span className="font-bold">Security &amp; Audit</span> trail. Ensure that the assigned role follows the Principle of Least Privilege (PoLP) according to the institutional governance handbook.
          </p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          SMARTGRADE 
        </p>
      </div>
    </div>
  );
};

export default CreateUser;
