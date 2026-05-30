import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, X, Building2, BookOpen } from 'lucide-react';

const ManageDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [addDeptLoading, setAddDeptLoading] = useState(false);

  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptLoading, setEditDeptLoading] = useState(false);

  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [deleteDept, setDeleteDept] = useState(null);
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false);

  const [manageCoursesDept, setManageCoursesDept] = useState(null);
  const [deptCourses, setDeptCourses] = useState([]);
  const [courseLoading, setCourseLoading] = useState(false);

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

  const errorColor = '#ef4444';
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');
  const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

  const fetchDepartments = async () => {
    try {
      const res = await api('http://localhost:5000/api/departments');
      if (res.ok) setDepartments(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchDeptCourses = async (deptId) => {
    setCourseLoading(true);
    try {
      const res = await api(`http://localhost:5000/api/courses?department_id=${deptId}`);
      if (res.ok) setDeptCourses(await res.json());
    } catch (err) { console.error(err); }
    finally { setCourseLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDepartments()]).finally(() => setLoading(false));
  }, []);

  const handleAddDept = async () => {
    if (!deptName.trim()) return;
    setAddDeptLoading(true);
    setError('');
    try {
      const res = await api('http://localhost:5000/api/departments', { method: 'POST', body: JSON.stringify({ name: deptName.trim() }) });
      if (res.ok) {
        await fetchDepartments();
        setAddDeptOpen(false);
        setDeptName('');
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
      const res = await api(`http://localhost:5000/api/departments/${editDept.id}`, { method: 'PATCH', body: JSON.stringify({ name: editDeptName.trim() }) });
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
        await fetchDepartments();
        setDeleteDeptOpen(false);
        setDeleteDept(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete department');
      }
    } catch { setError('Network error'); }
    finally { setDeleteDeptLoading(false); }
  };

  const openManageCourses = (dept) => {
    setManageCoursesDept(dept);
    fetchDeptCourses(dept.id);
  };

  const handleAddCourse = async () => {
    if (!courseName.trim() || !courseAbbreviation.trim() || !manageCoursesDept) return;
    setAddCourseLoading(true);
    setError('');
    try {
      const res = await api('http://localhost:5000/api/courses', { method: 'POST', body: JSON.stringify({ name: courseName.trim(), abbreviation: courseAbbreviation.trim(), department_id: manageCoursesDept.id }) });
      if (res.ok) {
        await fetchDeptCourses(manageCoursesDept.id);
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
        await fetchDeptCourses(manageCoursesDept.id);
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
        await fetchDeptCourses(manageCoursesDept.id);
        setDeleteCourseOpen(false);
        setDeleteCourse(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete course');
      }
    } catch { setError('Network error'); }
    finally { setDeleteCourseLoading(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#f5a623] rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>Departments & Courses</h1>
          <p className="text-xs sm:text-sm mt-0.5 text-gray-500">Manage academic departments and their course offerings.</p>
        </div>
        <button onClick={() => { setAddDeptOpen(true); setError(''); }} className="px-3 h-8 rounded border flex items-center gap-1.5 text-white text-xs font-bold shadow-sm hover:scale-105 transition-transform" style={{ background: '#f5a623', borderColor: '#f5a623' }}><Plus size={14} /> Add Department</button>
      </div>

      {departments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-[#e5e0d5]">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-base font-bold text-gray-700 mb-1">No Departments Yet</h3>
          <p className="text-sm text-gray-400">Add your first department to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-xl p-5 border border-[#e5e0d5] shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: '#fef3c7' }}>
                    <Building2 size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{dept.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openManageCourses(dept)}
                    className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold hover:bg-gray-50"
                    style={{ borderColor: '#e5e0d5' }}
                  >
                    <BookOpen size={14} /> Courses
                  </button>
                  <button
                    onClick={() => { setEditDept(dept); setEditDeptName(dept.name); setEditDeptOpen(true); setError(''); }}
                    className="p-1.5 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    title="Edit department"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => { setDeleteDept(dept); setDeleteDeptOpen(true); setError(''); }}
                    className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete department"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      {addDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department Name</label>
                <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. College of Engineering (COE)" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setAddDeptOpen(false); setDeptName(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddDept} disabled={!deptName.trim() || addDeptLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#f5a623' }}>{addDeptLoading ? 'Adding...' : 'Add Department'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Department</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department Name</label>
                <input type="text" value={editDeptName} onChange={(e) => setEditDeptName(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditDeptOpen(false); setEditDept(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleEditDept} disabled={!editDeptName.trim() || editDeptLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#f5a623' }}>{editDeptLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {deleteDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Department</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{deleteDept?.name}</strong>? This cannot be undone.</p>
            {error && <p className="text-sm font-semibold mb-3" style={{ color: errorColor }}>{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteDeptOpen(false); setDeleteDept(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteDept} disabled={deleteDeptLoading} className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#ef4444' }}>{deleteDeptLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Courses Modal */}
      {manageCoursesDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-50"><BookOpen size={20} className="text-yellow-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Courses</h3>
                  <p className="text-xs text-gray-400">{manageCoursesDept.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setAddCourseOpen(true); setError(''); }}
                  className="px-3 py-1.5 rounded-lg border flex items-center gap-1 text-xs font-bold text-white shadow-sm hover:scale-105"
                  style={{ background: '#f5a623', borderColor: '#f5a623' }}
                >
                  <Plus size={12} /> Add Course
                </button>
                <button onClick={() => { setManageCoursesDept(null); setDeptCourses([]); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {courseLoading ? (
                <div className="flex justify-center py-12"><div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-[#f5a623] rounded-full" /></div>
              ) : deptCourses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No courses yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deptCourses.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#8b5cf6' }}>{c.abbreviation}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => { setEditCourse(c); setEditCourseName(c.name); setEditCourseAbbreviation(c.abbreviation || ''); setEditCourseOpen(true); setError(''); }}
                          className="p-1.5 rounded-md text-blue-500 hover:text-blue-700 hover:bg-blue-100"
                          title="Edit course"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => { setDeleteCourse(c); setDeleteCourseOpen(true); setError(''); }}
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

            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button onClick={() => { setManageCoursesDept(null); setDeptCourses([]); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {addCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Course</h3>
            <p className="text-xs text-gray-400 mb-4">For: <strong>{manageCoursesDept?.name}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Course Name</label>
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="e.g. Bachelor of Science in Information Technology" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Abbreviation</label>
                <input type="text" value={courseAbbreviation} onChange={(e) => setCourseAbbreviation(e.target.value)} placeholder="e.g. BSIT" className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm uppercase" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setAddCourseOpen(false); setCourseName(''); setCourseAbbreviation(''); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleAddCourse} disabled={!courseName.trim() || !courseAbbreviation.trim() || addCourseLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#f5a623' }}>{addCourseLoading ? 'Adding...' : 'Add Course'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Course Name</label>
                <input type="text" value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Abbreviation</label>
                <input type="text" value={editCourseAbbreviation} onChange={(e) => setEditCourseAbbreviation(e.target.value)} className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm uppercase" />
              </div>
              {error && <p className="text-sm font-semibold" style={{ color: errorColor }}>{error}</p>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => { setEditCourseOpen(false); setEditCourse(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleEditCourse} disabled={!editCourseName.trim() || editCourseLoading} className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50" style={{ background: '#f5a623' }}>{editCourseLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {deleteCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Course</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{deleteCourse?.name}</strong>? This cannot be undone.</p>
            {error && <p className="text-sm font-semibold mb-3" style={{ color: errorColor }}>{error}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteCourseOpen(false); setDeleteCourse(null); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteCourse} disabled={deleteCourseLoading} className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#ef4444' }}>{deleteCourseLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageDepartments;
