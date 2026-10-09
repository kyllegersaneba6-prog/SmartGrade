import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, Trash2, Pencil, Upload, UserCheck, BookOpen, GraduationCap, Calendar,
CheckCircle, Eye, EyeOff, X, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
import CreateAdminTeacher from './CreateAdminTeacher';
import { useAdmin } from '../../contexts/AdminContext';
import api from '../../utils/api';
import { displayStaffId, formatStaffId, isValidStaffId, lastNameFromFullName, staffIdToDigits, usernameFromLastNameAndId } from '../../utils/staffId';
import { SkeletonList } from '../../components/common/Skeleton';

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
  const [editForm, setEditForm] = useState({ full_name: '', staff_id: '', username: '', password: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [teacherToAssign, setTeacherToAssign] = useState(null);
  const [assignYear, setAssignYear] = useState('1st');
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [assignCourse, setAssignCourse] = useState('');
  const [assignSection, setAssignSection] = useState('');
  const [assignSubject, setAssignSubject] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [teacherToView, setTeacherToView] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [removeAssignOpen, setRemoveAssignOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState(null);
  const [confirmAssignText, setConfirmAssignText] = useState('');
  const [removingAssignment, setRemovingAssignment] = useState(false);
  const [allAssignments, setAllAssignments] = useState([]);
  const { isArchiveMode, currentTerm, activeTerm } = useAdmin();

  const teacherCourses = useMemo(() => {
    const target = currentTerm;
    if (!target) return {};
    const filtered = allAssignments.filter(a =>
      a.school_year === target.school_year && a.semester === target.semester
    );
    const courseMap = {};
    filtered.forEach(a => {
      const tid = a.teacher_id;
      const abbrev = a.sections?.courses?.abbreviation;
      if (tid && abbrev) {
        if (!courseMap[tid]) courseMap[tid] = new Set();
        courseMap[tid].add(abbrev);
      }
    });
    const serialized = {};
    Object.keys(courseMap).forEach(key => { serialized[key] = [...courseMap[key]]; });
    return serialized;
  }, [allAssignments, currentTerm]);

  const yearLevels = ['1st', '2nd', '3rd', '4th'];
  const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };



  const fetchTeachers = async () => {
    try {
      const [response, assignRes] = await Promise.all([
        api('http://localhost:5000/api/users'),
        api('http://localhost:5000/api/assignments'),
      ]);
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((u) => ({
          rawId: u.id,
          name: u.full_name,
          staffId: u.staff_id || '',
          username: u.username || 'N/A',
          dept: u.department || 'N/A',
          createdAt: u.created_at
        }));
        setTeachers(mapped);
      }
      if (assignRes.ok) setAllAssignments(await assignRes.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  useEffect(() => {
    const handler = async () => { await fetchTeachers(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, []);

  const exportToExcel = () => {
    const exportData = teachers.map(u => ({ 'ID': displayStaffId(u.staffId), 'Name': u.name, 'Username': u.username }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, 'SmartGrade_Teachers.xlsx');
  };

  const openEditModal = (u) => {
    setTeacherToEdit(u);
    setEditForm({
      full_name: u.name,
      staff_id: formatStaffId(u.staffId || ''),
      username: u.username === 'N/A' ? '' : u.username,
      password: ''
    });
    setShowEditPassword(false);
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!teacherToEdit?.rawId) return;
    if (editForm.staff_id.trim() && !isValidStaffId(editForm.staff_id)) {
      setEditError('ID must contain exactly 9 digits (format 00000-0000).');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      const body = { full_name: editForm.full_name, staff_id: staffIdToDigits(editForm.staff_id) };
      const res = await api(`http://localhost:5000/api/users/${teacherToEdit.rawId}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm.password.trim() ? { ...body, password: editForm.password } : body)
      });
      if (res.ok) {
        const updated = await res.json();
        setTeachers(prev => prev.map(u => u.rawId !== teacherToEdit.rawId ? u : { ...u, name: updated.full_name, staffId: updated.staff_id || '', username: updated.username || u.username }));
        setEditModalOpen(false);
        setTeacherToEdit(null);
        setEditError('');
      } else {
        const data = await res.json();
        setEditError(data.message || data.error || 'Failed to update teacher');
      }
    } catch (err) { console.error(err); setEditError('Network error. Please try again.'); }
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
      if (res.ok) {
        const data = await res.json();
        if (currentTerm) {
          setTeacherAssignments(data.filter(a =>
            a.school_year === currentTerm.school_year && a.semester === currentTerm.semester
          ));
        } else {
          setTeacherAssignments(data);
        }
      } else setTeacherAssignments([]);
    } catch { setTeacherAssignments([]); }
    finally { setViewLoading(false); }
  };

  const openAssignModal = async (teacher) => {
    setTeacherToAssign(teacher);
    setAssignYear('1st');
    setAssignCourse('');
    setAssignSection('');
    setAssignSubject('');
    setAssignSuccess(false);
    setAssignError('');
    setAssignModalOpen(true);
    try {
      const termParams = currentTerm ? `?school_year=${currentTerm.school_year}&semester=${currentTerm.semester}` : '';
      const adminDept = JSON.parse(localStorage.getItem('user') || '{}')?.department;
      let deptId = '';
      if (adminDept) {
        const deptRes = await api('http://localhost:5000/api/departments');
        if (deptRes.ok) {
          const depts = await deptRes.json();
          const match = depts.find(d => d.name === adminDept);
          if (match) deptId = match.id;
        }
      }
      const [secRes, subRes, courseRes] = await Promise.all([
        api(`http://localhost:5000/api/sections${termParams}`),
        api(`http://localhost:5000/api/subjects${currentTerm ? `?semester=${currentTerm.semester}` : ''}`),
        deptId ? api(`http://localhost:5000/api/courses?department_id=${deptId}`) : api('http://localhost:5000/api/courses'),
      ]);
      if (secRes.ok) setSectionsList(await secRes.json());
      if (subRes.ok) setSubjectsList(await subRes.json());
      if (courseRes.ok) setCoursesList(await courseRes.json());
    } catch (err) { console.error(err); }
  };

  const filteredSections = sectionsList.filter((s) => s.year_level === assignYear && (!assignCourse || s.course_id === assignCourse || !s.course_id));
  const filteredSubjects = subjectsList.filter((s) => s.year_level === assignYear && (!assignCourse || s.course_id === assignCourse || !s.course_id));

  const handleAssign = async () => {
    if (!assignSection || !assignSubject || !teacherToAssign || !currentTerm) return;
    setAssignLoading(true);
    setAssignError('');
    try {
      const res = await api('http://localhost:5000/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          teacher_id: teacherToAssign.rawId,
          section_id: assignSection,
          subject_id: assignSubject,
          school_year: currentTerm.school_year,
          semester: currentTerm.semester,
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Teacher Management</h1>
          <p className="text-xs sm:text-sm mt-0.5 text-amber-400">Provision, edit, and manage all teacher accounts.</p>
        </div>
        <span className="text-[10px] sm:text-sm font-bold px-3 py-1 rounded-full text-white" style={{ background: '#0c1925' }}>{teachers.length} TEACHERS</span>
      </div>

      <div className="rounded-xl p-5 shadow-sm border border-gray-50 card-hover" style={{ background: '#fff' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Teacher Accounts</h2>
          <div className="flex gap-2">
            <button onClick={() => setCreateModalOpen(true)} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105 transition-transform" style={{ background: '#0c1925', borderColor: '#0c1925' }}><UserPlus size={14} /> Add Teacher</button>
            <button onClick={exportToExcel} className="px-3 h-8 rounded border flex items-center gap-1.5 text-[#0c1925] text-xs font-bold shadow-sm hover:scale-105" style={{ background: '#fbbf24', borderColor: '#fbbf24' }}><Upload size={14} /> Export</button>
          </div>
        </div>

        <div className="table-responsive"><table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
              {['ID', 'NAME', 'USERNAME', 'ASSIGNED COURSE', 'ACTIONS'].map((h) => (<th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[12px] uppercase tracking-wide">{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-xs text-gray-500">
                  No teachers have been added yet. Click <strong>Add Teacher</strong> to create the first account.
                </td>
              </tr>
            )}
            {paginated.map((u) => (
              <tr key={u.rawId} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                <td className="py-3 pr-3 font-mono text-[12px] text-gray-900">{displayStaffId(u.staffId)}</td>
                <td className="py-3 pr-3 font-bold text-gray-900">{u.name}</td>
                <td className="py-3 pr-3 text-gray-900 text-[12px]">{u.username}</td>
                <td className="py-3 pr-3">
                  {teacherCourses[u.rawId]?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacherCourses[u.rawId].map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-900 ">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-500">—</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openViewModal(u)} className="text-blue-600 hover:text-blue-900 transition-colors p-1 rounded-md hover:bg-white flex items-center gap-1 text-[11px] font-semibold" title="View Assigned"><Eye size={14} /> View</button>
                    <div className="relative group inline-block">
                      <button onClick={() => openAssignModal(u)} disabled={isArchiveMode} className={`text-[#0c1925] transition-colors p-1 rounded-md flex items-center gap-1 text-[11px] font-semibold ${isArchiveMode ? 'opacity-40 cursor-not-allowed' : 'hover:text-[#0c1925] hover:bg-gray-300'}`} title={isArchiveMode ? 'Cannot assign while viewing archives' : 'Assign'}><UserCheck size={14} /> Assign</button>
                      {isArchiveMode && <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Cannot modify while viewing archives</div>}
                    </div>
                    <button onClick={() => openEditModal(u)} className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50" title="Edit"><Pencil size={14} /></button>
                    <button onClick={() => { setTeacherToDelete(u); setConfirmText(''); setDeleteModalOpen(true); }} className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
          <span className="text-gray-900">Showing {Math.min((page - 1) * USERS_PER_PAGE + 1, teachers.length)}–{Math.min(page * USERS_PER_PAGE, teachers.length)} of {teachers.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border text-gray-500 hover:text-sidebar hover:border-gray-900 disabled:opacity-40" style={{ borderColor: '#e5e0d5' }}><ChevronLeft size={14} /></button>
            <span className="text-gray-900 font-medium">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border text-gray-500 hover:text-sidebar hover:border-gray-900 disabled:opacity-40" style={{ borderColor: '#e5e0d5' }}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-lg w-full mx-4 border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50"><Eye size={20} className="text-blue-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assigned Subjects</h3>
                  <p className="text-sm text-gray-900">{teacherToView?.name}</p>
                </div>
              </div>
              <button onClick={() => { setViewModalOpen(false); setTeacherToView(null); setTeacherAssignments([]); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {viewLoading ? (
                <div aria-busy="true"><SkeletonList rows={3} avatar /></div>
              ) : teacherAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No subjects assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const groups = {};
                    teacherAssignments.forEach(a => {
                      const gk = `${a.school_year}|${a.semester}`;
                      if (!groups[gk]) groups[gk] = { school_year: a.school_year, semester: a.semester, items: [] };
                      groups[gk].items.push(a);
                    });
                    return Object.keys(groups).map((gk) => {
                      const group = groups[gk];
                      const isActive = activeTerm && group.school_year === activeTerm.school_year && group.semester === activeTerm.semester;
                      return (
                        <div key={gk}>
                          <div className={`px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-t-lg border-b ${
                            isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {group.school_year} | {group.semester}
                            {isActive ? <span className="ml-1.5 text-green-600 bg-green-100 px-1.5 py-0.5 rounded text-[9px]">Active</span> : <span className="ml-1.5 text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded text-[9px]">Historical</span>}
                          </div>
                          <div className="space-y-2 mt-2">
                            {group.items.map(a => (
                              <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-semibold text-gray-900">{a.subjects?.code ? <span className="text-gray-900 font-mono text-[11px] mr-1.5">{a.subjects.code}</span> : null}{a.subjects?.name}</p>
                                  <p className="text-xs text-gray-900">{a.sections?.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isActive ? (
                                    <button
                                      onClick={() => { setAssignmentToRemove(a); setConfirmAssignText(''); setRemoveAssignOpen(true); }}
                                      className="text-red-400 hover:text-red-600 transition-colors"
                                      title="Remove assignment (deletes grading & attendance data)"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : (
                                    <Lock size={14} className="text-gray-300" title="Historical assignment — read-only" />
                                  )}
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: '#f5a623' }}>
                                    {a.sections?.year_level} Year
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Teacher</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label><input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm" /></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ID</label><input type="text" value={editForm.staff_id} onChange={(e) => setEditForm({ ...editForm, staff_id: formatStaffId(e.target.value) })} placeholder="00000-0000" maxLength={10} inputMode="numeric" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm font-mono" /></div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Username (auto-generated)</label>
                <input type="text" value={usernameFromLastNameAndId(lastNameFromFullName(editForm.full_name), editForm.staff_id) || editForm.username} readOnly className="w-full px-3 py-2 bg-gray-100 border border-[#e5e0d5] rounded-lg text-sm text-gray-500 cursor-not-allowed font-mono" />
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
              <button onClick={() => { setEditModalOpen(false); setTeacherToEdit(null); setEditError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={editLoading}>Cancel</button>
              <button onClick={handleEditSave} disabled={editLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#0c1925' }}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-lg w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-gray-100"><UserCheck size={22} className="text-[#0c1925]" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Teacher</h3>
                <p className="text-xs text-gray-900">Assign <strong className="text-gray-700">{teacherToAssign?.name}</strong> to a class</p>
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
                <div className="bg-amber-50 border border-amber-400 rounded-lg px-4 py-3 mb-5 space-y-1">
                  <p className="text-xs text-amber-700 font-medium">
                    Select the year level, section, and subject to assign this teacher.
                  </p>
                  <p className="text-[11px] text-amber-600 font-semibold">
                    This creates a <strong>new</strong> assignment. The teacher's existing assignments and their data remain unchanged.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5"><Calendar size={14} /> Year Level</label>
                    <select
                      value={assignYear}
                      onChange={(e) => { setAssignYear(e.target.value); setAssignSection(''); }}
                      className="w-full px-3 py-2 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] bg-gray-100  text-sm"
                    >
                      {yearLevels.map((y) => <option key={y} value={y}>{yearLabels[y]}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5"><BookOpen size={14} /> Course</label>
                    <select
                      value={assignCourse}
                      onChange={(e) => { setAssignCourse(e.target.value); setAssignSection(''); setAssignSubject(''); }}
                      className="w-full px-3 py-2 border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] bg-gray-100  text-sm"
                    >
                      <option value="">-- Select Course --</option>
                      {coursesList.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.abbreviation})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5"><GraduationCap size={14} /> Section</label>
                    <select
                      value={assignSection}
                      onChange={(e) => setAssignSection(e.target.value)}
                      disabled={!assignCourse}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] text-sm ${!assignCourse ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100'}`}
                    >
                      <option value="">-- Select Section --</option>
                      {filteredSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {!assignCourse ? (
                      <p className="text-[10px] text-gray-900 mt-1">Select a course first.</p>
                    ) : filteredSections.length === 0 ? (
                      <p className="text-[10px] text-gray-500 mt-1">No sections found for {yearLabels[assignYear]} and selected course.</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider mb-1.5"><BookOpen size={14} /> Subject</label>
                    <select
                      value={assignSubject}
                      onChange={(e) => setAssignSubject(e.target.value)}
                      disabled={!assignCourse}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] text-sm ${!assignCourse ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100'}`}
                    >
                      <option value="">-- Select Subject --</option>
                      {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {!assignCourse ? (
                      <p className="text-[10px] text-gray-900 mt-1">Select a course first.</p>
                    ) : filteredSubjects.length === 0 ? (
                      <p className="text-[10px] text-gray-500 mt-1">No subjects found for {yearLabels[assignYear]} and selected course.</p>
                    ) : null}
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                  <p className="text-xs text-gray-900">
                    <span className="font-semibold text-gray-700">Summary:</span>{' '}
                      {teacherToAssign?.name} will be assigned to{' '}
                      <strong className="text-gray-700">{sectionsList.find((s) => s.id === assignSection)?.name || '___'}</strong>
                      {' '}—{' '}
                      <strong className="text-gray-700">{subjectsList.find((s) => s.id === assignSubject)?.name || '___'}</strong>
                      {' '}({yearLabels[assignYear]}) — {currentTerm?.school_year} {currentTerm?.semester}.
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
                    style={{ background: '#0c1925' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Assignment</h3>
            <p className="text-sm text-gray-500 mb-1">Remove <strong>{assignmentToRemove?.subjects?.name}</strong> from <strong>{assignmentToRemove?.sections?.name}</strong>?</p>
            <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              This permanently deletes all grading components, scores, and attendance records for this assignment. This action cannot be undone.
            </p>
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


