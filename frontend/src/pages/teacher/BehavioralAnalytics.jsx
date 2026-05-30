import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart3, Loader, ArrowLeft, Download, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const avg = (arr) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

const BehavioralAnalytics = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [components, setComponents] = useState([]);
  const [scores, setScores] = useState({});
  const [attendanceScores, setAttendanceScores] = useState({ max_total: 0, scores: {} });
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('PRELIMS');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState('finalGrade');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [highlightedRowId, setHighlightedRowId] = useState(null);

  const currentAssignment = assignments.find((a) => a.id === selectedAssignment);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await api('http://localhost:5000/api/assignments');
        if (res.ok) {
          const data = await res.json();
          setAssignments(data);
          if (data.length > 0 && !selectedAssignment) setSelectedAssignment(data[0].id);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAssignments();
  }, []);

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

  const fetchGradeData = async () => {
    if (!selectedAssignment) return;
    setDataLoading(true);
    try {
      const [compRes, scoresRes, attRes] = await Promise.all([
        api(`http://localhost:5000/api/grading-components?assignment_id=${selectedAssignment}&term=${selectedTerm}`),
        api(`http://localhost:5000/api/component-scores?assignment_id=${selectedAssignment}&term=${selectedTerm}`),
        api(`http://localhost:5000/api/attendance/computed-scores?teacher_assignment_id=${selectedAssignment}&term=${selectedTerm}`),
      ]);
      if (compRes.ok) setComponents(await compRes.json());
      if (scoresRes.ok) {
        const scoreList = await scoresRes.json();
        const scoreMap = {};
        scoreList.forEach(s => {
          if (!scoreMap[s.activity_id]) scoreMap[s.activity_id] = {};
          scoreMap[s.activity_id][s.student_id] = s.score;
        });
        setScores(scoreMap);
      }
      if (attRes.ok) {
        setAttendanceScores(await attRes.json());
      } else {
        setAttendanceScores({ max_total: 0, scores: {} });
      }
    } catch (err) { console.error(err); }
    finally { setDataLoading(false); }
  };

  useEffect(() => { fetchGradeData(); }, [selectedAssignment, selectedTerm]);

  // --- Computation helpers ---
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

  const getComponentPerformance = (studentId, comp) => {
    if (comp.is_attendance) {
      if (attendanceScores.max_total === 0) return 0;
      return ((attendanceScores.scores[studentId] ?? 0) / attendanceScores.max_total) * 100;
    }
    const activities = comp.activities || [];
    let earned = 0, possible = 0;
    activities.forEach(a => {
      const val = parseFloat(scores[a.id]?.[studentId]);
      if (!isNaN(val)) {
        earned += val;
        possible += parseFloat(a.max_score || 0);
      }
    });
    if (possible === 0) return 0;
    return (earned / possible) * 100;
  };

  const getComponentActivityScores = (studentId, comp) => {
    if (comp.is_attendance) return [];
    return (comp.activities || []).map(a => {
      const raw = parseFloat(scores[a.id]?.[studentId]);
      return {
        activity: a,
        score: isNaN(raw) ? null : raw,
        pct: isNaN(raw) ? null : a.max_score ? raw / a.max_score : null,
      };
    }).filter(x => x.score !== null && x.pct !== null);
  };

  const getComponentSubmissionRate = (studentId, comp) => {
    if (comp.is_attendance) {
      if (attendanceScores.max_total === 0) return 0;
      return (attendanceScores.scores[studentId] ?? 0) / attendanceScores.max_total;
    }
    const activities = comp.activities || [];
    if (activities.length === 0) return 0;
    let submitted = 0;
    activities.forEach(a => {
      const val = scores[a.id]?.[studentId];
      if (val !== null && val !== undefined && Number(val) !== 0) submitted++;
    });
    return submitted / activities.length;
  };

  const getComponentTrend = (studentId, comp) => {
    if (comp.is_attendance) return 'stable';
    const scored = getComponentActivityScores(studentId, comp);
    if (scored.length < 2) return 'stable';
    const values = scored.map(x => x.pct);
    const indices = values.map((_, i) => i);
    const n = values.length;
    const meanX = avg(indices);
    const meanY = avg(values);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (indices[i] - meanX) * (values[i] - meanY);
      den += (indices[i] - meanX) ** 2;
    }
    if (den === 0) return 'stable';
    const slope = num / den;
    const threshold = meanY * 0.05;
    if (slope > threshold) return 'improving';
    if (slope < -threshold) return 'declining';
    return 'stable';
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

  const getOverallSubRate = (studentId) => {
    const validComps = components.filter(c => c.is_attendance || c.activities?.length > 0);
    if (validComps.length === 0) return 0;
    return avg(validComps.map(c => getComponentSubmissionRate(studentId, c)));
  };

  const getAttendanceRate = (studentId) => {
    if (attendanceScores.max_total === 0) return 0;
    return (attendanceScores.scores[studentId] ?? 0) / attendanceScores.max_total;
  };

  const getOverallPerformance = (studentId) => {
    let totalEarned = 0, totalPossible = 0;
    components.forEach(c => {
      if (c.is_attendance) {
        totalEarned += attendanceScores.scores[studentId] ?? 0;
        totalPossible += attendanceScores.max_total;
      } else {
        const activities = c.activities || [];
        activities.forEach(a => {
          const val = parseFloat(scores[a.id]?.[studentId]);
          if (!isNaN(val)) {
            totalEarned += val;
            totalPossible += parseFloat(a.max_score || 0);
          }
        });
      }
    });
    if (totalPossible === 0) return 0;
    return (totalEarned / totalPossible) * 100;
  };

  // --- Analytics data per student ---
  const studentAnalytics = useMemo(() => {
    if (!students.length || !components.length) return {};
    const result = {};
    students.forEach(s => {
      const componentData = {};
      components.forEach(c => {
        const activities = c.is_attendance ? [] : (c.activities || []);
        const scoredActivities = getComponentActivityScores(s.id, c);
        componentData[c.id] = {
          name: c.name,
          weight: c.weight,
          is_attendance: c.is_attendance,
          equiv: getComponentEquiv(s.id, c),
          weighted: getComponentWeighted(s.id, c),
          submissionRate: getComponentSubmissionRate(s.id, c),
          performance: getComponentPerformance(s.id, c),
          trend: getComponentTrend(s.id, c),
          activities: scoredActivities,
          maxTotal: getComponentMaxTotal(c),
          total: getComponentTotal(s.id, c),
        };
      });
      result[s.id] = {
        student: s,
        components: componentData,
        finalGrade: getFinalGrade(s.id),
        overallSubRate: getOverallSubRate(s.id),
        attendanceRate: getAttendanceRate(s.id),
        overallPerformance: getOverallPerformance(s.id),
      };
    });
    return result;
  }, [students, components, scores, attendanceScores]);

  // --- Summary KPIs ---
  const summary = useMemo(() => {
    const vals = Object.values(studentAnalytics);
    return {
      avgGrade: avg(vals.map(v => v.finalGrade)),
      avgSubRate: avg(vals.map(v => v.overallSubRate)),
      avgAttendanceRate: avg(vals.map(v => v.attendanceRate)),
      avgPerformance: avg(vals.map(v => v.overallPerformance)),
    };
  }, [studentAnalytics]);

  // --- Sorting ---
  const sortedStudents = useMemo(() => {
    const entries = Object.values(studentAnalytics);
    entries.sort((a, b) => {
      let aVal, bVal;
      if (sortKey === 'name') { aVal = a.student.student_name; bVal = b.student.student_name; }
      else if (sortKey === 'student_id') { aVal = a.student.student_id; bVal = b.student.student_id; }
      else if (sortKey === 'finalGrade') { aVal = a.finalGrade; bVal = b.finalGrade; }
      else if (sortKey === 'subRate') { aVal = a.overallSubRate; bVal = b.overallSubRate; }
      else if (sortKey === 'attRate') { aVal = a.attendanceRate; bVal = b.attendanceRate; }
      else if (sortKey === 'performance') { aVal = a.overallPerformance; bVal = b.overallPerformance; }
      else { aVal = a.finalGrade; bVal = b.finalGrade; }
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? (aVal - bVal) : (bVal - aVal);
    });
    return entries;
  }, [studentAnalytics, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return null;
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  // --- Export ---
  const handleExportExcel = () => {
    if (!currentAssignment || components.length === 0) return;

    const visibleComponents = components.filter(c => c.is_attendance || c.activities?.length > 0);

    const titleRow = [`${currentAssignment.subjects?.code || ''} ${currentAssignment.subjects?.name}`.trim(), `Section: ${currentAssignment.sections?.name}`, `Term: ${selectedTerm}`, 'Behavioral Analytics'];

    const subHeader = ['Stud No.', 'Student Name'];
    visibleComponents.forEach(c => {
      subHeader.push('EQUIV', 'Performance', 'Sub%');
    });
    subHeader.push('FINAL', 'Sub%', 'Att.%', 'PERFORMANCE');

    const dataRows = sortedStudents.map((entry) => {
      const row = [entry.student.student_id, entry.student.student_name];
      visibleComponents.forEach(c => {
        const cd = entry.components[c.id];
        row.push(
          cd.equiv.toFixed(2),
          cd.performance.toFixed(1) + '%',
          (cd.submissionRate * 100).toFixed(1) + '%'
        );
      });
      row.push(
        entry.finalGrade.toFixed(2),
        (entry.overallSubRate * 100).toFixed(1) + '%',
        (entry.attendanceRate * 100).toFixed(1) + '%',
        entry.overallPerformance.toFixed(1) + '%'
      );
      return row;
    });

    // Main header row with component names
    const mainHeader = Array(subHeader.length).fill('');
    mainHeader[0] = 'STUDENT INFORMATION';
    let ci = 0;
    visibleComponents.forEach(c => {
      // place component name at the start of its 3-col span (after 2 static cols)
      const idx = 2 + ci * 3;
      if (idx < mainHeader.length) mainHeader[idx] = `${c.name} (${c.weight}%)`;
      ci++;
    });
    // FINAL, Sub%, Att.%, PERFORMANCE — place at their span start
    const afterComp = 2 + visibleComponents.length * 3;
    mainHeader[afterComp] = 'FINAL';
    mainHeader[afterComp + 1] = 'Sub%';
    mainHeader[afterComp + 2] = 'Att.%';
    mainHeader[afterComp + 3] = 'PERFORMANCE';

    const allRows = [titleRow, mainHeader, subHeader, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    const colCount = subHeader.length;
    const rowCount = allRows.length;

    // Column widths
    const colWidths = [
      { wch: 14 },  // Stud No.
      { wch: 28 },  // Student Name
    ];
    visibleComponents.forEach(() => { colWidths.push({ wch: 10 }, { wch: 14 }, { wch: 8 }); });
    colWidths.push({ wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 14 });
    worksheet['!cols'] = colWidths;

    // Merges for title (row 0) and main header (row 1)
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // STUDENT INFORMATION
    ];
    visibleComponents.forEach((_, i) => {
      const startCol = 2 + i * 3;
      merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: startCol + 2 } });
    });
    worksheet['!merges'] = merges;

    // Colors
    const WHITE = 'FFFFFF';
    const GRAY_50 = 'F9FAFB';
    const BORDER = 'E5E7EB';
    const GREEN_700 = '15803D';
    const RED_600 = 'DC2626';
    const SIDEBAR = '1B1B2F';
    const FINAL_GREEN = '529344';
    const PURPLE = '8B5CF6';
    const CYAN = '06B6D4';
    const ORANGE = 'F97316';
    const COMP_BLUE = '3B82F6';

    const thinBorder = { top: { style: 'thin', color: { rgb: BORDER } }, bottom: { style: 'thin', color: { rgb: BORDER } }, left: { style: 'thin', color: { rgb: BORDER } }, right: { style: 'thin', color: { rgb: BORDER } } };
    const thickerRight = { ...thinBorder, right: { style: 'medium', color: { rgb: BORDER } } };

    const applyStyle = (cell, style) => { if (cell) cell.s = style; };

    // Row 0: title
    const titleStyle = { fill: { fgColor: { rgb: SIDEBAR } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' } };
    for (let c = 0; c < colCount; c++) applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c })], titleStyle);

    // Row 1: main header — component names and FINAL/Sub%/Att.%/PERFORMANCE
    const mainHdrStyle = (bg) => ({ fill: { fgColor: { rgb: bg } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });
    const lastMainColors = [FINAL_GREEN, PURPLE, CYAN, ORANGE];
    // Student info columns
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 0 })], mainHdrStyle(SIDEBAR));
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 1 })], mainHdrStyle(SIDEBAR));
    ci = 0;
    visibleComponents.forEach(() => {
      for (let i = 0; i < 3; i++) {
        const c = ci++;
        applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 2 + c })], mainHdrStyle(COMP_BLUE));
      }
    });
    lastMainColors.forEach((bg) => {
      const c = ci++;
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c: 2 + c })], mainHdrStyle(bg));
    });

    // Row 2: sub-header
    const compHdrColors = [COMP_BLUE, COMP_BLUE, COMP_BLUE];
    const lastHdrColors = [FINAL_GREEN, PURPLE, CYAN, ORANGE];
    const subHdrStyle = (bg) => ({ fill: { fgColor: { rgb: bg } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });

    ci = 2;
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c: 0 })], { ...subHdrStyle(GRAY_50), font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });
    applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c: 1 })], { ...subHdrStyle(GRAY_50), font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder });

    visibleComponents.forEach(() => {
      for (let i = 0; i < 3; i++) {
        const c = ci++;
        const isLast = i === 2;
        applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c })], { ...subHdrStyle(GRAY_50), font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: isLast ? thickerRight : thinBorder });
      }
    });
    lastHdrColors.forEach((bg, i) => {
      const c = ci++;
      const isLast = i === lastHdrColors.length - 1;
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 2, c })], { ...subHdrStyle(GRAY_50), font: { bold: true, color: { rgb: SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: isLast ? thinBorder : thickerRight });
    });

    // Data rows (r >= 3)
    const dataCenterStyle = (isGreen) => ({ fill: { fgColor: { rgb: WHITE } }, font: { bold: true, color: { rgb: isGreen ? GREEN_700 : SIDEBAR }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });
    const dataFailStyle = { fill: { fgColor: { rgb: WHITE } }, font: { bold: true, color: { rgb: RED_600 }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const dataLeftStyle = { ...dataCenterStyle(false), font: { ...dataCenterStyle(false).font, bold: false }, alignment: { horizontal: 'left', vertical: 'center' } };

    const isThickerRightCol = (c) => {
      let idx = 2; // start after Stud No. + Student Name
      for (let i = 0; i < visibleComponents.length; i++) {
        idx += 2; // EQUIV, Performance — skip Sub% which has thicker
        if (c === idx) return true;
        idx += 1; // Sub%
      }
      // last 4 cols: FINAL (thicker), Sub% (thicker), Att.% (thicker), PERFORMANCE (no)
      const afterComp = 2 + visibleComponents.length * 3;
      const rel = c - afterComp;
      return rel >= 0 && rel < lastHdrColors.length - 1;
    };

    for (let r = 3; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;

        if (c === 0) { cell.s = { ...dataCenterStyle(false), font: { color: { rgb: '9CA3AF' }, sz: 9 } }; continue; }
        if (c === 1) { cell.s = dataLeftStyle; continue; }

        const isThicker = isThickerRightCol(c);

        // Performance columns (show green/amber/red)
        const perfCol = (() => {
          let idx = 2;
          for (let i = 0; i < visibleComponents.length; i++) {
            idx += 1; // EQUIV
            if (c === idx) return true; // Performance
            idx += 2; // Sub%
          }
          return c === colCount - 1; // last column is overall PERFORMANCE
        })();

        if (perfCol) {
          const pct = typeof cell.v === 'string' ? parseFloat(cell.v) : cell.v;
          const isLow = pct < 60;
          const isMid = pct >= 60 && pct < 75;
          const color = isLow ? RED_600 : (isMid ? 'D97706' : GREEN_700);
          cell.s = { ...dataCenterStyle(false), font: { bold: true, color: { rgb: color }, sz: 10 }, border: isThicker ? thickerRight : thinBorder };
          continue;
        }

        cell.s = { ...dataCenterStyle(false), border: isThicker ? thickerRight : thinBorder };
      }

      if (r % 2 === 0) {
        for (let c = 0; c < colCount; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
          if (cell?.s) cell.s = { ...cell.s, fill: { fgColor: { rgb: GRAY_50 } } };
        }
      }
    }

    worksheet['!rows'] = Array.from({ length: rowCount }, () => ({ hpt: 22 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
    XLSX.writeFile(workbook, `${currentAssignment.subjects?.name?.replace(/\s+/g, '_')}_${selectedTerm}_Analytics.xlsx`);
  };

  // --- Trend icon ---
  const TrendIcon = ({ trend }) => {
    if (trend === 'improving') return <TrendingUp size={12} className="text-green-600" />;
    if (trend === 'declining') return <TrendingDown size={12} className="text-red-500" />;
    return <Minus size={12} className="text-gray-400" />;
  };

  // --- Performance bar ---
  const PerformanceBar = ({ pct }) => {
    const color = pct >= 75 ? '#16a34a' : pct >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <div className="w-full max-w-full overflow-hidden" title={`Performance: ${pct.toFixed(1)}%`}>
        <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
        </div>
      </div>
    );
  };

  // --- Detail Modal ---
  const detailStudent = selectedStudent ? studentAnalytics[selectedStudent] : null;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-gray-400" /></div>;
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <BarChart3 size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  const hasComponents = components.some(c => c.is_attendance || c.activities?.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors cursor-pointer" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 font-sans">
              SmartGrade — Behavioral Analytics
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
                onClick={() => { if (t !== selectedTerm) { setSelectedTerm(t); } }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedTerm === t ? 'bg-sidebar text-white shadow-sm' : 'text-text-muted hover:text-sidebar'
                }`}
              >
                {t}
              </button>
            ))}
            {dataLoading && <Loader size={14} className="animate-spin text-sidebar/40 ml-2" />}
          </div>
          {hasComponents && (
            <button onClick={handleExportExcel} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer">
              <Download size={16} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      {hasComponents && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Avg Final Grade</div>
            <div className={`text-2xl font-extrabold ${summary.avgGrade >= 75 ? 'text-green-700' : 'text-red-600'}`}>
              {summary.avgGrade.toFixed(2)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Avg Submission Rate</div>
            <div className={`text-2xl font-extrabold ${summary.avgSubRate >= 0.9 ? 'text-green-700' : summary.avgSubRate >= 0.75 ? 'text-amber-600' : 'text-red-600'}`}>
              {(summary.avgSubRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Avg Attendance Rate</div>
            <div className={`text-2xl font-extrabold ${summary.avgAttendanceRate >= 0.9 ? 'text-green-700' : summary.avgAttendanceRate >= 0.75 ? 'text-amber-600' : 'text-red-600'}`}>
              {(summary.avgAttendanceRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Overall Performance</div>
            <div className={`text-2xl font-extrabold ${summary.avgPerformance >= 75 ? 'text-green-700' : summary.avgPerformance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {summary.avgPerformance.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {!hasComponents ? (
          <div className="py-12 text-center text-gray-400">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No grading components for this term.</p>
            <p className="text-xs mt-1">Set up components in Class Record first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4" style={{ scrollbarWidth: 'auto' }}>
            <table className="min-w-max w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-sidebar border-b-2 border-r-2 border-border p-3 text-white text-left font-bold min-w-[330px] sticky left-0 z-20">
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-gray-300">{students.length} students</span>
                    </div>
                  </th>
                  {components.map((comp) => (
                    (comp.is_attendance || comp.activities?.length > 0) && (
                      <th key={comp.id} colSpan={3} className="border-b-2 border-r-2 p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0"
                        style={{ backgroundColor: '#3b82f6', borderColor: '#2563eb' }}
                      >
                        {comp.name} ({comp.weight}%)
                      </th>
                    )
                  ))}
                  <th className="bg-[#529344] border-b-2 border-[#3d7031] p-3 text-white text-center font-bold text-sm uppercase tracking-wider min-w-[100px] relative z-0">FINAL</th>
                  <th className="bg-[#8b5cf6] border-b-2 border-[#7c3aed] p-3 text-white text-center font-bold text-xs uppercase tracking-wider min-w-[90px] relative z-0">Sub%</th>
                  <th className="bg-[#06b6d4] border-b-2 border-[#0891b2] p-3 text-white text-center font-bold text-xs uppercase tracking-wider min-w-[90px] relative z-0">Att.%</th>
                  <th className="bg-[#f97316] border-b-2 border-[#ea580c] p-3 text-white text-center font-bold text-xs uppercase tracking-wider min-w-[100px] relative z-0">PERFORMANCE</th>
                </tr>
                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20 w-10" style={{ left: 0 }}>#</th>
                  <th className="px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20 w-[110px] cursor-pointer select-none hover:bg-gray-100" style={{ left: '40px' }} onClick={() => handleSort('student_id')}>Stud ID {sortIcon('student_id')}</th>
                  <th className="px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20 w-[180px] cursor-pointer select-none hover:bg-gray-100" style={{ left: '150px' }} onClick={() => handleSort('name')}>Student Name {sortIcon('name')}</th>
                  {components.map((comp) => (
                    (comp.is_attendance || comp.activities?.length > 0) && (
                      <React.Fragment key={comp.id}>
                        <th className="px-2 py-2.5 border-r border-gray-200 bg-gray-100/50 w-[65px] relative z-0 font-semibold text-sidebar align-middle">EQUIV</th>
                        <th className="px-2 py-2.5 border-r border-gray-200 bg-gray-100/50 w-24 relative z-0 font-semibold text-sidebar align-middle">Performance</th>
                        <th className="px-2 py-2.5 border-r-2 border-gray-300 bg-gray-100/50 w-[55px] relative z-0 font-semibold text-sidebar align-middle">Sub%</th>
                      </React.Fragment>
                    )
                  ))}
                  <th className="px-3 py-2.5 bg-[#8fc782] text-green-900 font-extrabold text-sm w-[75px] relative z-0 cursor-pointer select-none hover:brightness-95 align-middle" onClick={() => handleSort('finalGrade')}>FINAL {sortIcon('finalGrade')}</th>
                  <th className="px-3 py-2.5 bg-purple-100 text-purple-900 font-extrabold text-xs w-[65px] relative z-0 cursor-pointer select-none hover:brightness-95 align-middle" onClick={() => handleSort('subRate')}>SUB% {sortIcon('subRate')}</th>
                  <th className="px-3 py-2.5 bg-cyan-100 text-cyan-900 font-extrabold text-xs w-[65px] relative z-0 cursor-pointer select-none hover:brightness-95 align-middle" onClick={() => handleSort('attRate')}>ATT% {sortIcon('attRate')}</th>
                  <th className="px-3 py-2.5 bg-orange-100 text-orange-900 font-extrabold text-xs w-[90px] relative z-0 cursor-pointer select-none hover:brightness-95 align-middle" onClick={() => handleSort('performance')}>PERFORMANCE {sortIcon('performance')}</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3 + components.filter(c => c.is_attendance || c.activities?.length > 0).length * 3 + 4} className="px-6 py-10 text-center text-gray-500 italic">
                      No students in this section.
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((entry, index) => {
                    const isLowPerforming = entry.overallPerformance < 60;
                    const rowBg = isLowPerforming ? 'bg-red-50/60' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                    return (
                      <tr key={entry.student.id} className={`${rowBg} hover:bg-blue-50/30 cursor-pointer transition-colors ${highlightedRowId === entry.student.id ? '!bg-green-200' : ''}`} onClick={() => setSelectedStudent(entry.student.id)}>
                        <td className={`px-1 py-1.5 text-center sticky border-r border-b border-gray-200 z-30 w-10 text-gray-400 text-[10px] align-middle ${highlightedRowId === entry.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: 0 }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === entry.student.id ? null : entry.student.id); }}>{index + 1}</td>
                        <td className={`px-2 py-1.5 sticky border-r border-b border-gray-200 z-20 w-[110px] text-xs font-mono font-semibold text-sidebar align-middle ${highlightedRowId === entry.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: '40px' }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === entry.student.id ? null : entry.student.id); }}>{entry.student.student_id}</td>
                        <td className={`px-2 py-1.5 sticky border-r-2 border-b border-border z-20 w-[180px] text-xs font-medium text-sidebar truncate align-middle ${highlightedRowId === entry.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: '150px' }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === entry.student.id ? null : entry.student.id); }}>{entry.student.student_name}</td>
                        {components.map((comp) => {
                          const cd = entry.components[comp.id];
                          if (!cd) return null;
                          return (
                            <React.Fragment key={comp.id}>
                              <td className={`px-2 py-1.5 text-center border-r border-b border-gray-200 font-bold text-xs align-middle w-[65px] ${cd.equiv < 75 ? 'text-red-600' : 'text-sidebar'}`}>{cd.equiv.toFixed(2)}</td>
                              <td className="px-2 py-1.5 border-r border-b border-gray-200 align-middle w-24 max-w-24 overflow-hidden">
                                <PerformanceBar pct={cd.performance} />
                              </td>
                              <td className="px-2 py-1.5 text-center border-r-2 border-b border-gray-300 text-xs font-semibold align-middle w-[55px]">{cd.is_attendance ? '-' : (cd.submissionRate * 100).toFixed(0) + '%'}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`px-2 py-1.5 text-center font-extrabold text-sm border-b border-gray-200 align-middle w-[75px] ${entry.finalGrade < 75 ? 'text-red-600' : 'text-green-900'}`}>{entry.finalGrade.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-center font-bold text-xs border-b border-gray-200 text-purple-900 align-middle w-[65px]">{(entry.overallSubRate * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-center font-bold text-xs border-b border-gray-200 text-cyan-900 align-middle w-[65px]">{(entry.attendanceRate * 100).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-center font-bold text-xs border-b border-gray-200 text-orange-900 align-middle w-[90px]">{entry.overallPerformance.toFixed(1)}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailStudent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">{detailStudent.student.student_name}</h3>
                <p className="text-xs text-gray-400">{detailStudent.student.student_id}</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {components.map((comp) => {
                if (!comp.is_attendance && !comp.activities?.length) return null;
                const cd = detailStudent.components[comp.id];
                return (
                  <div key={comp.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-sidebar">{comp.name}</span>
                        <span className="text-[10px] text-gray-400">({comp.weight}%)</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className={`${cd.equiv < 75 ? 'text-red-600' : 'text-green-700'}`}>EQUIV: {cd.equiv.toFixed(2)}</span>
                        <span className="text-blue-600">Performance: {cd.performance.toFixed(1)}%</span>
                        <span className="text-gray-500">Sub: {(cd.submissionRate * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {cd.is_attendance ? (
                      <div className="text-xs text-gray-500">
                        Total: {cd.total} / {cd.maxTotal} ({((cd.total / (cd.maxTotal || 1)) * 100).toFixed(1)}%)
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {cd.activities.map((act, i) => {
                          const pct = act.activity.max_score ? (act.score / act.activity.max_score) * 100 : 0;
                          return (
                            <div key={act.activity.id} className="flex items-center gap-3 text-xs">
                              <span className="w-32 font-semibold text-gray-700 truncate">{act.activity.name}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                              </div>
                              <span className="w-24 text-right font-mono text-gray-600">{act.score} / {act.activity.max_score}</span>
                              <span className="w-12 text-right font-bold" style={{ color: pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>{pct.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                        {cd.activities.length >= 2 && (
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                            <TrendIcon trend={cd.trend} />
                            <span>Trend: {cd.trend}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Final Grade</div>
                    <div className={`text-lg font-extrabold ${detailStudent.finalGrade < 75 ? 'text-red-600' : 'text-green-700'}`}>{detailStudent.finalGrade.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Sub. Rate</div>
                    <div className="text-lg font-extrabold text-purple-700">{(detailStudent.overallSubRate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Att. Rate</div>
                    <div className="text-lg font-extrabold text-cyan-700">{(detailStudent.attendanceRate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Performance</div>
                    <div className={`text-lg font-extrabold ${detailStudent.overallPerformance >= 75 ? 'text-green-700' : detailStudent.overallPerformance >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {detailStudent.overallPerformance.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BehavioralAnalytics;
