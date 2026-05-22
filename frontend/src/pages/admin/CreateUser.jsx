import React, { useState, useEffect } from 'react';
import { User, Key, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateUser = ({ onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    system_role: '',
    permissions_profile: '',
    password: '',
    course: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingNames, setExistingNames] = useState([]);

  useEffect(() => {
    const fetchExistingNames = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/users');
        if (res.ok) {
          const data = await res.json();
          setExistingNames(data.map(u => u.full_name.toLowerCase().trim()));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchExistingNames();
  }, []);

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
    } else if (name === 'department') {
      if (value !== 'College of Information and Communication Technology (CICT)') {
        setFormData({ ...formData, department: value, course: '' });
      } else {
        setFormData({ ...formData, department: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.department || !formData.system_role || !formData.permissions_profile || !formData.password) {
      setError('All required fields (Full Name, Department, System Role, Permissions Profile, and Password) must be filled.');
      return;
    }
    if (existingNames.includes(formData.full_name.toLowerCase().trim())) {
      setError('A user with this name already exists.');
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
        if (onSuccess) onSuccess();
        if (onClose) onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create New User</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Provision a new account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Name
            </label>
            <input 
              type="text" 
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <div className="relative">
              <select 
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
              >
                <option value="" disabled>Select a department</option>
                <option value="College of Information and Communication Technology (CICT)">College of Information and Communication Technology (CICT)</option>
                <option value="College of Engineering (COE)">College of Engineering (COE)</option>
                <option value="College of Business Management and Accountancy (CBMA)">College of Business Management and Accountancy (CBMA)</option>
                <option value="College of Education, Arts and Sciences (CEAS)">College of Education, Arts and Sciences (CEAS)</option>
                <option value="College of Hospitality and Tourism Management (CHTM)">College of Hospitality and Tourism Management (CHTM)</option>
                <option value="College of Criminal Justice Education (CCJE)">College of Criminal Justice Education (CCJE)</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Course
            </label>
            <div className="relative">
              <select 
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                disabled={formData.department !== 'College of Information and Communication Technology (CICT)'}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>Select a course</option>
                {formData.department === 'College of Information and Communication Technology (CICT)' && (
                  <>
                    <option value="Bachelor of Science in Information Technology (BSIT)">Bachelor of Science in Information Technology (BSIT)</option>
                    <option value="Bachelor of Science in Computer Science (BSCS)">Bachelor of Science in Computer Science (BSCS)</option>
                    <option value="Bachelor of Science in Information Systems (BSIS)">Bachelor of Science in Information Systems (BSIS)</option>
                  </>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              System Role
            </label>
            <div className="relative">
              <select 
                name="system_role"
                value={formData.system_role}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
              >
                <option value="" disabled>Select an access level</option>
                <option value="sysadmin">Super Admin</option>
                <option value="dean">College Dean</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Initial Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm pr-10"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Permissions Profile
            </label>
            <div className="relative">
              <select 
                name="permissions_profile"
                value={formData.permissions_profile}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg appearance-none text-sm text-gray-500 cursor-not-allowed"
              >
                <option value="" disabled>Select permissions profile...</option>
                <option value="read_only">Read-Only</option>
                <option value="create_update">Create & Update</option>
                <option value="manage">Full-Control</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-500 text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button 
            type="button" 
            onClick={() => onClose && onClose()}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#f5a623' }}
          >
            <UserPlus size={16} />
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;
