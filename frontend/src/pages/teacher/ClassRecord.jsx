import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, ArrowLeft, FileSpreadsheet, Percent, HelpCircle, Plus, Trash2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];

const COMPONENT_COLORS = [
  { bg: '#3b82f6', border: '#2563eb', light: '#eff6ff', headerBg: '#3b82f6', headerBorder: '#2563eb' },
  { bg: '#8b5cf6', border: '#7c3aed', light: '#f5f3ff', headerBg: '#8b5cf6', headerBorder: '#7c3aed' },
  { bg: '#06b6d4', border: '#0891b2', light: '#ecfeff', headerBg: '#06b6d4', headerBorder: '#0891b2' },
  { bg: '#f97316', border: '#ea580c', light: '#fff7ed', headerBg: '#f97316', headerBorder: '#ea580c' },
  { bg: '#84cc16', border: '#65a30d', light: '#f7fee7', headerBg: '#84cc16', headerBorder: '#65a30d' },
  { bg: '#ec4899', border: '#db2777', light: '#fdf2f8', headerBg: '#ec4899', headerBorder: '#db2777' },
];

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const ClassRecord = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('PRELIMS');
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [components, setComponents] = useState([]);
  const [scores, setScores] = useState({});
  const [attendanceScores, setAttendanceScores] = useState({ max_total: 0, scores: {} });
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [addCompOpen, setAddCompOpen] = useState(false);
  const [copyingPrelims, setCopyingPrelims] = useState(false);
  const [error, setError] = useState('');

  const currentAssignment = assignments.find((a) => a.id === selectedAssignment);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (addCompOpen && !e.target.closest('.add-comp-popup')) setAddCompOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addCompOpen]);

  // Fetch assignments on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api('http://localhost:5000/api/assignments');
        if (res.ok) {
          const data = await res.json();
          setAssignments(data);
          if (data.length > 0 && !selectedAssignment) {
            setSelectedAssignment(data[0].id);
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

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
  }, [selectedAssignment]);

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
    const handler = async () => { await fetchGradeData(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [fetchGradeData]);

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
    const raw = value === '' ? null : parseFloat(value);
    let numVal = raw;
    if (numVal !== null) {
      for (const comp of components) {
        const act = (comp.activities || []).find(a => a.id === activityId);
        if (act && act.max_score) {
          numVal = Math.min(raw, act.max_score);
          break;
        }
      }
    }
    const updated = { ...scores };
    if (!updated[activityId]) updated[activityId] = {};
    updated[activityId][studentId] = numVal;
    setScores(updated);
    scheduleScoreSave(updated);
  };

  // Add component
  const addComponent = async (isAttendance) => {
    if (!selectedAssignment) return;
    if (isAttendance && hasAttendance) return;
    setAddCompOpen(false);
    try {
      const res = await api('http://localhost:5000/api/grading-components', {
        method: 'POST',
        body: JSON.stringify({
          teacher_assignment_id: selectedAssignment,
          term: selectedTerm,
          name: isAttendance ? 'Attendance' : 'New Component',
          weight: 0,
          is_attendance: isAttendance || false
        })
      });
      if (res.ok) {
        const comp = await res.json();
        comp.activities = [];
        setComponents(prev => [...prev, comp]);
      }
    } catch (err) { console.error(err); }
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
  const updateComponent = async (id, updates) => {
    try {
      const res = await api(`http://localhost:5000/api/grading-components/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
      }
    } catch (err) { console.error(err); }
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
      }
    } catch (err) { console.error(err); }
  };

  // Add activity
  const addActivity = async (componentId) => {
    try {
      const res = await api('http://localhost:5000/api/component-activities', {
        method: 'POST',
        body: JSON.stringify({ component_id: componentId, name: 'New', max_score: 100 })
      });
      if (res.ok) {
        const act = await res.json();
        setComponents(prev => prev.map(c =>
          c.id === componentId ? { ...c, activities: [...(c.activities || []), act] } : c
        ));
      }
    } catch (err) { console.error(err); }
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
      }
    } catch (err) { console.error(err); }
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
    const FINAL_GREEN = '529344';
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

  if (loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-gray-400" /></div>;
  }

  if (assignments.length === 0) {
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
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors cursor-pointer" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 font-sans">
              SmartGrade — Class Record
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="text-left text-lg font-medium text-sidebar bg-transparent border-b-2 border-gold pb-1 pr-6 cursor-pointer font-sans min-w-[260px] whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {currentAssignment ? (
                  <span>{currentAssignment.subjects?.code}{currentAssignment.subjects?.code && ' — '}{currentAssignment.subjects?.name} ({currentAssignment.sections?.name})</span>
                ) : 'Select a class...'}
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {assignments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedAssignment(a.id); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-3 border-b last:border-0 border-border hover:bg-gray-50 transition-colors ${
                        selectedAssignment === a.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      {a.subjects?.code && <div className="text-gray-400 font-mono text-[11px] leading-tight">{a.subjects.code}</div>}
                      <div className="text-sm font-bold text-gray-800 leading-tight">{a.subjects?.name}</div>
                      <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{a.sections?.name} — {a.sections?.year_level}</div>
                      <div className="text-[10px] text-gray-400 leading-tight mt-0.5">{a.school_year} {a.semester}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

          <button onClick={handleExportExcel} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer">
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-sidebar to-sidebar-hover p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden xl:col-span-1">
          <FileSpreadsheet size={120} className="absolute -right-4 -bottom-4 opacity-10 text-white" />
          <div>
            <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Class Record
            </span>
            <h2 className="text-xl font-bold mt-2 leading-snug">{currentAssignment?.subjects?.code ? <span className="text-gray-300 font-mono text-sm mr-2">{currentAssignment.subjects.code}</span> : null}{currentAssignment?.subjects?.name}</h2>
            <p className="text-xs text-gray-300 mt-1">{currentAssignment?.sections?.name} — {currentAssignment?.sections?.year_level}</p>
            <p className="text-[10px] text-gray-400 mt-1">{currentAssignment?.school_year} {currentAssignment?.semester}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-border xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50"><Percent size={14} className="text-gold" /></div>
              <h4 className="text-xs font-bold text-sidebar uppercase tracking-wider">Grading Components</h4>
            </div>
            <div className="group relative">
              <HelpCircle size={14} className="text-gold/40 hover:text-gold cursor-pointer transition-colors" />
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-52 bg-sidebar text-white text-[10px] p-2.5 rounded-lg shadow-xl z-20 leading-relaxed">
                Define your grading components and their percentage weights. Add sub-activities under each component. Total weight must equal 100%.
              </div>
            </div>
          </div>

          {dataLoading && components.length === 0 ? (
            <div className="flex justify-center py-8"><Loader size={16} className="animate-spin text-sidebar/30" /></div>
          ) : components.length === 0 ? (
            <div className="text-center py-8 text-sidebar/40">
              <Percent size={36} className="mx-auto mb-3 opacity-20 text-sidebar" />
              <p className="text-sm font-bold text-sidebar/60">No grading components yet</p>
              <p className="text-xs mt-1 mb-4 text-sidebar/40">Click below to set up your grading system.</p>
              {selectedTerm !== 'PRELIMS' && (
                <div className="mb-4">
                  <button onClick={copyFromPrelims} disabled={copyingPrelims}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50">
                    {copyingPrelims ? <Loader size={14} className="animate-spin" /> : null}
                    {copyingPrelims ? 'Copying...' : 'Copy from PRELIMS'}
                  </button>
                  <p className="text-[10px] text-sidebar/40 mt-2">Copy all PRELIMS grading components and activities to {selectedTerm}.</p>
                </div>
              )}
              <div className="relative inline-block">
                <button onClick={() => setAddCompOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm hover:scale-105 transition-transform" style={{ background: '#f5a623' }}>
                  <Plus size={14} /> Add Component
                </button>
                {addCompOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden add-comp-popup">
                    <button onClick={() => addComponent(false)} className="w-full text-left px-4 py-3 text-xs font-bold text-sidebar hover:bg-gray-50 border-b border-gray-100 transition-colors">
                      Regular Component
                    </button>
                    <button
                      onClick={() => addComponent(true)}
                      disabled={hasAttendance}
                      className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${hasAttendance ? 'text-gray-300 cursor-not-allowed' : 'text-sidebar hover:bg-gray-50'}`}
                    >
                      <span className={hasAttendance ? 'text-gray-300' : 'text-amber-600'}>Attendance</span>
                      {hasAttendance && <span className="ml-1 text-[10px] text-gray-300">(already added)</span>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4">
                {components.map((comp, idx) => {
                  const color = getColor(idx);
                  return (
                    <div key={comp.id} className="flex-1 min-w-[220px] max-w-[320px] rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow" style={{ borderColor: color.border, backgroundColor: color.light }}>
                      <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: color.light, borderBottom: `1px solid ${color.border}` }}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, name: e.target.value } : c))}
                            onBlur={() => updateComponent(comp.id, { name: comp.name })}
                            className="text-sm font-extrabold text-sidebar bg-transparent border-b border-transparent hover:border-sidebar/20 focus:border-gold focus:outline-none px-1 py-0.5 flex-1 min-w-0"
                            placeholder="Component name"
                          />
                          {comp.is_attendance && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 shrink-0">
                              Attendance
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <div className="flex items-center bg-white rounded-lg border px-2 py-1" style={{ borderColor: color.border }}>
                            <input
                              type="number"
                              value={comp.weight}
                              onChange={(e) => setComponents(prev => {
                                const raw = parseFloat(e.target.value) || 0;
                                const others = prev.reduce((s, c) => c.id === comp.id ? s : s + parseFloat(c.weight || 0), 0);
                                const clamped = Math.min(raw, Math.max(0, 100 - others));
                                return prev.map(c => c.id === comp.id ? { ...c, weight: clamped } : c);
                              })}
                              onBlur={() => updateComponent(comp.id, { weight: comp.weight })}
                              className="w-12 text-center text-xs font-extrabold text-sidebar bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              min="0" max="100"
                            />
                            <span className="text-[10px] font-bold" style={{ color: color.bg }}>%</span>
                          </div>
                          <button onClick={() => deleteComponent(comp.id)} className="text-sidebar/20 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {(comp.activities || []).map((act) => (
                          <div key={act.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border bg-white" style={{ borderColor: color.border + '50' }}>
                            <input
                              type="text"
                              value={act.name}
                              onChange={(e) => setComponents(prev => prev.map(c =>
                                c.id === comp.id ? { ...c, activities: c.activities.map(a => a.id === act.id ? { ...a, name: e.target.value } : a) } : c
                              ))}
                              onBlur={() => updateActivity(act.id, { name: act.name })}
                              className="text-[11px] font-bold text-sidebar bg-transparent border-b border-transparent hover:border-sidebar/20 focus:border-gold focus:outline-none px-1 py-0.5 flex-1 min-w-0"
                              placeholder="Activity"
                            />
                            <div className="flex items-center gap-1 bg-white rounded border px-1.5 py-0.5" style={{ borderColor: color.bg + '60' }}>
                              <input
                                type="number"
                                value={act.max_score}
                                onChange={(e) => setComponents(prev => prev.map(c =>
                                  c.id === comp.id ? { ...c, activities: c.activities.map(a => a.id === act.id ? { ...a, max_score: parseFloat(e.target.value) || 0 } : a) } : c
                                ))}
                                onBlur={() => updateActivity(act.id, { max_score: act.max_score })}
                                className="w-12 text-center text-[10px] font-extrabold text-sidebar bg-transparent focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                min="0"
                              />
                              <span className="text-[9px] font-bold" style={{ color: color.bg }}>max</span>
                            </div>
                            <button onClick={() => deleteActivity(comp.id, act.id)} className="text-sidebar/20 hover:text-red-500 transition-colors shrink-0 p-0.5">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                        {!comp.is_attendance && (
                          <button
                            onClick={() => addActivity(comp.id)}
                            className="w-full text-[10px] font-bold text-white flex items-center justify-center gap-1 py-1.5 rounded-lg border border-transparent hover:brightness-110 transition-all"
                            style={{ backgroundColor: '#166534' }}
                          >
                            <Plus size={12} /> Add Activity
                          </button>
                        )}
                        {comp.is_attendance && (
                          <div className="text-[10px] text-gray-500 italic text-center py-1.5">
                            Scores auto-computed from attendance records
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="flex-[0_0_160px] min-w-[160px] relative">
                  <button
                    onClick={() => setAddCompOpen(true)}
                    className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sidebar/20 hover:border-gold hover:bg-amber-50/30 transition-all text-sidebar/40 hover:text-gold"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-extrabold">Add Component</span>
                  </button>
                  {addCompOpen && (
                    <div className="absolute top-0 left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden add-comp-popup">
                      <button onClick={() => addComponent(false)} className="w-full text-left px-4 py-3 text-xs font-bold text-sidebar hover:bg-gray-50 border-b border-gray-100 transition-colors">
                        Regular Component
                      </button>
                      <button
                        onClick={() => addComponent(true)}
                        disabled={hasAttendance}
                        className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${hasAttendance ? 'text-gray-300 cursor-not-allowed' : 'text-sidebar hover:bg-gray-50'}`}
                      >
                        <span className={hasAttendance ? 'text-gray-300' : 'text-amber-600'}>Attendance</span>
                        {hasAttendance && <span className="ml-1 text-[10px] text-gray-300">(already added)</span>}
                      </button>
                    </div>
                  )}
                </div>
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
      </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {currentAssignment && (
        <div className="mb-2 px-1">
          <span className="text-sm font-bold text-gray-700">{currentAssignment.subjects?.name} — {currentAssignment.sections?.name}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {components.length > 0 && totalWeight !== 100 && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span>Component weights must total 100% before you can enter scores. Current: {totalWeight}%</span>
          </div>
        )}
        {components.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">Set up grading components to view the class record table.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4" style={{ scrollbarWidth: 'auto' }}>
            <table className="min-w-max w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-sidebar border-b-2 border-r-2 border-border p-3 text-white text-left font-bold min-w-[352px] sticky left-0 z-20">
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-gray-300">{students.length} students</span>
                    </div>
                  </th>
                  {components.map((comp, idx) => {
                    const color = getColor(idx);
                    const actCount = comp.activities?.length || 0;
                    const cols = comp.is_attendance ? 3 : actCount + 3;
                    if (cols === 0) return null;
                    return (
                      <th key={comp.id} colSpan={cols} className="border-b-2 border-r-2 p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0"
                        style={{ backgroundColor: color.headerBg, borderColor: color.headerBorder }}
                      >
                        {comp.name} ({comp.weight}%)
                        {comp.is_attendance && <span className="ml-2 text-[10px] font-normal opacity-70">[ATTENDANCE]</span>}
                      </th>
                    );
                  })}
                  <th className="bg-[#529344] border-b-2 border-[#3d7031] p-3 text-white text-center font-bold text-base uppercase tracking-wider min-w-[120px] relative z-0">
                    {selectedTerm === 'PRELIMS' ? 'PRE' : selectedTerm === 'MIDTERMS' ? 'MID' : selectedTerm === 'PRE-FINALS' ? 'P-F' : 'FIN'} GRADE
                  </th>
                </tr>

                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20 w-12" style={{ left: 0 }}>#</th>
                  <th className="px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20 w-28" style={{ left: '48px' }}>Stud ID</th>
                  <th className="px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20 min-w-[180px]" style={{ left: '160px' }}>Student Name</th>
                  {components.map((comp, idx) => {
                    const color = getColor(idx);
                    if (comp.is_attendance) {
                      return [
                        <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-150 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                        <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-150 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                        <th key={`${comp.id}-wt`} className="px-3 py-2.5 border-r-4 border-yellow-300 bg-yellow-100 text-yellow-900 font-extrabold w-20 relative z-0" style={{ borderRightColor: color.border }}>W_TOTAL</th>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <th key={act.id} className="px-2 py-2.5 border-r border-gray-200 bg-gray-100/50 w-12 relative z-0" style={{ backgroundColor: color.light }}>{act.name}</th>
                    )).concat(
                      <th key={`${comp.id}-total`} className="px-3 py-2.5 border-r border-gray-200 bg-gray-150 text-sidebar font-bold w-16 relative z-0">TOTAL</th>,
                      <th key={`${comp.id}-equiv`} className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-150 text-sidebar font-bold w-16 relative z-0">EQUIV</th>,
                      <th key={`${comp.id}-wt`} className="px-3 py-2.5 border-r-4 border-yellow-300 bg-yellow-100 text-yellow-900 font-extrabold w-20 relative z-0" style={{ borderRightColor: color.border }}>W_TOTAL</th>
                    );
                  })}
                  <th className="px-3 py-2.5 bg-[#8fc782] text-green-900 font-extrabold text-sm w-28 relative z-0">FINAL</th>
                </tr>

                <tr className="bg-white border-b border-border text-center font-bold text-sidebar select-none">
                  <td className="px-1 py-2 text-center sticky bg-white border-r border-border z-20 w-12" style={{ left: 0 }}></td>
                  <td className="px-3 py-2 text-left sticky bg-white border-r border-border z-20 text-[10px] text-text-muted w-28" style={{ left: '48px' }}>MAX SCORE</td>
                  <td className="px-4 py-2 text-left sticky bg-white border-r-2 border-border z-20 text-[10px] text-text-muted font-normal italic min-w-[180px]" style={{ left: '160px' }}>Maximum target scores</td>
                  {components.map((comp, idx) => {
                    const color = getColor(idx);
                    const maxTotal = getComponentMaxTotal(comp);
                    if (comp.is_attendance) {
                      return [
                        <td key={`${comp.id}-total`} className="px-2 py-2 border-r border-b border-gray-200 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">{maxTotal}</td>,
                        <td key={`${comp.id}-equiv`} className="px-2 py-2 border-r-2 border-b border-gray-300 bg-gray-100 font-extrabold text-sidebar text-center text-xs relative z-0">100.00</td>,
                        <td key={`${comp.id}-wt`} className="px-2 py-2 border-r-4 border-b border-yellow-200 bg-yellow-50 font-extrabold text-yellow-900 text-center text-xs relative z-0" style={{ borderRightColor: color.border }}>{comp.weight.toFixed(2)}</td>
                      ];
                    }
                    return (comp.activities || []).map((act) => (
                      <td key={act.id} className="p-1 border-r border-b border-gray-200 bg-gray-50/20 relative z-0">
                        <input type="number" step="any" value={act.max_score || 0}
                          disabled={totalWeight !== 100}
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
                      <td key={`${comp.id}-wt`} className="px-2 py-2 border-r-4 border-b border-yellow-200 bg-yellow-50 font-extrabold text-yellow-900 text-center text-xs relative z-0" style={{ borderRightColor: color.border }}>{comp.weight.toFixed(2)}</td>
                    );
                  })}
                  <td className="px-2 py-2 bg-[#8fc782] font-extrabold text-green-900 text-center text-sm relative z-0 border-b border-gray-200">100.00</td>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-6 py-10 text-center text-gray-500 italic">
                      No students in this section. Import from Excel or add students in the Sections page.
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => {
                    const finalGrade = getFinalGrade(student.id);
                    const isFinalFail = finalGrade < 75;

                    return (
                      <tr key={student.id} className={`transition-colors ${selectedRow === student.id ? 'bg-green-200' : 'hover:bg-green-50/10'}`}>
                        <td className={`px-1 py-1 text-center sticky border-r border-b border-gray-200 z-30 w-12 text-gray-400 text-[10px] cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: 0 }} onClick={() => setSelectedRow(student.id)}>{index + 1}</td>
                        <td className={`px-2 py-1 sticky border-r border-b border-gray-200 z-20 w-28 text-xs font-mono font-semibold text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '48px' }} onClick={() => setSelectedRow(student.id)}>{student.student_id}</td>
                        <td className={`px-2 py-1 sticky border-r-2 border-b border-border z-20 min-w-[180px] text-xs font-medium text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '160px' }} onClick={() => setSelectedRow(student.id)}>{student.student_name}</td>
                        {components.map((comp, idx) => {
                          const componentTotal = getComponentTotal(student.id, comp);
                          const componentEquiv = getComponentEquiv(student.id, comp);
                          const componentWeighted = getComponentWeighted(student.id, comp);
                          const isFail = componentEquiv < 75;

                          const isSelected = selectedRow === student.id;
                          if (comp.is_attendance) {
                            return [
                              <td key={`${comp.id}-total-${student.id}`} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`}>{componentTotal}</td>,
                              <td key={`${comp.id}-equiv-${student.id}`} className={`px-2 py-2 border-r-2 border-b border-gray-300 text-center font-bold text-xs ${isSelected ? 'bg-green-200' : 'bg-white'} ${isFail ? 'text-red-600 font-extrabold' : 'text-sidebar'}`}>{componentEquiv.toFixed(2)}</td>,
                              <td key={`${comp.id}-wt-${student.id}`} className={`px-2 py-2 border-r-4 border-b border-yellow-200 text-center font-bold text-yellow-800 text-xs ${isSelected ? 'bg-green-200' : 'bg-yellow-50/30'}`}>{componentWeighted.toFixed(2)}</td>
                            ];
                          }
                          return (comp.activities || []).map((act) => {
                            const val = scores[act.id]?.[student.id] ?? '';
                            const maxVal = act.max_score || 100;
                            const inputVal = val !== null && val !== undefined ? val : '';
                            return (
                              <td key={act.id} className={`p-0.5 border-r border-b border-gray-200 ${isSelected ? 'bg-green-200' : 'bg-[#f3f4f6]'}`}>
                                <input type="number" step="any" placeholder="0" value={inputVal === '' ? '' : inputVal}
                                  disabled={totalWeight !== 100}
                                  onChange={(e) => handleScoreChange(act.id, student.id, e.target.value)}
                                  className="w-full text-center text-xs font-medium text-sidebar p-1 border border-transparent rounded focus:outline-none focus:ring-1 focus:ring-gold bg-transparent hover:bg-gray-100 focus:bg-white transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
                                  max={maxVal} />
                              </td>
                            );
                          }).concat(
                            <td key={`${comp.id}-total-${student.id}`} className={`px-2 py-2 border-r border-b border-gray-200 text-center font-bold text-xs ${isSelected ? 'bg-green-200 text-sidebar' : 'bg-white text-sidebar'}`}>{componentTotal}</td>,
                            <td key={`${comp.id}-equiv-${student.id}`} className={`px-2 py-2 border-r-2 border-b border-gray-300 text-center font-bold text-xs ${isSelected ? 'bg-green-200' : 'bg-white'} ${isFail ? 'text-red-600 font-extrabold' : 'text-sidebar'}`}>{componentEquiv.toFixed(2)}</td>,
                            <td key={`${comp.id}-wt-${student.id}`} className={`px-2 py-2 border-r-4 border-b border-yellow-200 text-center font-bold text-yellow-800 text-xs ${isSelected ? 'bg-green-200' : 'bg-yellow-50/30'}`}>{componentWeighted.toFixed(2)}</td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center font-extrabold text-sm border-b border-gray-200 ${isFinalFail ? 'bg-red-100 text-red-700' : (selectedRow === student.id ? 'bg-[#8fc782]/60 text-green-900' : 'bg-[#8fc782]/40 text-green-900')}`}>
                          {finalGrade.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassRecord;
