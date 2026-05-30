import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, X, UserPlus, BookOpen, Loader, Lock, Eye, EyeOff } from 'lucide-react';

const formatStudentId = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const yearLevels = ['1st', '2nd', '3rd', '4th'];

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const AdminSections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const year = searchParams.get('year') || '1st';

  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionLetter, setNewSectionLetter] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [studentRows, setStudentRows] = useState([{ id: '', name: '' }]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [schoolYearOptions, setSchoolYearOptions] = useState([]);
  const [semester, setSemester] = useState('');
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [confirmSectionText, setConfirmSectionText] = useState('');
  const [deletingSection, setDeletingSection] = useState(false);
  const [deleteStudentOpen, setDeleteStudentOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [confirmStudentText, setConfirmStudentText] = useState('');
  const [deletingStudent, setDeletingStudent] = useState(false);

  const [activeTerm, setActiveTerm] = useState(null);
  const [loadActiveTerm, setLoadActiveTerm] = useState(true);
  const [showArchives, setShowArchives] = useState(false);


  const isActiveView = activeTerm && schoolYear === activeTerm.school_year && semester === activeTerm.semester && !showArchives;

  useEffect(() => {
    if (!showArchives && activeTerm) {
      setSchoolYear(activeTerm.school_year);
      setSemester(activeTerm.semester);
    }
  }, [showArchives, activeTerm]);

  const fetchSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const params = new URLSearchParams({ year });
      if (schoolYear) params.set('school_year', schoolYear);
      if (semester) params.set('semester', semester);
      if (selectedCourseId) params.set('course_id', selectedCourseId);
      const res = await api(`http://localhost:5000/api/sections?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data);
        if (data.length > 0) {
          setSelectedSection((prev) => {
            if (prev && data.some((s) => s.id === prev.id)) return prev;
            return data[0];
          });
        } else {
          setSelectedSection(null);
        }
      }
      const allRes = await api(`http://localhost:5000/api/sections?year=${year}`);
      if (allRes.ok) {
        const allData = await allRes.json();
        const years = [...new Set(allData.map(s => s.school_year))].sort().reverse();
        setSchoolYearOptions(years);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSections(false);
    }
  }, [year, selectedCourseId, schoolYear, semester]);

  const fetchStudents = useCallback(async (sectionId) => {
    setLoadingStudents(true);
    try {
      const res = await api(`http://localhost:5000/api/sections/${sectionId}/students`);
      if (res.ok) setStudents(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  useEffect(() => {
    const handler = async () => { await fetchSections(); if (selectedSection) await fetchStudents(selectedSection.id); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [fetchSections, fetchStudents, selectedSection]);

  useEffect(() => {
    if (selectedSection) fetchStudents(selectedSection.id);
    else setStudents([]);
  }, [selectedSection, fetchStudents]);

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

  useEffect(() => {
    setStudents([]);
  }, [year, selectedCourseId, schoolYear, semester]);

  const getPreviewName = (letter) => {
    if (!letter.trim()) return '';
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course?.abbreviation) return '';
    const yearNum = year.replace('th', '').replace('nd', '').replace('rd', '').replace('st', '');
    return `${course.abbreviation} ${yearNum}-${letter.trim().toUpperCase()}`;
  };

  const addSection = async () => {
    const letter = newSectionLetter.trim().toUpperCase();
    if (!letter || !selectedCourseId) return;
    const previewName = getPreviewName(letter);
    if (!previewName) return;
    setSectionError('');
    try {
      const res = await api('http://localhost:5000/api/sections', {
        method: 'POST',
        body: JSON.stringify({ name: letter, year_level: year, course_id: selectedCourseId, school_year: activeTerm?.school_year, semester: activeTerm?.semester })
      });
      if (res.ok) {
        const section = await res.json();
        setSections((prev) => [...prev, section].sort((a, b) => a.name.localeCompare(b.name)));
        setNewSectionLetter('');
        setShowAddSection(false);
      } else {
        const data = await res.json();
        setSectionError(data.message || data.error || 'Failed to create section');
      }
    } catch {
      setSectionError('Network error');
    }
  };

  const removeSection = async (section) => {
    try {
      const res = await api(`http://localhost:5000/api/sections/${section.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSections((prev) => prev.filter((s) => s.id !== section.id));
        if (selectedSection?.id === section.id) setSelectedSection(null);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete section');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addStudents = async () => {
    if (addingStudents || !selectedSection) return;
    const rows = studentRows.filter((r) => r.id.trim() && r.name.trim());
    if (rows.length === 0) return;
    for (const { id } of rows) {
      if (!/^\d{2}-\d{4}-\d{3}$/.test(id.trim())) {
        setStudentError(`Invalid ID format "${id.trim()}". Must be 00-0000-000 (e.g. 22-1234-567).`);
        return;
      }
    }
    setAddingStudents(true);
    setStudentError('');
    const errors = [];
    const added = [];
    for (const { id, name } of rows) {
      try {
        const res = await api(`http://localhost:5000/api/sections/${selectedSection.id}/students`, {
          method: 'POST',
          body: JSON.stringify({ student_id: id.trim(), student_name: name.trim() })
        });
        if (res.ok) {
          added.push(await res.json());
        } else {
          const data = await res.json();
          errors.push(data.message || data.error || `Failed to add "${name}"`);
        }
      } catch {
        errors.push(`Network error adding "${name}"`);
      }
    }
    if (added.length > 0) {
      setStudents((prev) => [...prev, ...added].sort((a, b) => a.student_name.localeCompare(b.student_name)));
      setStudentRows([{ id: '', name: '' }]);
      setShowAddStudent(false);
    }
    if (errors.length > 0) setStudentError(errors.join('\n'));
    setAddingStudents(false);
  };

  const removeStudent = async (student) => {
    try {
      const res = await api(`http://localhost:5000/api/sections/students/${student.id}`, { method: 'DELETE' });
      if (res.ok) setStudents((prev) => prev.filter((s) => s.id !== student.id));
      else {
        const data = await res.json();
        setError(data.message || 'Failed to remove student');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleArchives = () => {
    const next = !showArchives;
    setShowArchives(next);
    if (!next && activeTerm) {
      setSchoolYear(activeTerm.school_year);
      setSemester(activeTerm.semester);
    }
  };

  const isTermClosed = !isActiveView && showArchives;

  const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

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
            <span className="text-sm font-semibold text-gray-800">{activeTerm.school_year} — {activeTerm.semester}</span>
          </div>
          <div className="flex items-center gap-3">
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
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>Manage Sections</h1>
            <p className="text-xs sm:text-sm mt-0.5 text-gray-500">{yearLabels[year] || year}</p>
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
          {showArchives && (
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            >
              <option value="">All SY</option>
              {schoolYearOptions.map((sy) => <option key={sy} value={sy}>{sy}</option>)}
            </select>
          )}
          {showArchives && (
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            >
              <option value="">All Sem</option>
              {['1st Semester', '2nd Semester', 'Summer'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {!showArchives && activeTerm && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              {activeTerm.school_year} — {activeTerm.semester}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {yearLevels.map((y) => (
            <button
              key={y}
              onClick={() => setSearchParams({ year: y })}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                year === y
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
              style={year === y ? { background: '#f5a623' } : {}}
            >
              {y} Year
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl p-5 shadow-sm border border-[#e5e0d5]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <BookOpen size={16} style={{ color: '#f5a623' }} /> Sections
            </h2>
            <div className="relative group">
              <button
                onClick={() => { if (!isTermClosed) { setShowAddSection(true); setSectionError(''); } }}
                disabled={isTermClosed}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                  isTermClosed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                style={{ background: '#f5a623' }}
              >
                <Plus size={14} /> Add
              </button>
              {isTermClosed && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  This term is closed
                </div>
              )}
            </div>
          </div>

          {loadingSections ? (
            <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-gray-400" /></div>
          ) : sections.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sections yet. Click "Add" to create one.</p>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedSection?.id === section.id
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSection(section)}
                >
                  <span>{section.name}</span>
                  <div className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!isTermClosed) { setSectionToDelete(section); setConfirmSectionText(''); setDeleteSectionOpen(true); } }}
                      disabled={isTermClosed}
                      className={`transition-colors ${isTermClosed ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    {isTermClosed && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        This term is closed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-[#e5e0d5]">
          {!selectedSection ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BookOpen size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a section to view its students</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-700">
                  Students — <span style={{ color: '#f5a623' }}>{selectedSection.name}</span>
                </h2>
                <div className="relative group">
                  <button
                    onClick={() => { if (!isTermClosed) { setShowAddStudent(true); setStudentError(''); } }}
                    disabled={isTermClosed}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                      isTermClosed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    }`}
                    style={{ background: '#22c55e' }}
                  >
                    <UserPlus size={14} /> Add Student
                  </button>
                  {isTermClosed && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      This term is closed
                    </div>
                  )}
                </div>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center py-12"><Loader size={20} className="animate-spin text-gray-400" /></div>
              ) : students.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-12">No students enrolled yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                        <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">#</th>
                        <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Student ID</th>
                        <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Student Name</th>
                        <th className="text-left pb-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                          <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 pr-3 font-mono text-gray-700">{s.student_id}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{s.student_name}</td>
                          <td className="py-2.5">
                            <div className="relative group inline-block">
                              <button
                                onClick={() => { if (!isTermClosed) { setStudentToDelete(s); setConfirmStudentText(''); setDeleteStudentOpen(true); } }}
                                disabled={isTermClosed}
                                className={`transition-colors ${isTermClosed ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}
                              >
                                <Trash2 size={14} />
                              </button>
                              {isTermClosed && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  This term is closed
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Section</h3>
              <button onClick={() => setShowAddSection(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {!selectedCourseId ? (
              <p className="text-sm text-amber-600 font-semibold mb-4">Please select a course first.</p>
            ) : (
              <>
                <input
                  type="text"
                  value={newSectionLetter}
                  onChange={(e) => setNewSectionLetter(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                  placeholder="e.g. A"
                  className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm mb-2"
                  autoFocus
                  maxLength={2}
                  onKeyDown={(e) => e.key === 'Enter' && addSection()}
                />
                {newSectionLetter.trim() && (
                  <p className="text-xs text-gray-500 mb-2">
                    Will be saved as: <strong className="text-gray-700">{getPreviewName(newSectionLetter)}</strong>
                    <br />
                    {activeTerm?.school_year || getCurrentSchoolYear()} — {activeTerm?.semester || '1st Semester'}
                  </p>
                )}
                {sectionError && <p className="text-xs font-semibold text-red-500 mb-3">{sectionError}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowAddSection(false); setSectionError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={addSection} disabled={!newSectionLetter.trim()} className="px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#f5a623' }}>Add</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Students</h3>
              <button onClick={() => { setShowAddStudent(false); setStudentRows([{ id: '', name: '' }]); setStudentError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto p-0.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student ID & Name</label>
              {studentRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.id}
                    onChange={(e) => {
                      const next = [...studentRows];
                      next[i] = { ...next[i], id: formatStudentId(e.target.value) };
                      setStudentRows(next);
                    }}
                    placeholder="00-0000-000"
                    maxLength={11}
                    className="w-32 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm font-mono"
                    autoFocus={i === 0}
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const next = [...studentRows];
                      next[i] = { ...next[i], name: e.target.value };
                      setStudentRows(next);
                    }}
                    placeholder="Student Name"
                    className="flex-1 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (i === studentRows.length - 1) setStudentRows([...studentRows, { id: '', name: '' }]); } }}
                  />
                  {studentRows.length > 1 && (
                    <button
                      onClick={() => setStudentRows(studentRows.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {studentError && <p className="text-xs font-semibold text-red-500 mb-3 whitespace-pre-line">{studentError}</p>}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStudentRows([...studentRows, { id: '', name: '' }])}
                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                style={{ background: '#f5a623' }}
              >
                Add More Students
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setShowAddStudent(false); setStudentRows([{ id: '', name: '' }]); setStudentError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={addStudents} disabled={addingStudents} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#22c55e' }}>
                  <UserPlus size={14} /> {addingStudents ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Section</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to delete <strong>{sectionToDelete?.name}</strong>? This will also delete all enrolled students.</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={confirmSectionText} onChange={(e) => setConfirmSectionText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteSectionOpen(false); setSectionToDelete(null); setConfirmSectionText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={deletingSection}>Cancel</button>
              <button onClick={async () => { if (!sectionToDelete) return; setDeletingSection(true); try { const res = await api(`http://localhost:5000/api/sections/${sectionToDelete.id}`, { method: 'DELETE' }); if (res.ok) { setSections((prev) => prev.filter((s) => s.id !== sectionToDelete.id)); if (selectedSection?.id === sectionToDelete.id) setSelectedSection(null); } else { const d = await res.json(); setError(d.message || 'Failed to delete'); } } catch (err) { console.error(err); } finally { setDeletingSection(false); setDeleteSectionOpen(false); setSectionToDelete(null); setConfirmSectionText(''); } }} disabled={confirmSectionText !== 'Confirm' || deletingSection} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmSectionText === 'Confirm' && !deletingSection ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deletingSection ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Student</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to remove <strong>{studentToDelete?.student_name}</strong> ({studentToDelete?.student_id})?</p>
            <div className="mb-4"><label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input type="text" value={confirmStudentText} onChange={(e) => setConfirmStudentText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Confirm" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteStudentOpen(false); setStudentToDelete(null); setConfirmStudentText(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={deletingStudent}>Cancel</button>
              <button onClick={async () => { if (!studentToDelete) return; setDeletingStudent(true); try { const res = await api(`http://localhost:5000/api/sections/students/${studentToDelete.id}`, { method: 'DELETE' }); if (res.ok) setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id)); else { const d = await res.json(); setError(d.message || 'Failed to remove'); } } catch (err) { console.error(err); } finally { setDeletingStudent(false); setDeleteStudentOpen(false); setStudentToDelete(null); setConfirmStudentText(''); } }} disabled={confirmStudentText !== 'Confirm' || deletingStudent} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmStudentText === 'Confirm' && !deletingStudent ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{deletingStudent ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSections;
