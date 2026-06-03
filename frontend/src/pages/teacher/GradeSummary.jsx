import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Loader, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx-js-style';
import { useTeacher } from '../../contexts/TeacherContext';
import AssignmentSelector from '../../components/teacher/FloatingAssignmentSelector';
import api from '../../utils/api';

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];
const TERM_PCTS = { PRELIMS: '20%', MIDTERMS: '20%', 'PRE-FINALS': '20%', FINALS: '40%' };
const TERM_WEIGHTS = { PRELIMS: 0.20, MIDTERMS: 0.20, 'PRE-FINALS': 0.20, FINALS: 0.40 };

const GRADE_RANGES = [
  { min: 98, gp: 1.00, desc: 'Excellent' },
  { min: 95, gp: 1.25, desc: 'Very Good' },
  { min: 92, gp: 1.50, desc: 'Very Good' },
  { min: 89, gp: 1.75, desc: 'Very Good' },
  { min: 86, gp: 2.00, desc: 'Satisfactory' },
  { min: 83, gp: 2.25, desc: 'Satisfactory' },
  { min: 80, gp: 2.50, desc: 'Satisfactory' },
  { min: 77, gp: 2.75, desc: 'Fair' },
  { min: 75, gp: 3.00, desc: 'Fair' },
];

const gradeToPoint = (grade) => {
  if (grade < 75) return { gp: 5.00, desc: 'Failed' };
  for (const r of GRADE_RANGES) {
    if (grade >= r.min) return r;
  }
  return { gp: 5.00, desc: 'Failed' };
};

const getComponentTotal = (studentId, comp, scores, attScores) => {
  if (comp.is_attendance) return attScores?.scores?.[studentId] ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => {
    const val = parseFloat(scores?.[a.id]?.[studentId]);
    if (!isNaN(val)) sum += val;
  });
  return sum;
};

const getComponentMaxTotal = (comp, attScores) => {
  if (comp.is_attendance) return attScores?.max_total ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => sum += parseFloat(a.max_score || 0));
  return sum;
};

const getComponentEquiv = (studentId, comp, scores, attScores) => {
  const total = getComponentTotal(studentId, comp, scores, attScores);
  const maxTotal = getComponentMaxTotal(comp, attScores);
  if (maxTotal === 0) return 0;
  return (total / maxTotal) * 50 + 50;
};

const getComponentWeighted = (studentId, comp, scores, attScores) => {
  const equiv = getComponentEquiv(studentId, comp, scores, attScores);
  return (equiv * comp.weight) / 100;
};

const getFinalGrade = (studentId, components, scores, attScores) => {
  let sum = 0;
  components.forEach(c => {
    if (c.is_attendance || c.activities?.length > 0) {
      sum += getComponentWeighted(studentId, c, scores, attScores);
    }
  });
  return sum;
};

