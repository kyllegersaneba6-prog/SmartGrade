import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bolt, Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { SkeletonList } from '../../components/common/Skeleton';
import SuperAdminPageHeading from '../../components/superadmin/SuperAdminPageHeading';

const getDeptAbbr = (dept) => {
  if (dept.abbr && String(dept.abbr).trim()) return String(dept.abbr).trim();
  const match = String(dept.name || '').match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
};

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptAbbreviation, setDeptAbbreviation] = useState('');
  const [addDeptLoading, setAddDeptLoading] = useState(false);

  const [editDept, setEditDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptAbbreviation, setEditDeptAbbreviation] = useState('');
  const [editDeptLoading, setEditDeptLoading] = useState(false);

  const [deleteDept, setDeleteDept] = useState(null);
  const [deleteDeptConfirmText, setDeleteDeptConfirmText] = useState('');
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState(null);

  const closeMenu = () => { setOpenMenuId(null); setMenuPos(null); };
  const openDeptMenu = (dept, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 144;
    const menuHeight = 82;
    const gutter = 8;
    const fitsBelow = rect.bottom + menuHeight + gutter <= window.innerHeight;
    setMenuPos({
      top: fitsBelow ? rect.bottom + 4 : Math.max(gutter, rect.top - menuHeight - 4),
      left: Math.max(gutter, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - gutter)),
    });
    setOpenMenuId(dept.id);
  };

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeMenu(); };
    const closeOnScroll = () => closeMenu();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [openMenuId]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await api('/api/departments');
      if (response.ok) setDepartments(await response.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api('/api/departments')
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setDepartments(data);
      })
      .catch((err) => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleAddDept = async () => {
    const name = deptName.trim();
    const abbreviation = deptAbbreviation.trim();
    if (!name || !abbreviation) return;
    if (departments.some((dept) => dept.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('This department has already been added.');
      return;
    }
    if (departments.some((dept) => getDeptAbbr(dept).toLowerCase() === abbreviation.toLowerCase())) {
      setError('This abbreviation is already in use by another department.');
      return;
    }

    setAddDeptLoading(true);
    setError('');
    try {
      const response = await api('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name, abbr: abbreviation }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || data.message || 'Failed to create department.');
        return;
      }
      await fetchDepartments();
      setAddDeptOpen(false);
      setDeptName('');
      setDeptAbbreviation('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setAddDeptLoading(false);
    }
  };

  const handleEditDept = async () => {
    if (!editDept || !editDeptName.trim() || !editDeptAbbreviation.trim()) return;
    const name = editDeptName.trim();
    const abbreviation = editDeptAbbreviation.trim();
    if (departments.some((dept) => dept.id !== editDept.id && dept.name.trim().toLowerCase() === name.toLowerCase())) {
      setError('This department has already been added.');
      return;
    }
    if (departments.some((dept) => dept.id !== editDept.id && getDeptAbbr(dept).toLowerCase() === abbreviation.toLowerCase())) {
      setError('This abbreviation is already in use by another department.');
      return;
    }

    setEditDeptLoading(true);
    setError('');
    try {
      const response = await api(`/api/departments/${editDept.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, abbr: abbreviation }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || data.message || 'Failed to update department.');
        return;
      }
      await fetchDepartments();
      window.dispatchEvent(new CustomEvent('app:reload'));
      setEditDept(null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setEditDeptLoading(false);
    }
  };

  const handleDeleteDept = async () => {
    if (!deleteDept || deleteDeptConfirmText !== 'Confirm') return;
    setDeleteDeptLoading(true);
    setError('');
    try {
      const response = await api(`/api/departments/${deleteDept.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || data.error || 'Failed to delete department.');
        return;
      }
      await fetchDepartments();
      setDeleteDept(null);
      setDeleteDeptConfirmText('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDeleteDeptLoading(false);
    }
  };

  const closeAddModal = () => {
    setAddDeptOpen(false);
    setDeptName('');
    setDeptAbbreviation('');
    setError('');
  };
  const closeEditModal = () => { setEditDept(null); setError(''); };
  const closeDeleteModal = () => { setDeleteDept(null); setDeleteDeptConfirmText(''); setError(''); };

  if (loading) {
    return <div className="mx-auto max-w-7xl space-y-6" aria-busy="true"><SkeletonList rows={4} /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <SuperAdminPageHeading
        eyebrow="Organization"
        title="Departments"
        description="Create and maintain academic departments, then assign each admin to the department they oversee."
        actions={(
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700">{departments.length} departments</span>
            <button
              type="button"
              onClick={() => { setAddDeptOpen(true); setDeptName(''); setDeptAbbreviation(''); setError(''); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0c1925] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#142a3f]"
            >
              <Plus size={14} /> Add Department
            </button>
          </div>
        )}
      />

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-[#0c1925]">Academic Departments</h2>
          <p className="mt-1 text-xs text-gray-500">Departments are used to group administrators and teachers.</p>
        </div>
        {departments.length === 0 ? (
          <div className="px-5 py-14 text-center text-gray-500">
            <Building2 size={38} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-sm font-bold text-gray-800">No departments yet</h3>
            <p className="mt-1 text-xs">Add your first department to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {departments.map((dept) => (
              <article key={dept.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-100 bg-gray-50 text-[#0c1925]"><Building2 size={19} /></span>
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-bold text-gray-900">{dept.name}</h3>
                    {getDeptAbbr(dept) && <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-900">{getDeptAbbr(dept)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => openMenuId === dept.id ? closeMenu() : openDeptMenu(dept, event)}
                    aria-label={`Actions for ${dept.name}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === dept.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50"
                    title="Department actions"
                  ><Bolt size={18} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {openMenuId && menuPos && createPortal(
        <>
          <button type="button" aria-label="Close department actions" className="fixed inset-0 z-40 cursor-default" onClick={closeMenu} />
          <div role="menu" className="fixed z-50 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl" style={{ top: menuPos.top, left: menuPos.left }}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const dept = departments.find((item) => item.id === openMenuId);
                closeMenu();
                if (dept) { setEditDept(dept); setEditDeptName(dept.name); setEditDeptAbbreviation(getDeptAbbr(dept)); setError(''); }
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            ><Pencil size={14} className="text-blue-500" /> Edit</button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const dept = departments.find((item) => item.id === openMenuId);
                closeMenu();
                if (dept) { setDeleteDept(dept); setDeleteDeptConfirmText(''); setError(''); }
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-red-50 hover:text-red-600"
            ><Trash2 size={14} className="text-red-500" /> Delete</button>
          </div>
        </>,
        document.body
      )}

      {addDeptOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="add-department-title" className="modal-surface w-full max-w-md rounded-xl border border-gray-100 bg-white p-6">
            <h3 id="add-department-title" className="mb-4 text-lg font-bold text-gray-900">Add Department</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Department Name</label>
                <input type="text" value={deptName} onChange={(event) => { setDeptName(event.target.value.replace(/[^A-Za-z\s]/g, '')); setError(''); }} placeholder="e.g. College of Information Technology" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Abbreviation</label>
                <input type="text" value={deptAbbreviation} onChange={(event) => { setDeptAbbreviation(event.target.value.toUpperCase().replace(/[^A-Z]/g, '')); setError(''); }} placeholder="e.g. CIT" maxLength={10} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
              </div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeAddModal} disabled={addDeptLoading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleAddDept} disabled={!deptName.trim() || !deptAbbreviation.trim() || addDeptLoading} className="rounded-lg bg-[#0c1925] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50">{addDeptLoading ? 'Adding...' : 'Add Department'}</button>
            </div>
          </section>
        </div>
      )}

      {editDept && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-department-title" className="modal-surface w-full max-w-md rounded-xl border border-gray-100 bg-white p-6">
            <h3 id="edit-department-title" className="mb-4 text-lg font-bold text-gray-900">Edit Department</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Department Name</label>
                <input type="text" value={editDeptName} onChange={(event) => { setEditDeptName(event.target.value); setError(''); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">Abbreviation</label>
                <input type="text" value={editDeptAbbreviation} onChange={(event) => { setEditDeptAbbreviation(event.target.value.toUpperCase()); setError(''); }} maxLength={10} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
              </div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeEditModal} disabled={editDeptLoading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleEditDept} disabled={!editDeptName.trim() || !editDeptAbbreviation.trim() || editDeptLoading} className="rounded-lg bg-[#0c1925] px-4 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-50">{editDeptLoading ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </section>
        </div>
      )}

      {deleteDept && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-department-title" className="modal-surface w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6">
            <h3 id="delete-department-title" className="mb-2 text-lg font-bold text-gray-900">Delete Department</h3>
            <p className="mb-4 text-sm text-gray-600">Are you sure you want to delete <strong>{deleteDept.name}</strong>? This cannot be undone.</p>
            <label className="mb-1 block text-xs font-bold text-gray-700">Type <strong>Confirm</strong> to delete</label>
            <input type="text" value={deleteDeptConfirmText} onChange={(event) => { setDeleteDeptConfirmText(event.target.value); setError(''); }} placeholder="Confirm" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeDeleteModal} disabled={deleteDeptLoading} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleDeleteDept} disabled={deleteDeptConfirmText !== 'Confirm' || deleteDeptLoading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">{deleteDeptLoading ? 'Deleting...' : 'Delete Department'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ManageDepartments;
