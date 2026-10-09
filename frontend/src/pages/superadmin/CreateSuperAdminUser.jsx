import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { formatStaffId, isValidStaffId, staffIdToDigits, usernameFromLastNameAndId } from '../../utils/staffId';

// Username is generated from last name + ID (lastname.4512@sg) and
// validated by the backend on creation.
const previewUsername = (lastName, staffId) => usernameFromLastNameAndId(lastName, staffId);

const CreateSuperAdminUser = ({ onClose, onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentsWithAdmin, setDepartmentsWithAdmin] = useState(new Set());
  const [password, setPassword] = useState('smartgrade123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, usersRes] = await Promise.all([
          api('http://localhost:5000/api/departments'),
          api('http://localhost:5000/api/users'),
        ]);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (usersRes.ok) {
          const users = await usersRes.json();
          setDepartmentsWithAdmin(new Set(
            users.filter((u) => u.system_role === 'admin' && u.department).map((u) => u.department.trim().toLowerCase())
          ));
        }
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !departmentId || !password || !staffId.trim()) {
      setError('All required fields must be filled.');
      return;
    }
    if (!isValidStaffId(staffId)) {
      setError('ID must contain exactly 9 digits (format 00000-0000).');
      return;
    }
    const dept = departments.find(d => d.id === departmentId);
    if (!dept) { setError('Please select a valid department.'); return; }
    if (departmentsWithAdmin.has(dept.name.trim().toLowerCase())) {
      setError(`An admin already exists in ${dept.name}. One admin per department only.`);
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
          department: dept.name,
          system_role: 'admin',
          staff_id: staffIdToDigits(staffId),
          password
        })
      });

      if (response.ok) {
        const created = await response.json();
        setCreatedUsername(created.username || '');
      } else {
        const data = await response.json();
        setError(data.message || data.error || 'Failed to create admin');
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
            <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Account Created</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Share these credentials with the admin</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Username</label>
            <input type="text" value={createdUsername} readOnly className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-800 font-mono" />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md" style={{ background: '#142a3f' }}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create New Admin</h1>
          <p className="text-[10px] text-gray-900 uppercase tracking-wider">Provision a new admin account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">ID</label>
            <input type="text" value={staffId} onChange={(e) => { setStaffId(formatStaffId(e.target.value)); setError(''); }} placeholder="00000-0000" maxLength={10} inputMode="numeric" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-gray-100 text-sm font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-gray-100 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-gray-100 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Department</label>
            <select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setError(''); }} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-gray-100 text-sm">
              <option value="" disabled>Select a department</option>
              {departments.map((d) => {
                const taken = departmentsWithAdmin.has(d.name.trim().toLowerCase());
                return (
                  <option key={d.id} value={d.id} disabled={taken}>
                    {d.name}{taken ? ' (admin already assigned)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Username (auto-generated)</label>
            <input type="text" value={previewUsername(lastName, staffId)} readOnly placeholder="Enter complete ID + last name " className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-900 cursor-not-allowed font-mono" />
            {(lastName.trim() || staffId.trim()) && !previewUsername(lastName, staffId) && (
              <p className="text-[10px] text-gray-400 mt-1">Enter a last name and all 9 ID digits to generate the username</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-gray-100 text-sm pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-red-500 text-sm font-semibold">{error}</div>}

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={() => onClose && onClose()} className="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50 flex items-center gap-2" style={{ background: '#0c1925' }}><UserPlus size={16} />{loading ? 'Creating...' : 'Create Admin'}</button>
        </div>
      </div>
    </div>
  );
};

export default CreateSuperAdminUser;


