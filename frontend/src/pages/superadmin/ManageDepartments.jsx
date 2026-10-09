import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Building2, BookOpen, ChevronDown } from 'lucide-react';
import api from '../../utils/api';
import { SkeletonList } from '../../components/common/Skeleton';

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptAbbreviation, setDeptAbbreviation] = useState('');
  const [addDeptLoading, setAddDeptLoading] = useState(false);

  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptAbbreviation, setEditDeptAbbreviation] = useState('');
  const [editDeptLoading, setEditDeptLoading] = useState(false);

  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false);
  const [deleteDeptConfirmText, setDeleteDeptConfirmText] = useState('');

  const [manageCoursesDept, setManageCoursesDept] = useState(null);
  const [coursesByDept, setCoursesByDept] = useState({});
  const [coursesLoadingByDept, setCoursesLoadingByDept] = useState({});
  const [expandedDepts, setExpandedDepts] = useState({});

  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseAbbreviation, setCourseAbbreviation] = useState('');
  const [addCourseLoading, setAddCourseLoading] = useState(false);

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editCourseAbbreviation, setEditCourseAbbreviation] = useState('');
  const [editCourseLoading, setEditCourseLoading] = useState(false);

  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [deleteCourseLoading, setDeleteCourseLoading] = useState(false);
  const [deleteCourseConfirmText, setDeleteCourseConfirmText] = useState('');

  const errorColor = '#ef4444';
  const [error, setError] = useState('');

  // Stored abbr first; fall back to the code in parentheses
  // (e.g. "College of … (CICT)" → "CICT") so older rows still show one.
  const getDeptAbbr = (dept) => {
    if (dept.abbr && String(dept.abbr).trim()) return String(dept.abbr).trim();
    const m = String(dept.name || '').match(/\(([^)]+)\)\s*$/);
    return m ? m[1].trim() : '';
  };

  const fetchDepartments = async () => {
    try {
      const res = await api('http://localhost:5000/api/departments');
      if (res.ok) setDepartments(await res.json());
    } catch (err) { console.error(err); }
  };

  const [courseCounts, setCourseCounts] = useState({});
  const [countsLoaded, setCountsLoaded] = useState(false);

  // Independent from expand/collapse: loads every department's total up front on page load.
  const fetchCourseCounts = async () => {
    try {
      const res = await api('http://localhost:5000/api/courses');
      if (res.ok) {
        const all = await res.json();
        const counts = {};
        all.forEach((c) => {
          if (c.department_id) counts[c.department_id] = (counts[c.department_id] || 0) + 1;
        });
        setCourseCounts(counts);
      }
    } catch (err) { console.error(err); }
    finally { setCountsLoaded(true); }
  };

  const fetchDeptCourses = async (deptId) => {
    setCoursesLoadingByDept((prev) => ({ ...prev, [deptId]: true }));
    try {
      const res = await api(`http://localhost:5000/api/courses?department_id=${deptId}`);
      if (res.ok) {
        const data = await res.json();
        setCoursesByDept((prev) => ({ ...prev, [deptId]: data }));
      }
    } catch (err) { console.error(err); }
    finally { setCoursesLoadingByDept((prev) => ({ ...prev, [deptId]: false })); }
  };

  const toggleDept = (dept) => {
    const willExpand = !expandedDepts[dept.id];
    setExpandedDepts((prev) => ({ ...prev, [dept.id]: willExpand }));
    if (willExpand && coursesByDept[dept.id] === undefined && !coursesLoadingByDept[dept.id]) {
      fetchDeptCourses(dept.id);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDepartments(), fetchCourseCounts()]).finally(() => setLoading(false));
  }, []);

  const handleAddDept = async () => {
    if (!deptName.trim() || !deptAbbreviation.trim()) return;
    if (departments.some((d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase())) {
      setError('This department has already been added.');
      return;
    }
    if (departments.some((d) => getDeptAbbr(d).toLowerCase() === deptAbbreviation.trim().toLowerCase())) {
      setError('This abbreviation is already in use by another department.');
      return;
    }
    setAddDeptLoading(true);
    setError('');
    try {
      const res = await api('http://localhost:5000/api/departments', { method: 'POST', body: JSON.stringify({ name: deptName.trim(), abbr: deptAbbreviation.trim() }) });
      if (res.ok) {
        await fetchDepartments();
        setAddDeptOpen(false);
        setDeptName('');
        setDeptAbbreviation('');
      } else {
        const data = await res.json();
        setError(data.error || data.message || 'Failed to create department');
      }
    } catch { setError('Network error'); }
    finally { setAddDeptLoading(false); }
  };

  const handleEditDept = async () => {
    if (!editDeptName.trim() || !editDept) return;
    setEditDeptLoading(true);
    setError('');
    try {
      const res = await api(`http://localhost:5000/api/departments/${editDept.id}`, { method: 'PATCH', body: JSON.stringify({ name: editDeptName.trim(), abbr: editDeptAbbreviation.trim() }) });
      if (res.ok) {
        await fetchDepartments();
        setEditDeptOpen(false);
        setEditDept(null);
      } else {
        const data = await res.json();
        setError(data.error || data.message || 'Failed to update department');
      }
    } catch { setError('Network error'); }
    finally { setEditDeptLoading(false); }
  };

  const handleDeleteDept = async () => {
    if (!deleteDept) return;
    setDeleteDeptLoading(true);
    setError('');
    try {
      const res = await api(`http://localhost:5000/api/departments/${deleteDept.id}`, { method: 'DELETE' });
      if (res.ok) {
        const removedId = deleteDept.id;
        await fetchDepartments();
        setDeleteDeptOpen(false);
        setDeleteDept(null);
        setDeleteDeptConfirmText('');
        setExpandedDepts((prev) => {
          const next = { ...prev };
          delete next[removedId];
          return next;
        });
        setCoursesByDept((prev) => {
          const next = { ...prev };
          delete next[removedId];
          return next;
        });
        setCourseCounts((prev) => {
          const next = { ...prev };
          delete next[removedId];
          return next;
        });
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete department');
      }
    } catch { setError('Network error'); }
    finally { setDeleteDeptLoading(false); }
  };

  const openAddCourse = (dept) => {
    setManageCoursesDept(dept);
    setAddCourseOpen(true);
    setError('');
  };

  const handleAddCourse = async () => {
    if (!courseName.trim() || !courseAbbreviation.trim() || !manageCoursesDept) return;
    setAddCourseLoading(true);
    setError('');
    try {
      const res = await api('http://localhost:5000/api/courses', { method: 'POST', body: JSON.stringify({ name: courseName.trim(), abbreviation: courseAbbreviation.trim(), department_id: manageCoursesDept.id }) });
      if (res.ok) {
        await Promise.all([fetchDeptCourses(manageCoursesDept.id), fetchCourseCounts()]);
        setAddCourseOpen(false);
        setCourseName('');
        setCourseAbbreviation('');
      } else {
        const data = await res.json();
        setError(data.error || data.message || 'Failed to create course');
      }
    } catch { setError('Network error'); }
    finally { setAddCourseLoading(false); }
  };

  const handleEditCourse = async () => {
    if (!editCourseName.trim() || !editCourse) return;
    setEditCourseLoading(true);
    setError('');
    try {
      const body = { name: editCourseName.trim() };
      if (editCourseAbbreviation.trim()) body.abbreviation = editCourseAbbreviation.trim();
      const res = await api(`http://localhost:5000/api/courses/${editCourse.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (res.ok) {
        await Promise.all([fetchDeptCourses(manageCoursesDept.id), fetchCourseCounts()]);
        setEditCourseOpen(false);
        setEditCourse(null);
      } else {
        const data = await res.json();
        setError(data.error || data.message || 'Failed to update course');
      }
    } catch { setError('Network error'); }
    finally { setEditCourseLoading(false); }
  };

  const handleDeleteCourse = async () => {
    if (!deleteCourse) return;
    setDeleteCourseLoading(true);
    setError('');
    try {
      const res = await api(`http://localhost:5000/api/courses/${deleteCourse.id}`, { method: 'DELETE' });
      if (res.ok) {
        await Promise.all([fetchDeptCourses(manageCoursesDept.id), fetchCourseCounts()]);
        setDeleteCourseOpen(false);
        setDeleteCourse(null);
        setDeleteCourseConfirmText('');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete course');
      }
    } catch { setError('Network error'); }
    finally { setDeleteCourseLoading(false); }
  };

  if (loading) {
    return <div className="space-y-6 max-w-7xl mx-auto" aria-busy="true"><SkeletonList rows={4} /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Departments & Courses</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>Organize academic departments and manage the courses under each one.</p>
                  </div>
        <button onClick={() => { setAddDeptOpen(true); setDeptName(''); setDeptAbbreviation(''); setError(''); }} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105 transition-transform" style={{ background: '#0c1925', borderColor: '#142a3f' }}><Plus size={14} /> Add Department</button>
      </div>

      {departments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-[#e5e0d5] card-hover text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-base font-bold mb-1">No Departments Yet</h3>
          <p className="text-sm">Add your first department to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {departments.map((dept) => {
            const expanded = !!expandedDepts[dept.id];
            const deptCourses = coursesByDept[dept.id];
            const courseLoading = !!coursesLoadingByDept[dept.id];
            return (
            <div key={dept.id} className="bg-white rounded-xl border border-gray-50 card-hover shadow-sm overflow-hidden">
              <div
                onClick={() => toggleDept(dept)}
                className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${expanded ? 'bg-[#0c1925]/5' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <ChevronDown size={18} className={`shrink-0 text-[#0c1925] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                  <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm">
                    <Building2 size={20} className="text-[#0c1925]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {dept.name}
                      {(() => {
                        const stored = dept.abbr && String(dept.abbr).trim() ? String(dept.abbr).trim() : '';
                        if (!stored) return null;
                        const m = String(dept.name || '').match(/\(([^)]+)\)\s*$/);
                        if (m && m[1].trim().toLowerCase() === stored.toLowerCase()) return null;
                        return (
                          <span className="ml-1 font-semibold text-gray-900">({stored})</span>
                        );
                      })()}
                    </h3>
                    <p className="text-[11px] text-gray-600 font-semibold mt-0.5">
                      {!countsLoaded ? '… courses' : `${courseCounts[dept.id] ?? 0} course${(courseCounts[dept.id] ?? 0) === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditDept(dept); setEditDeptName(dept.name); setEditDeptAbbreviation(getDeptAbbr(dept)); setEditDeptOpen(true); setError(''); }}
                    className="p-1.5 rounded-md text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                    title="Edit department"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => { setDeleteDept(dept); setDeleteDeptOpen(true); setDeleteDeptConfirmText(''); setError(''); }}
                    className="p-1.5 rounded-md text-red-700 hover:text-red-900 hover:bg-red-50"
                    title="Delete department"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="px-5 pb-5 pt-1 ml-4 border-l-2 border-[#0c1925]/15">
                    <div className="flex items-center justify-between mb-2 ml-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <BookOpen size={16} /> Courses
                      </p>
                      <button
                        onClick={() => openAddCourse(dept)}
                        className="px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold text-white shadow-sm hover:scale-105 transition-transform"
                        style={{ background: '#142a3f' }}
                      >
                        <Plus size={12} /> Add Course
                      </button>
                    </div>
                    {courseLoading ? (
                      <div aria-busy="true" className="ml-3"><SkeletonList rows={3} /></div>
                    ) : deptCourses === undefined || deptCourses.length === 0 ? (
                      <div className="text-center py-8 ml-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-gray-500">
                        <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-semibold">No courses yet in this department.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 ml-3">
                        {deptCourses.map((c) => (
                          <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className="text-gray-300 font-bold select-none">•</span>
                              <span className="text-sm font-semibold text-gray-800 truncate">{c.name}{c.abbreviation && <span className="ml-1 font-semibold text-gray-500">({c.abbreviation})</span>}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => { setManageCoursesDept(dept); setEditCourse(c); setEditCourseName(c.name); setEditCourseAbbreviation(c.abbreviation || ''); setEditCourseOpen(true); setError(''); }}
                                className="p-1.5 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                                title="Edit course"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => { setManageCoursesDept(dept); setDeleteCourse(c); setDeleteCourseOpen(true); setDeleteCourseConfirmText(''); setError(''); }}
                                className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-100"
                                title="Delete course"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add Department Modal */}
      {addDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Department Name</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => { setDeptName(e.target.value); setError(''); }}
                  placeholder="e.g. College of Information Technology"
                  className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Abbreviation</label>
                <input
                  type="text"
                  value={deptAbbreviation}
                  onChange={(e) => { setDeptAbbreviation(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="e.g. CIT"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm text-gray-800 uppercase"
                />
              </div>
              {deptName.trim() && departments.some((d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase()) && (
                <p className="text-sm font-semibold" style={{ color: errorColor }}>This department has already been added.</p>
              )}
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setAddDeptOpen(false); setDeptName(''); setDeptAbbreviation(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleAddDept}
                disabled={!deptName.trim() || !deptAbbreviation.trim() || addDeptLoading || departments.some((d) => d.name.trim().toLowerCase() === deptName.trim().toLowerCase())}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50"
                style={{ background: '#0c1925' }}
              >{addDeptLoading ? 'Adding...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Department Name</label>
                <input type="text" value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Abbreviation</label>
                <input type="text" value={editDeptAbbreviation} onChange={(e) => setEditDeptAbbreviation(e.target.value.toUpperCase())} placeholder="e.g. CIT" maxLength={10} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm uppercase" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditDeptOpen(false); setEditDept(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleEditDept} disabled={!editDeptName.trim() || editDeptLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#142a3f' }}>{editDeptLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {deleteDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Department</h3>
            <p className="text-sm text-gray-900 mb-4">Are you sure you want to delete <strong>{deleteDept?.name}</strong>? This cannot be undone.</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={deleteDeptConfirmText} onChange={(e) => setDeleteDeptConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            {error && <p className="text-sm font-semibold mb-3" style={{ color: errorColor }}>{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteDeptOpen(false); setDeleteDept(null); setDeleteDeptConfirmText(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteDept} disabled={deleteDeptConfirmText !== 'Confirm' || deleteDeptLoading} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${deleteDeptConfirmText === 'Confirm' && !deleteDeptLoading ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deleteDeptLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {addCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Course</h3>
            <p className="text-xs text-gray-900 mb-4">For: <strong>{manageCoursesDept?.name}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Course Name</label>
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Bachelor of Science in Information Technology" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Abbreviation</label>
                <input type="text" value={courseAbbreviation} onChange={(e) => setCourseAbbreviation(e.target.value)} placeholder="e.g. BSIT" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm uppercase" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setAddCourseOpen(false); setCourseName(''); setCourseAbbreviation(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddCourse} disabled={!courseName.trim() || !courseAbbreviation.trim() || addCourseLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#142a3f' }}>{addCourseLoading ? 'Adding...' : 'Add Course'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Course Name</label>
                <input type="text" value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Abbreviation</label>
                <input type="text" value={editCourseAbbreviation} onChange={(e) => setEditCourseAbbreviation(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] bg-[#fbf8f1] text-sm uppercase" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditCourseOpen(false); setEditCourse(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleEditCourse} disabled={!editCourseName.trim() || editCourseLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#142a3f' }}>{editCourseLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {deleteCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Course</h3>
            <p className="text-sm text-gray-900 mb-4">Are you sure you want to delete <strong>{deleteCourse?.name}</strong>? This cannot be undone.</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-900 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={deleteCourseConfirmText} onChange={(e) => setDeleteCourseConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            {error && <p className="text-sm font-semibold mb-3" style={{ color: errorColor }}>{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteCourseOpen(false); setDeleteCourse(null); setDeleteCourseConfirmText(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteCourse} disabled={deleteCourseConfirmText !== 'Confirm' || deleteCourseLoading} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${deleteCourseConfirmText === 'Confirm' && !deleteCourseLoading ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deleteCourseLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDepartments;