const GradeSummary = () => {
  const navigate = useNavigate();

  const { selectedAssignment, currentAssignment, loading: ctxLoading } = useTeacher();

  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [termData, setTermData] = useState({});
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchAllTerms = async () => {
      setDataLoading(true);
      const results = {};
      try {
        const fetches = TERMS.map(async (term) => {
          const [compRes, scoresRes, attRes] = await Promise.all([
            api(`http://localhost:5000/api/grading-components?assignment_id=${selectedAssignment}&term=${term}`),
            api(`http://localhost:5000/api/component-scores?assignment_id=${selectedAssignment}&term=${term}`),
            api(`http://localhost:5000/api/attendance/computed-scores?teacher_assignment_id=${selectedAssignment}&term=${term}`),
          ]);
          const components = compRes.ok ? await compRes.json() : [];
          let scores = {};
          if (scoresRes.ok) {
            const scoreList = await scoresRes.json();
            scoreList.forEach(s => {
              if (!scores[s.activity_id]) scores[s.activity_id] = {};
              scores[s.activity_id][s.student_id] = s.score;
            });
          }
          const attendanceScores = attRes.ok ? await attRes.json() : { max_total: 0, scores: {} };
          results[term] = { components, scores, attendanceScores };
        });
        await Promise.all(fetches);
        setTermData(results);
      } catch (err) { console.error(err); }
      finally { setDataLoading(false); }
    };
    fetchAllTerms();
  }, [selectedAssignment]);

  const studentRows = useMemo(() => {
    if (!students.length || !Object.keys(termData).length) return [];
    return students.map(s => {
      const row = { student: s };
      const termGrades = [];
      TERMS.forEach(term => {
        const td = termData[term];
        if (!td || !td.components.length) {
          row[term] = { grade: null, gp: null };
          return;
        }
        const grade = getFinalGrade(s.id, td.components, td.scores, td.attendanceScores);
        const pt = gradeToPoint(grade);
        row[term] = {
          grade: grade,
          gp: pt.gp,
          desc: pt.desc,
        };
        termGrades.push(grade);
      });
      if (termGrades.length > 0) {
        let weightedSum = 0, totalWeight = 0;
        TERMS.forEach(term => {
          const g = row[term]?.grade;
          if (g !== null) {
            weightedSum += g * TERM_WEIGHTS[term];
            totalWeight += TERM_WEIGHTS[term];
          }
        });
        const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;
        row.finalGrade = avg;
        const fpt = gradeToPoint(avg);
        row.finalGp = fpt.gp;
        row.remarks = fpt.desc;
      } else {
        row.finalGrade = null;
        row.finalGp = null;
        row.remarks = null;
      }
      return row;
    });
  }, [students, termData]);

  const availableTerms = useMemo(() => {
    return TERMS.filter(term => {
      const td = termData[term];
      return td?.components?.some(c => c.is_attendance || c.activities?.length > 0);
    });
  }, [termData]);

  const hasAnyData = Object.values(termData).some(td => td?.components?.some(c => c.is_attendance || c.activities?.length > 0));

  if (ctxLoading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-gray-400" /></div>;
  }

  if (!currentAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <BarChart3 size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  const handleExportExcel = () => {
    const subHeaders = ['#', 'Stud ID', 'Student Name'];
    TERMS.forEach(t => { subHeaders.push('Grade', 'G.P.'); });
    subHeaders.push('FINAL Grade', 'FINAL G.P.', 'Remarks');

    const dataRows = studentRows.map((r, i) => {
      const row = [i + 1, r.student.student_id, r.student.student_name];
      TERMS.forEach(t => {
        const cell = r[t];
        row.push(cell.grade !== null ? cell.grade.toFixed(2) : '-');
        row.push(cell.gp !== null ? cell.gp.toFixed(2) : '-');
      });
      row.push(r.finalGrade !== null ? r.finalGrade.toFixed(2) : '-');
      row.push(r.finalGp !== null ? r.finalGp.toFixed(2) : '-');
      row.push(r.remarks ?? '-');
      return row;
    });

    // Row 0: main header — write merged labels
    const mainHdrRow = Array(subHeaders.length).fill('');
    // STUDENT INFORMATION spans cols 0-2
    mainHdrRow[0] = 'STUDENT INFORMATION';
    TERMS.forEach((t, i) => {
      mainHdrRow[3 + i * 2] = `${t} ${TERM_PCTS[t]}`;
    });
    mainHdrRow[3 + TERMS.length * 2] = 'FINAL GRADE';

    const allRows = [mainHdrRow, subHeaders, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    const colCount = subHeaders.length;
    const rowCount = allRows.length;

    // Column widths
    const colWidths = [
      { wch: 5 },   // #
      { wch: 14 },  // Stud ID
      { wch: 28 },  // Student Name
    ];
    TERMS.forEach(() => { colWidths.push({ wch: 12 }, { wch: 10 }); });
    colWidths.push({ wch: 12 }, { wch: 10 }, { wch: 10 });
    worksheet['!cols'] = colWidths;

    // Colors
    const SIDEBAR = '1B1B2F';
    const TERM_BLUE = '3B82F6';
    const FINAL_GREEN = '529344';
    const GRAY_50 = 'F9FAFB';
    const GRAY_100 = 'F3F4F6';
    const WHITE = 'FFFFFF';
    const BORDER = 'E5E7EB';
    const GREEN_700 = '15803D';
    const RED_600 = 'DC2626';

    const thinBorder = { top: { style: 'thin', color: { rgb: BORDER } }, bottom: { style: 'thin', color: { rgb: BORDER } }, left: { style: 'thin', color: { rgb: BORDER } }, right: { style: 'thin', color: { rgb: BORDER } } };
    const thickerRight = { ...thinBorder, right: { style: 'medium', color: { rgb: BORDER } } };

    const applyStyle = (cell, style) => { if (cell) cell.s = style; };

    // --- Row 0: main header ---
    const hdrStyle = { fill: { fgColor: { rgb: SIDEBAR } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const termHdrStyle = { ...hdrStyle, fill: { fgColor: { rgb: TERM_BLUE } } };
    const finalHdrStyle = { ...hdrStyle, fill: { fgColor: { rgb: FINAL_GREEN } } };

    for (let c = 0; c < 3; c++) applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c })], hdrStyle);
    let col = 3;
    TERMS.forEach(() => {
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c: col })], termHdrStyle);
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c: col + 1 })], termHdrStyle);
      col += 2;
    });
    for (let c = col; c < colCount; c++) applyStyle(worksheet[XLSX.utils.encode_cell({ r: 0, c })], finalHdrStyle);

    // --- Row 1: sub-header ---
    const subHdrStyle = { fill: { fgColor: { rgb: GRAY_50 } }, font: { bold: true, color: { rgb: '1B1B2F' }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const subGpStyle = { ...subHdrStyle, border: thickerRight };
    for (let c = 0; c < colCount; c++) {
      const isGp = (c >= 4 && (c - 4) % 2 === 1) || c === colCount - 2;
      applyStyle(worksheet[XLSX.utils.encode_cell({ r: 1, c })], isGp ? subGpStyle : subHdrStyle);
    }

    // --- Data rows (r >= 2) ---
    const dataCenterStyle = (isGreen) => ({ fill: { fgColor: { rgb: WHITE } }, font: { bold: true, color: { rgb: isGreen ? GREEN_700 : '1B1B2F' }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder });
    const dataFailStyle = { fill: { fgColor: { rgb: WHITE } }, font: { bold: true, color: { rgb: RED_600 }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const dataLeftStyle = { ...dataCenterStyle(false), font: { ...dataCenterStyle(false).font, bold: false }, alignment: { horizontal: 'left', vertical: 'center' } };

    for (let r = 2; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (!cell) continue;

        if (c === 0) { cell.s = { ...dataCenterStyle(false), font: { color: { rgb: '9CA3AF' }, sz: 9 } }; continue; }
        if (c === 1) { cell.s = dataLeftStyle; continue; }
        if (c === 2) { cell.s = { ...dataLeftStyle, font: { ...dataLeftStyle.font, bold: false } }; continue; }

        const isGp = (c >= 4 && (c - 4) % 2 === 1) || c === colCount - 2;
        if (isGp) {
          const isRed = typeof cell.v === 'string' && cell.v === '5.00';
          cell.s = { ...(isRed ? dataFailStyle : dataCenterStyle(false)), border: thickerRight };
          continue;
        }

        if (c >= 3) {
          const numVal = typeof cell.v === 'number' ? cell.v : (typeof cell.v === 'string' && cell.v !== '-' ? parseFloat(cell.v) : null);
          const isFail = numVal !== null && numVal < 75;
          cell.s = isFail ? dataFailStyle : dataCenterStyle(true);
          continue;
        }
        // Remarks column (last)
        if (c === colCount - 1) {
          const isPassed = cell.v !== 'Failed';
          cell.s = { ...(isPassed ? dataCenterStyle(true) : dataFailStyle), font: { ...(isPassed ? dataCenterStyle(true).font : dataFailStyle.font), bold: true } };
          continue;
        }
        cell.s = dataCenterStyle(false);
      }

      if (r % 2 === 1) {
        for (let c = 0; c < colCount; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
          if (cell?.s) cell.s = { ...cell.s, fill: { fgColor: { rgb: GRAY_50 } } };
        }
      }
    }

    // Merges for main header
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },   // STUDENT INFORMATION
    ];
    TERMS.forEach((_, i) => {
      const startCol = 3 + i * 2;
      worksheet['!merges'].push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 1 } });
    });
    const finalStart = 3 + TERMS.length * 2;
    worksheet['!merges'].push({ s: { r: 0, c: finalStart }, e: { r: 0, c: colCount - 1 } });

    worksheet['!rows'] = Array.from({ length: rowCount }, () => ({ hpt: 22 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GradeSummary');
    XLSX.writeFile(workbook, `${currentAssignment.subjects?.name?.replace(/\s+/g, '_')}_GradeSummary.xlsx`);
  };

  const gpColor = (gp) => {
    if (gp === null) return 'text-gray-400';
    if (gp <= 2.00) return 'text-green-700';
    if (gp <= 3.00) return 'text-amber-600';
    return 'text-red-600';
  };

  const gradeColor = (grade) => {
    if (grade === null) return 'text-gray-400';
    if (grade >= 75) return 'text-green-700';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <AssignmentSelector />
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors cursor-pointer" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 font-sans">
              SmartGrade — Grade Summary
            </div>
            <span className="text-sm font-bold text-gray-700">{currentAssignment.subjects?.name} — {currentAssignment.sections?.name}</span>
          </div>
        </div>
        {dataLoading && <Loader size={18} className="animate-spin text-sidebar/40" />}
        {hasAnyData && !dataLoading && (
          <button onClick={handleExportExcel} className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer">
            <Download size={16} /> Export Excel
          </button>
        )}
      </div>

      <div className="mb-2 px-1 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">{currentAssignment?.subjects?.name} — {currentAssignment?.sections?.name}</span>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold bg-white"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {!hasAnyData ? (
          <div className="py-12 text-center text-gray-400">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No grading data available.</p>
            <p className="text-xs mt-1">Set up components and scores in Class Record first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4" style={{ scrollbarWidth: 'auto' }}>
            <table className="min-w-max w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-sidebar border-b-2 border-r-2 border-border p-3 text-white text-left font-bold min-w-[280px] sticky left-0 z-20">
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-gray-300">{searchQuery ? `${studentRows.filter(r => r.student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length}/${students.length}` : students.length} students</span>
                    </div>
                  </th>
                  {TERMS.map(term => (
                    <th key={term} colSpan={2} className="border-b-2 border-r-2 p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0"
                      style={{ backgroundColor: '#3b82f6', borderColor: '#2563eb' }}
                    >
                      {term} {TERM_PCTS[term]}
                    </th>
                  ))}
                  <th className="bg-[#529344] border-b-2 border-[#3d7031] p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0" colSpan={3}>FINAL GRADE</th>
                </tr>
                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20 w-10" style={{ left: 0 }}>#</th>
                  <th className="px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20 w-[110px]" style={{ left: '40px' }}>Stud ID</th>
                  <th className="px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20 w-[180px]" style={{ left: '150px' }}>Student Name</th>
                  {TERMS.map(term => (
                    <React.Fragment key={term}>
                      <th className="px-3 py-2.5 border-r border-gray-200 bg-gray-100/50 w-24 relative z-0">Grade</th>
                      <th className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-100/50 w-24 relative z-0">G.P.</th>
                    </React.Fragment>
                  ))}
                  <th className="px-3 py-2.5 border-r border-gray-200 bg-gray-100/50 w-20 relative z-0 font-semibold text-sidebar">Grade</th>
                  <th className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-100/50 w-16 relative z-0 font-semibold text-sidebar">G.P.</th>
                  <th className="px-3 py-2.5 border-r border-gray-200 bg-gray-100/50 w-24 relative z-0 font-semibold text-sidebar">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = searchQuery
                    ? studentRows.filter(r =>
                        r.student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : studentRows;
                  return students.length === 0 ? (
                    <tr>
                      <td colSpan={3 + TERMS.length * 2 + 3} className="px-6 py-10 text-center text-gray-500 italic">
                        No students in this section.
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3 + TERMS.length * 2 + 3} className="px-6 py-10 text-center text-gray-500 italic">
                        No students match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, index) => (
                    <tr key={row.student.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/30 transition-colors ${highlightedRowId === row.student.id ? '!bg-green-200' : ''}`}>
                      <td className={`px-1 py-1.5 text-center sticky border-r border-b border-gray-200 z-30 w-10 text-gray-400 text-[10px] align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: 0 }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{index + 1}</td>
                      <td className={`px-2 py-1.5 sticky border-r border-b border-gray-200 z-20 w-[110px] text-xs font-mono font-semibold text-sidebar align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: '40px' }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{row.student.student_id}</td>
                      <td className={`px-2 py-1.5 sticky border-r-2 border-b border-border z-20 w-[180px] text-xs font-medium text-sidebar truncate align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} style={{ left: '150px' }} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{row.student.student_name}</td>
                      {TERMS.map(term => {
                        const cell = row[term];
                        return (
                          <React.Fragment key={term}>
                            <td className={`px-2 py-1.5 text-center border-r border-b border-gray-200 font-bold text-xs align-middle ${gradeColor(cell.grade)}`}>
                              {cell.grade !== null ? cell.grade.toFixed(2) : '-'}
                            </td>
                            <td className={`px-2 py-1.5 text-center border-r-2 border-b border-gray-300 font-bold text-xs align-middle ${gpColor(cell.gp)}`}>
                              {cell.gp !== null ? cell.gp.toFixed(2) : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`px-2 py-1.5 text-center font-extrabold text-sm border-b border-gray-200 align-middle ${row.finalGrade !== null && row.finalGrade >= 75 ? 'text-green-900' : 'text-red-600'}`}>
                        {row.finalGrade !== null ? row.finalGrade.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-1.5 text-center font-bold text-xs border-b border-gray-200 align-middle ${gpColor(row.finalGp)}`}>
                        {row.finalGp !== null ? row.finalGp.toFixed(2) : '-'}
                      </td>
                      <td className={`px-2 py-1.5 text-center font-extrabold text-sm border-b border-gray-200 align-middle ${row.remarks !== 'Failed' ? 'text-green-700' : 'text-red-600'}`}>
                        {row.remarks ?? '-'}
                      </td>
                    </tr>
                  ))
                  )})()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grade Point Legend */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Grade Point Scale</div>
        <table className="w-full text-xs text-gray-600 border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 pr-4 font-semibold text-gray-500">Grade</th>
              <th className="text-left py-1 pr-4 font-semibold text-gray-500">Equivalent</th>
              <th className="text-left py-1 font-semibold text-gray-500">Description</th>
            </tr>
          </thead>
          <tbody>
            {GRADE_RANGES.map((r, i) => (
              <tr key={r.gp} className="border-b border-gray-100 last:border-0">
                <td className="py-1 pr-4 font-mono">{r.gp.toFixed(2)}</td>
                <td className="py-1 pr-4 font-mono">{r.min}%{i > 0 ? ` – ${GRADE_RANGES[i - 1].min - 1}%` : ' – 100%'}</td>
                <td className="py-1">{r.desc}</td>
              </tr>
            ))}
            <tr className="border-b border-gray-100 last:border-0">
              <td className="py-1 pr-4 font-mono text-red-600">5.00</td>
              <td className="py-1 pr-4 font-mono text-red-600">below 75%</td>
              <td className="py-1 text-red-600">Failed</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeSummary;
