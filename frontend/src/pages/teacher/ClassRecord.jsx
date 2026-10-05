import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Download, ArrowLeft, FileSpreadsheet, Percent, HelpCircle, Plus, Trash2, Loader, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import { useTeacher } from '../../contexts/TeacherContext';
import AssignmentSelector from '../../components/common/FloatingAssignmentSelector';
import { SkeletonHeaderCard, SkeletonList, SkeletonTable } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import api from '../../utils/api';

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];

const COMPONENT_COLORS = [
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
  { bg: '#0f172a', border: '#0f172a', light: '#eef2f6', headerBg: '#0f172a', headerBorder: '#0f172a' },
];

const ClassRecord = () => {
  const navigate = useNavigate();
  const saveTimerRef = useRef(null);

  const { selectedAssignment, currentAssignment, isReadOnly, loading: ctxLoading, refreshAssignments } = useTeacher();

  const [students, setStudents] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('PRELIMS');

  const [components, setComponents] = useState([]);
  const [scores, setScores] = useState({});
  const [attendanceScores, setAttendanceScores] = useState({ max_total: 0, scores: {} });
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [addingComp, setAddingComp] = useState(null);
  const [addingActivityId, setAddingActivityId] = useState(null);
  const [copyingPrelims, setCopyingPrelims] = useState(false);
  const [error, setError] = useState('');
  const [clampWarnings, setClampWarnings] = useState({});
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dragCompId, setDragCompId] = useState(null);
  const [dropCompId, setDropCompId] = useState(null);
  const [reordering, setReordering] = useState(false);
  const inputRefs = useRef({});
  const focusCompIdRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addCompOpen && !e.target.closest('.add-comp-popup')) setAddCompOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addCompOpen]);

  // Fetch students when assignment changes
  useEffect(() => {
    if (!currentAssignment) return;
    const fetchStudents = async () => {
      try {
        const res = await api(`http://localhost:5000/api/sections/${currentAssignment.section_id}/students`);
        if (res.ok) setStudents(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchStudents();
  }, [currentAssignment]);

  // Fetch components + scores when assignment or term changes
  const fetchGradeData = useCallback(async () => {
    if (!selectedAssignment) return;
    setDataLoading(true);
    try {
      const compRes = await api(`http://localhost:5000/api/grading-components?assignment_id=${selectedAssignment}&term=${selectedTerm}`);
      let comps = [];
      if (compRes.ok) {
        comps = await compRes.json();
        setComponents(comps);
      }

      const scoresRes = await api(`http://localhost:5000/api/component-scores?assignment_id=${selectedAssignment}&term=${selectedTerm}`);
      if (scoresRes.ok) {
        const scoreList = await scoresRes.json();
        const scoreMap = {};
        scoreList.forEach(s => {
          if (!scoreMap[s.activity_id]) scoreMap[s.activity_id] = {};
          scoreMap[s.activity_id][s.student_id] = s.score;
        });
        setScores(scoreMap);
      }

      const attRes = await api(`http://localhost:5000/api/attendance/computed-scores?teacher_assignment_id=${selectedAssignment}&term=${selectedTerm}`);
      if (attRes.ok) {
        setAttendanceScores(await attRes.json());
      } else {
        setAttendanceScores({ max_total: 0, scores: {} });
      }
    } catch (err) { console.error(err); }
    finally { setDataLoading(false); }
  }, [selectedAssignment, selectedTerm]);

  useEffect(() => { fetchGradeData(); setError(''); }, [fetchGradeData]);

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
        await api('http://localhost:5000/api/component-scores/bulk', {
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

  // Add component
  const addComponent = async (isAttendance) => {
    if (!selectedAssignment || totalWeight === 100) return;
    if (isAttendance && hasAttendance) return;
    if (addingComp) return;
    const kind = isAttendance ? 'attendance' : 'regular';
    setAddingComp(kind);
    try {
      const res = await api('http://localhost:5000/api/grading-components', {
        method: 'POST',
        body: JSON.stringify({
          teacher_assignment_id: selectedAssignment,
          term: selectedTerm,
          name: isAttendance ? 'Attendance' : 'Assessment',
          weight: 0,
          is_attendance: isAttendance || false
        })
      });
      if (res.ok) {
        const comp = await res.json();
        comp.activities = [];
        if (!isAttendance) comp.name = '';
        setComponents(prev => [...prev, comp]);
        setError('');
        setAddCompOpen(false);
        if (!isAttendance) focusCompIdRef.current = comp.id;
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Failed to add component. Please try again.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setAddingComp(null);
    }
  };

  const copyFromPrelims = async () => {
    if (!selectedAssignment) return;
    setCopyingPrelims(true);
    try {
      const res = await api('http://localhost:5000/api/grading-components/copy-from-prelims', {
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

  // Update component
  // Merge ONLY the fields that were sent — never the full server echo — so one
  // field's save can never overwrite another field's unsaved local edits.
  const updateComponent = async (id, updates) => {
    try {
      const res = await api(`http://localhost:5000/api/grading-components/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Failed to save component. Please try again.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Changes may not have been saved.');
      setTimeout(() => setError(''), 4000);
    }
  };

  // Delete component
  const deleteComponent = async (id) => {
    try {
      const res = await api(`http://localhost:5000/api/grading-components/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComponents(prev => prev.filter(c => c.id !== id));
        setScores(prev => {
          const comp = components.find(c => c.id === id);
          if (comp) {
            const next = { ...prev };
            comp.activities.forEach(a => delete next[a.id]);
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

  // Next sub-component name from the parent component name: first letter of every
  // word + running number (Performance Task->PTn, Written Works->WWn, Final
  // Exam->FEn). Continues from the highest existing number; null = keep legacy behavior.
  const nextActivityName = (comp) => {
    const words = String(comp?.name || '').split(/\s+/).filter(Boolean);
    let prefix = '';
    words.forEach(w => {
      const m = w.match(/[A-Za-z]/);
      if (m) prefix += m[0].toUpperCase();
    });
    if (!prefix) return null;
    let max = 0;
    (comp.activities || []).forEach(a => {
      const m = String(a?.name || '').trim().match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `${prefix}${max + 1}`;
  };

  // Add activity
  const addActivity = async (componentId) => {
    if (addingActivityId) return;
    setAddingActivityId(componentId);
    const parent = components.find(c => c.id === componentId);
    const autoName = nextActivityName(parent);
    try {
      const res = await api('http://localhost:5000/api/component-activities', {
        method: 'POST',
        body: JSON.stringify({ component_id: componentId, name: autoName || 'Activity', max_score: 100 })
      });
      if (res.ok) {
        const act = await res.json();
        // Keep the auto-generated name visible (still editable); otherwise use
        // empty to force placeholder behavior in UI (legacy behavior).
        const cleanAct = autoName ? { ...act, name: autoName, max_score: 0 } : { ...act, name: '', max_score: 0 };
        setComponents(prev => prev.map(c =>
          c.id === componentId ? { ...c, activities: [...(c.activities || []), cleanAct] } : c
        ));
        setError('');
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Failed to add activity. Please try again.');
        setTimeout(() => setError(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setAddingActivityId(null);
    }
  };

  // Update activity
  const updateActivity = async (id, updates) => {
    try {
      const res = await api(`http://localhost:5000/api/component-activities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (err) { console.error(err); }
  };

  // Delete activity
  const deleteActivity = async (componentId, activityId) => {
    try {
      const res = await api(`http://localhost:5000/api/component-activities/${activityId}`, { method: 'DELETE' });
      if (res.ok) {
        setComponents(prev => prev.map(c =>
          c.id === componentId ? { ...c, activities: c.activities.filter(a => a.id !== activityId) } : c
        ));
        setScores(prev => {
          const next = { ...prev };
          delete next[activityId];
          return next;
        });
        return true;
      }
      const data = await res.json().catch(() => null);
      setError(data?.message || 'Failed to delete activity. Please try again.');
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
    if (!deleteModal || deleting) return;
    setDeleting(true);
    try {
      const ok = deleteModal.type === 'component'
        ? await deleteComponent(deleteModal.id)
        : await deleteActivity(deleteModal.componentId, deleteModal.id);
      if (ok) setDeleteModal(null);
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
      const res = await api('http://localhost:5000/api/grading-components/reorder', {
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
      const val = parseFloat(scores[a.id]?.[studentId]);
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
    activities.forEach(a => sum += parseFloat(a.max_score || 0));
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
  const hasAttendance = components.some(c => c.is_attendance);

  // Table-ready = has a Title/Name AND a Percentage (weight > 0). Attendance is
  // auto-created with a fixed name, so it is exempt from the name rule and
  // appears in the table automatically once its percentage is set.
  const isTableReady = (c) => c?.is_attendance
    ? parseFloat(c?.weight) > 0
    : (String(c?.name || '').trim() !== '' && parseFloat(c?.weight) > 0);
  const tableComponents = useMemo(() => components.filter(isTableReady), [components]);

  const visibleActivityIds = useMemo(() => {
    const ids = [];
    components.forEach(comp => {
      if (!comp.is_attendance && comp.activities) {
        comp.activities.forEach(act => ids.push(act.id));
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

  // Color for each component
  const getColor = (idx) => COMPONENT_COLORS[idx % COMPONENT_COLORS.length];

  const handleExportExcel = () => {
    if (!currentAssignment || components.length === 0) return;

    const visibleComponents = components.filter(c => c.is_attendance || c.activities?.length > 0);

    // Build sub-header row
    const subHeader = ['Stud No.', 'Student Name'];
    visibleComponents.forEach(c => {
      if (c.is_attendance) {
        subHeader.push('TOTAL', 'EQUIV', 'W_TOTAL');
      } else {
        (c.activities || []).forEach(a => subHeader.push(a.name));
        subHeader.push('TOTAL', 'EQUIV', 'W_TOTAL');
      }
    });
    subHeader.push(`${selectedTerm} GRADE`);

    // Build MAX SCORE row
    const maxRow = ['MAX SCORE', ''];
    visibleComponents.forEach(c => {
      const maxTotal = getComponentMaxTotal(c);
      if (c.is_attendance) {
        maxRow.push(maxTotal, '100.00', ((100 * c.weight) / 100).toFixed(2));
      } else {
        (c.activities || []).forEach(a => maxRow.push(a.max_score || 0));
        maxRow.push(maxTotal, '100.00', ((100 * c.weight) / 100).toFixed(2));
      }
    });
    maxRow.push('100.00');

    // Build data rows
    const dataRows = students.map((student) => {
      const row = [student.student_id, student.student_name];
      visibleComponents.forEach(c => {
        if (c.is_attendance) {
          const total = getComponentTotal(student.id, c);
          const equiv = getComponentEquiv(student.id, c);
          const weighted = getComponentWeighted(student.id, c);
          row.push(total, equiv.toFixed(2), weighted.toFixed(2));
        } else {
          (c.activities || []).forEach(a => {
            row.push(scores[a.id]?.[student.id] ?? 0);
          });
          const total = getComponentTotal(student.id, c);
          const equiv = getComponentEquiv(student.id, c);
          const weighted = getComponentWeighted(student.id, c);
          row.push(total, equiv.toFixed(2), weighted.toFixed(2));
        }
      });
      row.push(getFinalGrade(student.id).toFixed(2));
      return row;
    });

    // Title row
    const titleRow = Array(subHeader.length).fill('');
    titleRow[0] = `${currentAssignment.subjects?.code || ''} ${currentAssignment.subjects?.name}`.trim();
    titleRow[1] = `Section: ${currentAssignment.sections?.name}`;
    titleRow[2] = `Term: ${selectedTerm}`;

    // Main header row (component names)
    const mainHeader = Array(subHeader.length).fill('');
    mainHeader[0] = 'STUDENT INFORMATION';
    let colIdx = 2;
    visibleComponents.forEach((c, i) => {
      const color = getColor(i);
      if (c.is_attendance) {
        mainHeader[colIdx] = `${c.name} (${c.weight}%)`;
      } else {
        const actCount = (c.activities || []).length;
        mainHeader[colIdx] = `${c.name} (${c.weight}%)`;
      }
      // advance colIdx past the component's columns
      if (c.is_attendance) {
        colIdx += 3;
      } else {
        colIdx += (c.activities || []).length + 3;
      }
    });
    const finalCol = subHeader.length - 1;
    mainHeader[finalCol] = `${selectedTerm} GRADE`;

    const allRows = [titleRow, mainHeader, subHeader, maxRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    const rowCount = allRows.length;

    // Column widths
    const colWidths = [
      { wch: 14 },  // Stud No.
      { wch: 28 },  // Student Name
    ];
    visibleComponents.forEach(c => {
      if (c.is_attendance) {
        colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 });
      } else {
        (c.activities || []).forEach(() => colWidths.push({ wch: 8 }));
        colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 });
      }
    });
    colWidths.push({ wch: 12 });
    worksheet['!cols'] = colWidths;

    // Colors
    const WHITE = 'FFFFFF';
    const GRAY_50 = 'F9FAFB';
    const BORDER = 'E5E7EB';
    const SIDEBAR = '1B1B2F';
    const FINAL_GREEN = 'EAB308';
    const GREEN_700 = '15803D';
    const RED_600 = 'DC2626';

    const thinBorder = { top: { style: 'thin', color: { rgb: BORDER } }, bottom: { style: 'thin', color: { rgb: BORDER } }, left: { style: 'thin', color: { rgb: BORDER } }, right: { style: 'thin', color: { rgb: BORDER } } };
    const thickerRight = { ...thinBorder, right: { style: 'medium', color: { rgb: BORDER } } };

    const applyStyle = (cell, style) => { if (cell) cell.s = style; };

    // Row 0: title
    const titleStyle = { fill: { fgColor: { rgb: SIDEBAR } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' } };
    for (let c = 0; c < subHeader.length; c++) applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c })], titleStyle);

    // Row 1: main header
    const mainHdrStyle = (bg) => ({ fill: { fgColor: { rgb: bg } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });

    // Student info part of main header
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 0 })], mainHdrStyle(SIDEBAR));
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 1 })], mainHdrStyle(SIDEBAR));
    colIdx = 2;
    visibleComponents.forEach((c, i) => {
      const color = getColor(i);
      const bg = color.headerBg.replace('#', '').toUpperCase();
      const span = c.is_attendance ? 3 : (c.activities || []).length + 3;
      for (let j = 0; j < span; j++) {
        applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: colIdx + j })], mainHdrStyle(bg));
      }
      colIdx += span;
    });
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: finalCol })], mainHdrStyle(FINAL_GREEN));

    // Row 2: sub-header
    const subHdrStyle = { fill: { fgColor: { rgb: GRAY_50 } }, font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const subHdrLeftStyle = { ...subHdrStyle, alignment: { horizontal: 'left', vertical: 'center' } };
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c: 0 })], subHdrStyle);
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c: 1 })], subHdrLeftStyle);

    // Determine which columns have thicker right border (last sub-col of each component group + final) and apply component light colors
    const thickerCols = new Set();
    let ci = 2;
    visibleComponents.forEach((c, i) => {
      const color = getColor(i);
      const light = color.light.replace('#', '').toUpperCase();
      const activityStyle = { ...subHdrStyle, fill: { fgColor: { rgb: light } } };
      const span = c.is_attendance ? 3 : (c.activities || []).length + 3;
      for (let j = 0; j < span; j++) {
        applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c: ci + j })], activityStyle);
      }
      ci += span - 1; // last column of this component group
      thickerCols.add(ci);
      ci++; // move past
    });
    thickerCols.add(finalCol); // final grade column

    for (let c = 2; c < subHeader.length; c++) {
      const isThicker = thickerCols.has(c);
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c })], isThicker ? { ...subHdrStyle, border: thickerRight } : subHdrStyle);
    }

    // Row 3: MAX SCORE
    const maxStyle = { fill: { fgColor: { rgb: GRAY_50 } }, font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const maxLeftStyle = { ...maxStyle, alignment: { horizontal: 'left', vertical: 'center' } };
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 3, c: 0 })], maxStyle);
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 3, c: 1 })], maxLeftStyle);
    for (let c = 2; c < subHeader.length; c++) {
      const isThicker = thickerCols.has(c);
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 3, c })], isThicker ? { ...maxStyle, border: thickerRight } : maxStyle);
    }

    // Data rows (r >= 4)
    const dataCenterStyle = { fill: { fgColor: { rgb: WHITE } }, font: { bold: false, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const dataLeftStyle = { ...dataCenterStyle, alignment: { horizontal: 'left', vertical: 'center' }, font: { ...dataCenterStyle.font, bold: false } };
    const dataBoldStyle = { ...dataCenterStyle, font: { ...dataCenterStyle.font, bold: true } };
    const dataFailStyle = { ...dataCenterStyle, font: { bold: true, color: { rgb: RED_600 }, sz: 10 } };
    const dataGreenStyle = { ...dataCenterStyle, font: { bold: true, color: { rgb: GREEN_700 }, sz: 10 } };

    for (let r = 4; r < rowCount; r++) {
      // Student info columns
      const cell0 = worksheet[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell0) cell0.s = { ...dataCenterStyle, font: { color: { rgb: '9CA3AF' }, sz: 9 } };
      const cell1 = worksheet[XLSX.utils.encode_cell({ r, c: 1 })];
      if (cell1) cell1.s = dataLeftStyle;

      for (let c = 2; c < subHeader.length; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;
        const isThicker = thickerCols.has(c);

        // W_TOTAL columns and final grade - bold
        const isWTotal = (() => {
          let idx = 2;
          for (const comp of visibleComponents) {
            if (comp.is_attendance) {
              idx += 2; // TOTAL, EQUIV
              if (c === idx) return true; // W_TOTAL
              idx += 1;
            } else {
              idx += (comp.activities || []).length; // activities
              idx += 2; // TOTAL, EQUIV
              if (c === idx) return true; // W_TOTAL
              idx += 1;
            }
          }
          return c === finalCol;
        })();

        if (isWTotal) {
          const val = parseFloat(cell.v);
          const isFail = !isNaN(val) && val < 75;
          cell.s = { ...(isFail ? dataFailStyle : dataGreenStyle), border: isThicker ? thickerRight : thinBorder };
        } else {
          cell.s = { ...dataCenterStyle, border: isThicker ? thickerRight : thinBorder };
        }
      }

      // Alternate row background
      if (r % 2 === 0) {
        for (let c = 0; c < subHeader.length; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
          if (cell?.s) cell.s = { ...cell.s, fill: { fgColor: { rgb: GRAY_50 } } };
        }
      }
    }

    // Merges for main header
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: subHeader.length - 1 } }, // title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // STUDENT INFORMATION
    ];
    colIdx = 2;
    visibleComponents.forEach(c => {
      const span = c.is_attendance ? 3 : (c.activities || []).length + 3;
      merges.push({ s: { r: 1, c: colIdx }, e: { r: 1, c: colIdx + span - 1 } });
      colIdx += span;
    });
    // Final grade merge already single column, no merge needed
    worksheet['!merges'] = merges;

    worksheet['!rows'] = Array.from({ length: rowCount }, () => ({ hpt: 22 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Record');
    XLSX.writeFile(workbook, `${currentAssignment.subjects?.name?.replace(/\s+/g, '_')}_${selectedTerm}.xlsx`);
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
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <FileSpreadsheet size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssignmentSelector />
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors cursor-pointer" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[12px] font-bold text-text-muted uppercase tracking-wider mb-1 font-sans">
              SmartGrade — Class Record
            </div>
            <span className="text-sm font-bold text-gray-900">{currentAssignment.subjects?.name} — {currentAssignment.sections?.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center bg-bg-light border border-border rounded-lg p-1">
            {TERMS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTerm(t)}
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

          <button onClick={handleExportExcel} className="px-4 py-2 bg-[#0c1925] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gray-300"><Percent size={16} className="text-[#0c1925]" /></div>
              <h4 className="text-xs font-bold text-sidebar uppercase tracking-wider">Grading Components</h4>
            </div>
            <div className="group relative">
              <HelpCircle size={14} className="text-gray-700 hover:text-[#0c1925] cursor-pointer transition-colors" />
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-52 bg-sidebar text-white text-[10px] p-2.5 rounded-lg shadow-xl z-20 leading-relaxed">
                Define your grading components and their percentage weights. Add sub-activities under each component. Total weight must equal 100%.
              </div>
            </div>
          </div>

          {dataLoading && components.length === 0 ? (
            <div className="space-y-2 py-4" role="status" aria-label="Loading grading components">
              <SkeletonList rows={3} />
            </div>
          ) : components.length === 0 ? (
            <div className="text-center py-8 text-sidebar/40">
              <Percent size={36} className="mx-auto mb-3 opacity-20 text-sidebar" />
              <p className="text-sm font-bold text-sidebar/60">No grading components yet</p>
              <p className="text-xs mt-1 mb-4 text-sidebar/40">Click below to set up your grading system.</p>
              {selectedTerm !== 'PRELIMS' && (
                <div className="mb-4">
                  <button onClick={copyFromPrelims} disabled={copyingPrelims || isReadOnly}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
                    {copyingPrelims ? <Loader size={14} className="animate-spin" /> : null}
                    {copyingPrelims ? 'Copying...' : 'Copy from PRELIMS'}
                  </button>
                  <p className="text-[10px] text-sidebar/40 mt-2">Copy all PRELIMS grading components and activities to {selectedTerm}.</p>
                </div>
              )}
              <div className="relative inline-block">
                <button onClick={() => setAddCompOpen(true)} disabled={isReadOnly || totalWeight === 100} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0c1925] border border-[#0c1925] rounded-lg shadow-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={14} /> Add Component
                </button>
                {addCompOpen && !isReadOnly && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden add-comp-popup">
                    <button onClick={() => addComponent(false)} disabled={!!addingComp} className="w-full text-left px-4 py-3 text-xs font-bold text-sidebar hover:bg-gray-50 border-b border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {addingComp === 'regular' ? 'Adding Component...' : 'Regular Component'}
                    </button>
                    <button
                      onClick={() => addComponent(true)}
                      disabled={hasAttendance || !!addingComp}
                      className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${hasAttendance ? 'text-gray-300 cursor-not-allowed' : 'text-sidebar hover:bg-gray-50'}`}
                    >
                      {addingComp === 'attendance' ? 'Adding...' : (<><span className={hasAttendance ? 'text-gray-300' : 'text-amber-600'}>Attendance</span>{hasAttendance && <span className="ml-1 text-[10px] text-gray-300">(already added)</span>}</>)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {components.map((comp, idx) => {
                  const color = getColor(idx);
                  const needsSetup = !isTableReady(comp);
                  const missing = [
                    (comp?.is_attendance || String(comp?.name || '').trim() !== '') ? null : 'a name',
                    parseFloat(comp?.weight) > 0 ? null : 'a percentage',
                  ].filter(Boolean);
                  return (
                    <div key={comp.id} className={`group w-full rounded-xl border shadow-sm overflow-visible hover:shadow-md transition-shadow bg-gray-200 relative ${needsSetup && !isReadOnly ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-200'}`}>
                      {needsSetup && !isReadOnly && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full w-56 p-2.5 bg-sidebar text-white text-[10px] rounded-lg shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-30 leading-relaxed font-normal normal-case">
                          This component needs {missing.join(' and ')} before it appears in the class-record table.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-sidebar"></div>
                        </div>
                      )}
                      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-900 rounded-t-[10px]" style={{ backgroundColor: '#d1d5db' }}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {comp.is_attendance ? (
                            <span className="text-sm font-extrabold text-sidebar px-1 py-0.5">Attendance</span>
                          ) : (
                            <input
                              type="text"
                              value={comp.name}
                              onChange={(e) => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, name: e.target.value } : c))}
                              onBlur={() => updateComponent(comp.id, { name: comp.name })}
                              ref={(el) => { if (el && focusCompIdRef.current === comp.id) { focusCompIdRef.current = null; el.focus(); el.select(); } }}
                              className="text-sm font-extrabold text-sidebar bg-transparent border-b border-transparent hover:border-sidebar/20 focus:border-gold focus:outline-none px-1 py-0.5 flex-1 min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="Assessment"
                              disabled={isReadOnly}
                            />
                          )}
                          {needsSetup && !isReadOnly && (
                            <span title={`This component needs ${missing.join(' and ')}`} className="shrink-0 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center cursor-help">
                              !
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="flex items-center bg-white rounded-lg border border-gray-200 px-2 py-1">
                              <input
                                type="number"
                                value={comp.weight === 0 ? '' : comp.weight}
                                onChange={(e) => setComponents(prev => {
                                  const raw = parseFloat(e.target.value) || 0;
                                  const others = prev.reduce((s, c) => c.id === comp.id ? s : s + parseFloat(c.weight || 0), 0);
                                  const clamped = Math.min(raw, Math.max(0, 100 - others));
                                  if (raw !== clamped) {
                                    setClampWarnings(cw => ({ ...cw, [`weight-${comp.id}`]: 100 - others }));
                                    setTimeout(() => {
                                      setClampWarnings(cw => { const c = { ...cw }; delete c[`weight-${comp.id}`]; return c; });
                                    }, 3000);
                                  }
                                  return prev.map(c => c.id === comp.id ? { ...c, weight: clamped } : c);
                                })}
                                onBlur={() => updateComponent(comp.id, { weight: comp.weight })}
                                className={`w-12 text-center text-xs font-extrabold text-sidebar bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${clampWarnings[`weight-${comp.id}`] ? 'text-amber-600' : ''}`}
                                min="0" max="100"
                                placeholder="0"
                                disabled={isReadOnly}
                              />
                            <span className="text-[10px] font-bold" style={{ color: color.bg }}>%</span>
                          </div>
                          {!isReadOnly && (
                            <button onClick={() => setDeleteModal({ type: 'component', id: comp.id })} className="text-gray-900 hover:text-red-500 transition-colors p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <div className={(comp.activities || []).length > 3 ? 'max-h-[122px] overflow-y-auto pr-1 space-y-1.5' : 'space-y-1.5'} style={{ scrollbarWidth: 'thin' }}>
                        {(comp.activities || []).map((act) => (
                          <div key={act.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border border-gray-200 bg-white">
                              <input
                                type="text"
                                value={act.name}
                                onChange={(e) => setComponents(prev => prev.map(c =>
                                  c.id === comp.id ? { ...c, activities: c.activities.map(a => a.id === act.id ? { ...a, name: e.target.value } : a) } : c
                                ))}
                                onBlur={() => updateActivity(act.id, { name: act.name })}
                                className="text-[11px] font-bold text-sidebar bg-white border border-gray-500 focus:border-[#0c1925] focus:outline-none px-1 py-0.5 flex-1 min-w-0"
                                placeholder="Activity"
                                disabled={isReadOnly}
                              />
                            <div className="flex items-center gap-1 bg-white rounded border border-gray-200 px-1.5 py-0.5">
                                <input
                                  type="number"
                                  value={act.max_score === 0 ? '' : act.max_score}
                                  onChange={(e) => setComponents(prev => prev.map(c =>
                                    c.id === comp.id ? { ...c, activities: c.activities.map(a => a.id === act.id ? { ...a, max_score: parseFloat(e.target.value) || 0 } : a) } : c
                                  ))}
                                  onBlur={() => updateActivity(act.id, { max_score: act.max_score })}
                                  className="w-12 text-center text-[10px] font-extrabold text-sidebar bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                  min="0"
                                  placeholder="0"
                                  disabled={isReadOnly}
                                />
                              <span className="text-[9px] font-bold" style={{ color: color.bg }}>max</span>
                            </div>
                            {!isReadOnly && (
                              <button onClick={() => setDeleteModal({ type: 'activity', id: act.id, componentId: comp.id })} className="text-gray-900 hover:text-red-500 transition-colors shrink-0 p-0.5">
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        ))}
                        </div>
                        {!comp.is_attendance && !isReadOnly && (
                            <button
                              onClick={() => addActivity(comp.id)}
                              disabled={addingActivityId === comp.id}
                              className="w-full text-[10px] font-bold text-white flex items-center justify-center gap-1 py-1.5 rounded-lg border border-transparent hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ backgroundColor: '#0c1925' }}
                            >
                              {addingActivityId === comp.id ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
                              {addingActivityId === comp.id ? 'Adding...' : 'Add'}
                            </button>
                        )}
                        {comp.is_attendance && (
                          <div className="text-[10px] text-gray-900 italic text-center py-1.5">
                            Scores auto-computed from attendance records
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!isReadOnly && (
                <div className="relative min-h-[120px]">
                  <button
                    onClick={() => setAddCompOpen(true)}
                    disabled={isReadOnly || totalWeight === 100}
                    className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-xl border border-[#0c1925] border-dashed bg-[#0c1925] transition-all text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold">Add Component</span>
                  </button>
                  {addCompOpen && (
                    <div className="absolute top-0 left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden add-comp-popup">
                      <button onClick={() => addComponent(false)} disabled={!!addingComp} className="w-full text-left px-4 py-3 text-xs font-bold text-sidebar hover:bg-gray-50 border-b border-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {addingComp === 'regular' ? 'Adding Component...' : 'Regular Component'}
                      </button>
                      <button
                        onClick={() => addComponent(true)}
                        disabled={hasAttendance || !!addingComp}
                        className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${hasAttendance ? 'text-gray-300 cursor-not-allowed' : 'text-sidebar hover:bg-gray-50'}`}
                      >
                        {addingComp === 'attendance' ? 'Adding...' : (<><span className={hasAttendance ? 'text-gray-300' : 'text-amber-600'}>Attendance</span>{hasAttendance && <span className="ml-1 text-[10px] text-gray-300">(already added)</span>}</>)}
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-sidebar/10">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold ${
                  totalWeight === 100 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <span>Total Weight:</span>
                  <span className="text-sm">{totalWeight}%</span>
                  {totalWeight === 100 ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <span>{error}</span>
        </div>
      )}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-9.364a9 9 0 11-12.728 0 9 9 0 0112.728 0z" /></svg>
          <span>This term is closed. Viewing only.</span>
        </div>
      )}

      {currentAssignment && (
        <div className="mb-2 px-1 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">{currentAssignment.subjects?.name} — {currentAssignment.sections?.name}</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-72 pl-9 pr-3 py-1.5 text-xs border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] focus:border-[#0c1925] bg-white"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {components.length > 0 && totalWeight === 100 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 border-b border-green-200 text-green-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <span>Component weights total 100%. Grade computation is balanced — you can now enter scores.</span>
          </div>
        )}
        {components.length > 0 && totalWeight !== 100 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Component weights must total 100% before you can enter scores. Current: {totalWeight}%</span>
          </div>
        )}
        {dataLoading && components.length === 0 ? (
          <div aria-busy="true"><SkeletonTable cols={6} rows={8} /></div>
        ) : components.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">Set up grading components to view the class record table.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4" style={{ scrollbarWidth: 'auto' }}>
            <table className="min-w-max w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-[#0c1925] border-b-2 border-r-2 border-border p-3 text-white text-left font-bold min-w-[352px] sticky left-0 z-20" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-white">{searchQuery ? `${students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length}/${students.length}` : students.length} students</span>
                    </div>
                  </th>
                  {tableComponents.map((comp, idx) => {
                    const color = getColor(idx);
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
                        className={`bg-[#0c1925] border-b-2 border-r-2 p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0 ${!isReadOnly ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'outline outline-2 outline-amber-400 outline-offset-[-2px]' : ''}`}
                        style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          {!isReadOnly && <GripVertical size={14} className="opacity-50 shrink-0" />}
                          <span>{comp.is_attendance ? 'Attendance' : comp.name} ({comp.weight}%)</span>
                        </span>
                      </th>
                    );
                  })}
                  <th className="bg-gold border-b-2 border-gold-hover p-3 text-[#0c1925] text-center font-bold text-base uppercase tracking-wider min-w-[120px] relative z-0">
                    {selectedTerm === 'PRELIMS' ? 'PRE' : selectedTerm === 'MIDTERMS' ? 'MID' : selectedTerm === 'PRE-FINALS' ? 'P-F' : 'FIN'} GRADE
                  </th>
                </tr>

                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20 w-12" style={{ left: 0 }}>#</th>
                  <th className="px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20 w-28" style={{ left: '48px' }}>Stud ID</th>
                  <th className="px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20 min-w-[180px]" style={{ left: '160px' }}>Student Name</th>
                  {tableComponents.map((comp, idx) => {
                    const color = getColor(idx);
                    if (comp.is_attendance) {
                      return [
                        <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-150 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                        <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-150 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                        <th key={`${comp.id}-wt`} className="px-3 py-2.5 border-r-4 border-gray-300 bg-gray-150 text-sidebar font-extrabold w-20 relative z-0" style={{ borderRightColor: color.border }}>W_TOTAL</th>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <th key={act.id} className="px-2 py-2.5 border-r border-gray-200 bg-gray-100/50 w-12 relative z-0" style={{ backgroundColor: color.light }}>{act.name}</th>
                    )).concat(
                      <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-150 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                      <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-150 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                      <th key={`${comp.id}-wt`} className="px-3 py-2.5 border-r-4 border-gray-300 bg-gray-150 text-sidebar font-extrabold w-20 relative z-0" style={{ borderRightColor: color.border }}>W_TOTAL</th>
                    );
                  })}
                  <th className="px-3 py-2.5 bg-gray-150 text-sidebar font-extrabold text-sm w-28 relative z-0">FINAL</th>
                </tr>

                <tr className="bg-white border-b border-border text-center font-bold text-sidebar select-none">
                  <td className="px-1 py-2 text-center sticky bg-white border-r border-border z-20 w-12" style={{ left: 0 }}></td>
                  <td className="px-3 py-2 text-left sticky bg-white border-r border-border z-20 text-[10px] text-gray-900 w-28" style={{ left: '48px' }}>MAX SCORE</td>
                  <td className="px-4 py-2 text-left sticky bg-white border-r-2 border-border z-20 text-[10px] text-gray-900 font-normal italic min-w-[180px]" style={{ left: '160px' }}>Maximum target scores</td>
                  {tableComponents.map((comp, idx) => {
                    const color = getColor(idx);
                    const maxTotal = getComponentMaxTotal(comp);
                    if (comp.is_attendance) {
                      return [
                        <td key={`${comp.id}-total`} className="px-2 py-2 border-r border-b border-gray-200 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{maxTotal}</td>,
                        <td key={`${comp.id}-equiv`} className="px-2 py-2 border-r-2 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">100.00</td>,
                        <td key={`${comp.id}-wt`} className="px-2 py-2 border-r-4 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0" style={{ borderRightColor: color.border }}>{comp.weight.toFixed(2)}</td>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <td key={act.id} className="p-1 border-r border-b border-gray-200 bg-gray-50/20 relative z-0">
                        <input type="number" step="any" value={act.max_score || 0}
                          disabled={totalWeight !== 100 || isReadOnly}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setComponents(prev => prev.map(c =>
                              c.id === comp.id ? {
                                ...c,
                                activities: c.activities.map(a => a.id === act.id ? { ...a, max_score: val } : a)
                              } : c
                            ));
                          }}
                          onBlur={() => updateActivity(act.id, { max_score: act.max_score })}
                          className="w-full text-center text-xs font-black text-sidebar p-1 border border-transparent rounded hover:border-gray-300 focus:border-gold focus:outline-none bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed" />
                      </td>
                    )).concat(
                      <td key={`${comp.id}-total`} className="px-2 py-2 border-r border-b border-gray-200 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{maxTotal}</td>,
                      <td key={`${comp.id}-equiv`} className="px-2 py-2 border-r-2 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">100.00</td>,
                      <td key={`${comp.id}-wt`} className="px-2 py-2 border-r-4 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0" style={{ borderRightColor: color.border }}>{comp.weight.toFixed(2)}</td>
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
                    const paginatedStudents = filtered.slice((page - 1) * 10, page * 10);
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
                        <td className={`px-1 py-1 text-center sticky border-r border-b border-gray-200 z-30 w-12 text-gray-900 text-[10px] cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: 0 }} onClick={() => setSelectedRow(student.id)}>{(page - 1) * 10 + index + 1}</td>
                        <td className={`px-2 py-1 sticky border-r border-b border-gray-200 z-20 w-28 text-xs font-mono font-semibold text-gray-900 cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '48px' }} onClick={() => setSelectedRow(student.id)}>{student.student_id}</td>
                        <td className={`px-2 py-1 sticky border-r-2 border-b border-border z-20 min-w-[180px] text-xs font-medium text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '160px' }} onClick={() => setSelectedRow(student.id)}>{student.student_name}</td>
                        {tableComponents.map((comp, idx) => {
                          const componentTotal = getComponentTotal(student.id, comp);
                          const componentEquiv = getComponentEquiv(student.id, comp);
                          const componentWeighted = getComponentWeighted(student.id, comp);
                          const isFail = componentEquiv < 75;

                          const isSelected = selectedRow === student.id;
                          if (comp.is_attendance) {
                            return [
                              <td key={`${comp.id}-total-${student.id}`} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`}>{componentTotal}</td>,
                              <td key={`${comp.id}-equiv-${student.id}`} className={`px-2 py-2 border-r-2 border-b border-gray-300 text-center font-bold text-xs ${isSelected ? 'bg-green-200' : 'bg-white'} ${isFail ? 'text-red-600 font-extrabold' : 'text-sidebar'}`}>{componentEquiv.toFixed(2)}</td>,
                              <td key={`${comp.id}-wt-${student.id}`} className={`px-2 py-2 border-r-4 border-b border-gray-200 text-center font-bold text-sidebar text-xs ${isSelected ? 'bg-green-200' : 'bg-white'}`}>{componentWeighted.toFixed(2)}</td>
                            ];
                          }
                          return (comp.activities || []).map((act) => {
                            const val = scores[act.id]?.[student.id] ?? '';
                            const maxVal = act.max_score || 100;
                            const inputVal = val !== null && val !== undefined ? val : '';
                            return (
                              <td key={act.id} className={`p-0.5 border-r border-b border-gray-200 ${isSelected ? 'bg-green-200' : 'bg-[#f3f4f6]'}`}>
                                <div className="relative">
                                  <input type="number" step="any" placeholder="0" value={inputVal === '' ? '' : inputVal}
                                    ref={el => { if (el) inputRefs.current[`${student.id}:${act.id}`] = el; }}
                                    disabled={totalWeight !== 100 || isReadOnly}
                                    onChange={(e) => handleScoreChange(act.id, student.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, student.id, act.id, index, paginatedStudents, visibleActivityIds)}
                                    className={`w-full text-center text-xs font-medium text-sidebar p-1 border rounded focus:outline-none focus:ring-1 focus:ring-gold bg-transparent hover:bg-gray-100 focus:bg-white transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed ${clampWarnings[`${act.id}-${student.id}`] ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
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
                            <td key={`${comp.id}-wt-${student.id}`} className={`px-2 py-2 border-r-4 border-b border-gray-200 text-center font-bold text-sidebar text-xs ${isSelected ? 'bg-green-200' : 'bg-white'}`}>{componentWeighted.toFixed(2)}</td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center font-extrabold text-sm border-b border-gray-200 bg-white ${isFinalFail ? 'text-red-700' : 'text-green-700'}`}>
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
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((searchQuery ? students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : students.length) / 10)}
            onPageChange={setPage}
            totalItems={searchQuery ? students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : students.length}
            rowsPerPage={10}
          />
        )}
      </div>
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-900 mb-6">Are you sure you want to delete this {deleteModal.type}? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModal(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" style={{ background: '#ef4444' }}>
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



