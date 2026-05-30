import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, Trash2, Pencil, Download, UserCheck, BookOpen, GraduationCap, Calendar, CheckCircle, Eye, X, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import CreateAdminTeacher from './CreateAdminTeacher';

const USERS_PER_PAGE = 10;

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const semesters = ['1st Semester', '2nd Semester', 'Summer'];

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [teacherToAssign, setTeacherToAssign] = useState(null);
  const [assignYear, setAssignYear] = useState('1st');
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [assignSection, setAssignSection] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [activeTerm, setActiveTerm] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [teacherToView, setTeacherToView] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [removeAssignOpen, setRemoveAssignOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState(null);
  const [confirmAssignText, setConfirmAssignText] = useState('');
  const [removingAssignment, setRemovingAssignment] = useState(false);

  const yearLevels = ['1st', '2nd', '3rd', '4th'];
  const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

  const getToken = () => localStorage.getItem('token');
  const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

  const fetchTeachers = async () => {
    try {
      const response = await api('http://localhost:5000/api/users');
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((u) => ({
          rawId: u.id,
          name: u.full_name,
          username: u.username || 'N/A',
          dept: u.department || 'N/A',
          createdAt: u.created_at
        }));
        setTeachers(mapped);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    const handler = async () => { await fetchTeachers(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, []);

  useEffect(() => {
    const fetchActiveTerm = async () => {
      const res = await api('http://localhost:5000/api/terms/active');
      if (res.ok) setActiveTerm(await res.json());
    };
    fetchActiveTerm();
  }, []);

  const exportToExcel = () => {
    const exportData = teachers.map(u => ({ 'Name': u.name, 'Username': u.username }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, 'SmartGrade_Teachers.xlsx');
  };

  const openEditModal = (u) => {
    setTeacherToEdit(u);
    setEditForm({ full_name: u.name });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!teacherToEdit?.rawId) return;
    setEditLoading(true);
    try {
      const res = await api(`http://localhost:5000/api/users/${teacherToEdit.rawId}`, { method: 'PATCH', body: JSON.stringify(editForm) });
      if (res.ok) {
        const updated = await res.json();
        setTeachers(prev => prev.map(u => u.rawId !== teacherToEdit.rawId ? u : { ...u, name: updated.full_name }));
        setEditModalOpen(false);
        setTeacherToEdit(null);
      }
    } catch (err) { console.error(err); }
    finally { setEditLoading(false); }
  };

  const confirmDelete = async () => {
    if (confirmText !== 'Confirm' || !teacherToDelete) return;
    setDeleting(true);
    try {
      const response = await api(`http://localhost:5000/api/users/${teacherToDelete.rawId}`, { method: 'DELETE' });
      if (response.ok) setTeachers(teachers.filter(u => u.rawId !== teacherToDelete.rawId));
    } catch (err) { console.error(err); }
    finally { setDeleting(false); setDeleteModalOpen(false); setTeacherToDelete(null); setConfirmText(''); }
  };

  const openViewModal = async (teacher) => {
    setTeacherToView(teacher);
    setViewModalOpen(true);
    setViewLoading(true);
    try {
      const res = await api(`http://localhost:5000/api/assignments?teacher_id=${teacher.rawId}`);
      if (res.ok) setTeacherAssignments(await res.json());
      else setTeacherAssignments([]);
    } catch { setTeacherAssignments([]); }
    finally { setViewLoading(false); }
  };

  const openAssignModal = async (teacher) => {
    setTeacherToAssign(teacher);
    setAssignYear('1st');
    setAssignSection('');
    setAssignSubject('');
    setAssignSuccess(false);
    setAssignError('');
    setAssignModalOpen(true);
    try {
      const [secRes, subRes] = await Promise.all([
        api('http://localhost:5000/api/sections'),
        api('http://localhost:5000/api/subjects'),
      ]);
      if (secRes.ok) setSectionsList(await secRes.json());
      if (subRes.ok) setSubjectsList(await subRes.json());
    } catch (err) { console.error(err); }
  };

  const filteredSections = sectionsList.filter((s) => s.year_level === assignYear);

  const handleAssign = async () => {
    if (!assignSection || !assignSubject || !teacherToAssign || !activeTerm) return;
    setAssignLoading(true);
    setAssignError('');
    try {
      const res = await api('http://localhost:5000/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          teacher_id: teacherToAssign.rawId,
          section_id: assignSection,
          subject_id: assignSubject,
          school_year: activeTerm.school_year,
          semester: activeTerm.semester,
        }),
      });
      if (res.ok) {
        setAssignSuccess(true);
      } else {
        const data = await res.json();
        setAssignError(data.message || 'Failed to assign');
      }
    } catch { setAssignError('Network error'); }
    finally { setAssignLoading(false); }
  };

  const totalPages = Math.max(1, Math.ceil(teachers.length / USERS_PER_PAGE));
  const paginated = teachers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>Teacher Management</h1>
          <p className="text-xs sm:text-sm mt-0.5 text-gray-500">Provision, edit, and manage all teacher accounts.</p>
        </div>
        <span className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: '#6b7280' }}>{teachers.length} TEACHERS</span>
      </div>

      <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>Teacher Accounts</h2>
          <div className="flex gap-2">
            <button onClick={() => setCreateModalOpen(true)} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105 transition-transform" style={{ background: '#f5a623', borderColor: '#f5a623' }}><UserPlus size={14} /> Add Teacher</button>
            <button onClick={exportToExcel} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105" style={{ background: '#22c55e', borderColor: '#22c55e' }}><Download size={14} /> Export</button>
          </div>
        </div>

        <div className="table-responsive"><table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
              {['NAME', 'USERNAME', 'ACTIONS'].map((h) => (<th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((u) => (
              <tr key={u.rawId} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                <td className="py-3 pr-3 font-bold text-gray-900">{u.name}</td>
                <td className="py-3 pr-3 text-gray-500 text-[11px]">{u.username}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openViewModal(u)} className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded-md hover:bg-blue-50 flex items-center gap-1 text-[11px] font-semibold" title="View Assigned"><Eye size={14} /> View</button>
                    <button onClick={() => openAssignModal(u)} className="text-emerald-600 hover:text-emerald-800 transition-colors p-1 rounded-md hover:bg-emerald-50 flex items-center gap-1 text-[11px] font-semibold" title="Assign"><UserCheck size={14} /> Assign</button>
                    <button onClick={() => openEditModal(u)} className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50" title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => { setTeacherToDelete(u); setConfirmText(''); setDeleteModalOpen(true); }} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
          <span className="text-gray-400">Showing {Math.min((page - 1) * USERS_PER_PAGE + 1, teachers.length)}–{Math.min(page * USERS_PER_PAGE, teachers.length)} of {teachers.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40" style={{ borderColor: '#e5e0d5' }}><ChevronLeft size={14} /></button>
            <span className="text-gray-500 font-medium">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40" style={{ borderColor: '#e5e0d5' }}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50"><Eye size={20} className="text-blue-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assigned Subjects</h3>
                  <p className="text-xs text-gray-400">{teacherToView?.name}</p>
                </div>
              </div>
              <button onClick={() => { setViewModalOpen(false); setTeacherToView(null); setTeacherAssignments([]); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {viewLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-[#f5a623] rounded-full" /></div>
              ) : teacherAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No subjects assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teacherAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-gray-800">{a.subjects?.code ? <span className="text-gray-400 font-mono text-[11px] mr-1.5">{a.subjects.code}</span> : null}{a.subjects?.name}</p>
                        <p className="text-xs text-gray-400">{a.sections?.name}</p>
                        <p className="text-[10px] text-gray-400">{a.school_year} {a.semester}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setAssignmentToRemove(a); setConfirmAssignText(''); setRemoveAssignOpen(true); }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: '#f5a623' }}>
                          {a.sections?.year_level} Year
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button onClick={() => { setViewModalOpen(false); setTeacherToView(null); setTeacherAssignments([]); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Teacher</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" /></div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditModalOpen(false); setTeacherToEdit(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={editLoading}>Cancel</button>
              <button onClick={handleEditSave} disabled={editLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#f5a623' }}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-emerald-50"><UserCheck size={22} className="text-emerald-600" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Teacher</h3>
                <p className="text-xs text-gray-400">Assign <strong className="text-gray-700">{teacherToAssign?.name}</strong> to a class</p>
              </div>
            </div>

            {assignSuccess ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-4"><CheckCircle size={28} className="text-emerald-600" /></div>
                <h4 className="text-base font-bold text-gray-900 mb-1">Successfully Assigned!</h4>
                <p className="text-xs text-gray-400">{teacherToAssign?.name} has been assigned.</p>
                <button onClick={() => { setAssignModalOpen(false); setTeacherToAssign(null); }} className="mt-6 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: '#f5a623' }}>Done</button>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
                  <p className="text-xs text-amber-700 font-medium">Select the year level, section, and subject to assign this teacher.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"><Calendar size={14} /> Year Level</label>
                    <select
                      value={assignYear}
                      onChange={(e) => { setAssignYear(e.target.value); setAssignSection(''); }}
                      className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    >
                      {yearLevels.map((y) => <option key={y} value={y}>{yearLabels[y]}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"><GraduationCap size={14} /> Section</label>
                    <select
                      value={assignSection}
                      onChange={(e) => setAssignSection(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    >
                      <option value="">-- Select Section --</option>
                      {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {filteredSections.length === 0 && <p className="text-[10px] text-gray-400 mt-1">No sections found for {yearLabels[assignYear]}.</p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"><BookOpen size={14} /> Subject</label>
                    <select
                      value={assignSubject}
                      onChange={(e) => setAssignSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    >
                      <option value="">-- Select Subject --</option>
                      {subjectsList.filter((s) => s.year_level === assignYear).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Summary:</span>{' '}
                      {teacherToAssign?.name} will be assigned to{' '}
                      <strong className="text-gray-700">{sectionsList.find((s) => s.id === assignSection)?.name || '___'}</strong>
                      {' '}—{' '}
                      <strong className="text-gray-700">{subjectsList.find((s) => s.id === assignSubject)?.name || '___'}</strong>
                      {' '}({yearLabels[assignYear]}) — {activeTerm?.school_year} {activeTerm?.semester}.
                    </p>
                  </div>
                </div>

                {assignError && <p className="text-xs font-semibold text-red-500 mt-4">{assignError}</p>}
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => { setAssignModalOpen(false); setTeacherToAssign(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button
                    onClick={handleAssign}
                    disabled={!assignSection || !assignSubject || assignLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50"
                    style={{ background: '#22c55e' }}
                  >
                    {assignLoading ? 'Assigning...' : <><UserCheck size={16} /> Assign</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Teacher</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{teacherToDelete?.name}</strong>?</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteModalOpen(false); setTeacherToDelete(null); setConfirmText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={deleting}>Cancel</button>
              <button onClick={confirmDelete} disabled={confirmText !== 'Confirm' || deleting} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmText === 'Confirm' && !deleting ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {removeAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Assignment</h3>
            <p className="text-sm text-gray-500 mb-4">Remove <strong>{assignmentToRemove?.subjects?.name}</strong> from <strong>{assignmentToRemove?.sections?.name}</strong>?</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to remove</label>
              <input type="text" value={confirmAssignText} onChange={(e) => setConfirmAssignText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRemoveAssignOpen(false); setAssignmentToRemove(null); setConfirmAssignText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={removingAssignment}>Cancel</button>
              <button onClick={async () => { if (!assignmentToRemove) return; setRemovingAssignment(true); try { const res = await api(`http://localhost:5000/api/assignments/${assignmentToRemove.id}`, { method: 'DELETE' }); if (res.ok) setTeacherAssignments((prev) => prev.filter((a) => a.id !== assignmentToRemove.id)); } catch (err) { console.error(err); } finally { setRemovingAssignment(false); setRemoveAssignOpen(false); setAssignmentToRemove(null); setConfirmAssignText(''); } }} disabled={confirmAssignText !== 'Confirm' || removingAssignment} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmAssignText === 'Confirm' && !removingAssignment ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{removingAssignment ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && <CreateAdminTeacher onClose={() => setCreateModalOpen(false)} onSuccess={() => { setCreateModalOpen(false); fetchTeachers(); }} />}
    </div>
  );
};

export default AdminTeachers;
