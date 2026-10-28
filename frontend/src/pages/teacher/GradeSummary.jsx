import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Loader, Summary } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { useTeacher } from '../../contexts/TeacherContext';
import AssignmentSelector from '../../components/common/FloatingAssignmentSelector';
import ExportButtons from '../../components/teacher/ExportButtons';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';
import { SkeletonHeaderCard, SkeletonTable } from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import api from '../../utils/api';
import { buildTeacherFilename } from '../../utils/exportFilenames';
import {
  TERMS, TERM_PCTS, TERM_WEIGHTS, GRADE_RANGES,
  gradeToPoint, getFinalGrade
} from '../../utils/gradeCalculations';

const autoTable = typeof autoTableImport === 'function' ? autoTableImport : autoTableImport.default;

const SEMESTER_TEMPLATE_PATH = `${import.meta.env.BASE_URL}templates/grade-summary-semester-template.xlsx`;
const SEMESTER_TEMPLATE_FIRST_ROW = 23;
const SEMESTER_TEMPLATE_LAST_ROW = 63;

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const imageBytesToDataUrl = (bytes, mimeType) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:${mimeType};base64,${btoa(binary)}`;
};

const replaceCellValue = (rowXml, cellRef, value) => {
  let replaced = false;
  const nextRow = rowXml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, (cellXml) => {
    if (cellXml.match(/\br="([A-Z]+\d+)"/)?.[1] !== cellRef) return cellXml;
    replaced = true;
    const attrs = (cellXml.match(/^<c\b([^>]*?)(?:\/>|>)/)?.[1] || '')
      .replace(/\s+t="[^"]*"/, '');
    if (typeof value === 'string') {
      return `<c${attrs} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }
    const safeValue = Number.isFinite(Number(value)) ? String(Math.round(Number(value) * 100) / 100) : '0';
    return `<c${attrs}><v>${safeValue}</v></c>`;
  });
  if (!replaced) throw new Error(`Missing template cell ${cellRef}`);
  return nextRow;
};

const updateWorksheetCell = (sheetXml, cellRef, value) => {
  const targetRow = Number(cellRef.match(/\d+$/)?.[0]);
  let replaced = false;
  const nextSheet = sheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (rowXml, rowNumber) => {
    if (Number(rowNumber) !== targetRow) return rowXml;
    replaced = true;
    return replaceCellValue(rowXml, cellRef, value);
  });
  if (!replaced) throw new Error(`Missing template row ${targetRow}`);
  return nextSheet;
};

const extendSemesterRows = (sheetXml, studentCount) => {
  const baseStudentCapacity = SEMESTER_TEMPLATE_LAST_ROW - SEMESTER_TEMPLATE_FIRST_ROW + 1;
  const extraRows = Math.max(0, studentCount - baseStudentCapacity);
  if (!extraRows) return { sheetXml, extraRows: 0 };

  let shiftedSheet = sheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (rowXml, rowNumber) => {
    if (Number(rowNumber) < SEMESTER_TEMPLATE_LAST_ROW + 1) return rowXml;
    return rowXml.replace(/\br="([A-Z]*)(\d+)"/g, (attribute, column, referenceRow) => (
      Number(referenceRow) >= SEMESTER_TEMPLATE_LAST_ROW + 1
        ? `r="${column}${Number(referenceRow) + extraRows}"`
        : attribute
    ));
  });

  const baseRowMatch = shiftedSheet.match(/<row\b[^>]*\br="63"[^>]*>[\s\S]*?<\/row>/);
  if (!baseRowMatch) throw new Error('Semester template is missing a row style to extend.');
  const newRows = Array.from({ length: extraRows }, (_, index) => {
    const newRowNumber = SEMESTER_TEMPLATE_LAST_ROW + index + 1;
    return baseRowMatch[0].replace(/\br="([A-Z]*)(\d+)"/g, (attribute, column, referenceRow) => (
      Number(referenceRow) === SEMESTER_TEMPLATE_LAST_ROW ? `r="${column}${newRowNumber}"` : attribute
    ));
  }).join('');
  shiftedSheet = shiftedSheet.replace(baseRowMatch[0], `${baseRowMatch[0]}${newRows}`);
  shiftedSheet = shiftedSheet.replace(/<dimension\b([^>]*?)ref="A10:L(\d+)"/, (match, attrs, lastRow) => (
    `<dimension${attrs}ref="A10:L${Number(lastRow) + extraRows}"`
  ));
  return { sheetXml: shiftedSheet, extraRows };
};

