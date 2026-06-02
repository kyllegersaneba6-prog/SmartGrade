import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

const genNumericId = () => String(Math.floor(1000 + Math.random() * 9000));

const CreateAdminTeacher = ({ onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [numericSuffix, setNumericSuffix] = useState(genNumericId());
  const [password, setPassword] = useState('smartgrade123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem('token');
  const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

  useEffect(() => {
    if (lastName.trim()) {
      setUsername(`${lastName.trim().toLowerCase()}.${numericSuffix}@smartgrade`);
    } else {
      setUsername('');
    }
  }, [lastName, numericSuffix]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !password) {
      setError('All required fields must be filled.');
      return;
    }
    setLoading(true);
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const response = await api('http://localhost:5000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
          username,
          system_role: 'teacher',
          password
        })
      });
      if (response.ok) {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to create teacher');
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
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create New Teacher</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Provision a new teacher account</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username (auto-generated)</label>
            <input type="text" value={username} readOnly placeholder="Last name will auto-generate" className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono" />
            {lastName.trim() && (
              <p className="text-[10px] text-gray-400 mt-1">Format: lastname.####@smartgrade (numeric only)</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-red-500 text-sm font-semibold">{error}</div>}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={() => onClose && onClose()} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center gap-2" style={{ background: '#f5a623' }}><UserPlus size={16} />{loading ? 'Creating...' : 'Create Teacher'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdminTeacher;
