import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, X, UserPlus, Layers, Upload, FileSpreadsheet } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import Pagination from '../../components/common/Pagination';
import CustomDropdown from '../../components/common/CustomDropdown';
import { GraduationCap, CalendarDays } from 'lucide-react';
import { SkeletonList, SkeletonTable } from '../../components/common/Skeleton';
import * as XLSX from 'xlsx';

const formatStudentId = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
};

const yearLevels = ['1st', '2nd', '3rd', '4th'];

import api from '../../utils/api';

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
  const [, setImportSkipped] = useState([]);
  const [importHeaderError, setImportHeaderError] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;
  const [courseMissing, setCourseMissing] = useState(false);
  const [sectionLetterMissing, setSectionLetterMissing] = useState(false);
  const EXCEL_HEADERS = useMemo(() => ['firstname', 'lastname', 'middle initial', 'student id', 'gender'], []);
  const excelEmptyRow = () => ({ firstname: '', lastname: '', 'middle initial': '', 'student id': '', gender: '' });
  const buildExcelRows = (n) => Array.from({ length: n }, () => excelEmptyRow());
  const EXCEL_PAGE_SIZE = 10;
  const excelLabel = (h) => {
    if (h === 'firstname') return 'First Name';
    if (h === 'lastname') return 'Last Name';
    if (h === 'middle initial') return 'Middle Initial';
    if (h === 'student id') return 'Student ID';
    return 'Gender';
  };
  const excelPlaceholder = (h) => {
    if (h === 'firstname') return 'First Name';
    if (h === 'lastname') return 'Last Name';
    if (h === 'middle initial') return 'M.I.';
    if (h === 'student id') return '00-0000-000';
    return 'Male / Female';
  };
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelRows, setExcelRows] = useState(() => buildExcelRows(10));
  const [excelError, setExcelError] = useState('');

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
    setStudentPage(1);
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

  const anyModalOpen = showAddSection || showAddStudent || showImport || showExcelModal || deleteSectionOpen || deleteStudentOpen;

  useEffect(() => {
    if (anyModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [anyModalOpen]);

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
    if (!selectedCourseId) {
      setCourseMissing(true);
      setSectionError('Please select a course first.');
      return;
    }
    if (!letter) {
      setSectionLetterMissing(true);
      setSectionError('Section letter is required.');
      return;
    }
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
        setSectionLetterMissing(false);
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
        const expected = ['firstname', 'lastname', 'middle initial', 'student id', 'gender'];
        const normalizedSet = new Set(headers.map((h) => String(h).trim().toLowerCase()));
        // Backward-compatible aliases for files made with the old template
        const aliases = {
          firstname: ['firstname', 'first name'],
          lastname: ['lastname', 'last name'],
          'middle initial': ['middle initial', 'mi', 'm.i.'],
          'student id': ['student id', 'student id.', 'studentid'],
          gender: ['gender'],
        };
        const missing = expected.filter((h) => !(aliases[h] || [h]).some((a) => normalizedSet.has(a)));
        if (missing.length > 0) {
          setImportHeaderError(`Invalid headers. Missing: ${missing.join(', ')}. Expected first row: ${expected.join(', ')}. Found: ${headers.join(', ')}`);
          setShowImport(true);
          return;
        }
        const keyByNormalized = {};
        headers.forEach((h) => { keyByNormalized[String(h).trim().toLowerCase()] = h; });
        const findKey = (names) => {
          for (const n of names) {
            if (keyByNormalized[n] != null) return keyByNormalized[n];
          }
          return names[0];
        };
        const kId = findKey(aliases['student id']);
        const kFirst = findKey(aliases.firstname);
        const kLast = findKey(aliases.lastname);
        const kMi = findKey(aliases['middle initial']);
        const kGender = findKey(aliases.gender);
        const rawRows = json.map((row, i) => ({
          rowNum: i + 2,
          student_id: String(row[kId] ?? '').trim(),
          first_name: String(row[kFirst] ?? '').trim(),
          last_name: String(row[kLast] ?? '').trim(),
          mi: String(row[kMi] ?? '').trim().toUpperCase().slice(0, 1),
          gender: String(row[kGender] ?? '').trim(),
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
        const counts = {};
        rawRows.forEach((r) => {
          if (r.student_id) counts[r.student_id] = (counts[r.student_id] || 0) + 1;
        });
        const flagged = rawRows.map((r) => {
          const missingFields = !r.student_id || !r.first_name || !r.last_name;
          const duplicateInFile = !!r.student_id && (counts[r.student_id] || 0) > 1;
          const duplicateInSystem = !!r.student_id && existingIds.has(r.student_id);
          const hasIssue = missingFields || duplicateInFile || duplicateInSystem;
          return { ...r, missingFields, duplicateInFile, duplicateInSystem, included: !hasIssue };
        });
        setImportRows(flagged);
        setImportSkipped([]);
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
    const selected = importRows.filter((r) => r.included);
    if (selected.length === 0) {
      setImportError('Select at least one row to import.');
      return;
    }
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const payload = selected.map(({ student_id, first_name, last_name, mi, gender }) => ({
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

  const toggleImportRow = (rowNum) => {
    setImportRows((prev) => prev.map((r) => (r.rowNum === rowNum ? { ...r, included: !r.included } : r)));
  };

  const selectCleanImportRows = () => {
    setImportRows((prev) => prev.map((r) => ({ ...r, included: !(r.missingFields || r.duplicateInFile || r.duplicateInSystem) })));
  };

  const selectAllImportRows = () => {
    setImportRows((prev) => prev.map((r) => ({ ...r, included: true })));
  };

  const updateExcelCell = (i, field, val) => {
    setExcelRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
    setExcelError('');
  };
  const loadMoreExcelRows = () => setExcelRows((prev) => [...prev, ...buildExcelRows(EXCEL_PAGE_SIZE)]);
  const clearExcelRow = (i) => {
    setExcelRows((prev) => prev.map((r, idx) => (idx === i ? excelEmptyRow() : r)));
    setExcelError('');
  };
  const clearAllExcelRows = () => {
    setExcelRows((prev) => prev.map(() => excelEmptyRow()));
    setExcelError('');
  };

  const previewExcelRows = async () => {
    if (!selectedSection) return;
    const filled = excelRows.filter((r) => EXCEL_HEADERS.some((h) => String(r[h] || '').trim() !== ''));
    if (filled.length === 0) { setExcelError('Enter at least one student row.'); return; }
    for (let i = 0; i < filled.length; i++) {
      const r = filled[i];
      if (!String(r['student id']).trim() || !String(r.firstname).trim() || !String(r.lastname).trim()) {
        setExcelError(`Row ${excelRows.indexOf(r) + 1}: firstname, lastname, and student id are required.`);
        return;
      }
    }
    let existingIds = new Set();
    try {
      const res = await api(`http://localhost:5000/api/sections/${selectedSection.id}/students`);
      if (res.ok) {
        const existing = await res.json();
        existingIds = new Set(existing.map((s) => s.student_id));
      }
    } catch {}
    const counts = {};
    filled.forEach((r) => {
      const id = String(r['student id']).trim();
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
    const flagged = filled.map((r, idx) => {
      const student_id = String(r['student id']).trim();
      const first_name = String(r.firstname).trim();
      const last_name = String(r.lastname).trim();
      const mi = String(r['middle initial'] || '').trim().toUpperCase().slice(0, 1);
      const gender = String(r.gender || '').trim();
      const missingFields = !student_id || !first_name || !last_name;
      const duplicateInFile = !!student_id && (counts[student_id] || 0) > 1;
      const duplicateInSystem = !!student_id && existingIds.has(student_id);
      return {
        rowNum: idx + 2,
        student_id, first_name, last_name, mi, gender,
        missingFields, duplicateInFile, duplicateInSystem,
        included: !(missingFields || duplicateInFile || duplicateInSystem),
      };
    });
    setImportRows(flagged);
    setImportSkipped([]);
    setImportHeaderError('');
    setImportError('');
    setImportResult(null);
    setShowExcelModal(false);
    setShowImport(true);
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

  const studentTotalPages = Math.max(1, Math.ceil(students.length / STUDENTS_PER_PAGE));
  const safeStudentPage = Math.min(studentPage, studentTotalPages);
  const paginatedStudents = students.slice(
    (safeStudentPage - 1) * STUDENTS_PER_PAGE,
    safeStudentPage * STUDENTS_PER_PAGE
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-sm border border-gray-50" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Manage Sections</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>Create and organize class sections and manage student rosters.</p>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#cbd5e1' }}>{yearLabels[year] || year}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1 space-y-3 flex flex-col h-full">
          <div className="flex flex-col gap-2">
            <CustomDropdown
              value={selectedCourseId}
              onChange={(v) => { setSelectedCourseId(v); if (v) setCourseMissing(false); }}
              options={[
                { value: '', label: 'All courses', sublabel: 'Show every course' },
                ...courses.map((c) => ({ value: c.id, label: c.abbreviation ? `${c.abbreviation} — ${c.name}` : c.name, sublabel: c.abbreviation ? c.name : undefined })),
              ]}
              placeholder="Select course"
              icon={GraduationCap}
              searchable={courses.length > 5}
              searchPlaceholder="Search courses…"
              error={courseMissing && !selectedCourseId}
              errorMessage="Please select a course first"
              emptyMessage="No courses found."
            />
            <CustomDropdown
              value={year}
              onChange={(v) => setSearchParams({ year: v })}
              options={yearLevels.map((y) => ({ value: y, label: yearLabels[y] || y, sublabel: 'Year level' }))}
              placeholder="Select year level"
              icon={CalendarDays}
              searchable={false}
              emptyMessage="No year levels found."
            />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-50 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#0c1925] flex items-center gap-2">
              <Layers size={16} style={{ color: '#0c1925' }} /> Sections
            </h2>
            <div className="relative group">
              <button
                onClick={() => { if (isArchiveMode) return; if (!selectedCourseId) { setCourseMissing(true); return; } setCourseMissing(false); setShowAddSection(true); setSectionError(''); setSectionLetterMissing(false); setNewSectionLetter(''); }}
                disabled={isArchiveMode}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                  isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
                style={{ background: '#0c1925' }}
              >
                <Plus size={14} /> Add
              </button>
              {isArchiveMode && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Cannot modify while viewing archives
                </div>
              )}
              {!isArchiveMode && courseMissing && !selectedCourseId && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Please select a course first
                </div>
              )}
            </div>
          </div>

          {loadingSections ? (
            <div aria-busy="true"><SkeletonList rows={4} /></div>
          ) : sections.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sections found for this term.</p>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                    selectedSection?.id === section.id
                      ? 'bg-[#0c1925] text-white font-bold shadow-sm'
                      : 'text-[#0c1925] bg-gray-100 hover:bg-gray-300 font-bold'
                  }`}
                  onClick={() => setSelectedSection(section)}
                >
                  <span>{section.name}</span>
                  <div className="relative group">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!isArchiveMode) { setSectionToDelete(section); setConfirmSectionText(''); setDeleteSectionOpen(true); } }}
                      disabled={isArchiveMode}
                      className={`transition-colors ${isArchiveMode ? 'text-gray-300 cursor-not-allowed' : selectedSection?.id === section.id ? 'text-gray-300 hover:text-red-300' : 'text-gray-900 hover:text-red-900'}`}
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
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-50 h-full flex flex-col">
          {!selectedSection ? (
            <div className="flex flex-col flex-1 items-center justify-center py-16 text-gray-400">
              <Layers size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a section to view its students</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">
                  Students — <span style={{ color: '#0c1925' }}>{selectedSection.name}</span>
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
                      onClick={() => {
                        if (!isArchiveMode && selectedSection) {
                          setExcelError('');
                          if (excelRows.length < EXCEL_PAGE_SIZE) setExcelRows(buildExcelRows(EXCEL_PAGE_SIZE));
                          setShowExcelModal(true);
                        }
                      }}
                      disabled={isArchiveMode || !selectedSection}
                      title="Open Excel-like editor"
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                        isArchiveMode || !selectedSection ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                      style={{ background: '#0c1925' }}
                    >
                      <UserPlus size={14} /> Add Multiple
                    </button>
                    {isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Cannot modify while viewing archives
                      </div>
                    )}
                    {!isArchiveMode && selectedSection && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Open Excel-like editor
                      </div>
                    )}
                  </div>
                  <div className="relative group">
                    <button
                      onClick={() => { if (!isArchiveMode) { setShowAddStudent(true); setStudentError(''); } }}
                      disabled={isArchiveMode}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm transition-transform ${
                        isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                      style={{ background: '#0c1925' }}
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
                      title="Upload completed Excel file from the template tab"
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#0c1925] rounded-lg shadow-sm transition-transform ${
                        isArchiveMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                      }`}
                      style={{ background: '#fbbf24' }}
                    >
                      <Upload size={14} /> Import
                    </button>
                    {!isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Select the saved .xlsx to preview &amp; confirm import
                      </div>
                    )}
                    {isArchiveMode && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Cannot modify while viewing archives
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {loadingStudents ? (
                <div aria-busy="true"><SkeletonTable cols={5} rows={6} /></div>
              ) : students.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-12">No students enrolled yet.</p>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                          <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">#</th>
                          <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Student ID</th>
                          <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Student Name</th>
                          <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Gender</th>
                          <th className="text-left pb-2 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map((s, i) => (
                          <tr key={s.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                            <td className="py-2.5 pr-3 text-gray-400">{(safeStudentPage - 1) * STUDENTS_PER_PAGE + i + 1}</td>
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
                  <Pagination
                    currentPage={safeStudentPage}
                    totalPages={studentTotalPages}
                    onPageChange={setStudentPage}
                    totalItems={students.length}
                    rowsPerPage={STUDENTS_PER_PAGE}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Section</h3>
              <button onClick={() => { setShowAddSection(false); setSectionLetterMissing(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            {!selectedCourseId ? (
              <p className="text-sm text-amber-600 font-semibold mb-4">Please select a course first.</p>
            ) : (
              <>
                <div className="relative group mb-2">
                  <input
                    type="text"
                    value={newSectionLetter}
                    onChange={(e) => { setNewSectionLetter(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)); if (e.target.value.trim()) setSectionLetterMissing(false); }}
                    placeholder="e.g. A"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-[#fbf8f1] text-sm ${sectionLetterMissing && !newSectionLetter.trim() ? 'border-red-500 focus:ring-red-500' : 'border-gray-50 focus:ring-[#f5a623]'}`}
                    autoFocus
                    maxLength={2}
                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                  />
                  {sectionLetterMissing && !newSectionLetter.trim() && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Please enter a section letter
                    </div>
                  )}
                </div>
                {newSectionLetter.trim() && (
                  <p className="text-xs text-gray-500 mb-2">
                    Will be saved as: <strong className="text-gray-700">{getPreviewName(newSectionLetter)}</strong>
                    <br />
                    {currentTerm?.school_year || '—'} — {currentTerm?.semester || '—'}
                  </p>
                )}
                {sectionError && <p className="text-xs font-semibold text-red-500 mb-3">{sectionError}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowAddSection(false); setSectionError(''); setSectionLetterMissing(false); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <div className="relative group">
                    <button onClick={addSection} className="px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: '#f5a623' }}>Add</button>
                    {sectionLetterMissing && !newSectionLetter.trim() && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Please enter a section letter
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add Student</h3>
              <button onClick={() => { setShowAddStudent(false); setStudentRows([{ id: '', first_name: '', last_name: '', mi: '', gender: '' }]); setStudentError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-4 p-0.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student Details</label>
              {studentRows.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 relative">
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
                    className="w-full px-3 py-2 border border-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm font-mono"
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
                    className="w-full px-3 py-2 border border-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
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
                    className="w-full px-3 py-2 border border-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
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
                      className="w-20 px-3 py-2 border border-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm text-center"
                    />
                    <select
                      value={row.gender}
                      onChange={(e) => {
                        const next = [...studentRows];
                        next[i] = { ...next[i], gender: e.target.value };
                        setStudentRows(next);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
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
            <div className="flex items-center justify-end">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-2xl w-full mx-4 border border-gray-100 max-h-[85vh] flex flex-col">
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
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-green-600">{importRows.filter((r) => r.included).length}</span> selected
                    <span className="ml-2 text-gray-400">{importRows.filter((r) => r.duplicateInFile).length} duplicate in file</span>
                    <span className="ml-2 text-gray-400">{importRows.filter((r) => r.duplicateInSystem).length} already in section</span>
                    {importRows.some((r) => r.missingFields) && (
                      <span className="ml-2 text-red-500">{importRows.filter((r) => r.missingFields).length} incomplete</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={selectCleanImportRows} className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Select clean only</button>
                    <button onClick={selectAllImportRows} className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Select all</button>
                  </div>
                </div>
                {importError && <p className="text-xs font-semibold text-red-500 mb-3">{importError}</p>}
                <div className="flex-1 overflow-y-auto">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50" style={{ borderColor: '#f0ede6' }}>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Include</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">#</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Student ID</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">First Name</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Last Name</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row) => {
                          const flagged = row.missingFields || row.duplicateInFile || row.duplicateInSystem;
                          return (
                            <tr key={row.rowNum} className={`border-b last:border-0 ${flagged ? 'bg-red-50/60' : ''}`} style={{ borderColor: '#f0ede6' }}>
                              <td className="px-3 py-1.5">
                                <input type="checkbox" checked={!!row.included} onChange={() => toggleImportRow(row.rowNum)} className="h-3.5 w-3.5 accent-blue-600" />
                              </td>
                              <td className="px-3 py-1.5 text-gray-400">{row.rowNum - 1}</td>
                              <td className="px-3 py-1.5 font-mono text-gray-700">{row.student_id || '—'}</td>
                              <td className="px-3 py-1.5 text-gray-700">{row.first_name || '—'}</td>
                              <td className="px-3 py-1.5 text-gray-700">{row.last_name || '—'}</td>
                              <td className="px-3 py-1.5">
                                <span className="flex flex-wrap gap-1">
                                  {!flagged && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">Ready</span>}
                                  {row.missingFields && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700">Incomplete</span>}
                                  {row.duplicateInFile && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700">Duplicate in file</span>}
                                  {row.duplicateInSystem && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">Already in section</span>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-500">Uncheck any row to exclude it. Only checked rows are imported after you confirm.</p>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => { setShowImport(false); setImportRows([]); setImportSkipped([]); setImportHeaderError(''); setImportError(''); setImportResult(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  {importRows.length > 0 && (
                    <button onClick={doImport} disabled={importing || importRows.filter((r) => r.included).length === 0} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#3b82f6' }}>
                      <Upload size={14} /> {importing ? 'Importing...' : `Import (${importRows.filter((r) => r.included).length})`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 w-full mx-4 border border-gray-100 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet size={18} /> Add Multiple Students — Excel
              </h3>
              <button onClick={() => { setShowExcelModal(false); setExcelError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Section: <strong className="text-gray-800">{selectedSection?.name || '—'}</strong> — enter rows directly. Columns: {EXCEL_HEADERS.join(', ')}.
            </p>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">{excelRows.length} rows</p>
              <button onClick={clearAllExcelRows} className="px-3 py-1.5 text-xs font-semibold text-gray-600 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                Clear All
              </button>
            </div>
            {excelError && <p className="text-xs font-semibold text-red-500 mb-2">{excelError}</p>}
            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead className="sticky top-0">
                  <tr style={{ background: '#0c1925' }} className="text-white">
                    <th className="px-2 py-2 font-semibold border border-gray-700 w-10">#</th>
                    {EXCEL_HEADERS.map((h) => (
                      <th key={h} className="px-2 py-2 font-semibold border border-gray-700 text-left">{excelLabel(h)}</th>
                    ))}
                    <th className="px-2 py-2 font-semibold border border-gray-700 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {excelRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-2 py-1 border border-gray-200 text-gray-400 text-center">{i + 1}</td>
                      {EXCEL_HEADERS.map((h) => (
                        <td key={h} className="p-0 border border-gray-200">
                          <input
                            value={row[h] || ''}
                            onChange={(e) => updateExcelCell(i, h, e.target.value)}
                            placeholder={excelPlaceholder(h)}
                            aria-label={excelLabel(h)}
                            className="w-full px-2 py-1.5 text-xs placeholder:text-gray-400 placeholder:italic focus:outline-none focus:ring-1 focus:ring-inset focus:ring-[#f5a623] bg-transparent"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 border border-gray-200 text-center">
                        <button onClick={() => clearExcelRow(i)} title="Clear row" className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1">
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={loadMoreExcelRows} className="mt-2 w-full px-3 py-2 text-xs font-bold text-gray-700 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100">
              Load More (+{EXCEL_PAGE_SIZE})
            </button>
            <p className="mt-2 text-[11px] text-gray-500">Saving opens a preview that flags duplicates (in file and already in section). Duplicates are shown and left unchecked — only confirmed rows are imported.</p>
            <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
              <button onClick={() => { setShowExcelModal(false); setExcelError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
              <button onClick={previewExcelRows} className="flex items-center gap-1 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm" style={{ background: '#22c55e' }}>
                <Upload size={14} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
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


