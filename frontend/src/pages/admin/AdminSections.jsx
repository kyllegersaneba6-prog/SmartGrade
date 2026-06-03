import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, X, UserPlus, BookOpen, Loader, Upload } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import * as XLSX from 'xlsx';

const formatStudentId = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const yearLevels = ['1st', '2nd', '3rd', '4th'];

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const AdminSections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const year = searchParams.get('year') || '1st';
  const { currentTerm, isArchiveMode } = useAdmin();

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
  const [studentRows, setStudentRows] = useState([{ id: '', first_name: '', last_name: '', mi: '', gender: '' }]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [deleteSectionOpen, setDeleteSectionOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [confirmSectionText, setConfirmSectionText] = useState('');
  const [deletingSection, setDeletingSection] = useState(false);
  const [deleteStudentOpen, setDeleteStudentOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [confirmStudentText, setConfirmStudentText] = useState('');
  const [deletingStudent, setDeletingStudent] = useState(false);
  const fileInputRef = useRef(null);
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importSkipped, setImportSkipped] = useState([]);
  const [importHeaderError, setImportHeaderError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const schoolYear = currentTerm?.school_year || '';
  const semester = currentTerm?.semester || '';

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
        body: JSON.stringify({ name: letter, year_level: year, course_id: selectedCourseId, school_year: currentTerm?.school_year, semester: currentTerm?.semester })
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

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportHeaderError('');
    setImportError('');
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) {
          setImportHeaderError('The file is empty.');
          setShowImport(true);
          return;
        }
        const headers = Object.keys(json[0]);
        const expected = ['Student ID', 'First Name', 'Last Name', 'MI', 'Gender'];
        const normalizedHeaders = headers.map((h) => h.trim());
        const match = expected.every((h) => normalizedHeaders.includes(h));
        if (!match) {
          setImportHeaderError(`Invalid headers. Expected: ${expected.join(', ')}. Found: ${headers.join(', ')}`);
          setShowImport(true);
          return;
        }
        const allRows = json.map((row, i) => ({
          rowNum: i + 2,
          student_id: String(row['Student ID']).trim(),
          first_name: String(row['First Name']).trim(),
          last_name: String(row['Last Name']).trim(),
          mi: String(row['MI']).trim().toUpperCase().slice(0, 1),
          gender: String(row['Gender']).trim(),
        }));
        let existingIds = new Set();
        if (selectedSection) {
          try {
            const res = await api(`http://localhost:5000/api/sections/${selectedSection.id}/students`);
            if (res.ok) {
              const existing = await res.json();
              existingIds = new Set(existing.map((s) => s.student_id));
            }
          } catch {}
        }
        const newRows = [];
        const skippedRows = [];
        for (const row of allRows) {
          if (existingIds.has(row.student_id)) {
            skippedRows.push(row);
          } else {
            newRows.push(row);
          }
        }
        setImportRows(newRows);
        setImportSkipped(skippedRows);
        setShowImport(true);
      } catch (err) {
        setImportHeaderError('Failed to read the file. Make sure it is a valid Excel file.');
        setShowImport(true);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const doImport = async () => {
    if (importing || !selectedSection) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const payload = importRows.map(({ student_id, first_name, last_name, mi, gender }) => ({
        student_id, first_name, last_name, mi, gender
      }));
      const res = await api(`http://localhost:5000/api/sections/${selectedSection.id}/students/bulk`, {
        method: 'POST',
        body: JSON.stringify({ students: payload })
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        if (data.added?.length > 0) {
          setStudents((prev) => [...prev, ...data.added].sort((a, b) => a.student_name.localeCompare(b.student_name)));
        }
      } else {
        const data = await res.json();
        setImportError(data.message || 'Import failed');
      }
    } catch {
      setImportError('Network error');
    } finally {
      setImporting(false);
    }
  };

  const addStudents = async () => {
    if (addingStudents || !selectedSection) return;
    const rows = studentRows.filter((r) => r.id.trim() && r.first_name.trim() && r.last_name.trim());
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
    for (const { id, first_name, last_name, mi, gender } of rows) {
      try {
        const res = await api(`http://localhost:5000/api/sections/${selectedSection.id}/students`, {
          method: 'POST',
          body: JSON.stringify({ student_id: id.trim(), first_name: first_name.trim(), last_name: last_name.trim(), mi: mi.trim(), gender: gender.trim() })
        });
        if (res.ok) {
          added.push(await res.json());
        } else {
          const data = await res.json();
          errors.push(data.message || data.error || `Failed to add "${first_name} ${last_name}"`);
        }
      } catch {
        errors.push(`Network error adding "${first_name} ${last_name}"`);
      }
    }
    if (added.length > 0) {
      setStudents((prev) => [...prev, ...added].sort((a, b) => a.student_name.localeCompare(b.student_name)));
      setStudentRows([{ id: '', first_name: '', last_name: '', mi: '', gender: '' }]);
      setShowAddStudent(false);
    }
    if (errors.length > 0) setStudentError(errors.join('\n'));
    setAddingStudents(false);
  };

  const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {currentTerm && (
        <div className={`flex items-center justify-between px-5 py-3 rounded-2xl shadow-sm border ${!isArchiveMode ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${!isArchiveMode ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
              {!isArchiveMode ? 'Active Term' : 'Archived'}
            </span>
            <span className="text-sm font-semibold text-gray-800">{currentTerm.school_year} — {currentTerm.semester}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5] sticky top-0 z-10">
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
          {!isArchiveMode && currentTerm && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              {currentTerm.school_year} — {currentTerm.semester}
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
        <div className="lg:col-span-1 bg-white rounded-xl p-5 shadow-sm border border-[#e5e0d5]" style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <BookOpen size={16} style={{ color: '#f5a623' }} /> Sections
            </h2>
            <div className="relative group">
              <button
                onClick={() => { setShowAddSection(true); setSectionError(''); }}
                disabled={isArchiveMode}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                  isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                style={{ background: '#f5a623' }}
              >
                <Plus size={14} /> Add
              </button>
              {isArchiveMode && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Cannot modify while viewing archives
                </div>
              )}
            </div>
          </div>

          {loadingSections ? (
            <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-gray-400" /></div>
          ) : sections.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sections found for this term.</p>
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
                      onClick={(e) => { e.stopPropagation(); if (!isArchiveMode) { setSectionToDelete(section); setConfirmSectionText(''); setDeleteSectionOpen(true); } }}
                      disabled={isArchiveMode}
                      className={`transition-colors ${isArchiveMode ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    {isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Cannot modify while viewing archives
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
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <button
                      onClick={() => { if (!isArchiveMode) { setShowAddStudent(true); setStudentError(''); } }}
                      disabled={isArchiveMode}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                        isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                      style={{ background: '#22c55e' }}
                    >
                      <UserPlus size={14} /> Add Student
                    </button>
                    {isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Cannot modify while viewing archives
                      </div>
                    )}
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => { if (!isArchiveMode) { fileInputRef.current?.click(); } }}
                      disabled={isArchiveMode}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                        isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                      style={{ background: '#3b82f6' }}
                    >
                      <Upload size={14} /> Import
                    </button>
                    {isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Cannot modify while viewing archives
                      </div>
                    )}
                  </div>
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
                        <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Gender</th>
                        <th className="text-left pb-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                          <td className="py-2.5 pr-3 text-gray-400">{i + 1}</td>
                          <td className="py-2.5 pr-3 font-mono text-gray-700">{s.student_id}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{s.student_name}</td>
                          <td className="py-2.5 pr-3 text-gray-700">{s.gender || '—'}</td>
                          <td className="py-2.5">
                            <div className="relative group inline-block">
                              <button
                                onClick={() => { if (!isArchiveMode) { setStudentToDelete(s); setConfirmStudentText(''); setDeleteStudentOpen(true); } }}
                                disabled={isArchiveMode}
                                className={`transition-colors ${isArchiveMode ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600'}`}
                              >
                                <Trash2 size={14} />
                              </button>
                              {isArchiveMode && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  Cannot modify while viewing archives
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
                    {currentTerm?.school_year || '—'} — {currentTerm?.semester || '—'}
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
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Students</h3>
              <button onClick={() => { setShowAddStudent(false); setStudentRows([{ id: '', first_name: '', last_name: '', mi: '', gender: '' }]); setStudentError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-4 p-0.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student Details</label>
              {studentRows.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 relative">
                  {studentRows.length > 1 && (
                    <button
                      onClick={() => setStudentRows(studentRows.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <input
                    type="text"
                    value={row.id}
                    onChange={(e) => {
                      const next = [...studentRows];
                      next[i] = { ...next[i], id: formatStudentId(e.target.value) };
                      setStudentRows(next);
                    }}
                    placeholder="Student ID (00-0000-000)"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm font-mono"
                    autoFocus={i === 0}
                  />
                  <input
                    type="text"
                    value={row.first_name}
                    onChange={(e) => {
                      const next = [...studentRows];
                      next[i] = { ...next[i], first_name: e.target.value };
                      setStudentRows(next);
                    }}
                    placeholder="First Name"
                    className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                  />
                  <input
                    type="text"
                    value={row.last_name}
                    onChange={(e) => {
                      const next = [...studentRows];
                      next[i] = { ...next[i], last_name: e.target.value };
                      setStudentRows(next);
                    }}
                    placeholder="Last Name"
                    className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.mi}
                      onChange={(e) => {
                        const next = [...studentRows];
                        next[i] = { ...next[i], mi: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1) };
                        setStudentRows(next);
                      }}
                      placeholder="M.I."
                      maxLength={1}
                      className="w-20 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm text-center"
                    />
                    <select
                      value={row.gender}
                      onChange={(e) => {
                        const next = [...studentRows];
                        next[i] = { ...next[i], gender: e.target.value };
                        setStudentRows(next);
                      }}
                      className="flex-1 px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            {studentError && <p className="text-xs font-semibold text-red-500 mb-3 whitespace-pre-line">{studentError}</p>}
            <hr className="border-t border-gray-200 my-2" />
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStudentRows([...studentRows, { id: '', first_name: '', last_name: '', mi: '', gender: '' }])}
                className="px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                style={{ background: '#f5a623' }}
              >
                Add More Students
              </button>
              <div className="flex gap-3">
                <button onClick={() => { setShowAddStudent(false); setStudentRows([{ id: '', first_name: '', last_name: '', mi: '', gender: '' }]); setStudentError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button onClick={addStudents} disabled={addingStudents} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#22c55e' }}>
                  <UserPlus size={14} /> {addingStudents ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Import Students</h3>
              <button onClick={() => { setShowImport(false); setImportRows([]); setImportHeaderError(''); setImportError(''); setImportResult(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {importHeaderError ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
                  <X size={28} className="text-red-500" />
                </div>
                <p className="text-sm font-semibold text-red-600 mb-1">Header Mismatch</p>
                <p className="text-xs text-gray-500">{importHeaderError}</p>
                <button onClick={() => { setShowImport(false); setImportRows([]); setImportSkipped([]); setImportHeaderError(''); }} className="mt-6 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
              </div>
            ) : importResult ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                  <Upload size={28} className="text-green-600" />
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Import Complete</p>
                <p className="text-sm text-green-600 font-semibold">{importResult.added?.length || 0} student(s) added.</p>
                {importResult.skipped?.length > 0 && (
                  <div className="mt-3 text-left max-h-32 overflow-y-auto">
                    <p className="text-xs font-bold text-amber-600 mb-1">{importResult.skipped.length} student(s) skipped:</p>
                    {importResult.skipped.map((s, i) => (
                      <p key={i} className="text-xs text-gray-500">Row {importRows.findIndex((r) => r.student_id === s.student_id) + 2}: {s.student_id} — {s.reason}</p>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowImport(false); setImportRows([]); setImportSkipped([]); setImportResult(null); }} className="mt-6 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: '#22c55e' }}>Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-green-600">{importRows.length}</span> will be added
                    {importSkipped.length > 0 && (
                      <span className="ml-2"><span className="font-semibold text-amber-600">{importSkipped.length}</span> will be skipped (duplicate ID)</span>
                    )}
                  </p>
                </div>
                {importError && <p className="text-xs font-semibold text-red-500 mb-3">{importError}</p>}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {importRows.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Students to Add
                      </p>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50" style={{ borderColor: '#f0ede6' }}>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">#</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Student ID</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">First Name</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Last Name</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">MI</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Gender</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importRows.map((row, i) => (
                              <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                                <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-1.5 font-mono text-gray-700">{row.student_id}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.first_name}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.last_name}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.mi}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.gender}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {importSkipped.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Skipped (Duplicate ID)
                      </p>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-gray-50" style={{ borderColor: '#f0ede6' }}>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">#</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Student ID</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">First Name</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Last Name</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">MI</th>
                              <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Gender</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importSkipped.map((row, i) => (
                              <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                                <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                                <td className="px-3 py-1.5 font-mono text-gray-700">{row.student_id}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.first_name}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.last_name}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.mi}</td>
                                <td className="px-3 py-1.5 text-gray-700">{row.gender}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => { setShowImport(false); setImportRows([]); setImportSkipped([]); setImportHeaderError(''); setImportError(''); setImportResult(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  {importRows.length > 0 && (
                    <button onClick={doImport} disabled={importing} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#3b82f6' }}>
                      <Upload size={14} /> {importing ? 'Importing...' : 'Import'}
                    </button>
                  )}
                </div>
              </>
            )}
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
