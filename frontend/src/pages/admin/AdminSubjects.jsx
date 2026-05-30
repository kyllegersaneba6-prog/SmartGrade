import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, BookOpen, GraduationCap, Eye, EyeOff, Lock, Loader } from 'lucide-react';

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const yearLevels = ['1st', '2nd', '3rd', '4th'];
const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };
const semesterOptions = ['1st Semester', '2nd Semester', 'Summer'];

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedYear, setSelectedYear] = useState('1st');
  const [subjectRows, setSubjectRows] = useState([{ code: '', name: '' }]);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [activeTerm, setActiveTerm] = useState(null);
  const [schoolYear, setSchoolYear] = useState('');
  const [semester, setSemester] = useState('');
  const [showArchives, setShowArchives] = useState(false);
  const [schoolYearOptions, setSchoolYearOptions] = useState([]);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [addCourseId, setAddCourseId] = useState('');

  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const res = await api('http://localhost:5000/api/terms/active');
        if (res.ok) {
          const term = await res.json();
          setActiveTerm(term);
          if (!showArchives) {
            setSchoolYear(term.school_year);
            setSemester(term.semester);
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchActiveTerm();
  }, []);

  useEffect(() => {
    if (!showArchives && activeTerm) {
      setSchoolYear(activeTerm.school_year);
      setSemester(activeTerm.semester);
    }
  }, [showArchives, activeTerm]);

  useEffect(() => {
    const adminDept = JSON.parse(localStorage.getItem('user') || '{}')?.department;
    if (adminDept) {
      const fetchCourses = async () => {
        try {
          const deptRes = await api('http://localhost:5000/api/departments');
          if (deptRes.ok) {
            const depts = await deptRes.json();
            const match = depts.find(d => d.name === adminDept);
            if (match) {
              const coursesRes = await api(`http://localhost:5000/api/courses?department_id=${match.id}`);
              if (coursesRes.ok) setCourses(await coursesRes.json());
            }
          }
        } catch (err) { console.error(err); }
      };
      fetchCourses();
    }
  }, []);

  const isActiveView = activeTerm && schoolYear === activeTerm.school_year && semester === activeTerm.semester && !showArchives;

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (schoolYear) params.set('school_year', schoolYear);
      if (semester) params.set('semester', semester);
      if (selectedCourseId) params.set('course_id', selectedCourseId);
      const res = await api(`http://localhost:5000/api/subjects?${params.toString()}`);
      if (res.ok) setSubjects(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [schoolYear, semester, selectedCourseId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  useEffect(() => {
    const handler = async () => { await fetchSubjects(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [fetchSubjects]);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const res = await api('http://localhost:5000/api/subjects');
        if (res.ok) {
          const all = await res.json();
          const years = [...new Set(all.map(s => s.school_year).filter(Boolean))].sort().reverse();
          setSchoolYearOptions(years);
        }
      } catch (err) { console.error(err); }
    };
    fetchYears();
  }, []);

  const addSubjects = async () => {
    if (adding) return;
    if (!addCourseId) {
      setError('Please select course first');
      return;
    }
    const rows = subjectRows.filter((r) => r.name.trim());
    if (rows.length === 0) return;
    for (const { code } of rows) {
      if (code && !/^[A-Z]{4}\d{4}$/.test(code)) {
        setError(`Invalid code format "${code}". Must be 4 letters followed by 4 digits (e.g. MATH1001).`);
        return;
      }
    }
    setAdding(true);
    setError('');
    const errors = [];
    const added = [];
    for (const { code, name } of rows) {
      try {
        const res = await api('http://localhost:5000/api/subjects', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), code: code.trim() || null, year_level: selectedYear, course_id: addCourseId })
        });
        if (res.ok) {
          added.push(await res.json());
        } else {
          const data = await res.json();
          errors.push(data.message || data.error || `Failed to add "${name}"`);
        }
      } catch { errors.push(`Network error adding "${name}"`); }
    }
    if (added.length > 0) {
      setSubjects((prev) => [...prev, ...added].sort((a, b) => a.name.localeCompare(b.name)));
      setSubjectRows([{ code: '', name: '' }]);
      setShowAdd(false);
    }
    if (errors.length > 0) setError(errors.join('\n'));
    setAdding(false);
  };

  const openAssignModal = async (subject) => {
    setSelectedSubject(subject);
    setAssignModalOpen(true);
    setAssignLoading(true);
    try {
      const res = await api(`http://localhost:5000/api/assignments?subject_id=${subject.id}`);
      if (res.ok) setSubjectAssignments(await res.json());
      else setSubjectAssignments([]);
    } catch { setSubjectAssignments([]); }
    finally { setAssignLoading(false); }
  };

  const deleteSubject = async (id) => {
    try {
      const res = await api(`http://localhost:5000/api/subjects/${id}`, { method: 'DELETE' });
      if (res.ok) setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) { console.error(err); }
  };

  const grouped = yearLevels.map((y) => ({
    year: y,
    subjects: subjects.filter((s) => s.year_level === y)
  }));

  const maxRows = Math.max(...grouped.map((g) => g.subjects.length), 0);

  const toggleArchives = () => {
    const next = !showArchives;
    setShowArchives(next);
    if (!next && activeTerm) {
      setSchoolYear(activeTerm.school_year);
      setSemester(activeTerm.semester);
    }
  };

  const isTermClosed = !isActiveView && showArchives;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {activeTerm && (
        <div className={`flex items-center justify-between px-5 py-3 rounded-2xl shadow-sm border ${isActiveView ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {isActiveView ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Active Term</span>
            ) : (
              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-3 py-1 rounded-full flex items-center gap-1"><Lock size={10} /> Archived</span>
            )}
            <span className="text-sm font-semibold text-gray-800">{schoolYear} — {semester}</span>
          </div>
          <button
            onClick={toggleArchives}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              showArchives ? 'bg-[#f5a623] text-white border-[#f5a623]' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showArchives ? <EyeOff size={12} /> : <Eye size={12} />}
            {showArchives ? 'Exit Archives' : 'View Archives'}
          </button>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>Manage Subjects</h1>
              <p className="text-xs sm:text-sm mt-0.5 text-gray-500">Add and organize subjects per year level.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showArchives && (
              <>
                <select
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                >
                  <option value="">All SY</option>
                  {schoolYearOptions.map((sy) => <option key={sy} value={sy}>{sy}</option>)}
                </select>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                >
                  <option value="">All Sem</option>
                  {semesterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            {!showArchives && activeTerm && (
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                {activeTerm.school_year} — {activeTerm.semester}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="relative group inline-block">
            <button
              onClick={() => { if (!isTermClosed) { setSelectedYear('1st'); setAddCourseId(''); setShowAdd(true); setSubjectRows([{ code: '', name: '' }]); setError(''); } }}
              disabled={isTermClosed}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                isTermClosed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              style={{ background: '#f5a623' }}
            >
              Add Subject
            </button>
            {isTermClosed && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                This term is closed
              </div>
            )}
          </div>
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            >
              <option value="">All courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg whitespace-pre-line">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-[#e5e0d5] overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <BookOpen size={48} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No subjects found for this term.</p>
          </div>
        ) : (
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                {yearLevels.map((y) => (
                  <th key={y} className="text-left pb-3 pt-3 px-4 font-bold text-gray-600 text-sm border-r last:border-r-0" style={{ borderColor: '#f0ede6' }}>
                    {yearLabels[y]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(maxRows, 1) }).map((_, rowIdx) => (
                <tr key={rowIdx} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                  {grouped.map((g) => (
                    <td key={g.year} className="px-4 py-2 border-r last:border-r-0 align-top" style={{ borderColor: '#f0ede6' }}>
                      {g.subjects[rowIdx] ? (
                          <div className="flex items-center justify-between group px-2 py-1.5 rounded-lg hover:bg-gray-50 -mx-2 cursor-pointer" onClick={() => openAssignModal(g.subjects[rowIdx])}>
                            <div className="flex items-center gap-1.5 min-w-0">
                            {g.subjects[rowIdx].code && <span className="text-gray-400 font-mono text-[11px] leading-tight mt-0.5 shrink-0 w-[68px] text-center">{g.subjects[rowIdx].code}</span>}
                            <span className="text-gray-700 font-medium text-[13px] leading-tight break-words min-w-0">{g.subjects[rowIdx].name}</span>
                          </div>
                          {!isTermClosed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSubjectToDelete(g.subjects[rowIdx]); setConfirmText(''); setDeleteModalOpen(true); }}
                              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Subjects</h3>
              <button onClick={() => { setShowAdd(false); setSubjectRows([{ code: '', name: '' }]); setError(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Course</label>
              <select
                value={addCourseId}
                onChange={(e) => setAddCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
              >
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Year Level</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
              >
                {yearLevels.map((y) => <option key={y} value={y}>{yearLabels[y]}</option>)}
              </select>
            </div>
            {activeTerm && (
              <p className="text-xs text-gray-500 mb-3">
                Will be tagged as: <strong className="text-gray-700">{activeTerm.school_year} — {activeTerm.semester}</strong>
              </p>
            )}
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto p-0.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject Code & Name</label>
              {subjectRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.code}
                    onChange={(e) => {
                      const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                      const letters = raw.slice(0, 4).replace(/[^A-Z]/g, '');
                      const digits = raw.slice(4, 8).replace(/[^0-9]/g, '');
                      const next = [...subjectRows];
                      next[i] = { ...next[i], code: letters + digits };
                      setSubjectRows(next);
                    }}
                    placeholder="e.g. MATH1001"
                    className="w-28 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm font-mono"
                    maxLength={8}
                    autoFocus={i === 0}
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...subjectRows];
                      next[i] = { ...next[i], name: e.target.value };
                      setSubjectRows(next);
                    }}
                    placeholder="e.g. Mathematics 1"
                    className="flex-1 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (i === subjectRows.length - 1) setSubjectRows([...subjectRows, { code: '', name: '' }]); } }}
                  />
                  {subjectRows.length > 1 && (
                    <button
                      onClick={() => setSubjectRows(subjectRows.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSubjectRows([...subjectRows, { code: '', name: '' }])}
                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                style={{ background: '#f5a623' }}
              >
                Add More Subjects
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setShowAdd(false); setSubjectRows([{ code: '', name: '' }]); setError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={addSubjects} disabled={adding} className="px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#f5a623' }}>{adding ? 'Adding...' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50"><GraduationCap size={20} className="text-blue-600" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assigned Teachers</h3>
                  <p className="text-xs text-gray-400">{selectedSubject?.code && <span className="font-mono mr-1">{selectedSubject.code}</span>}{selectedSubject?.name}</p>
                </div>
              </div>
              <button onClick={() => { setAssignModalOpen(false); setSubjectAssignments([]); setSelectedSubject(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {assignLoading ? (
                <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
              ) : subjectAssignments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No teachers assigned to this subject.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-gray-800">{a.teacher?.full_name}</p>
                        <p className="text-xs text-gray-400">{a.sections?.name}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white" style={{ background: '#f5a623' }}>
                        {a.sections?.year_level} Year
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button onClick={() => { setAssignModalOpen(false); setSubjectAssignments([]); setSelectedSubject(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Subject</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{subjectToDelete?.name}</strong>?</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteModalOpen(false); setSubjectToDelete(null); setConfirmText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={deleting}>Cancel</button>
              <button onClick={async () => { if (!subjectToDelete) return; setDeleting(true); try { const res = await api(`http://localhost:5000/api/subjects/${subjectToDelete.id}`, { method: 'DELETE' }); if (res.ok) setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id)); } catch (err) { console.error(err); } finally { setDeleting(false); setDeleteModalOpen(false); setSubjectToDelete(null); setConfirmText(''); } }} disabled={confirmText !== 'Confirm' || deleting} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmText === 'Confirm' && !deleting ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubjects;
