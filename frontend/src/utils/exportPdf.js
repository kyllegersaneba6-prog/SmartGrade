import { jsPDF } from 'jspdf';
import autoTableImport from 'jspdf-autotable';

// jspdf-autotable ships both ESM (default = function) and CJS
// (default under `.default`) builds; handle either.
const autoTable = typeof autoTableImport === 'function' ? autoTableImport : autoTableImport.default;

// Plain black-and-white school-record styling for every PDF export:
// black text on white, thin dark borders, bold headers. No fills, colors,
// gradients, or decoration so the PDF prints cleanly on ordinary paper.
// Headers repeat on every page via AutoTable's default showHead.
const BW_LINE = [60, 60, 60];
const bwHeadStyle = {
  font: 'helvetica',
  fontStyle: 'bold',
  fontSize: 7,
  textColor: [0, 0, 0],
  fillColor: [255, 255, 255],
  lineColor: BW_LINE,
  lineWidth: 0.5,
  cellPadding: 4,
  halign: 'center',
  valign: 'middle',
  overflow: 'linebreak',
};
const bwBodyStyle = {
  font: 'helvetica',
  fontStyle: 'normal',
  fontSize: 7,
  textColor: [0, 0, 0],
  fillColor: [255, 255, 255],
  lineColor: BW_LINE,
  lineWidth: 0.5,
  cellPadding: 4,
  valign: 'middle',
  overflow: 'linebreak',
};

// Shared PDF renderer for teacher exports. Tables reuse the page's own
// headers/values; nothing is recalculated here.
// opts: { title, context[], filename, head[][], body[][], landscape=true,
//         emptyMessage, extraTables: [{ title, head, body }] }
export function exportTablePdf(opts) {
  const {
    title, context = [], filename, head, body = [],
    landscape = true, emptyMessage = 'No records match the current filters.',
    extraTables = [],
  } = opts;

  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  const addPageNumber = () => {
    const page = doc.internal.getNumberOfPages();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(`Page ${page}`, pageW - margin - 40, pageH - 20);
  };

  const tableOpts = {
    styles: bwBodyStyle,
    headStyles: bwHeadStyle,
    margin: { left: margin, right: margin },
    didDrawPage: addPageNumber,
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(title, margin, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0);
  context.forEach((line, i) => doc.text(String(line), margin, 56 + i * 13));
  const generatedAt = `Generated: ${new Date().toLocaleString()}`;
  doc.text(generatedAt, margin, 56 + context.length * 13);

  const startY = 66 + context.length * 13;
  const colCount = head?.[0]?.length || 1;
  const mainBody = body.length > 0
    ? body
    : [[{ content: emptyMessage, colSpan: colCount, styles: { halign: 'center' } }]];

  autoTable(doc, { ...tableOpts, startY, head, body: mainBody });

  extraTables.forEach((t) => {
    const y = doc.lastAutoTable.finalY + 28;
    if (t.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(t.title, margin, y);
    }
    const cols = t.head?.[0]?.length || 1;
    autoTable(doc, {
      ...tableOpts,
      startY: y + 8,
      head: t.head,
      body: t.body.length > 0
        ? t.body
        : [[{ content: emptyMessage, colSpan: cols, styles: { halign: 'center' } }]],
    });
  });

  doc.save(filename);
}
