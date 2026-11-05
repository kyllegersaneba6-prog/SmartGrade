import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const COLUMN_BOUNDARIES = [54, 192, 288, 378, 404, 487, 529, 600];

const normalizeLine = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const groupItemsByLine = (items, pageWidth) => {
  const scaleX = 612 / pageWidth;
  const lines = [];
  for (const item of items) {
    const text = normalizeLine(item.str);
    if (!text) continue;
    const x = item.transform?.[4] * scaleX;
    const y = item.transform?.[5];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2.5);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push({ x, text });
  }
  return lines.map((line) => {
    line.items.sort((a, b) => a.x - b.x);
    return {
      y: line.y,
      items: line.items,
      text: normalizeLine(line.items.map((item) => item.text).join(' ')),
    };
  }).sort((a, b) => b.y - a.y);
};

const getCells = (items) => {
  const cells = Array.from({ length: COLUMN_BOUNDARIES.length }, () => []);
  items.forEach((item) => {
    const index = COLUMN_BOUNDARIES.findIndex((boundary) => item.x < boundary);
    if (index >= 0) cells[index].push(item);
  });
  return cells.map((cell) => normalizeLine(cell.map((item) => item.text).join(' ')));
};

const readMetadata = (lines) => {
  const fullText = lines.map((line) => line.text).join('\n');
  const field = (expression) => fullText.match(expression)?.[1]?.trim() || '';
  const semesterFirst = fullText.match(/\b(1st|2nd|3rd)\s+Semester\b[\s,|]*\bS\.?\s*Y\.?\s*[:-]?\s*(\d{4})\s*[-–]\s*(\d{4})/i);
  const yearFirst = fullText.match(/\bS\.?\s*Y\.?\s*[:-]?\s*(\d{4})\s*[-–]\s*(\d{4})[\s,|]*(1st|2nd|3rd)\s+Semester\b/i);
  const termMatch = semesterFirst || yearFirst;
  const semesterOrdinal = semesterFirst ? semesterFirst[1] : yearFirst ? yearFirst[3] : '';
  const summer = /\bSummer\s+Semester\b/i.test(fullText);
  const semester = summer ? 'Summer' : termMatch
    ? `${semesterOrdinal.toLowerCase()} Semester`
    : '';
  const schoolYear = semesterFirst
    ? `${semesterFirst[2]}-${semesterFirst[3]}`
    : yearFirst
      ? `${yearFirst[1]}-${yearFirst[2]}`
    : '';
  return {
    subject_code: field(/Subject\s*code\s*:\s*(.+?)(?=\s+Descriptive\s+Title\s*:|[\r\n]|$)/i),
    descriptive_title: field(/Descriptive\s+Title\s*:\s*(.+?)(?=\s+Section\s*:|[\r\n]|$)/i),
    section: field(/Section\s*:\s*(.+?)(?=\s+Instructor\s*:|[\r\n]|$)/i),
    school_year: schoolYear,
    semester,
  };
};

export const parseClassListPdf = async (file) => {
  if (!file || (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf')) {
    throw new Error('Choose a PDF class list.');
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('PDF must be 25 MB or smaller.');

  let loadingTask;
  let document;
  try {
    loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    document = await loadingTask.promise;
  } catch {
    throw new Error('Could not read this PDF. Make sure it is a valid, unlocked class-list PDF.');
  }
  if (document.numPages > 25) {
    await loadingTask.destroy();
    throw new Error('This import supports class-list PDFs with up to 25 pages.');
  }

  try {
    const allLines = [];
    const rows = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const pageLines = groupItemsByLine((await page.getTextContent()).items, viewport.width);
      if (pageNumber === 1) allLines.push(...pageLines);

      pageLines.forEach((line) => {
        const cells = getCells(line.items);
        const studentId = cells[1].replace(/\s/g, '');
        const printedNumber = cells[0].match(/^\d+$/)?.[0];
        if (!printedNumber) return;
        rows.push({
          rowNum: Number(printedNumber),
          student_id: studentId,
          last_name: cells[2],
          first_name: cells[3],
          mi: cells[4].toUpperCase(),
          course: cells[5],
          year_level: cells[6],
          gender: cells[7].toUpperCase(),
        });
      });
    }

    const metadata = readMetadata(allLines);
    const firstRow = rows[0];
    if (rows.length > 500) throw new Error('This import supports up to 500 student rows per class list.');
    if (!metadata.subject_code || !metadata.descriptive_title || !metadata.section || !metadata.school_year || !metadata.semester) {
      throw new Error('The PDF must include Subject Code, Descriptive Title, Section, semester, and school year. Use the official class-list format.');
    }
    if (!firstRow) {
      throw new Error('No student rows were found. This page reads text-based class lists, not scanned images.');
    }
    metadata.course = firstRow.course;
    metadata.year_level = firstRow.year_level;

    const sameCourse = rows.every((row) => row.course === firstRow.course);
    const sameYear = rows.every((row) => row.year_level === firstRow.year_level);
    if (!sameCourse || !sameYear) {
      throw new Error('The PDF contains more than one course or year level. Split it into one class list per PDF.');
    }
    return { metadata, rows };
  } finally {
    await loadingTask.destroy();
  }
};