const GradeSummary = () => {
  const { selectedAssignment, currentAssignment, loading: ctxLoading } = useTeacher();

  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [termData, setTermData] = useState({});
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!currentAssignment) return;
    const fetchStudents = async () => {
      try {
        const res = await api(`/api/sections/${currentAssignment.section_id}/students`);
        if (res.ok) setStudents(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchStudents();
  }, [currentAssignment]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchAllTerms = async () => {
      setDataLoading(true);
      const results = {};
      try {
        const fetches = TERMS.map(async (term) => {
          const [compRes, scoresRes, attRes] = await Promise.all([
            api(`/api/grading-components?assignment_id=${selectedAssignment}&term=${term}`),
            api(`/api/component-scores?assignment_id=${selectedAssignment}&term=${term}`),
            api(`/api/attendance/computed-scores?teacher_assignment_id=${selectedAssignment}&term=${term}`),
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
      const termWeightedScores = [];
      TERMS.forEach(term => {
        const td = termData[term];
        const hasRecordedScore = td?.components?.some(c => {
          if (c.is_attendance) {
            return Object.prototype.hasOwnProperty.call(td.attendanceScores?.scores || {}, s.id);
          }
          return (c.activities || []).some(activity => {
            const score = td.scores?.[activity.id]?.[s.id];
            return score !== null && score !== undefined;
          });
        });
        const grade = hasRecordedScore
          ? getFinalGrade(s.id, td.components, td.scores, td.attendanceScores)
          : 50;
        const weightedScore = grade * TERM_WEIGHTS[term];
        row[term] = {
          grade: grade,
          weightedScore,
        };
        termWeightedScores.push(weightedScore);
      });
      const finalGrade = termWeightedScores.reduce((sum, score) => sum + score, 0);
      row.finalGrade = finalGrade;
      const fpt = gradeToPoint(finalGrade);
      row.finalGp = fpt.gp;
      row.remarks = fpt.desc;
      return row;
    });
  }, [students, termData]);

  const hasAnyData = Object.values(termData).some(td => td?.components?.some(c => c.is_attendance || c.activities?.length > 0));

  if (ctxLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <AssignmentSelector />
        <SkeletonHeaderCard />
        <SkeletonTable cols={8} rows={8} />
      </div>
    );
  }

  if (!currentAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Summary size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  const getSummaryFiltered = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return studentRows;
    return studentRows.filter(r =>
      r.student.student_name?.toLowerCase().includes(q) ||
      r.student.student_id?.toLowerCase().includes(q)
    );
  };

  const handleExportExcel = async () => {
    const filtered = getSummaryFiltered();
    const response = await fetch(SEMESTER_TEMPLATE_PATH);
    if (!response.ok) throw new Error('Semester export template could not be loaded.');
    const parts = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const worksheetPath = 'xl/worksheets/sheet5.xml';
    const extended = extendSemesterRows(strFromU8(parts[worksheetPath]), filtered.length);
    let sheetXml = extended.sheetXml;

    sheetXml = updateWorksheetCell(
      sheetXml,
      'A15',
      `${currentAssignment.subjects?.code || ''}${currentAssignment.subjects?.code && currentAssignment.subjects?.name ? ': ' : ''}${currentAssignment.subjects?.name || ''}`,
    );
    sheetXml = updateWorksheetCell(sheetXml, 'A16', `SEMESTER SUMMARY CLASS RECORD - ${currentAssignment.sections?.name || ''}`);
    sheetXml = updateWorksheetCell(sheetXml, 'A17', `${currentAssignment.semester || '1st Semester'}, Academic Year ${currentAssignment.school_year || ''}`);
    sheetXml = updateWorksheetCell(sheetXml, `A${70 + extended.extraRows}`, currentAssignment.teacher?.full_name?.toUpperCase() || '');
    sheetXml = updateWorksheetCell(sheetXml, 'D21', TERM_WEIGHTS.PRELIMS);
    sheetXml = updateWorksheetCell(sheetXml, 'F21', TERM_WEIGHTS.MIDTERMS);
    sheetXml = updateWorksheetCell(sheetXml, 'H21', TERM_WEIGHTS['PRE-FINALS']);
    sheetXml = updateWorksheetCell(sheetXml, 'J21', TERM_WEIGHTS.FINALS);
    sheetXml = updateWorksheetCell(sheetXml, 'K21', 1);

    const termColumns = [
      ['PRELIMS', 'C', 'D'],
      ['MIDTERMS', 'E', 'F'],
      ['PRE-FINALS', 'G', 'H'],
      ['FINALS', 'I', 'J'],
    ];
    for (let index = 0; index < filtered.length; index += 1) {
      const rowNumber = SEMESTER_TEMPLATE_FIRST_ROW + index;
      const rowData = filtered[index];
      const values = [
        ['A', index + 1],
        ['B', rowData.student.student_name || ''],
        ...termColumns.flatMap(([term, gradeColumn, scoreColumn]) => [
          [gradeColumn, rowData[term].grade],
          [scoreColumn, rowData[term].weightedScore],
        ]),
        ['K', rowData.finalGrade],
        ['L', rowData.finalGp.toFixed(2)],
      ];
      let foundRow = false;
      sheetXml = sheetXml.replace(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g, (rowXml, value) => {
        if (Number(value) !== rowNumber) return rowXml;
        foundRow = true;
        return values.reduce((updatedRow, [column, cellValue]) => (
          replaceCellValue(updatedRow, `${column}${rowNumber}`, cellValue)
        ), rowXml);
      });
      if (!foundRow) throw new Error(`Semester template is missing student row ${rowNumber}.`);
    }

    parts[worksheetPath] = strToU8(sheetXml);
    const workbookBytes = zipSync(parts, { level: 6 });
    const workbookBlob = new Blob([workbookBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = URL.createObjectURL(workbookBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = buildTeacherFilename({ section: currentAssignment.sections?.name, code: currentAssignment.subjects?.code, term: 'semester', page: 'gradesummary', ext: 'xlsx' });
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handleExportPdf = async () => {
    if (!currentAssignment || exporting) return;
    setExporting('pdf');
    setExportError('');
    try {
      const filtered = getSummaryFiltered();
      const response = await fetch(SEMESTER_TEMPLATE_PATH);
      if (!response.ok) throw new Error('Semester export template could not be loaded.');
      const parts = unzipSync(new Uint8Array(await response.arrayBuffer()));
      const leftLogo = imageBytesToDataUrl(parts['xl/media/image2.jpg'], 'image/jpeg');
      const rightLogo = imageBytesToDataUrl(parts['xl/media/image1.png'], 'image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 32;
      const blueHeader = [1, 87, 155];
      const termHeader = [34, 90, 165];
      const semesterHeader = [254, 242, 0];
      const headerCell = (content, color, textColor = [255, 255, 255], options = {}) => ({
        content,
        ...options,
        styles: { fillColor: color, textColor, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      });
      const groupHead = [[
        headerCell('NO.', blueHeader, [255, 255, 255], { rowSpan: 2 }),
        headerCell('NAME', blueHeader, [255, 255, 255], { rowSpan: 2 }),
        headerCell('PRELIM', termHeader, [255, 255, 255], { colSpan: 2 }),
        headerCell('MIDTERM', termHeader, [255, 255, 255], { colSpan: 2 }),
        headerCell('PRE-FINALS', termHeader, [255, 255, 255], { colSpan: 2 }),
        headerCell('FINALS', termHeader, [255, 255, 255], { colSpan: 2 }),
        headerCell('SEMESTER GRADE', semesterHeader, [0, 0, 0], { rowSpan: 2 }),
        headerCell('GRADE EQUIVALENT', semesterHeader, [0, 0, 0], { rowSpan: 2 }),
      ], [
        'Grade', TERM_PCTS.PRELIMS,
        'Grade', TERM_PCTS.MIDTERMS,
        'Grade', TERM_PCTS['PRE-FINALS'],
        'Grade', TERM_PCTS.FINALS,
      ]];
      const body = filtered.map((row, index) => [
        index + 1,
        row.student.student_name || '',
        row.PRELIMS.grade.toFixed(2), row.PRELIMS.weightedScore.toFixed(2),
        row.MIDTERMS.grade.toFixed(2), row.MIDTERMS.weightedScore.toFixed(2),
        row['PRE-FINALS'].grade.toFixed(2), row['PRE-FINALS'].weightedScore.toFixed(2),
        row.FINALS.grade.toFixed(2), row.FINALS.weightedScore.toFixed(2),
        row.finalGrade.toFixed(2), row.finalGp.toFixed(2),
      ]);
      const courseTitle = `${currentAssignment.subjects?.code || ''}${currentAssignment.subjects?.code && currentAssignment.subjects?.name ? ': ' : ''}${currentAssignment.subjects?.name || ''}`;
      const semesterTitle = `${currentAssignment.semester || '1st Semester'}, Academic Year ${currentAssignment.school_year || ''}`;
      const drawPageHeader = () => {
        doc.addImage(leftLogo, 'JPEG', margin, 18, 56, 56);
        doc.addImage(rightLogo, 'PNG', pageW - margin - 56, 18, 56, 56);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('STI WEST NEGROS UNIVERSITY', pageW / 2, 31, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('Burgos St., Bacolod City 6100', pageW / 2, 45, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('COLLEGE of INFORMATION and COMMUNICATIONS TECHNOLOGY', pageW / 2, 61, { align: 'center' });
        doc.setFontSize(9);
        doc.text(courseTitle, pageW / 2, 87, { align: 'center', maxWidth: pageW - 190 });
        doc.setFontSize(11);
        doc.text(`SEMESTER SUMMARY CLASS RECORD - ${currentAssignment.sections?.name || ''}`, pageW / 2, 104, { align: 'center' });
        doc.setFontSize(9);
        doc.text(semesterTitle, pageW / 2, 119, { align: 'center' });
      };

      doc.setProperties({ title: 'Semester Summary Class Record', subject: courseTitle });
      autoTable(doc, {
        head: groupHead,
        body,
        startY: 136,
        margin: { top: 136, left: margin, right: margin, bottom: 20 },
        theme: 'grid',
        showHead: 'everyPage',
        styles: {
          font: 'helvetica', fontSize: 7, textColor: [0, 0, 0], fillColor: [255, 255, 255],
          lineColor: [100, 100, 100], lineWidth: 0.3, cellPadding: 3,
          halign: 'center', valign: 'middle', overflow: 'linebreak',
        },
        headStyles: { fontStyle: 'bold', fontSize: 7, fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [100, 100, 100], lineWidth: 0.3 },
        columnStyles: {
          0: { cellWidth: 34 }, 1: { cellWidth: 220, halign: 'left' },
          2: { cellWidth: 62 }, 3: { cellWidth: 54 },
          4: { cellWidth: 62 }, 5: { cellWidth: 54 },
          6: { cellWidth: 62 }, 7: { cellWidth: 54 },
          8: { cellWidth: 62 }, 9: { cellWidth: 54 },
          10: { cellWidth: 80 }, 11: { cellWidth: 80 },
        },
        didDrawPage: drawPageHeader,
      });

      const signatures = [
        ['Submitted by:', 'Reviewed by:', 'Approved by:'],
        [currentAssignment.teacher?.full_name?.toUpperCase() || '', 'ARIEL T. SUMAGAYSAY, MSCS, MAEd', 'MAE B. LODANA, Ph.D.'],
        ['Course Instructor', 'Program Head, BSIT', 'Dean, CICT'],
      ].map((row, rowIndex) => row.map(content => ({
        content,
        styles: {
          fontStyle: rowIndex === 1 ? 'bold' : 'normal',
          fontSize: rowIndex === 0 ? 8 : 8.5,
          halign: rowIndex === 0 ? 'left' : 'center',
          cellPadding: rowIndex === 0 ? { top: 2, bottom: 1, left: 4, right: 4 } : { top: 1, bottom: 1, left: 4, right: 4 },
          lineWidth: 0,
        },
      })));
      autoTable(doc, {
        body: signatures,
        startY: doc.lastAutoTable.finalY + 10,
        margin: { top: 136, left: margin, right: margin, bottom: 18 },
        theme: 'plain',
        styles: { textColor: [0, 0, 0], valign: 'middle', overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: (pageW - margin * 2) / 3 }, 1: { cellWidth: (pageW - margin * 2) / 3 }, 2: { cellWidth: (pageW - margin * 2) / 3 } },
        didDrawPage: drawPageHeader,
        rowPageBreak: 'avoid',
      });
      doc.save(buildTeacherFilename({ section: currentAssignment.sections?.name, code: currentAssignment.subjects?.code, term: 'semester', page: 'gradesummary', ext: 'pdf' }));
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
      setExportError(err.message || 'Excel export failed. Please try again.');
    } finally {
      setExporting(null);
    }
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
      <TeacherPageHeading
        eyebrow="Student outcomes"
        title="Grade Summary"
        description="Review final grades and semester outcomes for your assigned classes."
        actions={hasAnyData && !dataLoading && <ExportButtons onExcel={onExcelClick} onPdf={handleExportPdf} exporting={exporting} error={exportError} />}
      />
      <AssignmentSelector />

      <div className="mb-2 px-1 flex items-center justify-end">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border card-hover overflow-hidden">
        {dataLoading && !hasAnyData ? (
          <div aria-busy="true"><SkeletonTable cols={8} rows={8} /></div>
        ) : !hasAnyData ? (
          <div className="py-12 text-center text-gray-500">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No grading data available.</p>
            <p className="text-xs mt-1">Set up components and scores in Class Record first.</p>
          </div>
        ) : (
          <div className="table-scroll w-full rounded-lg" style={{ scrollbarWidth: 'auto' }}>
            <table className="sticky-cols sticky-cols-compact min-w-max w-full text-xs select-none" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="sticky-student-header bg-sidebar border-b-2 border-r-2 border-border p-3 text-white text-left font-bold sticky left-0 z-20" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-gray-300">{searchQuery ? `${studentRows.filter(r => r.student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length}/${students.length}` : students.length} students</span>
                    </div>
                  </th>
                  {TERMS.map(term => (
                    <th key={term} colSpan={2} className="border-b-2 border-r-2 p-3 text-white text-center font-bold text-sm uppercase tracking-wider relative z-0" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
                      {term} {TERM_PCTS[term]}
                    </th>
                  ))}
                  <th className="bg-amber-400 border-b-2 border-gold-hover p-3 text-[#0c1925] text-center font-bold text-sm uppercase tracking-wider relative z-0" colSpan={3}>SEMESTRAL GRADE</th>
                </tr>
                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="sticky-student-number px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20">#</th>
                  <th className="sticky-student-id px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20">Stud ID</th>
                  <th className="sticky-student-name px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20">Student Name</th>
                  {TERMS.map(term => (
                    <React.Fragment key={term}>
                      <th className="px-3 py-2.5 border-r border-gray-200 bg-gray-100/50 w-24 relative z-0">Grade</th>
                      <th className="px-3 py-2.5 border-r-2 border-gray-300 bg-gray-100/50 w-24 relative z-0">{TERM_PCTS[term]}</th>
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
                   const paginatedRows = filtered.slice((page - 1) * 10, page * 10);
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
                    paginatedRows.map((row, index) => (
                    <tr key={row.student.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/30 transition-colors ${highlightedRowId === row.student.id ? '!bg-green-200' : ''}`}>
                       <td className={`sticky-student-number px-1 py-1.5 text-center sticky border-r border-b border-gray-200 z-30 text-gray-400 text-[10px] align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{(page - 1) * 10 + index + 1}</td>
                      <td className={`sticky-student-id px-2 py-1.5 sticky border-r border-b border-gray-200 z-20 text-xs font-mono font-semibold text-sidebar align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{row.student.student_id}</td>
                      <td className={`sticky-student-name px-2 py-1.5 sticky border-r-2 border-b border-border z-20 text-xs font-medium text-sidebar align-middle ${highlightedRowId === row.student.id ? '!bg-green-200' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`} onClick={e => { e.stopPropagation(); setHighlightedRowId(highlightedRowId === row.student.id ? null : row.student.id); }}>{row.student.student_name}</td>
                      {TERMS.map(term => {
                        const cell = row[term];
                        return (
                          <React.Fragment key={term}>
                            <td className={`px-2 py-1.5 text-center border-r border-b border-gray-200 font-bold text-xs align-middle ${gradeColor(cell.grade)}`}>
                              {cell.grade !== null ? cell.grade.toFixed(2) : '-'}
                            </td>
                            <td className="px-2 py-1.5 text-center border-r-2 border-b border-gray-300 font-bold text-xs align-middle text-green-700">
                              {cell.weightedScore.toFixed(2)}
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
        {hasAnyData && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((searchQuery ? studentRows.filter(r => r.student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : studentRows.length) / 10)}
            onPageChange={setPage}
            totalItems={searchQuery ? studentRows.filter(r => r.student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.student.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length : studentRows.length}
            rowsPerPage={10}
          />
        )}
      </div>

      {/* Grade Point Legend */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 card-hover">
        <div className="text-[12px] font-bold text-gray-900 uppercase tracking-wider mb-2">Grade Point Scale</div>
        <table className="w-full text-xs text-gray-900 border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 pr-4 font-semibold text-gray-900">Grade</th>
              <th className="text-left py-1 pr-4 font-semibold text-gray-900">Equivalent</th>
              <th className="text-left py-1 font-semibold text-gray-900">Description</th>
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



