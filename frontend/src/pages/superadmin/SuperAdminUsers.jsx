import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserPlus, Trash2, Pencil, Upload, Eye, EyeOff, CalendarX } from 'lucide-react';
import * as XLSX from 'xlsx';
import CreateSuperAdminUser from './CreateSuperAdminUser';
import api from '../../utils/api';
import { displayStaffId, formatStaffId, isValidStaffId, lastNameFromFullName, staffIdToDigits, usernameFromLastNameAndId } from '../../utils/staffId';

const USERS_PER_PAGE = 10;

const SuperAdminUsers = () => {
  const [usersList, setUsersList] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', staff_id: '', department: '', department_id: '', username: '', password: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [noTermModalOpen, setNoTermModalOpen] = useState(false);
  const [checkingTerm, setCheckingTerm] = useState(false);
  const navigate = useNavigate();

  const handleAddAdminClick = async () => {
    setCheckingTerm(true);
    try {
      const res = await api('http://localhost:5000/api/terms/active');
      if (res.ok) {
        const term = await res.json();
        if (term) {
          setCreateModalOpen(true);
          return;
        }
      }
      setNoTermModalOpen(true);
    } catch {
      setNoTermModalOpen(true);
    } finally {
      setCheckingTerm(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api('http://localhost:5000/api/users');
      if (response.ok) {
        const data = await response.json();
        const dbUsers = data.filter(u => u.system_role === 'admin').map((u) => ({
          id: `USR-${u.id.substring(0,4).toUpperCase()}`,
          rawId: u.id,
          name: u.full_name,
          staffId: u.staff_id || '',
          dept: u.department || 'N/A',
          username: u.username || 'N/A',
          role: 'ADMIN',
          roleColor: '#8b5cf6',
          systemRole: u.system_role,
          createdAt: u.created_at
        }));
        setUsersList(dbUsers);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api('http://localhost:5000/api/departments');
      if (res.ok) setDepartments(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadData = async () => {
    await Promise.all([fetchUsers(), fetchDepartments()]);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const handler = async () => { await loadData(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, []);

  const exportToExcel = () => {
    const exportData = usersList.map(u => ({ 'ID': displayStaffId(u.staffId), 'Name': u.name, 'Username': u.username, 'Department': u.dept }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Admins');
    XLSX.writeFile(wb, 'SmartGrade_Admins.xlsx');
  };

  const openEditModal = (u) => {
    setUserToEdit(u);
    const deptName = u.dept === 'N/A' ? '' : u.dept;
    const dept = departments.find(d => d.name === deptName);
    const deptId = dept ? dept.id : '';
    setEditForm({
      full_name: u.name,
      staff_id: formatStaffId(u.staffId || ''),
      department: deptName,
      department_id: deptId,
      username: u.username === 'N/A' ? '' : u.username,
      password: ''
    });
    setShowEditPassword(false);
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!userToEdit?.rawId) return;
    // One admin per department — block moving into a taken department before hitting the API
    const deptTaken = editForm.department && usersList.some((u) => u.rawId !== userToEdit.rawId && u.dept.trim().toLowerCase() === editForm.department.trim().toLowerCase());
    if (deptTaken) {
      setEditError(`An admin already exists in ${editForm.department}. One admin per department only.`);
      return;
    }
    if (editForm.staff_id.trim() && !isValidStaffId(editForm.staff_id)) {
      setEditError('ID must contain exactly 9 digits (format 00000-0000).');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const body = { full_name: editForm.full_name, staff_id: staffIdToDigits(editForm.staff_id), department: editForm.department };

      const res = await api(`http://localhost:5000/api/users/${userToEdit.rawId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm.password.trim() ? { ...body, password: editForm.password } : body)
      });
      if (res.ok) {
        const updated = await res.json();
        setUsersList(prev => prev.map(u => u.rawId !== userToEdit.rawId ? u : { ...u, name: updated.full_name, staffId: updated.staff_id || '', dept: updated.department || 'N/A', username: updated.username || u.username }));
        setEditModalOpen(false);
        setUserToEdit(null);
        setEditError('');
      } else {
        const data = await res.json();
        setEditError(data.message || data.error || 'Failed to update admin');
      }
    } catch (err) { console.error(err); setEditError('Network error. Please try again.'); }
    finally { setEditLoading(false); }
  };

  const confirmDelete = async () => {
    if (confirmText !== 'Confirm' || !userToDelete) return;
    setDeleting(true);
    try {
      const response = await api(`http://localhost:5000/api/users/${userToDelete.rawId}`, { method: 'DELETE' });
      if (response.ok) setUsersList(usersList.filter(u => u.rawId !== userToDelete.rawId));
    } catch (err) { console.error(err); }
    finally { setDeleting(false); setDeleteModalOpen(false); setUserToDelete(null); setConfirmText(''); }
  };

  const sortedUsers = usersList;
  const totalUserPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PER_PAGE));
  const paginatedUsers = sortedUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Admin Management</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>Create, edit, and manage administrator accounts across all departments.</p>
                  </div>
        <span className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: '#0c1925' }}>{usersList.length} ADMINS</span>
      </div>

      <div className="rounded-xl p-5 shadow-sm border border-[#F9FAFB] card-hover" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Admin Accounts</h2>
          <div className="flex gap-2">
            <button onClick={handleAddAdminClick} disabled={checkingTerm} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105 transition-transform disabled:opacity-50" style={{ background: '#0c1925', borderColor: '#142a3f' }}><UserPlus size={14} /> {checkingTerm ? 'Checking…' : 'Add Admin'}</button>
            <button onClick={exportToExcel} className="px-3 h-8 rounded border flex items-center gap-1.5 text-[#0c1925] text-xs font-bold shadow-sm hover:scale-105" style={{ background: '#fbbf24', borderColor: '#fbbf24' }}><Upload size={14} /> Export</button>
          </div>
        </div>

        <div className="table-responsive"><table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
              {['ID', 'NAME', 'USERNAME', 'DEPARTMENT', 'ACTIONS'].map((h) => (<th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[12px] uppercase tracking-wide">{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-gray-500">
                  No admins have been added yet. Click <strong>Add Admin</strong> to create the first account.
                </td>
              </tr>
            )}
            {paginatedUsers.map((u) => (
              <tr key={u.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                <td className="py-3 pr-3 font-mono text-[12px] text-gray-900">{displayStaffId(u.staffId)}</td>
                <td className="py-3 pr-3 font-bold text-gray-900 text-[12px]">{u.name}</td>
                <td className="py-3 pr-3 text-gray-900 font-mono text-[12px]">{u.username}</td>
                <td className="py-3 pr-3 text-gray-900 text-[12px]">{u.dept}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(u)} className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50" title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => { setUserToDelete(u); setConfirmText(''); setDeleteModalOpen(true); }} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
          <span className="text-gray-900">Showing {Math.min((userPage - 1) * USERS_PER_PAGE + 1, usersList.length)}–{Math.min(userPage * USERS_PER_PAGE, usersList.length)} of {usersList.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderColor: '#e5e0d5' }}><ChevronLeft size={14} /></button>
            <span className="text-gray-900 font-medium">Page {userPage} of {totalUserPages}</span>
            <button onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages} className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderColor: '#e5e0d5' }}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Admin</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID</label><input type="text" value={editForm.staff_id} onChange={(e) => setEditForm({ ...editForm, staff_id: formatStaffId(e.target.value) })} placeholder="00000-0000" maxLength={10} inputMode="numeric" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm font-mono" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username (auto-generated)</label>
                <input type="text" value={usernameFromLastNameAndId(lastNameFromFullName(editForm.full_name), editForm.staff_id) || editForm.username} readOnly className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono" />
              </div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                <select value={editForm.department_id} onChange={(e) => { const dept = departments.find(d => d.id === e.target.value); setEditForm({ ...editForm, department_id: e.target.value, department: dept ? dept.name : '' }); setEditError(''); }} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm">
                  <option value="">Select department</option>
                  {departments.map((d) => {
                    const takenByOther = usersList.some((u) => u.rawId !== userToEdit?.rawId && u.dept.trim().toLowerCase() === d.name.trim().toLowerCase());
                    return (
                      <option key={d.id} value={d.id} disabled={takenByOther}>
                        {d.name}{takenByOther ? ' (admin already assigned)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Password (leave blank to keep current)</label>
                <div className="relative">
                  <input type={showEditPassword ? "text" : "password"} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm pr-10" />
                  <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">{showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
            </div>
            {editError && <p className="mt-4 text-sm font-semibold text-red-500">{editError}</p>}
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditModalOpen(false); setUserToEdit(null); setEditError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={editLoading}>Cancel</button>
              <button onClick={handleEditSave} disabled={editLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#142a3f' }}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Admin</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteModalOpen(false); setUserToDelete(null); setConfirmText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={deleting}>Cancel</button>
              <button onClick={confirmDelete} disabled={confirmText !== 'Confirm' || deleting} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmText === 'Confirm' && !deleting ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {noTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
              <CalendarX size={28} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Term</h3>
            <p className="text-sm text-gray-500 mb-6">You can&apos;t add an admin until an academic term has started. Create a term first to enable admin management.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setNoTermModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
              <button onClick={() => { setNoTermModalOpen(false); navigate('/superadmin/settings'); }} className="px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: '#0c1925' }}>Go to Create Term</button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && <CreateSuperAdminUser onClose={() => setCreateModalOpen(false)} onSuccess={() => { setCreateModalOpen(false); fetchUsers(); }} />}
    </div>
  );
};

export default SuperAdminUsers;


