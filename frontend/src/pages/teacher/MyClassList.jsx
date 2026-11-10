import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, FileUp, LoaderCircle, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';
import FloatingSectionSelector from '../../components/common/FloatingSectionSelector';
import api from '../../utils/api';
import { SkeletonTable } from '../../components/common/Skeleton';

const normalize = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const digits = (value) => (String(value || '').match(/\d+/) || [''])[0];
const studentKey = (student) => String(student.id || student.student_id);
const normalizeGender = (value) => {
  const gender = String(value || '').trim().toLowerCase();
  if (gender === 'm' || gender === 'male') return 'Male';
  if (gender === 'f' || gender === 'female') return 'Female';
  return '';
};

const MyClassList = () => {
  const { assignments, loading: assignmentsLoading, activeTerm, isArchiveMode, setViewTerm, refreshAssignments } = useTeacher();
  const fileInputRef = useRef(null);
  const importDropdownRef = useRef(null);
  const classListHeaderRef = useRef(null);
  const [classListHeaderHeight, setClassListHeaderHeight] = useState(0);
  const [sectionId, setSectionId] = useState('');
  const [selectedBySection, setSelectedBySection] = useState({});
  const selectAllCheckboxRef = useRef(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [rosterState, setRosterState] = useState({ sectionId: '', students: [], error: '' });
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importResultModalOpen, setImportResultModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteStudentError, setDeleteStudentError] = useState('');
  const [deletingStudents, setDeletingStudents] = useState(false);
  const [studentForm, setStudentForm] = useState({ student_id: '', last_name: '', first_name: '', mi: '', gender: '', course: '', year_level: '' });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target)) setImportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const header = classListHeaderRef.current;
    if (!header) return undefined;

    const measureHeader = () => setClassListHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    measureHeader();
    const observer = new ResizeObserver(measureHeader);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!importResultModalOpen) return undefined;
    const timeoutId = window.setTimeout(() => setImportResultModalOpen(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [importResultModalOpen]);

  const sections = useMemo(() => {
    const unique = new Map();
    assignments.forEach((assignment) => {
      if (assignment.section_id && assignment.sections && !unique.has(assignment.section_id)) {
        unique.set(assignment.section_id, assignment);
      }
    });
    return [...unique.values()];
  }, [assignments]);
  const effectiveSectionId = sections.some((assignment) => String(assignment.section_id) === String(sectionId))
    ? String(sectionId)
    : String(sections[0]?.section_id || '');
  const selectedSectionAssignment = sections.find((assignment) => String(assignment.section_id) === effectiveSectionId) || null;
  const currentParsed = parsed;
  const targetSectionAssignment = currentParsed && assignments.find((assignment) => (
    normalize(assignment.sections?.name) === normalize(currentParsed.metadata.section)
    && normalize(assignment.sections?.courses?.abbreviation) === normalize(currentParsed.metadata.course)
    && digits(assignment.sections?.year_level) === digits(currentParsed.metadata.year_level)
    && assignment.school_year === currentParsed.metadata.school_year
    && assignment.semester === currentParsed.metadata.semester
  ));
  const targetSectionId = targetSectionAssignment?.section_id || '';
  const rosterSectionId = currentParsed ? targetSectionId : effectiveSectionId;
  const students = rosterState.sectionId === rosterSectionId ? rosterState.students : [];
  const rosterError = rosterState.sectionId === rosterSectionId ? rosterState.error : '';
  const rosterLoading = assignmentsLoading || Boolean(rosterSectionId && rosterState.sectionId !== rosterSectionId);
  const selectedStudentIds = selectedBySection[rosterSectionId] || [];
  const selectedStudentIdSet = new Set(selectedStudentIds);
  const selectedRosterStudentIds = students.filter((student) => selectedStudentIdSet.has(studentKey(student))).map(studentKey);
  const allStudentsSelected = students.length > 0 && selectedRosterStudentIds.length === students.length;
  const hasEmptySection = Boolean(selectedSectionAssignment && !rosterLoading && !rosterError && students.length === 0);
  const deleteEntireSection = allStudentsSelected || hasEmptySection;
  const someStudentsSelected = students.some((student) => selectedStudentIdSet.has(studentKey(student)));
  const isReadOnly = isArchiveMode || !activeTerm;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someStudentsSelected && !allStudentsSelected;
    }
  }, [someStudentsSelected, allStudentsSelected]);

  const toggleStudentSelection = (student, checked) => {
    if (!rosterSectionId) return;
    const key = studentKey(student);
    setSelectedBySection((current) => {
      const next = new Set(current[rosterSectionId] || []);
      if (checked) next.add(key);
      else next.delete(key);
      return { ...current, [rosterSectionId]: [...next] };
    });
  };

  const toggleAllStudentSelection = (checked) => {
    if (!rosterSectionId) return;
    setSelectedBySection((current) => ({
      ...current,
      [rosterSectionId]: checked ? students.map(studentKey) : [],
    }));
  };

  const openDeleteConfirmation = () => {
    setDeleteConfirmationText('');
    setDeleteStudentError('');
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmation = () => {
    if (deletingStudents) return;
    setDeleteConfirmOpen(false);
    setDeleteConfirmationText('');
    setDeleteStudentError('');
  };

  const deleteSelectedStudents = async (event) => {
    event.preventDefault();
    const deletingEmptySection = deleteEntireSection && students.length === 0;
    if (!selectedSectionAssignment || isReadOnly || deletingStudents || (!selectedRosterStudentIds.length && !deletingEmptySection)) return;
    if (deleteConfirmationText.trim() !== 'Confirm') {
      setDeleteStudentError('Type Confirm to delete to continue.');
      return;
    }

    const selectedSectionId = String(selectedSectionAssignment.section_id);
    const selectedIds = new Set(selectedRosterStudentIds);
    setDeletingStudents(true);
    setDeleteStudentError('');
    try {
      const response = await api(`/api/sections/${selectedSectionId}/students/bulk`, {
        method: 'DELETE',
        body: JSON.stringify({ student_ids: [...selectedIds], delete_section: deleteEntireSection }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || (deleteEntireSection ? 'Could not delete the class list.' : 'Could not delete the selected students.'));
      if (data.section_deleted) {
        await refreshAssignments();
        setSectionId('');
        setParsed(null);
        setSelectedBySection((current) => {
          const next = { ...current };
          delete next[selectedSectionId];
          return next;
        });
      } else {
        setRosterState((current) => current.sectionId === selectedSectionId
          ? { ...current, students: current.students.filter((student) => !selectedIds.has(studentKey(student))) }
          : current);
        setSelectedBySection((current) => ({ ...current, [selectedSectionId]: [] }));
      }
      setDeleteConfirmOpen(false);
      setDeleteConfirmationText('');
    } catch (error) {
      setDeleteStudentError(error.message || 'Could not delete the selected students.');
    } finally {
      setDeletingStudents(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!rosterSectionId) return () => { cancelled = true; };

    api(`/api/sections/${rosterSectionId}/students`)
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Could not load students for this section.');
        }
        const data = await response.json();
        if (!cancelled) setRosterState({ sectionId: rosterSectionId, students: data, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setRosterState({ sectionId: rosterSectionId, students: [], error: error.message || 'Could not load students.' });
      });

    return () => { cancelled = true; };
  }, [rosterSectionId]);

  const handleSectionChange = (value) => {
    setSectionId(String(value));
    setParsed(null);
    setParseError('');
    setImportError('');
    setImportResult(null);
    setImportResultModalOpen(false);
  };

  const metadataMismatches = useMemo(() => {
    if (!parsed || !activeTerm) return [];
    const mismatches = [];
    if (parsed.metadata.school_year !== activeTerm.school_year) mismatches.push('School Year');
    if (parsed.metadata.semester !== activeTerm.semester) mismatches.push('Semester');
    return mismatches;
  }, [parsed, activeTerm]);

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    const fileCounts = new Map();
    parsed.rows.forEach((row) => fileCounts.set(row.student_id, (fileCounts.get(row.student_id) || 0) + 1));
    const existingIds = new Set(!importResult && targetSectionId && rosterState.sectionId === targetSectionId
      ? rosterState.students.map((student) => student.student_id)
      : []);
    return parsed.rows.map((row) => {
      const issues = [];
      if (!/^\d{2}-\d{4}-\d{3}$/.test(row.student_id)) issues.push('Invalid Student ID');
      if (!row.first_name.trim()) issues.push('Missing First Name');
      if (!row.last_name.trim()) issues.push('Missing Last Name');
      if (!normalizeGender(row.gender)) issues.push('Invalid Gender');
      if ((fileCounts.get(row.student_id) || 0) > 1) issues.push('Duplicate in PDF');
      if (existingIds.has(row.student_id)) issues.push('Already in section');
      return { ...row, gender: normalizeGender(row.gender), issues };
    });
  }, [parsed, rosterState, targetSectionId, importResult]);

  const includedCount = previewRows.filter((row) => row.included && row.issues.length === 0).length;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setParsing(true);
    setParsed(null);
    setParseError('');
    setImportError('');
    setImportResult(null);
    setImportResultModalOpen(false);
    try {
      const { parseClassListPdf } = await import('../../utils/classListPdf');
      const result = await parseClassListPdf(file);
      if (!activeTerm) {
        setParseError('There is no active semester and school year available. The PDF was not opened for import.');
        return;
      }
      const mismatches = [];
      if (result.metadata.school_year !== activeTerm.school_year) mismatches.push('School Year');
      if (result.metadata.semester !== activeTerm.semester) mismatches.push('Semester');
      if (mismatches.length) {
        const pdfTerm = [result.metadata.school_year, result.metadata.semester].filter(Boolean).join(' · ');
        const activeTermLabel = [activeTerm.school_year, activeTerm.semester].filter(Boolean).join(' · ');
        setParseError(`PDF ${mismatches.join(' and ')} does not match the active term. Active term: ${activeTermLabel}. PDF term: ${pdfTerm}. The roster preview was not opened.`);
        return;
      }
      const counts = new Map();
      result.rows.forEach((row) => counts.set(row.student_id, (counts.get(row.student_id) || 0) + 1));
      result.rows = result.rows.map((row) => {
        const gender = normalizeGender(row.gender);
        const hasIssue = !/^\d{2}-\d{4}-\d{3}$/.test(row.student_id)
          || !row.first_name || !row.last_name || !gender
          || counts.get(row.student_id) > 1;
        return { ...row, gender, included: !hasIssue };
      });
      setParsed(result);
      const matchingSection = assignments.find((assignment) => (
        normalize(assignment.sections?.name) === normalize(result.metadata.section)
        && normalize(assignment.sections?.courses?.abbreviation) === normalize(result.metadata.course)
        && digits(assignment.sections?.year_level) === digits(result.metadata.year_level)
        && assignment.school_year === result.metadata.school_year
        && assignment.semester === result.metadata.semester
      ));
      if (matchingSection) setSectionId(String(matchingSection.section_id));
    } catch (error) {
      setParsed(null);
      setParseError(error.message || 'Could not read the PDF.');
    } finally {
      setParsing(false);
    }
  };

  const setAllValidRows = (included) => {
    const issuesByRow = new Map(previewRows.map((row) => [row.rowNum, row.issues.length > 0]));
    setParsed((current) => current && ({
      ...current,
      rows: current.rows.map((row) => ({ ...row, included: included && !issuesByRow.get(row.rowNum) })),
    }));
  };

  const toggleRow = (rowNum, checked) => {
    setParsed((current) => current && ({
      ...current,
      rows: current.rows.map((row) => row.rowNum === rowNum ? { ...row, included: checked } : row),
    }));
  };

  const importStudents = async () => {
    if (!currentParsed || isReadOnly || saving || metadataMismatches.length) return;
    const includedRows = previewRows.filter((row) => row.included && row.issues.length === 0);
    if (!includedRows.length) {
      setImportError('Select at least one valid student row.');
      return;
    }
    setSaving(true);
    setImportError('');
    setImportResult(null);
    setImportResultModalOpen(false);
    try {
      const response = await api('/api/assignments/import-class-list', {
        method: 'POST',
        body: JSON.stringify({
          pdf_metadata: currentParsed.metadata,
          students: includedRows.map(({ rowNum, student_id, first_name, last_name, mi, gender, course, year_level }) => ({
            row_num: rowNum, student_id, first_name, last_name, mi, gender, course, year_level,
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Student import failed.');
      setImportResult(data);
      setImportResultModalOpen(true);
      if (data.section?.id) setSectionId(String(data.section.id));
      await refreshAssignments();
      if (data.added?.length && rosterState.sectionId === data.section?.id) {
        setRosterState((current) => ({
          ...current,
          students: [...current.students, ...data.added].sort((a, b) => a.student_name.localeCompare(b.student_name)),
        }));
      }
    } catch (error) {
      setImportError(error.message || 'Student import failed.');
    } finally {
      setSaving(false);
    }
  };

  const openAddStudentModal = () => {
    setStudentForm({
      student_id: '',
      last_name: '',
      first_name: '',
      mi: '',
      gender: '',
      course: selectedSectionAssignment?.sections?.courses?.abbreviation || '',
      year_level: selectedSectionAssignment?.sections?.year_level || '',
    });
    setAddStudentError('');
    setStudentModalOpen(true);
  };

  const closeAddStudentModal = () => {
    if (addingStudent) return;
    setStudentModalOpen(false);
    setAddStudentError('');
  };

  const addStudent = async (event) => {
    event.preventDefault();
    if (!selectedSectionAssignment || isReadOnly || addingStudent) return;
    const studentId = studentForm.student_id.trim();
    const lastName = studentForm.last_name.trim();
    const firstName = studentForm.first_name.trim();
    const mi = studentForm.mi.trim().replace(/[.\s]+$/g, '').toUpperCase();
    const sectionCourse = selectedSectionAssignment.sections?.courses?.abbreviation || '';
    const sectionYearLevel = selectedSectionAssignment.sections?.year_level || '';
    if (!/^\d{2}-\d{4}-\d{3}$/.test(studentId)) {
      setAddStudentError('Use the Student ID format ##-####-###, for example 26-1234-001.');
      return;
    }
    if (!lastName || !firstName || !studentForm.gender) {
      setAddStudentError('Last Name, First Name, and Gender are required.');
      return;
    }
    if (!studentForm.course || !studentForm.year_level) {
      setAddStudentError('Select a course and year level.');
      return;
    }
    if (studentForm.course !== sectionCourse || studentForm.year_level !== sectionYearLevel) {
      setAddStudentError('Course and Year Level must match the selected section.');
      return;
    }

    const selectedSectionId = String(selectedSectionAssignment.section_id);
    setAddingStudent(true);
    setAddStudentError('');
    try {
      const response = await api(`/api/sections/${selectedSectionId}/students`, {
        method: 'POST',
        body: JSON.stringify({
          student_id: studentId,
          last_name: lastName,
          first_name: firstName,
          mi,
          gender: studentForm.gender,
          course: studentForm.course,
          year_level: studentForm.year_level,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not add this student.');
      setRosterState((current) => current.sectionId === selectedSectionId
        ? { ...current, error: '', students: [...current.students, data].sort((a, b) => a.student_name.localeCompare(b.student_name)) }
        : current);
      setStudentModalOpen(false);
      setStudentForm({ student_id: '', last_name: '', first_name: '', mi: '', gender: '', course: '', year_level: '' });
    } catch (error) {
      setAddStudentError(error.message || 'Could not add this student.');
    } finally {
      setAddingStudent(false);
    }
  };

  const closePreview = () => {
    if (saving) return;
    setParsed(null);
    setImportError('');
    setImportResult(null);
    setImportResultModalOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <TeacherPageHeading
        eyebrow="Student roster"
        title="My Class List"
        description="Import a class-list PDF or add students directly to each of your sections."
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-700" htmlFor="student-section">My sections</label>
            {assignmentsLoading ? (
              <div className="flex h-12 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-500">Loading sections…</div>
            ) : sections.length ? (
              <FloatingSectionSelector
                value={effectiveSectionId}
                onChange={handleSectionChange}
                sections={sections}
                isArchiveMode={isArchiveMode}
                onExitArchive={() => setViewTerm(null)}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">No imported sections yet. Upload a class-list PDF to create your first section.</div>
            )}
          </div>
          <div className="relative w-fit" ref={importDropdownRef}>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => setImportMenuOpen((current) => !current)}
              disabled={isReadOnly || parsing || saving}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#0c1925] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#142a3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {parsing ? <LoaderCircle size={17} className="animate-spin" /> : <FileUp size={17} />}
              {parsing ? 'Reading PDF...' : 'Import Class-List'}
              <ChevronDown size={14} className={`transition-transform duration-200 ${importMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {importMenuOpen && (
              <div className="dropdown-pop absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl origin-top-right">
                <button
                  type="button"
                  onClick={() => { setImportMenuOpen(false); fileInputRef.current?.click(); }}
                  disabled={isReadOnly || parsing || saving}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold text-sidebar transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText size={14} className="text-red-600" /> PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>

        {isReadOnly && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">PDF imports are available only in the active term. Exit archive mode and try again.</p>}
        {parseError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{parseError}</p>}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div ref={classListHeaderRef} className="sticky top-0 z-20 flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">Class List</h2>
              <span className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">
                <Users size={14} /> {students.length} students
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-600">
              {selectedSectionAssignment
                ? `Subject Title: ${selectedSectionAssignment.subjects?.name || 'Unavailable'}`
                : 'Choose a section to view its class list.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            {(selectedRosterStudentIds.length > 0 || hasEmptySection) && (
              <button
                type="button"
                onClick={openDeleteConfirmation}
                disabled={isReadOnly || rosterLoading || Boolean(rosterError) || deletingStudents}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} /> {hasEmptySection ? 'Delete Section' : `Delete (${selectedRosterStudentIds.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={openAddStudentModal}
              disabled={!selectedSectionAssignment || isReadOnly || rosterLoading || Boolean(rosterError) || addingStudent}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0c1925] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#142a3f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus size={16} /> Add Student
            </button>
          </div>
        </div>

        <div>
          {rosterLoading ? <SkeletonTable cols={9} rows={8} bare /> : (
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-xs">
            <thead className="bg-[#0D1E2D] text-white">
              <tr>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">#</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 w-10 bg-[#0D1E2D] px-3 py-3">
                  <input ref={selectAllCheckboxRef} type="checkbox" aria-label="Select all students" checked={allStudentsSelected} disabled={!students.length || rosterLoading || Boolean(rosterError)} onChange={(event) => toggleAllStudentSelection(event.target.checked)} className="h-4 w-4 rounded accent-[#0c1925] disabled:cursor-not-allowed" />
                </th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">Student ID</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">Last Name</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] py-3 pl-4 pr-1">First Name</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] py-3 pl-1 pr-4">MI</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">Course</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">Year Level</th>
                <th style={{ top: classListHeaderHeight }} className="sticky top-0 z-10 bg-[#0D1E2D] px-4 py-3">Gender</th>
              </tr>
            </thead>
            <tbody>
              {!selectedSectionAssignment ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">Import a class-list PDF to create your first section.</td></tr>
              ) : rosterError ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-red-600">{rosterError}</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">No students in this section yet. Add a student or import its class-list PDF.</td></tr>
              ) : students.map((student, index) => (
                <tr key={student.id || student.student_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={`Select ${student.student_name || student.student_id}`} checked={selectedStudentIdSet.has(studentKey(student))} onChange={(event) => toggleStudentSelection(student, event.target.checked)} className="h-4 w-4 rounded accent-[#0c1925]" />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-800">{student.student_id}</td>
                  <td className="px-4 py-3 text-gray-900">{student.last_name || '—'}</td>
                  <td className="py-3 pl-4 pr-1 text-gray-800">{student.first_name || '—'}</td>
                  <td className="py-3 pl-1 pr-4 text-gray-700">{student.mi || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{selectedSectionAssignment.sections?.courses?.abbreviation || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{selectedSectionAssignment.sections?.year_level || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{student.gender || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </section>

      {studentModalOpen && (
        <div
          className="modal-backdrop fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeAddStudentModal(); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="add-student-title" className="modal-surface w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4">
              <div>
                <h2 id="add-student-title" className="text-base font-bold text-gray-900">Add Student</h2>
                <p className="mt-1 text-xs text-gray-600">Add a student to {selectedSectionAssignment?.sections?.name || 'this section'}.</p>
              </div>
              <button type="button" onClick={closeAddStudentModal} disabled={addingStudent} aria-label="Close add student form" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"><X size={18} /></button>
            </div>
            <form onSubmit={addStudent} className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="add-student-id" className="mb-1.5 block text-xs font-bold text-gray-700">Student ID</label>
                <input id="add-student-id" autoFocus required value={studentForm.student_id} onChange={(event) => setStudentForm((current) => ({ ...current, student_id: event.target.value }))} placeholder="26-1234-001" className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-student-last-name" className="mb-1.5 block text-xs font-bold text-gray-700">Last Name</label>
                  <input id="add-student-last-name" required value={studentForm.last_name} onChange={(event) => setStudentForm((current) => ({ ...current, last_name: event.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10" />
                </div>
                <div>
                  <label htmlFor="add-student-first-name" className="mb-1.5 block text-xs font-bold text-gray-700">First Name</label>
                  <input id="add-student-first-name" required value={studentForm.first_name} onChange={(event) => setStudentForm((current) => ({ ...current, first_name: event.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-student-mi" className="mb-1.5 block text-xs font-bold text-gray-700">MI <span className="font-medium text-gray-400">(optional)</span></label>
                  <input id="add-student-mi" maxLength={3} value={studentForm.mi} onChange={(event) => setStudentForm((current) => ({ ...current, mi: event.target.value.toUpperCase() }))} className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10" />
                </div>
                <div>
                  <label htmlFor="add-student-gender" className="mb-1.5 block text-xs font-bold text-gray-700">Gender</label>
                  <select id="add-student-gender" required value={studentForm.gender} onChange={(event) => setStudentForm((current) => ({ ...current, gender: event.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10">
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add-student-course" className="mb-1.5 block text-xs font-bold text-gray-700">Course</label>
                  <select id="add-student-course" required value={studentForm.course} onChange={(event) => setStudentForm((current) => ({ ...current, course: event.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10">
                    <option value="">Select course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="add-student-year-level" className="mb-1.5 block text-xs font-bold text-gray-700">Year Level</label>
                  <select id="add-student-year-level" required value={studentForm.year_level} onChange={(event) => setStudentForm((current) => ({ ...current, year_level: event.target.value }))} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#0c1925] focus:ring-2 focus:ring-[#0c1925]/10">
                    <option value="">Select year level</option>
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Course and year level must match the selected section.</p>
              {addStudentError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{addStudentError}</p>}
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={closeAddStudentModal} disabled={addingStudent} className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={addingStudent || isReadOnly} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0c1925] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#142a3f] disabled:cursor-not-allowed disabled:opacity-50">
                  {addingStudent && <LoaderCircle size={15} className="animate-spin" />}
                  {addingStudent ? 'Adding…' : 'Add Student'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDeleteConfirmation(); }}
        >
          <form onSubmit={deleteSelectedStudents} role="dialog" aria-modal="true" aria-labelledby="delete-students-title" className="bg-white rounded-2xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 id="delete-students-title" className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            {hasEmptySection ? (
              <div className="mb-3 space-y-2 text-sm text-gray-900">
                <p>The class list for <strong>{selectedSectionAssignment?.sections?.name || 'this section'}</strong> is already empty.</p>
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">Deleting this section will remove it from the dropdown and permanently delete every teacher assignment tied to it, including related grades, scores, attendance, and class records. This may affect other teachers assigned to the section. This action cannot be undone.</p>
              </div>
            ) : deleteEntireSection ? (
              <div className="mb-3 space-y-2 text-sm text-gray-900">
                <p>You selected all <strong>{selectedRosterStudentIds.length} students</strong> in <strong>{selectedSectionAssignment?.sections?.name || 'this section'}</strong>.</p>
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">Deleting this complete class list will also remove the section from the dropdown, delete every teacher assignment tied to it, and permanently erase its grades, scores, attendance, and related class records. This may affect other teachers assigned to the section. This action cannot be undone.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-900 mb-3">Are you sure you want to delete {selectedRosterStudentIds.length} selected student(s) from <strong>{selectedSectionAssignment?.sections?.name || 'this section'}</strong>? This action cannot be undone.</p>
            )}
            <div className="mb-4">
              <label htmlFor="delete-confirmation-text" className="block text-xs font-bold text-gray-900 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input id="delete-confirmation-text" type="text" autoFocus autoComplete="off" value={deleteConfirmationText} onChange={(event) => { setDeleteConfirmationText(event.target.value); setDeleteStudentError(''); }} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" placeholder="Confirm" />
              {deleteStudentError && <p role="alert" className="mt-2 text-xs text-red-600">{deleteStudentError}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={closeDeleteConfirmation} disabled={deletingStudents} className="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button type="submit" disabled={deleteConfirmationText !== 'Confirm' || deletingStudents || isReadOnly} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-colors ${deleteConfirmationText === 'Confirm' && !deletingStudents && !isReadOnly ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'} flex items-center gap-2`}>
                {deletingStudents && <LoaderCircle size={14} className="animate-spin" />}
                {deletingStudents ? 'Deleting...' : hasEmptySection ? 'Delete Section' : deleteEntireSection ? 'Delete Class List' : 'Delete'}
              </button>
            </div>
          </form>
        </div>
      )}

      {currentParsed && (
        <div
          className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-3 sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closePreview(); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="pdf-preview-title" className="modal-surface relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
              <div>
                <h2 id="pdf-preview-title" className="text-base font-bold text-gray-900">Review PDF roster</h2>
                <p className="mt-1 text-xs text-gray-500">{parsed.rows.length} rows found. Check the class details and student data before importing.</p>
              </div>
              <button type="button" onClick={closePreview} disabled={saving} aria-label="Close PDF preview" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50"><X size={18} /></button>
            </div>

            <div className="shrink-0 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                {[
                  ['Subject Code', currentParsed.metadata.subject_code],
                  ['Descriptive Title', currentParsed.metadata.descriptive_title],
                  ['Section', currentParsed.metadata.section],
                  ['Course', currentParsed.metadata.course],
                  ['Year Level', currentParsed.metadata.year_level],
                  ['Semester', currentParsed.metadata.semester],
                  ['School Year', currentParsed.metadata.school_year],
                ].map(([label, value]) => (
                  <div key={label} className={`min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 ${label === 'Descriptive Title' ? 'sm:col-span-2' : ''}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-black">{label}</p>
                    <p className={`mt-1 font-semibold text-gray-900 ${label === 'Descriptive Title' ? 'whitespace-normal break-words leading-snug' : 'truncate'}`} title={value}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {(metadataMismatches.length > 0 || importError || (importResult?.skipped?.length > 0 && !importResultModalOpen)) && (
              <div className="max-h-36 shrink-0 space-y-2 overflow-y-auto px-5 pt-4 sm:px-6">
                {metadataMismatches.length > 0 && (
                  <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    <span>PDF term does not match the active term: <strong>{metadataMismatches.join(', ')}</strong>. Choose the current term's class list before importing.</span>
                  </div>
                )}
                {importError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{importError}</p>}
                {importResult?.skipped?.length > 0 && (
                  <div className="space-y-1 text-[11px] text-amber-800">
                    {importResult.skipped.slice(0, 8).map((item, index) => <p key={`${item.student_id}-${index}`}>Row {item.row || index + 1}: {item.student_id || 'No ID'} — {item.reason}</p>)}
                    {importResult.skipped.length > 8 && <p>And {importResult.skipped.length - 8} more skipped row(s).</p>}
                  </div>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-600">{includedCount} valid row(s) selected</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAllValidRows(true)} disabled={Boolean(importResult)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Select valid rows</button>
                  <button type="button" onClick={() => setAllValidRows(false)} disabled={Boolean(importResult)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Clear selection</button>
                </div>
              </div>
              <div className="overflow-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#142a3f] text-white">
                    <tr>
                      <th className="px-3 py-2.5">Import</th>
                      <th className="px-3 py-2.5">Student ID</th>
                      <th className="px-3 py-2.5">Last Name</th>
                      <th className="px-3 py-2.5">First Name</th>
                      <th className="px-3 py-2.5">MI</th>
                      <th className="px-3 py-2.5">Course</th>
                      <th className="px-3 py-2.5">Year Level</th>
                      <th className="px-3 py-2.5">Gender</th>
                      <th className="px-3 py-2.5">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.rowNum} className="border-b border-gray-100 align-top hover:bg-gray-50">
                        <td className="px-3 py-2.5"><input type="checkbox" aria-label={`Import row ${row.rowNum}`} checked={Boolean(row.included && !row.issues.length)} disabled={row.issues.length > 0 || isReadOnly || metadataMismatches.length > 0 || Boolean(importResult)} onChange={(event) => toggleRow(row.rowNum, event.target.checked)} className="h-4 w-4 accent-[#0c1925]" /></td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-900">{row.student_id || '—'}</td>
                        <td className="max-w-48 break-words px-3 py-2 text-gray-900">{row.last_name || '—'}</td>
                        <td className="max-w-56 break-words px-3 py-2 text-gray-900">{row.first_name || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">{row.mi || '—'}</td>
                        <td className="px-3 py-2 text-gray-900">{row.course}</td>
                        <td className="px-3 py-2 text-gray-900">{row.year_level}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">{row.gender || '—'}</td>
                        <td className="max-w-56 px-3 py-2.5">
                          {row.issues.length ? <span className="rounded-md text-[10px] font-semibold text-amber-700">{row.issues.join(' · ')}</span> : <span className="rounded-md text-[10px] font-semibold text-green-700">Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {importResultModalOpen && importResult && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4" role="presentation">
                <div role="status" aria-live="polite" aria-labelledby="import-result-title" className="w-full max-w-xl rounded-2xl border border-green-200 bg-white p-8 text-center shadow-2xl">
                  <div className="flex flex-col items-center">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                      <CheckCircle2 size={30} />
                    </span>
                    <div className="mt-4 min-w-0">
                      <h3 id="import-result-title" className="text-xl font-bold text-gray-900">Roster import complete</h3>
                      <p className="mt-2 text-base leading-7 text-gray-700">{importResult.added?.length || 0} student(s) added; {importResult.skipped?.length || 0} skipped. Class: {importResult.section?.name} · {importResult.subject?.code}.</p>
                    </div>
                  </div>
                  {importResult.skipped?.length > 0 && (
                    <div className="mt-5 max-h-36 space-y-1 overflow-y-auto rounded-lg bg-amber-50 p-4 text-sm text-amber-800 text-left">
                      {importResult.skipped.slice(0, 8).map((item, index) => <p key={`${item.student_id}-${index}`}>Row {item.row || index + 1}: {item.student_id || 'No ID'} — {item.reason}</p>)}
                      {importResult.skipped.length > 8 && <p>And {importResult.skipped.length - 8} more skipped row(s).</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-600">Student records will be shared across subjects in this section.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closePreview} disabled={saving} className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50">{importResult ? 'Done' : 'Cancel'}</button>
                {!importResult && (
                  <button type="button" onClick={importStudents} disabled={!includedCount || saving || isReadOnly || metadataMismatches.length > 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {saving && <LoaderCircle size={15} className="animate-spin" />}
                    {saving ? 'Importing...' : `Import ${includedCount} Student${includedCount === 1 ? '' : 's'}`}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default MyClassList;

