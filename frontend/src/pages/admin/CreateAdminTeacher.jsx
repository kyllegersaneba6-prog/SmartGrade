import React, { useState } from 'react';
import { Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { formatStaffId, isValidStaffId, staffIdToDigits, usernameFromLastNameAndId } from '../../utils/staffId';

// Username is generated from last name + ID (lastname.4512@sg) and
// validated by the backend on creation.
const previewUsername = (lastName, staffId) => usernameFromLastNameAndId(lastName, staffId);

const CreateAdminTeacher = ({ onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('smartgrade123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !password || !staffId.trim()) {
      setError('All required fields must be filled.');
      return;
    }
    if (!isValidStaffId(staffId)) {
      setError('ID must contain exactly 9 digits (format 00000-0000).');
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
          system_role: 'teacher',
          staff_id: staffIdToDigits(staffId),
          password
        })
      });
      if (response.ok) {
        const created = await response.json();
        setCreatedUsername(created.username || '');
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

  const handleClose = () => {
    if (createdUsername && onSuccess) onSuccess();
    if (onClose) onClose();
  };

  if (createdUsername) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
        <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4"><CheckCircle size={28} className="text-emerald-600" /></div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Teacher Account Created</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Share these credentials with the teacher</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Username</label>
            <input type="text" value={createdUsername} readOnly className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-800 font-mono" />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md" style={{ background: '#f5a623' }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
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
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID</label>
            <input type="text" value={staffId} onChange={(e) => { setStaffId(formatStaffId(e.target.value)); setError(''); }} placeholder="00000-0000" maxLength={10} inputMode="numeric" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm font-mono" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username (auto-generated)</label>
            <input type="text" value={previewUsername(lastName, staffId)} readOnly placeholder="Enter last name + complete ID" className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono" />
            {(lastName.trim() || staffId.trim()) && !previewUsername(lastName, staffId) && (
              <p className="text-[10px] text-gray-400 mt-1">Enter a last name and all 9 ID digits to generate the username</p>
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


