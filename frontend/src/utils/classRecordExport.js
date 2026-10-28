import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';
import { strToU8, unzipSync, zipSync } from 'fflate';

const autoTable = typeof autoTableImport === 'function' ? autoTableImport : autoTableImport.default;
const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/grade-summary-semester-template.xlsx`;
const BLUE = '225AA5';
const YELLOW = 'FEF200';
const RED = 'FF1F1F';
const BLACK = '111111';
const GRID = '222222';

const termName = (term) => ({
  PRELIMS: 'PRELIM',
  MIDTERMS: 'MIDTERM',
  'PRE-FINALS': 'PRE-FINAL',
  FINALS: 'FINAL',
}[term] || term);

const getTitles = (assignment, term) => ({
  course: `${assignment.subjects?.code || ''}${assignment.subjects?.code && assignment.subjects?.name ? ': ' : ''}${assignment.subjects?.name || ''}`.trim().toUpperCase(),
  classRecord: `${termName(term)} CLASS RECORD - ${assignment.sections?.name || ''}`,
  semester: `${assignment.semester || 'Semester'}, Academic Year ${assignment.school_year || ''}`,
});

const loadBrandAssets = async () => {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('The class record export logos could not be loaded.');
  const template = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const leftLogo = template['xl/media/image2.jpg'];
  const rightLogo = template['xl/media/image1.png'];
  if (!leftLogo || !rightLogo) throw new Error('The class record export logos are missing.');
  return { leftLogo, rightLogo };
};

const visibleGroups = (components) => components
  .filter((component) => component.is_attendance || component.activities?.length > 0)
  .map((component) => ({ ...component, activities: component.is_attendance ? [] : (component.activities || []) }));

const signatureStartColumns = (columnCount) => (columnCount >= 10
  ? [0, 4, columnCount - 3]
  : [0, Math.floor(columnCount / 3), Math.floor((columnCount * 2) / 3)]);

const buildTableData = ({ students, groups, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade }) => {
  const header = ['NO.', 'NAME'];
  const maxScore = ['', ''];
  const columns = [{ kind: 'number' }, { kind: 'name' }];

  groups.forEach((group, groupIndex) => {
    group.activities.forEach((activity) => {
      header.push(activity.name || 'Activity');
      maxScore.push(activity.is_attendance ? Number(attendanceScores?.max_total) || 0 : Number(activity.max_score) || 0);
      columns.push({ kind: 'activity', groupIndex, activity });
    });
    // Keep the subheader array aligned with the weighted-score column. In the
    // Excel layout that column is represented by a vertically merged weight
    // cell above it, so its subheader slot must stay blank.
    header.push('TOTAL', 'EQUIV', '');
    maxScore.push(getComponentMaxTotal(group), 100, Number(group.weight || 0));
    columns.push(
      { kind: 'total', groupIndex },
      { kind: 'equiv', groupIndex },
      { kind: 'weighted', groupIndex },
    );
  });

  header.push(`${termName(groups.selectedTerm || '')} GRADE`);
  columns.push({ kind: 'grade' });
  maxScore.push(100);

  const rows = students.map((student, index) => {
    const values = [index + 1, student.student_name || ''];
    groups.forEach((group) => {
      group.activities.forEach((activity) => values.push(activity.is_attendance
        ? attendanceScores?.scores?.[student.id] ?? 0
        : scores[activity.id]?.[student.id] ?? 0));
      values.push(
        getComponentTotal(student.id, group),
        Number(getComponentEquiv(student.id, group).toFixed(2)),
        Number(getComponentWeighted(student.id, group).toFixed(2)),
      );
    });
    values.push(Number(getFinalGrade(student.id).toFixed(2)));
    return values;
  });

  return { header, maxScore, columns, rows };
};

const buildDrawingXml = (rightColumn) => {
  const picture = (id, name, relationId) => `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${name}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relationId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>`;
  const anchor = (column, relationId, id, name, width, height) => `<xdr:oneCellAnchor><xdr:from><xdr:col>${column}</xdr:col><xdr:colOff>50000</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>50000</xdr:rowOff></xdr:from><xdr:ext cx="${width}" cy="${height}"/>${picture(id, name, relationId)}<xdr:clientData/></xdr:oneCellAnchor>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchor(1, 'rId1', 1, 'STI West Negros University logo', 950000, 780000)}${anchor(rightColumn, 'rId2', 2, 'University seal', 780000, 780000)}</xdr:wsDr>`;
};

const addExcelLogoDrawing = (workbookBytes, brandAssets, rightColumn) => {
  const files = unzipSync(new Uint8Array(workbookBytes));
  const worksheet = new TextDecoder().decode(files['xl/worksheets/sheet1.xml']);
  files['xl/worksheets/sheet1.xml'] = strToU8(worksheet.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>'));
  files['xl/worksheets/_rels/sheet1.xml.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
  files['xl/drawings/drawing1.xml'] = strToU8(buildDrawingXml(rightColumn));
  files['xl/drawings/_rels/drawing1.xml.rels'] = strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/sti-logo.jpg"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/university-seal.png"/></Relationships>');
  files['xl/media/sti-logo.jpg'] = brandAssets.leftLogo;
  files['xl/media/university-seal.png'] = brandAssets.rightLogo;
  const contentTypes = new TextDecoder().decode(files['[Content_Types].xml']);
  files['[Content_Types].xml'] = strToU8(contentTypes.replace('</Types>', '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>'));
  return zipSync(files, { level: 6 });
};

export async function exportClassRecordExcel({ assignment, term, students, components, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade, filename }) {
  const assets = await loadBrandAssets();
  const groups = visibleGroups(components);
  groups.selectedTerm = term;
  const { header, maxScore, columns, rows } = buildTableData({ students, groups, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade });
  const title = getTitles(assignment, term);
  const lastColumn = columns.length - 1;
  const topHeaderRow = 12;
  const subHeaderRow = 13;
  const maxScoreRow = 14;
  const dataStart = 15;
  const signatureRow = dataStart + rows.length + 1;
  const matrix = Array.from({ length: signatureRow + 5 }, () => Array(columns.length).fill(null));
  const setCell = (r, c, value) => { matrix[r][c] = value; };
  setCell(2, 0, 'STI WEST NEGROS UNIVERSITY');
  setCell(3, 0, 'Burgos St., Bacolod City 6100');
  setCell(5, 0, 'COLLEGE of INFORMATION and COMMUNICATIONS TECHNOLOGY');
  setCell(7, 0, title.course);
  setCell(8, 0, title.classRecord);
  setCell(9, 0, title.semester);
  setCell(topHeaderRow, 0, 'NO.');
  setCell(topHeaderRow, 1, 'NAME');
  header.forEach((value, index) => setCell(subHeaderRow, index, value));
  maxScore.forEach((value, index) => setCell(maxScoreRow, index, value));
  rows.forEach((row, rowIndex) => row.forEach((value, colIndex) => setCell(dataStart + rowIndex, colIndex, value)));

  const merges = [
    ...[2, 3, 5, 7, 8, 9].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: lastColumn } })),
    { s: { r: topHeaderRow, c: 0 }, e: { r: maxScoreRow, c: 0 } },
    { s: { r: topHeaderRow, c: 1 }, e: { r: maxScoreRow, c: 1 } },
  ];
  let column = 2;
  const weightColumns = new Set();
  groups.forEach((group) => {
    const groupEnd = column + group.activities.length + 1;
    const weightColumn = groupEnd + 1;
    merges.push({ s: { r: topHeaderRow, c: column }, e: { r: topHeaderRow, c: groupEnd } });
    merges.push({ s: { r: topHeaderRow, c: weightColumn }, e: { r: subHeaderRow, c: weightColumn } });
    setCell(topHeaderRow, column, group.name?.toUpperCase() || 'COMPONENT');
    setCell(topHeaderRow, weightColumn, Number(group.weight || 0) / 100);
    weightColumns.add(weightColumn);
    column = weightColumn + 1;
  });
  setCell(topHeaderRow, lastColumn, title.classRecord.split(' ')[0] + ' GRADE');
  merges.push({ s: { r: topHeaderRow, c: lastColumn }, e: { r: subHeaderRow, c: lastColumn } });

  const signatureColumns = signatureStartColumns(columns.length);
  const signatureLabels = ['Submitted by:', 'Reviewed by:', 'Approved by:'];
  const signatureNames = [assignment.teacher?.full_name?.toUpperCase() || '', 'ARIEL T. SUMAGAYSAY, MSCS, MAEd', 'MAE B. LODANA, Ph.D.'];
  const signatureRoles = ['Course Instructor', 'Program Head, BSIT', 'Dean, CICT'];
  signatureColumns.forEach((col, index) => {
    setCell(signatureRow, col, signatureLabels[index]);
    setCell(signatureRow + 3, col, signatureNames[index]);
    setCell(signatureRow + 4, col, signatureRoles[index]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(matrix);
  sheet['!cols'] = columns.map((columnInfo) => ({ wch: columnInfo.kind === 'name' ? 30 : columnInfo.kind === 'number' ? 6 : columnInfo.kind === 'activity' ? 8 : columnInfo.kind === 'grade' ? 14 : 9 }));
  sheet['!merges'] = merges;
  sheet['!rows'] = matrix.map((_, row) => ({ hpt: row === 2 ? 26 : row === 3 ? 18 : row === 5 ? 24 : [7, 8, 9].includes(row) ? 22 : row === topHeaderRow ? 30 : [subHeaderRow, maxScoreRow].includes(row) ? 22 : row >= dataStart && row < dataStart + rows.length ? 20 : 20 }));
  const thinBorder = { top: { style: 'thin', color: { rgb: GRID } }, bottom: { style: 'thin', color: { rgb: GRID } }, left: { style: 'thin', color: { rgb: GRID } }, right: { style: 'thin', color: { rgb: GRID } } };
  const centered = { horizontal: 'center', vertical: 'center', wrapText: true };
  const styleCell = (r, c, style) => { const cell = sheet[XLSX.utils.encode_cell({ r, c })]; if (cell) cell.s = style; };
  const normalTitle = { font: { name: 'Arial', bold: true, color: { rgb: BLACK }, sz: 12 }, alignment: centered };
  styleCell(2, 0, { ...normalTitle, font: { ...normalTitle.font, sz: 14 } });
  styleCell(3, 0, { font: { name: 'Arial', color: { rgb: BLACK }, sz: 10 }, alignment: centered });
  styleCell(5, 0, { ...normalTitle, font: { ...normalTitle.font, sz: 12 } });
  styleCell(7, 0, { font: { name: 'Arial', bold: true, color: { rgb: RED }, sz: 16 }, alignment: centered });
  styleCell(8, 0, { ...normalTitle, font: { ...normalTitle.font, sz: 14 } });
  styleCell(9, 0, { ...normalTitle, font: { ...normalTitle.font, sz: 11 } });
  const headerStyle = { fill: { fgColor: { rgb: BLUE } }, font: { name: 'Arial', bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, alignment: centered, border: thinBorder };
  const subHeaderStyle = { fill: { fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Arial', bold: true, color: { rgb: BLACK }, sz: 9 }, alignment: centered, border: thinBorder };
  const maxStyle = { fill: { fgColor: { rgb: 'FFFFFF' } }, font: { name: 'Arial', bold: true, color: { rgb: BLACK }, sz: 9 }, alignment: centered, border: thinBorder };
  for (let c = 0; c <= lastColumn; c += 1) {
    styleCell(topHeaderRow, c, headerStyle);
    styleCell(subHeaderRow, c, subHeaderStyle);
    styleCell(maxScoreRow, c, maxStyle);
  }
  weightColumns.forEach((c) => {
    const weightStyle = { fill: { fgColor: { rgb: YELLOW } }, font: { name: 'Arial', bold: true, color: { rgb: BLACK }, sz: 10 }, alignment: centered, border: thinBorder, numFmt: '0%' };
    styleCell(topHeaderRow, c, weightStyle);
    styleCell(subHeaderRow, c, weightStyle);
    styleCell(maxScoreRow, c, { ...maxStyle, numFmt: '0.00' });
  });
  for (let r = dataStart; r < dataStart + rows.length; r += 1) {
    for (let c = 0; c <= lastColumn; c += 1) {
      const value = sheet[XLSX.utils.encode_cell({ r, c })]?.v;
      const failedGrade = columns[c]?.kind === 'grade' && Number(value) < 75;
      styleCell(r, c, { fill: { fgColor: { rgb: r % 2 === 0 ? 'FFFFFF' : 'F7F7F7' } }, font: { name: 'Arial', bold: ['weighted', 'grade'].includes(columns[c]?.kind), color: { rgb: failedGrade ? RED : BLACK }, sz: 9 }, alignment: { horizontal: columns[c]?.kind === 'name' ? 'left' : 'center', vertical: 'center' }, border: thinBorder, numFmt: ['weighted', 'equiv', 'grade'].includes(columns[c]?.kind) ? '0.00' : 'General' });
    }
  }
  signatureColumns.forEach((c, index) => {
    styleCell(signatureRow, c, { font: { name: 'Arial', sz: 10, color: { rgb: BLACK } } });
    styleCell(signatureRow + 3, c, { font: { name: 'Arial', bold: true, sz: 11, color: { rgb: index === 1 ? RED : BLACK } } });
    styleCell(signatureRow + 4, c, { font: { name: 'Arial', sz: 9, color: { rgb: BLACK } } });
  });

  const workbook = XLSX.utils.book_new();
  const sheetName = { PRELIMS: 'Prelim', MIDTERMS: 'Midterm', 'PRE-FINALS': 'PreFinals', FINALS: 'Finals' }[term] || 'Class Record';
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  sheet['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet['!margins'] = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
  sheet['!freeze'] = { xSplit: 2, ySplit: 15, topLeftCell: 'C16', activePane: 'bottomRight', state: 'frozen' };
  const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const withLogos = addExcelLogoDrawing(workbookBytes, assets, Math.max(2, lastColumn - 2));
  const blob = new Blob([withLogos], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportClassRecordPdf({ assignment, term, students, components, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade, filename }) {
  const assets = await loadBrandAssets();
  const groups = visibleGroups(components);
  groups.selectedTerm = term;
  const { columns, rows } = buildTableData({ students, groups, scores, attendanceScores, getComponentMaxTotal, getComponentTotal, getComponentEquiv, getComponentWeighted, getFinalGrade });
  const title = getTitles(assignment, term);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'legal' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28;
  const leftLogo = `data:image/jpeg;base64,${btoa(Array.from(assets.leftLogo, (byte) => String.fromCharCode(byte)).join(''))}`;
  const rightLogo = `data:image/png;base64,${btoa(Array.from(assets.rightLogo, (byte) => String.fromCharCode(byte)).join(''))}`;
  const imageX = margin;
  const imageRightX = pageWidth - margin - 56;
  const drawInstitutionHeader = () => {
    doc.addImage(leftLogo, 'JPEG', imageX, 14, 56, 56);
    doc.addImage(rightLogo, 'PNG', imageRightX, 14, 56, 56);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('STI WEST NEGROS UNIVERSITY', pageWidth / 2, 25, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Burgos St., Bacolod City 6100', pageWidth / 2, 38, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('COLLEGE of INFORMATION and COMMUNICATIONS TECHNOLOGY', pageWidth / 2, 57, { align: 'center' });
    doc.setTextColor(255, 31, 31);
    doc.setFontSize(14);
    doc.text(title.course, pageWidth / 2, 86, { align: 'center', maxWidth: pageWidth - 180 });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(title.classRecord, pageWidth / 2, 105, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title.semester, pageWidth / 2, 122, { align: 'center' });
  };

  const tableHead = [[
    { content: 'NO.', rowSpan: 3, styles: { fillColor: [34, 90, 165], textColor: [255, 255, 255] } },
    { content: 'NAME', rowSpan: 3, styles: { fillColor: [34, 90, 165], textColor: [255, 255, 255], halign: 'left' } },
  ]];
  const secondHead = [];
  const maxScoreHead = [];
  groups.forEach((group) => {
    tableHead[0].push({ content: group.name?.toUpperCase() || 'COMPONENT', colSpan: group.activities.length + 2, styles: { fillColor: [34, 90, 165], textColor: [255, 255, 255] } });
    tableHead[0].push({ content: `${group.weight || 0}%`, rowSpan: 2, styles: { fillColor: [254, 242, 0], textColor: [0, 0, 0] } });
    group.activities.forEach((activity) => {
      secondHead.push({ content: activity.name || 'Activity', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] } });
      maxScoreHead.push({ content: activity.is_attendance ? Number(attendanceScores?.max_total) || 0 : Number(activity.max_score) || 0, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } });
    });
    secondHead.push(
      { content: 'TOTAL', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
      { content: 'EQUIV', styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
    );
    maxScoreHead.push({ content: getComponentMaxTotal(group), styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } }, { content: 100, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } });
    maxScoreHead.push({ content: Number(group.weight || 0).toFixed(2), styles: { fillColor: [254, 242, 0], textColor: [0, 0, 0], fontStyle: 'bold' } });
  });
  tableHead[0].push({ content: `${termName(term)} GRADE`, rowSpan: 2, styles: { fillColor: [34, 90, 165], textColor: [255, 255, 255] } });
  maxScoreHead.push({ content: 100, styles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' } });
  tableHead.push(secondHead, maxScoreHead);

  const body = rows.map((row) => row.map((value, column) => {
    const fail = columns[column]?.kind === 'grade' && Number(value) < 75;
    return { content: value, styles: { textColor: fail ? [220, 38, 38] : [0, 0, 0], fontStyle: ['weighted', 'grade'].includes(columns[column]?.kind) ? 'bold' : 'normal', halign: columns[column]?.kind === 'name' ? 'left' : 'center' } };
  }));
  const availableWidth = pageWidth - margin * 2;
  const count = columns.length;
  const scoreWidth = Math.max(10, Math.min(40, (availableWidth - 254) / Math.max(1, count - 3)));
  const columnStyles = { 0: { cellWidth: 28 }, 1: { cellWidth: 162, halign: 'left' } };
  const pdfColumnWidths = columns.map((column, index) => {
    if (index === 0) return 28;
    if (index === 1) return 162;
    if (column.kind === 'grade') return 64;
    return scoreWidth;
  });
  columns.forEach((column, index) => {
    if (index > 1 && index < count - 1) columnStyles[index] = { cellWidth: pdfColumnWidths[index] };
    if (column.kind === 'grade') columnStyles[index] = { cellWidth: 64, fontStyle: 'bold' };
  });
  const fontSize = Math.max(5, Math.min(8, 8 - Math.max(0, count - 14) * 0.18));
  doc.setProperties({ title: title.classRecord, subject: title.course });
  autoTable(doc, {
    head: tableHead,
    body,
    startY: 137,
    margin: { top: 137, left: margin, right: margin, bottom: 24 },
    theme: 'grid',
    showHead: 'everyPage',
    styles: { font: 'helvetica', fontSize, textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [34, 34, 34], lineWidth: 0.35, cellPadding: count > 20 ? 2 : 3, halign: 'center', valign: 'middle', overflow: 'linebreak' },
    headStyles: { font: 'helvetica', fontStyle: 'bold', fontSize: Math.max(5, fontSize), fillColor: [34, 90, 165], textColor: [255, 255, 255], lineColor: [34, 34, 34], lineWidth: 0.35 },
    columnStyles,
    didDrawPage: drawInstitutionHeader,
  });

  let signatureY = doc.lastAutoTable.finalY + 20;
  if (signatureY + 70 > pageHeight - 16) {
    doc.addPage();
    drawInstitutionHeader();
    signatureY = 150;
  }
  const signatureStarts = signatureStartColumns(columns.length);
  const signatureOffsets = signatureStarts.map((start) => pdfColumnWidths.slice(0, start).reduce((sum, width) => sum + width, 0));
  const signatureWidths = signatureOffsets.map((offset, index) => (signatureOffsets[index + 1] ?? availableWidth) - offset);
  const signatures = [
    ['Submitted by:', assignment.teacher?.full_name?.toUpperCase() || '', 'Course Instructor'],
    ['Reviewed by:', 'ARIEL T. SUMAGAYSAY, MSCS, MAEd', 'Program Head, BSIT'],
    ['Approved by:', 'MAE B. LODANA, Ph.D.', 'Dean, CICT'],
  ];
  signatures.forEach(([label, name, role], index) => {
    const x = margin + signatureOffsets[index];
    const blockWidth = signatureWidths[index];
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(label, x + 3, signatureY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(index === 1 ? 255 : 0, index === 1 ? 31 : 0, index === 1 ? 31 : 0);
    doc.text(name, x + 3, signatureY + 48, { align: 'left', maxWidth: Math.max(40, blockWidth - 8) });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(role, x + 3, signatureY + 60, { align: 'left', maxWidth: Math.max(40, blockWidth - 8) });
  });
  doc.save(filename);
}
