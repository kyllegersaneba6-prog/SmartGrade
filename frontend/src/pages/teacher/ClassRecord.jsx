import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FileSpreadsheet, Plus, Trash2, Loader, Pencil, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../../contexts/TeacherContext';
import AssignmentSelector from '../../components/common/FloatingAssignmentSelector';
import ExportButtons from '../../components/teacher/ExportButtons';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';
import { SkeletonHeaderCard, SkeletonList, SkeletonTable } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import api from '../../utils/api';
import { buildTeacherFilename, TEACHER_TERM_TOKENS } from '../../utils/exportFilenames';
import { exportClassRecordExcel, exportClassRecordPdf } from '../../utils/classRecordExport';
import { TEACHER_TABLE_PAGE_SIZE } from '../../utils/teacherTable';

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];

const COMPONENT_COLORS = [
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
];
const getColor = (idx) => COMPONENT_COLORS[idx % COMPONENT_COLORS.length];

const ClassRecord = () => {
  const navigate = useNavigate();
  const saveTimerRef = useRef(null);

  const {
    selectedAssignment,
    currentAssignment,
    isReadOnly,
    loading: ctxLoading,
    refreshAssignments,
    gradingTerm: selectedTerm,
    setGradingTerm,
  } = useTeacher();

  const [students, setStudents] = useState([]);

  const [components, setComponents] = useState([]);
  const [scores, setScores] = useState({});
  const [attendanceScores, setAttendanceScores] = useState({ max_total: 0, scores: {} });
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [componentModal, setComponentModal] = useState(null);
  const [componentDraft, setComponentDraft] = useState({ name: '', weight: '', is_attendance: false, activities: [] });
  const [showSubcomponentChoices, setShowSubcomponentChoices] = useState(false);
  const [savingComponent, setSavingComponent] = useState(false);
  const [copyingPrelims, setCopyingPrelims] = useState(false);
  const [error, setError] = useState('');
  const [clampWarnings, setClampWarnings] = useState({});
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [deleteModal, setDeleteModal] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [dragCompId, setDragCompId] = useState(null);
  const [dropCompId, setDropCompId] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState('');
  const inputRefs = useRef({});
  const studentFetchControllerRef = useRef(null);
  const gradeFetchControllerRef = useRef(null);
  const gradeFetchRequestRef = useRef(0);

  useEffect(() => { setPage(1); }, [selectedAssignment, selectedTerm]);

  // Load students for the selected section and cancel stale assignment requests.
  useEffect(() => {
    const sectionId = currentAssignment?.section_id;
    studentFetchControllerRef.current?.abort();
    const controller = new AbortController();
    studentFetchControllerRef.current = controller;
    if (!sectionId) {
      setStudents([]);
      return () => controller.abort();
    }
    setStudents([]);

    const fetchStudents = async () => {
      try {
        const res = await api(`/api/sections/${sectionId}/students`, { signal: controller.signal });
        if (res.ok) setStudents(await res.json());
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    };
    fetchStudents();
    return () => controller.abort();
  }, [currentAssignment?.section_id]);

  // Fetch independent grade datasets together and ignore responses for a term
  // or assignment that is no longer selected.
  const fetchGradeData = useCallback(async () => {
    gradeFetchControllerRef.current?.abort();
    const controller = new AbortController();
    gradeFetchControllerRef.current = controller;
    const requestId = ++gradeFetchRequestRef.current;
    if (!selectedAssignment) {
      setComponents([]);
      setScores({});
      setAttendanceScores({ max_total: 0, scores: {} });
      setDataLoading(false);
      return;
    }
    setComponents([]);
    setScores({});
    setAttendanceScores({ max_total: 0, scores: {} });
    setDataLoading(true);
    try {
      const [compRes, scoresRes, attRes] = await Promise.all([
        api(`/api/grading-components?assignment_id=${selectedAssignment}&term=${selectedTerm}`, { signal: controller.signal }),
        api(`/api/component-scores?assignment_id=${selectedAssignment}&term=${selectedTerm}`, { signal: controller.signal }),
        api(`/api/attendance/computed-scores?teacher_assignment_id=${selectedAssignment}&term=${selectedTerm}`, { signal: controller.signal }),
      ]);
      const [comps, scoreList, attendance] = await Promise.all([
        compRes.ok ? compRes.json() : Promise.resolve([]),
        scoresRes.ok ? scoresRes.json() : Promise.resolve([]),
        attRes.ok ? attRes.json() : Promise.resolve({ max_total: 0, scores: {} }),
      ]);
      if (requestId !== gradeFetchRequestRef.current) return;
      const scoreMap = {};
      scoreList.forEach((score) => {
        if (!scoreMap[score.activity_id]) scoreMap[score.activity_id] = {};
        scoreMap[score.activity_id][score.student_id] = score.score;
      });
      setComponents(comps);
      setScores(scoreMap);
      setAttendanceScores(attendance);
    } catch (err) {
      if (err.name !== 'AbortError' && requestId === gradeFetchRequestRef.current) console.error(err);
    } finally {
      if (requestId === gradeFetchRequestRef.current) setDataLoading(false);
    }
  }, [selectedAssignment, selectedTerm]);

  useEffect(() => {
    fetchGradeData();
    setError('');
    return () => {
      gradeFetchRequestRef.current += 1;
      gradeFetchControllerRef.current?.abort();
    };
  }, [fetchGradeData]);

  useEffect(() => {
    const handler = async () => {
      await refreshAssignments();
      await fetchGradeData();
      window.dispatchEvent(new CustomEvent('app:reload-done'));
    };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [fetchGradeData, refreshAssignments]);

  // Debounced score save to DB
  const scheduleScoreSave = useCallback((newScores) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const payload = [];
      Object.entries(newScores).forEach(([activityId, studentScores]) => {
        Object.entries(studentScores).forEach(([studentId, score]) => {
          payload.push({ activity_id: activityId, student_id: studentId, score });
        });
      });
      if (payload.length > 0) {
        await api('/api/component-scores/bulk', {
          method: 'POST',
          body: JSON.stringify({ scores: payload })
        });
      }
    }, 800);
  }, []);

  const handleScoreChange = (activityId, studentId, value) => {
    if (isReadOnly) return;
    const raw = value === '' ? null : parseFloat(value);
    let numVal = raw;
    let maxScore = null;
    if (numVal !== null) {
      for (const comp of components) {
        const act = (comp.activities || []).find(a => a.id === activityId);
        if (act && act.max_score) {
          maxScore = act.max_score;
          numVal = Math.min(raw, act.max_score);
          break;
        }
      }
    }
    if (raw !== numVal && maxScore !== null) {
      const key = `${activityId}-${studentId}`;
      setClampWarnings(prev => ({ ...prev, [key]: maxScore }));
      setTimeout(() => {
        setClampWarnings(prev => { const c = { ...prev }; delete c[key]; return c; });
      }, 3000);
    }
    const updated = { ...scores };
    if (!updated[activityId]) updated[activityId] = {};
    updated[activityId][studentId] = numVal;
    setScores(updated);
    scheduleScoreSave(updated);
  };

  const openAddComponent = () => {
    setError('');
    setShowSubcomponentChoices(false);
    setComponentDraft({ name: '', weight: '', is_attendance: false, activities: [] });
    setComponentModal({ mode: 'add' });
  };

  const openEditComponent = (comp) => {
    setError('');
    setShowSubcomponentChoices(false);
    setComponentDraft({
      name: comp.is_attendance ? 'Attendance' : (comp.name || ''),
      weight: String(comp.weight ?? ''),
      is_attendance: !!comp.is_attendance,
      activities: (comp.activities || []).map((activity) => ({
        id: activity.id,
        name: activity.name || '',
        max_score: String(activity.max_score ?? ''),
        is_attendance: !!activity.is_attendance,
      })),
    });
    setComponentModal({ mode: 'edit', componentId: comp.id });
  };

  const saveComponentModal = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || savingComponent) return;
    const name = componentDraft.is_attendance ? 'Attendance' : componentDraft.name.trim();
    const weight = Number(componentDraft.weight);
    const existing = componentModal.mode === 'edit'
      ? components.find((comp) => comp.id === componentModal.componentId)
      : null;
    const weightAvailable = 100 - components.reduce((sum, comp) => sum + (comp.id === existing?.id ? 0 : Number(comp.weight || 0)), 0);
    if (!name) return setError('Enter a component name.');
    if (!Number.isFinite(weight) || weight <= 0 || weight > weightAvailable) {
      return setError(`Weight must be greater than 0 and no more than ${weightAvailable}%.`);
    }
    if (components.some((comp) => comp.id !== existing?.id && comp.name?.toLowerCase() === name.toLowerCase())) {
      return setError('A component with this name already exists for this term.');
    }
    if (!componentDraft.is_attendance && componentDraft.activities.some((activity) =>
      !activity.is_attendance && (!activity.name.trim() || !Number.isFinite(Number(activity.max_score)) || Number(activity.max_score) <= 0)
    )) return setError('Each activity needs a name and a maximum score greater than 0.');
    const draftAttendanceCount = componentDraft.activities.filter((activity) => activity.is_attendance).length;
    const otherAttendanceCount = components.reduce((count, component) => {
      if (component.id === existing?.id) return count;
      if (component.is_attendance) return count + 1;
      return count + (component.activities || []).filter((activity) => activity.is_attendance).length;
    }, 0);
    if (draftAttendanceCount > 1 || (draftAttendanceCount > 0 && otherAttendanceCount > 0) || (componentDraft.is_attendance && otherAttendanceCount > 0)) {
      return setError('Attendance can only be used once per assignment and term, either as a main component or a subcomponent.');
    }

    setSavingComponent(true);
    setError('');
    try {
      let componentId = existing?.id;
      if (existing) {
        const res = await api(`/api/grading-components/${existing.id}`, {
          method: 'PUT', body: JSON.stringify({ name, weight }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Could not save component.');
      } else {
        const res = await api('/api/grading-components', {
          method: 'POST',
          body: JSON.stringify({ teacher_assignment_id: selectedAssignment, term: selectedTerm, name, weight, is_attendance: componentDraft.is_attendance }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Could not add component.');
        componentId = (await res.json()).id;
        setComponentModal({ mode: 'edit', componentId });
      }

      if (!componentDraft.is_attendance) {
        const originalActivities = existing?.activities || [];
        const draftIds = new Set(componentDraft.activities.filter((activity) => activity.id).map((activity) => activity.id));
        for (const activity of originalActivities) {
          if (!draftIds.has(activity.id)) {
            const res = await api(`/api/component-activities/${activity.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Could not delete subcomponent.');
          }
        }
        for (const activity of componentDraft.activities) {
          const payload = activity.is_attendance
            ? { name: 'Attendance', max_score: 1, is_attendance: true }
            : { name: activity.name.trim(), max_score: Number(activity.max_score), is_attendance: false };
          const res = activity.id
            ? await api(`/api/component-activities/${activity.id}`, { method: 'PUT', body: JSON.stringify(payload) })
            : await api('/api/component-activities', { method: 'POST', body: JSON.stringify({ component_id: componentId, ...payload }) });
          if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || 'Could not save a subcomponent.');
          if (!activity.id) {
            const created = await res.json();
            activity.id = created.id;
            setComponentDraft((draft) => ({ ...draft, activities: draft.activities.map((item) => item.key === activity.key ? { ...item, id: created.id } : item) }));
          }
        }
      }
      setComponentModal(null);
      await fetchGradeData();
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
      await fetchGradeData();
    } finally {
      setSavingComponent(false);
    }
  };

  const copyFromPrelims = async () => {
    if (!selectedAssignment) return;
    setCopyingPrelims(true);
    try {
      const res = await api('/api/grading-components/copy-from-prelims', {
        method: 'POST',
        body: JSON.stringify({ teacher_assignment_id: selectedAssignment, target_term: selectedTerm })
      });
      if (res.ok) {
        const comps = await res.json();
        setComponents(comps);
        setError('');
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to copy from PRELIMS');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) { console.error(err); }
    finally { setCopyingPrelims(false); }
  };

  // Delete component
  const deleteComponent = async (id) => {
    try {
      const res = await api(`/api/grading-components/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComponents(prev => prev.filter(c => c.id !== id));
        setScores(prev => {
          const comp = components.find(c => c.id === id);
          if (comp) {
            const next = { ...prev };
            (comp.activities || []).forEach(a => delete next[a.id]);
            return next;
          }
          return prev;
        });
        return true;
      }
      const data = await res.json().catch(() => null);
      setError(data?.message || 'Failed to delete component. Please try again.');
      setTimeout(() => setError(''), 4000);
      return false;
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setTimeout(() => setError(''), 4000);
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal || deleting || confirmText !== 'Confirm') return;
    setDeleting(true);
    try {
      const ok = await deleteComponent(deleteModal.id);
      if (ok) {
        setDeleteModal(null);
        setConfirmText('');
      }
    } finally {
      setDeleting(false);
    }
  };

  // Drag-and-drop reorder of component columns (display order only).
  // Sub-components, scores, and ids move with the component automatically
  // since every row renders from the same `components` array keyed by id.
  const persistComponentOrder = async (ordered) => {
    if (reordering) return;
    setReordering(true);
    const prev = components;
    setComponents(ordered);
    try {
      const res = await api('/api/grading-components/reorder', {
        method: 'POST',
        body: JSON.stringify({
          teacher_assignment_id: selectedAssignment,
          term: selectedTerm,
          ordered_ids: ordered.map(c => c.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setComponents(prev);
        setError(data?.message || 'Failed to save component order. Please try again.');
        setTimeout(() => setError(''), 4000);
      } else {
        setError('');
      }
    } catch (err) {
      console.error(err);
      setComponents(prev);
      setError('Network error. Component order was not saved.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setReordering(false);
    }
  };

  const handleCompDrop = (targetId) => {
    if (!dragCompId || dragCompId === targetId || isReadOnly || reordering) {
      setDragCompId(null);
      setDropCompId(null);
      return;
    }
    const from = components.findIndex(c => c.id === dragCompId);
    const to = components.findIndex(c => c.id === targetId);
    setDragCompId(null);
    setDropCompId(null);
    if (from < 0 || to < 0) return;
    const next = [...components];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistComponentOrder(next);
  };

  // Compute component totals
  const getComponentTotal = (studentId, comp) => {
    if (comp.is_attendance) {
      return attendanceScores.scores[studentId] ?? 0;
    }
    const activities = comp.activities || [];
    let sum = 0;
    activities.forEach(a => {
      const val = a.is_attendance
        ? parseFloat(attendanceScores.scores[studentId] ?? 0)
        : parseFloat(scores[a.id]?.[studentId]);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const getComponentMaxTotal = (comp) => {
    if (comp.is_attendance) {
      return attendanceScores.max_total;
    }
    const activities = comp.activities || [];
    let sum = 0;
    activities.forEach(a => {
      sum += a.is_attendance
        ? parseFloat(attendanceScores.max_total || 0)
        : parseFloat(a.max_score || 0);
    });
    return sum;
  };

  const getComponentEquiv = (studentId, comp) => {
    const total = getComponentTotal(studentId, comp);
    const maxTotal = getComponentMaxTotal(comp);
    if (maxTotal === 0) return 0;
    return (total / maxTotal) * 50 + 50;
  };

  const getComponentWeighted = (studentId, comp) => {
    const equiv = getComponentEquiv(studentId, comp);
    return (equiv * comp.weight) / 100;
  };

  const getFinalGrade = (studentId) => {
    let sum = 0;
    components.forEach(c => {
      if (c.is_attendance || c.activities?.length > 0) {
        sum += getComponentWeighted(studentId, c);
      }
    });
    return sum;
  };

  const totalWeight = components.reduce((sum, c) => sum + parseFloat(c.weight || 0), 0);
  const hasAttendance = components.some(c => c.is_attendance || (c.activities || []).some(activity => activity.is_attendance));

  // Keep incomplete legacy entries in the table so teachers can still edit them.
  const tableComponents = useMemo(() => components, [components]);

  // Score-ready = activity has a name AND a max score above zero. Score cells
  // stay locked until both are set, so blank activities can't collect scores.
  const isActivityReady = (act) => String(act?.name || '').trim() !== '' && parseFloat(act?.max_score) > 0;
  const hasUnreadyActivity = tableComponents.some((comp) => !comp.is_attendance && (comp.activities || []).some((a) => !a.is_attendance && !isActivityReady(a)));

  const visibleActivityIds = useMemo(() => {
    const ids = [];
    components.forEach(comp => {
      if (!comp.is_attendance && comp.activities) {
        comp.activities.forEach(act => { if (!act.is_attendance && isActivityReady(act)) ids.push(act.id); });
      }
    });
    return ids;
  }, [components]);

  const handleKeyDown = useCallback((e, studentId, colId, studentIndex, filteredStudents, editableIds) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const totalCols = editableIds.length;
      const currentColIdx = editableIds.indexOf(colId);
      if (currentColIdx === -1) return;
      let ns = studentIndex;
      let nc = currentColIdx + dir;
      if (nc < 0) { nc = totalCols - 1; ns--; }
      else if (nc >= totalCols) { nc = 0; ns++; }
      if (ns < 0 || ns >= filteredStudents.length) return;
      const el = inputRefs.current[`${filteredStudents[ns].id}:${editableIds[nc]}`];
      if (el) { el.focus(); el.select(); }
      return;
    }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const totalCols = editableIds.length;
    const currentColIdx = editableIds.indexOf(colId);
    if (currentColIdx === -1) return;
    let ns = studentIndex;
    let nc = currentColIdx;
    if (e.key === 'ArrowLeft') nc = Math.max(0, currentColIdx - 1);
    else if (e.key === 'ArrowRight') nc = Math.min(totalCols - 1, currentColIdx + 1);
    else if (e.key === 'ArrowUp') ns = Math.max(0, studentIndex - 1);
    else if (e.key === 'ArrowDown') ns = Math.min(filteredStudents.length - 1, studentIndex + 1);
    const el = inputRefs.current[`${filteredStudents[ns].id}:${editableIds[nc]}`];
    if (el) { el.focus(); el.select(); }
  }, []);

  // Dynamic column count for table
  let activityCount = 0;
  components.forEach(c => { if (c.activities) activityCount += c.activities.length; });
  const colCount = 3 + (activityCount > 0 || hasAttendance ? components.length * 3 + activityCount : 0) + 1;

  const getExportFilename = (ext) => buildTeacherFilename({ section: currentAssignment.sections?.name, code: currentAssignment.subjects?.code, term: TEACHER_TERM_TOKENS[selectedTerm] ?? String(selectedTerm).toLowerCase(), page: 'classrecord', ext });

  const handleExportExcel = async () => {
    if (!currentAssignment || components.length === 0) return;
    await exportClassRecordExcel({ assignment: currentAssignment, term: selectedTerm, students, components, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade, filename: getExportFilename('xlsx') });
  };

  const handleExportPdf = async () => {
    if (!currentAssignment || components.length === 0 || exporting) return;
    setExporting('pdf');
    setExportError('');
    try {
      const query = searchQuery.trim().toLowerCase();
      const filteredStudents = query ? students.filter((student) => student.student_name?.toLowerCase().includes(query) || student.student_id?.toLowerCase().includes(query)) : students;
    await exportClassRecordPdf({ assignment: currentAssignment, term: selectedTerm, students: filteredStudents, components, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade, filename: getExportFilename('pdf') });
    } catch (err) {
      console.error(err);
      setExportError('PDF export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const onExcelClick = async () => {
    if (exporting) return;
    setExporting('excel');
    setExportError('');
    try {
      await handleExportExcel();
    } catch (err) {
      console.error(err);
      setExportError('Excel export failed. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  if (ctxLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <AssignmentSelector />
        <SkeletonHeaderCard />
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (!currentAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <FileSpreadsheet size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  return (
    <div className="teacher-class-record-page space-y-6">
      <div className="class-record-horizontal-anchor class-record-heading-anchor">
        <TeacherPageHeading
          eyebrow="Grade management"
          title="Class Record"
          description="View and manage student grades, assessment components, and class performance."
          actions={<ExportButtons onExcel={onExcelClick} onPdf={handleExportPdf} exporting={exporting} error={exportError} />}
        />
      </div>
      <div className="class-record-horizontal-anchor flex flex-wrap items-center gap-3">
        <AssignmentSelector />
        <div className="flex items-center bg-bg-light border border-border rounded-lg p-1">
          {TERMS.map((t) => (
            <button
              key={t}
              onClick={() => setGradingTerm(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedTerm === t
                  ? 'bg-sidebar text-white shadow-sm'
                  : 'text-text-muted hover:text-sidebar'
              }`}
            >
              {t}
            </button>
          ))}
          {dataLoading && <Loader size={14} className="animate-spin text-sidebar/40 ml-2" />}
        </div>
      </div>

      {error && (
        <div className="class-record-horizontal-anchor flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <span>{error}</span>
        </div>
      )}
      {isReadOnly && (
        <div className="class-record-horizontal-anchor flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-9.364a9 9 0 11-12.728 0 9 9 0 0112.728 0z" /></svg>
          <span>This term is closed. Viewing only.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border card-hover">
        <div className="class-record-horizontal-anchor flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-border bg-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span className="font-bold text-sidebar">Grading components</span>
            <span className={`font-extrabold ${totalWeight === 100 ? 'text-green-700' : 'text-amber-700'}`}>Total weight: {totalWeight}%</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedTerm !== 'PRELIMS' && !isReadOnly && !dataLoading && components.length === 0 && (
              <button onClick={copyFromPrelims} disabled={copyingPrelims} className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 disabled:opacity-50">
                {copyingPrelims ? 'Copying...' : 'Copy from PRELIMS'}
              </button>
            )}
            {!isReadOnly && (
              <button onClick={openAddComponent} disabled={totalWeight >= 100 || savingComponent} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#0c1925] rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus size={14} /> Add Component
              </button>
            )}
            {currentAssignment && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="w-56 pl-9 pr-8 py-2 text-xs border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] focus:border-[#0c1925] bg-white"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {components.length > 0 && totalWeight === 100 && !hasUnreadyActivity && (
          <div className="class-record-horizontal-anchor flex items-center gap-2 px-5 py-2.5 bg-green-50 border-b border-green-200 text-green-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span>Component weights total 100%. Grade computation is balanced — you can now enter scores.</span>
          </div>
        )}
        {components.length > 0 && totalWeight === 100 && hasUnreadyActivity && (
          <div className="class-record-horizontal-anchor flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Name each activity and set its max score before entering scores.</span>
          </div>
        )}
        {components.length > 0 && totalWeight !== 100 && (
          <div className="class-record-horizontal-anchor flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Component weights must total 100% before you can enter scores. Current: {totalWeight}%</span>
          </div>
        )}
        {dataLoading && components.length === 0 ? (
          <div aria-busy="true"><SkeletonTable cols={6} rows={8} /></div>
        ) : components.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">Add grading components to set up the class record table.</p>
          </div>
        ) : (
          <div className="w-full pb-2">
            <table className="teacher-sticky-table teacher-sticky-table-3rows teacher-sticky-class-record sticky-cols table-fixed w-max min-w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <colgroup>
                <col key="student-number-col" style={{ width: 'var(--student-number-width)' }} />
                <col key="student-id-col" style={{ width: 'var(--student-id-width)' }} />
                <col key="student-name-col" style={{ width: 'var(--student-name-width)' }} />
                {tableComponents.flatMap((comp) => comp.is_attendance
                  ? [
                    <col key={`${comp.id}-total-col`} style={{ width: '64px' }} />,
                    <col key={`${comp.id}-equiv-col`} style={{ width: '64px' }} />,
                    <col key={`${comp.id}-weighted-col`} style={{ width: '80px' }} />,
                  ]
                  : [
                    ...(comp.activities || []).map((activity) => <col key={`${activity.id}-col`} style={{ width: '48px' }} />),
                    <col key={`${comp.id}-total-col`} style={{ width: '64px' }} />,
                    <col key={`${comp.id}-equiv-col`} style={{ width: '64px' }} />,
                    <col key={`${comp.id}-weighted-col`} style={{ width: '80px' }} />,
                  ])}
                <col key="final-grade-col" style={{ width: '120px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={3} className="sticky-student-header class-record-separator bg-[#0c1925] border-b-2 border-r border-border p-3 text-white text-left font-bold sticky left-0 z-20" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-white">{searchQuery ? `${students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length}/${students.length}` : students.length} students</span>
                    </div>
                  </th>
                  {tableComponents.map((comp) => {
                    const actCount = comp.activities?.length || 0;
                    const cols = comp.is_attendance ? 3 : actCount + 3;
                    if (cols === 0) return null;
                    const isDragging = dragCompId === comp.id;
                    const isDropTarget = dropCompId === comp.id && dragCompId !== comp.id;
                    return (
                      <th
                        key={comp.id}
                        colSpan={cols}
                        draggable={!isReadOnly && !reordering}
                        onDragStart={(e) => { if (isReadOnly) return; e.dataTransfer.setData('text/plain', comp.id); e.dataTransfer.effectAllowed = 'move'; setDragCompId(comp.id); }}
                        onDragOver={(e) => { if (dragCompId && dragCompId !== comp.id) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropCompId !== comp.id) setDropCompId(comp.id); } }}
                        onDragLeave={() => { if (dropCompId === comp.id) setDropCompId(null); }}
                        onDrop={(e) => { e.preventDefault(); handleCompDrop(comp.id); }}
                        onDragEnd={() => { setDragCompId(null); setDropCompId(null); }}
                        title={isReadOnly ? undefined : 'Drag to reorder columns'}
                        className={`class-record-separator bg-[#0c1925] border-b-2 border-r p-2 text-white text-center font-bold relative z-0 ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'outline outline-2 outline-amber-400 outline-offset-[-2px]' : ''}`}
                        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
                      >
                        <div className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5">
                          <span className="flex h-9 w-full items-center justify-center px-1 text-xs leading-tight uppercase tracking-wider line-clamp-2 break-words">
                            {comp.is_attendance ? 'Attendance' : (comp.name || 'Untitled component')} ({comp.weight}%)
                          </span>
                          {!isReadOnly && <span className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => openEditComponent(comp)} title={`Edit ${comp.name || 'component'}`} aria-label={`Edit ${comp.name || 'component'}`} className="inline-flex h-6 min-w-[3.5rem] items-center justify-center gap-1 rounded bg-white/10 px-1.5 text-[10px] font-bold hover:bg-white/20"><Pencil size={11} /> Edit</button>
                            <button type="button" onClick={() => { setConfirmText(''); setDeleteModal({ type: 'component', id: comp.id }); }} title={`Delete ${comp.name || 'component'}`} aria-label={`Delete ${comp.name || 'component'}`} className="inline-flex h-6 min-w-[3.5rem] items-center justify-center gap-1 rounded bg-white/10 px-1.5 text-[10px] font-bold hover:bg-red-500/80"><Trash2 size={11} /> Delete</button>
                          </span>}
                        </div>
                      </th>
                    );
                  })}
                  <th className="bg-amber-400 border-b-2 border-gold-hover p-3 text-[#0c1925] text-center font-bold text-base uppercase tracking-wider min-w-[120px] relative z-0">
                    {selectedTerm === 'PRELIMS' ? 'PRE' : selectedTerm === 'MIDTERMS' ? 'MID' : selectedTerm === 'PRE-FINALS' ? 'P-F' : 'FIN'} GRADE
                  </th>
                </tr>

                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="sticky-student-number px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20">#</th>
                  <th className="sticky-student-id px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20">Stud ID</th>
                  <th className="sticky-student-name class-record-separator px-4 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20">Student Name</th>
                  {tableComponents.map((comp, idx) => {
                    const color = getColor(idx);
                    if (comp.is_attendance) {
                      return [
                        <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-100 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                        <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-100 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                        <th key={`${comp.id}-wt`} className="class-record-separator px-3 py-2.5 border-r bg-gray-100 text-sidebar font-extrabold w-20 relative z-0">W_TOTAL</th>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <th key={act.id} className="px-2 py-2.5 border-r border-gray-200 bg-gray-100 w-12 relative z-0" style={{ backgroundColor: color.light }}>{act.name}</th>
                    )).concat(
                      <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-100 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                      <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-100 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                      <th key={`${comp.id}-wt`} className="class-record-separator px-3 py-2.5 border-r bg-gray-100 text-sidebar font-extrabold w-20 relative z-0">W_TOTAL</th>
                    );
                  })}
                  <th className="px-3 py-2.5 bg-gray-100 text-sidebar font-extrabold text-sm w-28 relative z-0">FINAL</th>
                </tr>

                <tr className="class-record-max-score-row bg-white border-b border-border text-center font-bold text-sidebar select-none">
                  <td className="sticky-student-number px-1 py-2 text-center sticky bg-white border-r border-border z-20"></td>
                  <td className="sticky-student-id px-3 py-2 text-left sticky bg-white border-r border-border z-20 text-[10px] text-gray-900">MAX SCORE</td>
                  <td className="sticky-student-name class-record-separator px-4 py-2 text-left sticky bg-white border-r border-border z-20 text-[10px] text-gray-900 font-normal italic">Maximum target scores</td>
                  {tableComponents.map((comp) => {
                    const maxTotal = getComponentMaxTotal(comp);
                    if (comp.is_attendance) {
                      return [
                        <td key={`${comp.id}-total`} className="px-2 py-2 border-r border-b border-gray-200 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{maxTotal}</td>,
                        <td key={`${comp.id}-equiv`} className="px-2 py-2 border-r-2 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">100.00</td>,
                        <td key={`${comp.id}-wt`} className="class-record-separator px-2 py-2 border-r border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{comp.weight.toFixed(2)}</td>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <td key={act.id} className="p-1 border-r border-b border-gray-200 bg-gray-50 relative z-0">
                        <div className="w-full text-center text-xs font-black text-sidebar p-1" title="Set the max score in the component setup above">
                          {act.is_attendance ? attendanceScores.max_total : (act.max_score || 0)}
                        </div>
                      </td>
                    )).concat(
                      <td key={`${comp.id}-total`} className="px-2 py-2 border-r border-b border-gray-200 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{maxTotal}</td>,
                      <td key={`${comp.id}-equiv`} className="px-2 py-2 border-r-2 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">100.00</td>,
                      <td key={`${comp.id}-wt`} className="class-record-separator px-2 py-2 border-r border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{comp.weight.toFixed(2)}</td>
                    );
                  })}
                  <td className="px-2 py-2 bg-gray-100 font-extrabold text-sidebar text-center text-sm relative z-0 border-b border-gray-200">100.00</td>
                </tr>
              </thead>
              <tbody>
                  {(() => {
                    const filtered = searchQuery
                      ? students.filter(s =>
                          s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : students;
                    const paginatedStudents = filtered.slice((page - 1) * TEACHER_TABLE_PAGE_SIZE, page * TEACHER_TABLE_PAGE_SIZE);
                    return students.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-6 py-10 text-center text-gray-500 italic">
                        No students in this section. Import from Excel or add students in the Sections page.
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-6 py-10 text-center text-gray-500 italic">
                        No students match your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student, index) => {
                    const finalGrade = getFinalGrade(student.id);
                    const isFinalFail = finalGrade < 75;

                    return (
                      <tr key={student.id} className={`transition-colors ${selectedRow === student.id ? 'bg-green-200' : 'hover:bg-green-50/10'}`}>
                        <td className={`sticky-student-number px-1 py-1 text-center sticky border-r border-b border-gray-200 z-30 text-gray-900 text-[10px] cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} onClick={() => setSelectedRow(student.id)}>{(page - 1) * TEACHER_TABLE_PAGE_SIZE + index + 1}</td>
                        <td className={`sticky-student-id px-2 py-1 sticky border-r border-b border-gray-200 z-20 text-xs font-mono font-semibold text-gray-900 cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} onClick={() => setSelectedRow(student.id)}>{student.student_id}</td>
                        <td className={`sticky-student-name class-record-separator px-2 py-1 sticky border-r border-b border-border z-20 text-xs font-medium text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} onClick={() => setSelectedRow(student.id)}>{student.student_name}</td>
                        {tableComponents.map((comp) => {
                          const componentTotal = getComponentTotal(student.id, comp);
                          const componentEquiv = getComponentEquiv(student.id, comp);
                          const componentWeighted = getComponentWeighted(student.id, comp);
                          const isFail = componentEquiv < 75;

                          const isSelected = selectedRow === student.id;
                          if (comp.is_attendance) {
                            return [
                              <td key={`${comp.id}-total-${student.id}`} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`}>{componentTotal}</td>,
                              <td key={`${comp.id}-equiv-${student.id}`} className={`px-2 py-2 border-r-2 border-b border-gray-300 text-center font-bold text-xs ${isSelected ? 'bg-green-200' : 'bg-white'} ${isFail ? 'text-red-600 font-extrabold' : 'text-sidebar'}`}>{componentEquiv.toFixed(2)}</td>,
                              <td key={`${comp.id}-wt-${student.id}`} className={`class-record-separator px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-sidebar text-xs ${isSelected ? 'bg-green-200' : 'bg-white'}`}>{componentWeighted.toFixed(2)}</td>
                            ];
                          }
                          return (comp.activities || []).map((act) => {
                            if (act.is_attendance) {
                              return <td key={act.id} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`} title="Computed from attendance records">{attendanceScores.scores[student.id] ?? 0}</td>;
                            }
                            const val = scores[act.id]?.[student.id] ?? '';
                            const maxVal = act.max_score || 100;
                            const inputVal = val !== null && val !== undefined ? val : '';
                            const actLocked = !isActivityReady(act);
                            const draftKey = `${act.id}:${student.id}`;
                            const displayVal = scoreDrafts[draftKey] !== undefined
                              ? scoreDrafts[draftKey]
                              : (inputVal === '' ? '' : String(inputVal));
                            return (
                              <td key={act.id} className={`p-0.5 border-r border-b border-gray-200 ${isSelected ? 'bg-green-200' : 'bg-[#f3f4f6]'}`}>
                                <div className="relative">
                                  <input type="text" inputMode="decimal" value={displayVal}
                                    ref={el => { if (el) inputRefs.current[`${student.id}:${act.id}`] = el; }}
                                    disabled={totalWeight !== 100 || isReadOnly || actLocked}
                                    title={actLocked && !isReadOnly && totalWeight === 100 ? 'Set the activity name and max score first' : undefined}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9.]/g, '');
                                      const parts = raw.split('.');
                                      const cleaned = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
                                      const parsed = parseFloat(cleaned);
                                      const clampedDisplay = cleaned !== '' && !Number.isNaN(parsed) && parsed > maxVal ? String(maxVal) : cleaned;
                                      setScoreDrafts((prev) => ({ ...prev, [draftKey]: clampedDisplay }));
                                      if (cleaned === '' || /^\d+(\.\d*)?$/.test(cleaned)) {
                                        handleScoreChange(act.id, student.id, cleaned);
                                      }
                                    }}
                                    onBlur={() => setScoreDrafts((prev) => { const next = { ...prev }; delete next[draftKey]; return next; })}
                                    onKeyDown={(e) => handleKeyDown(e, student.id, act.id, index, paginatedStudents, visibleActivityIds)}
                                    className={`w-full text-center text-xs font-medium text-sidebar p-1 border rounded focus:outline-none focus:ring-1 focus:ring-gold bg-transparent hover:bg-gray-100 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${clampWarnings[`${act.id}-${student.id}`] ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                                    max={maxVal} />
                                  {clampWarnings[`${act.id}-${student.id}`] && (
                                    <div className="absolute -top-1 right-0 w-2 h-2 bg-amber-400 rounded-full" title={`Value clamped to max ${clampWarnings[`${act.id}-${student.id}`]}`} />
                                  )}
                                </div>
                              </td>
                            );
                          }).concat(
                            <td key={`${comp.id}-total-${student.id}`} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`}>{componentTotal}</td>,
                            <td key={`${comp.id}-equiv-${student.id}`} className={`px-2 py-2 border-r-2 border-b border-gray-300 text-center font-bold text-xs ${isSelected ? 'bg-green-200' : 'bg-white'} ${isFail ? 'text-red-600 font-extrabold' : 'text-sidebar'}`}>{componentEquiv.toFixed(2)}</td>,
                            <td key={`${comp.id}-wt-${student.id}`} className={`class-record-separator px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-sidebar text-xs ${isSelected ? 'bg-green-200' : 'bg-white'}`}>{componentWeighted.toFixed(2)}</td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center font-extrabold text-sm border-b border-gray-200 ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'} ${isFinalFail ? 'text-red-700' : 'text-green-700'}`}>
                          {finalGrade.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                  )})()}
              </tbody>
            </table>
          </div>
        )}
        {components.length > 0 && (
          <div className="class-record-horizontal-anchor">
            <Pagination
              currentPage={page}
              totalPages={Math.ceil((searchQuery ? students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : students.length) / TEACHER_TABLE_PAGE_SIZE)}
              onPageChange={setPage}
              totalItems={searchQuery ? students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : students.length}
              rowsPerPage={TEACHER_TABLE_PAGE_SIZE}
            />
          </div>
        )}
      </div>
      {componentModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center modal-backdrop p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !savingComponent) setComponentModal(null); }}>
          <form onSubmit={saveComponentModal} className="bg-white rounded-2xl modal-surface w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-base font-extrabold text-sidebar">{componentModal.mode === 'add' ? 'Add grading component' : 'Edit grading component'}</h3>
                <p className="text-xs text-gray-500 mt-1">Set its weight and subcomponents for this term.</p>
              </div>
              <button type="button" onClick={() => setComponentModal(null)} disabled={savingComponent} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}
              {!componentModal.componentId && (
                <label className="block text-xs font-bold text-gray-700">Component type
                  <select value={componentDraft.is_attendance ? 'attendance' : 'regular'} onChange={(e) => setComponentDraft((draft) => ({ ...draft, is_attendance: e.target.value === 'attendance', name: e.target.value === 'attendance' ? 'Attendance' : '' }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-sidebar focus:outline-none focus:ring-2 focus:ring-[#0c1925]">
                    <option value="regular">Grading component</option>
                    <option value="attendance" disabled={hasAttendance}>Attendance{hasAttendance ? ' (already added)' : ''}</option>
                  </select>
                </label>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                <label className="block text-xs font-bold text-gray-700">Component name
                  <input value={componentDraft.is_attendance ? 'Attendance' : componentDraft.name} onChange={(e) => setComponentDraft((draft) => ({ ...draft, name: e.target.value }))} placeholder="e.g. Class Standing" disabled={componentDraft.is_attendance} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-sidebar focus:outline-none focus:ring-2 focus:ring-[#0c1925] disabled:bg-gray-100" />
                </label>
                <label className="block text-xs font-bold text-gray-700">Weight (%)
                  <input type="text" inputMode="decimal" value={componentDraft.weight} onChange={(e) => { const raw = e.target.value.replace(/[^0-9.]/g, ''); const parts = raw.split('.'); const cleaned = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : raw; setComponentDraft((draft) => ({ ...draft, weight: cleaned })); }} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-sidebar focus:outline-none focus:ring-2 focus:ring-[#0c1925]" />
                </label>
              </div>
              {!componentDraft.is_attendance && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div><h4 className="text-xs font-extrabold text-sidebar">Subcomponents</h4><p className="text-[11px] text-gray-500">Add an activity or include attendance.</p></div>
                    <div className="relative">
                      <button type="button" onClick={() => setShowSubcomponentChoices((visible) => !visible)} aria-expanded={showSubcomponentChoices} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-sidebar text-xs font-bold hover:bg-gray-200"><Plus size={13} /> Add</button>
                      {showSubcomponentChoices && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button type="button" onClick={() => { setComponentDraft((draft) => ({ ...draft, activities: [...draft.activities, { key: `${Date.now()}-${Math.random()}`, name: '', max_score: '100', is_attendance: false }] })); setShowSubcomponentChoices(false); }} className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50">Activity</button>
                          <button type="button" disabled={hasAttendance || componentDraft.activities.some((activity) => activity.is_attendance)} onClick={() => { setComponentDraft((draft) => ({ ...draft, activities: [...draft.activities, { key: `${Date.now()}-${Math.random()}`, name: 'Attendance', max_score: '1', is_attendance: true }] })); setShowSubcomponentChoices(false); }} className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400">Attendance{hasAttendance || componentDraft.activities.some((activity) => activity.is_attendance) ? ' (already used)' : ''}</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {componentDraft.activities.length === 0 ? <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">No subcomponents yet.</p> : componentDraft.activities.map((activity, index) => (
                    <div key={activity.id || activity.key} className="grid grid-cols-[1fr_105px_34px] gap-2 items-end rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                      {activity.id ? (
                        <label className="text-[11px] font-bold text-gray-600">{activity.is_attendance ? 'Attendance' : 'Name'}
                          {activity.is_attendance
                            ? <div className="mt-1 rounded-md border border-gray-200 bg-gray-100 px-2.5 py-2 text-xs font-semibold text-gray-500">Attendance scores are computed automatically</div>
                            : <input value={activity.name} onChange={(e) => setComponentDraft((draft) => ({ ...draft, activities: draft.activities.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} placeholder="e.g. Quiz 1" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-sidebar focus:outline-none focus:ring-1 focus:ring-[#0c1925]" />}
                        </label>
                      ) : (
                        <label className="text-[11px] font-bold text-gray-600">{activity.is_attendance ? 'Attendance' : 'Name'}
                          {activity.is_attendance && <span className="mt-1 block rounded-md border border-gray-200 bg-gray-100 px-2.5 py-2 text-xs font-medium text-gray-500">Uses computed attendance scores</span>}
                          {!activity.is_attendance && <input value={activity.name} onChange={(e) => setComponentDraft((draft) => ({ ...draft, activities: draft.activities.map((item, i) => i === index ? { ...item, name: e.target.value } : item) }))} placeholder="e.g. Quiz 1" className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-sidebar focus:outline-none focus:ring-1 focus:ring-[#0c1925]" />}
                        </label>
                      )}
                      {!activity.is_attendance && (
                        <label className="text-[11px] font-bold text-gray-600">Max score
                          <input type="number" min="0.01" max="1000" step="any" value={activity.max_score} onChange={(e) => setComponentDraft((draft) => ({ ...draft, activities: draft.activities.map((item, i) => i === index ? { ...item, max_score: e.target.value } : item) }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-sidebar focus:outline-none focus:ring-1 focus:ring-[#0c1925]" />
                        </label>
                      )}
                      <button type="button" onClick={() => setComponentDraft((draft) => ({ ...draft, activities: draft.activities.filter((_, i) => i !== index) }))} title="Remove subcomponent" aria-label="Remove subcomponent" className="mb-0.5 p-2 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </section>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button type="button" onClick={() => setComponentModal(null)} disabled={savingComponent} className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={savingComponent} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0c1925] text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-50">
                {savingComponent && <Loader size={13} className="animate-spin" />}{savingComponent ? 'Saving...' : componentModal.mode === 'add' ? 'Add Component' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-900 mb-3">Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-1">Type <strong>Confirm</strong> to delete</label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Confirm"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteModal(null); setConfirmText(''); }} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={confirmText !== 'Confirm' || deleting} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md transition-colors ${confirmText === 'Confirm' && !deleting ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'} flex items-center gap-2`}>
                {deleting && <Loader size={14} className="animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRecord;


