import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bolt, BookOpen, Pencil, Search, Trash2, UserPlus, X, Eye, EyeOff } from 'lucide-react';
import CreateAdminTeacher from './CreateAdminTeacher';
import api from '../../utils/api';
import { displayStaffId, formatStaffId, usernameFromLastNameAndId } from '../../utils/staffId';
import AdminPageHeading from '../../components/admin/AdminPageHeading';

const AdminTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', password: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [classesTeacher, setClassesTeacher] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const classesRequestId = useRef(0);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);

  const closeMenu = () => { setOpenMenuId(null); setMenuPos(null); };
  const openActionsMenu = (teacher, event) => {
    if (openMenuId === teacher.id) { closeMenu(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = 126;
    const gutter = 8;
    const fitsBelow = rect.bottom + menuHeight + gutter <= window.innerHeight;
    setMenuPos({
      top: fitsBelow ? rect.bottom + 4 : Math.max(gutter, rect.top - menuHeight - 4),
      left: Math.max(gutter, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - gutter)),
    });
    setOpenMenuId(teacher.id);
  };

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeMenu(); };
    const closeOnScrollOrResize = () => closeMenu();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScrollOrResize, true);
    window.addEventListener('resize', closeOnScrollOrResize);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScrollOrResize, true);
      window.removeEventListener('resize', closeOnScrollOrResize);
    };
  }, [openMenuId]);

  const fetchTeachers = async () => {
    try {
      const response = await api('/api/users');
      if (response.ok) setTeachers(await response.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api('/api/users')
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setTeachers(data);
      })
      .catch((error) => console.error(error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = async () => {
      await fetchTeachers();
      window.dispatchEvent(new CustomEvent('app:reload-done'));
    };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, []);

  const filteredTeachers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter((teacher) => displayStaffId(teacher.staff_id).toLowerCase().includes(query)
      || String(teacher.staff_id || '').toLowerCase().includes(query)
      || teacher.full_name?.toLowerCase().includes(query)
      || teacher.username?.toLowerCase().includes(query));
  }, [teachers, searchQuery]);

  const openEdit = (teacher) => {
    setTeacherToEdit(teacher);
    setEditForm({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      password: '',
    });
    setEditError('');
    setShowEditPassword(false);
  };

  const openClasses = async (teacher) => {
    const requestId = ++classesRequestId.current;
    setClassesTeacher(teacher);
    setTeacherClasses([]);
    setClassesError('');
    setClassesLoading(true);
    try {
      const response = await api(`/api/assignments?teacher_id=${encodeURIComponent(teacher.id)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || 'Could not load this teacher’s classes.');
      if (requestId === classesRequestId.current) setTeacherClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      if (requestId === classesRequestId.current) setClassesError(error.message || 'Network error. Please try again.');
    } finally {
      if (requestId === classesRequestId.current) setClassesLoading(false);
    }
  };

  const closeClasses = () => {
    classesRequestId.current += 1;
    setClassesTeacher(null);
    setTeacherClasses([]);
    setClassesError('');
    setClassesLoading(false);
  };

  const uniqueClasses = useMemo(() => {
    const sections = new Map();
    teacherClasses.forEach((assignment) => {
      const section = assignment.sections;
      if (!section) return;
      const key = [assignment.section_id || section.name, assignment.school_year, assignment.semester].join('|');
      if (!sections.has(key)) {
        sections.set(key, {
          sectionId: assignment.section_id,
          sectionName: section.name || 'Unnamed section',
          yearLevel: section.year_level || '',
          course: section.courses?.abbreviation || '',
          schoolYear: assignment.school_year || '',
          semester: assignment.semester || '',
        });
      }
    });
    return [...sections.values()].sort((a, b) => (
      b.schoolYear.localeCompare(a.schoolYear)
      || a.semester.localeCompare(b.semester)
      || a.sectionName.localeCompare(b.sectionName)
    ));
  }, [teacherClasses]);
  const menuTeacher = teachers.find((teacher) => teacher.id === openMenuId) || null;

  const saveEdit = async () => {
    if (!teacherToEdit) return;
    const firstName = editForm.first_name.trim();
    const lastName = editForm.last_name.trim();
    if (!firstName || !lastName) {
      setEditError('First name and last name are required.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const body = {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      };
      const response = await api(`/api/users/${teacherToEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm.password.trim() ? { ...body, password: editForm.password } : body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to update teacher.');
      setTeachers((current) => current.map((teacher) => teacher.id === teacherToEdit.id ? { ...teacher, ...data } : teacher));
      setTeacherToEdit(null);
    } catch (error) {
      setEditError(error.message || 'Network error. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (confirmText !== 'Confirm' || !teacherToDelete) return;
    setDeleting(true);
    try {
      const response = await api(`/api/users/${teacherToDelete.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to delete teacher.');
      setTeachers((current) => current.filter((teacher) => teacher.id !== teacherToDelete.id));
      setTeacherToDelete(null);
      setConfirmText('');
    } catch (error) {
      setConfirmText('');
      window.alert(error.message || 'Failed to delete teacher.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeading
        eyebrow="Accounts"
        title="Teacher Management"
        description="Create and maintain teacher accounts. Teachers set up their own sections by importing the class-list PDF they receive."
        actions={<span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700">{teachers.length} teachers</span>}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#0c1925]">Teacher Accounts</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setCreateModalOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg border border-[#0c1925] bg-[#0c1925] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#142a3f]"><UserPlus size={14} /> Add Teacher</button>
            <label className="relative">
              <span className="sr-only">Search teachers</span>
              <input
                type="text"
                placeholder="Search by ID, name, or username..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-xs focus:border-[#0c1925] focus:outline-none focus:ring-2 focus:ring-[#0c1925] sm:w-64"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="rounded-lg absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Clear search"><X size={14} /></button>}
            </label>
          </div>
        </div>

        <div className="max-h-[min(520px,65vh)] overflow-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['ID', 'NAME', 'USERNAME', 'DATE ADDED', 'ACTIONS'].map((heading) => <th key={heading} scope="col" className="sticky top-0 z-10 bg-gray-50 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-gray-600">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-500">Loading teacher accounts…</td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-500">{searchQuery.trim() ? 'No teachers match your search.' : <>No teachers have been added yet. Click <strong>Add Teacher</strong> to create the first account.</>}</td></tr>
              ) : filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-[12px] text-gray-900">{displayStaffId(teacher.staff_id)}</td>
                  <td className="px-3 py-3 font-bold text-gray-900">{teacher.full_name}</td>
                  <td className="px-3 py-3 text-[12px] text-gray-700">{teacher.username || '—'}</td>
                  <td className="px-3 py-3 text-gray-600">{teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={(event) => openActionsMenu(teacher, event)}
                      aria-label={`Actions for ${teacher.full_name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === teacher.id}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                      title="Teacher actions"
                    ><Bolt size={20} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span>Showing {filteredTeachers.length} of {teachers.length} teachers</span>
        </div>

        {openMenuId && menuTeacher && menuPos && createPortal(
          <>
            <button type="button" aria-label="Close teacher actions" className="fixed inset-0 z-40 cursor-default" onClick={closeMenu} />
            <div role="menu" className="fixed z-50 w-40 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl" style={{ top: menuPos.top, left: menuPos.left }}>
              <button
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); openClasses(menuTeacher); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              ><BookOpen size={14} /> Classes</button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); openEdit(menuTeacher); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              ><Pencil size={14} className="text-blue-500" /> Edit</button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { closeMenu(); setTeacherToDelete(menuTeacher); setConfirmText(''); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
              ><Trash2 size={14} className="text-red-500" /> Delete</button>
            </div>
          </>,
          document.body
        )}
      </section>

      {teacherToEdit && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-surface mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">Edit Teacher</h3>
            <div className="space-y-4">
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">ID</label><input value={formatStaffId(teacherToEdit.staff_id || '')} readOnly className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 font-mono text-sm text-gray-600" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">First Name</label><input value={editForm.first_name} onChange={(event) => setEditForm({ ...editForm, first_name: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Last Name</label><input value={editForm.last_name} onChange={(event) => setEditForm({ ...editForm, last_name: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Username (auto-generated)</label><input readOnly value={usernameFromLastNameAndId(editForm.last_name, teacherToEdit.staff_id) || teacherToEdit.username || ''} className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-sm text-gray-600" /></div>
              <div><label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">New Password (leave blank to keep current)</label><div className="relative"><input type={showEditPassword ? 'text' : 'password'} value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm" /><button type="button" onClick={() => setShowEditPassword(!showEditPassword)} aria-label={showEditPassword ? 'Hide password' : 'Show password'} className="rounded-lg absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">{showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            </div>
            {editError && <p className="mt-4 text-sm font-semibold text-red-600">{editError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button onClick={() => setTeacherToEdit(null)} disabled={editLoading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button><button onClick={saveEdit} disabled={editLoading} className="rounded-lg bg-[#0c1925] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{editLoading ? 'Saving…' : 'Save Changes'}</button></div>
          </div>
        </div>
      )}

      {teacherToDelete && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-surface mx-4 w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Teacher</h3>
            <p className="mb-4 text-sm text-gray-600">Are you sure you want to delete <strong>{teacherToDelete.full_name}</strong>?</p>
            <label className="mb-1 block text-xs font-bold text-gray-700">Type <strong>Confirm</strong> to delete</label>
            <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Confirm" />
            <div className="mt-5 flex justify-end gap-3"><button onClick={() => { setTeacherToDelete(null); setConfirmText(''); }} disabled={deleting} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button><button onClick={confirmDelete} disabled={confirmText !== 'Confirm' || deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{deleting ? 'Deleting…' : 'Delete'}</button></div>
          </div>
        </div>
      )}

      {classesTeacher && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeClasses(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="teacher-classes-title" className="modal-surface w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Teacher classes</p>
                <h3 id="teacher-classes-title" className="mt-1 text-lg font-bold text-gray-900">{classesTeacher.full_name}</h3>
                <p className="mt-1 text-xs text-gray-500">Courses, year levels, and sections handled by this teacher.</p>
              </div>
              <button type="button" onClick={closeClasses} aria-label="Close class list" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"><X size={18} /></button>
            </header>
            <div className="max-h-[65vh] overflow-y-auto p-6">
              {classesLoading ? (
                <p className="py-10 text-center text-sm text-gray-500">Loading class assignments…</p>
              ) : classesError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{classesError}</div>
              ) : uniqueClasses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
                  <BookOpen size={22} className="mx-auto text-gray-400" />
                  <p className="mt-2 text-sm font-semibold text-gray-700">No class sections yet</p>
                  <p className="mt-1 text-xs text-gray-500">The teacher’s imported class sections will appear here.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {uniqueClasses.map((item) => (
                    <article key={`${item.sectionId || item.sectionName}-${item.schoolYear}-${item.semester}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Section</p>
                          <h4 className="mt-0.5 text-base font-extrabold text-[#0c1925]">{item.sectionName}</h4>
                        </div>
                        {item.course && <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">{item.course}</span>}
                      </div>
                      <p className="mt-2 text-xs font-semibold text-gray-700">{item.yearLevel ? `${item.yearLevel} Year` : 'Year level not set'}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500">{[item.schoolYear, item.semester].filter(Boolean).join(' · ') || 'Academic term not set'}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <footer className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <span className="text-xs text-gray-500">{classesLoading ? 'Loading…' : `${uniqueClasses.length} ${uniqueClasses.length === 1 ? 'section' : 'sections'}`}</span>
              <button type="button" onClick={closeClasses} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
            </footer>
          </section>
        </div>
      )}

      {createModalOpen && <CreateAdminTeacher onClose={() => setCreateModalOpen(false)} onSuccess={() => { setCreateModalOpen(false); fetchTeachers(); }} />}
    </div>
  );
};

export default AdminTeachers;
