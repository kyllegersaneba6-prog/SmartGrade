import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, FileSpreadsheet, ArrowLeft, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const TEMPLATE_HEADERS = ['firstname', 'lastname', 'middle initial', 'student id', 'gender'];

const emptyRow = () => ({ firstname: '', lastname: '', 'middle initial': '', 'student id': '', gender: '' });

const BulkStudentImport = () => {
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('section_id') || '';
  const courseName = searchParams.get('course') || '';
  const yearLevel = searchParams.get('year') || '';
  const sectionName = searchParams.get('section') || '';
  const autoDownloaded = useRef(false);
  const [rows, setRows] = useState([emptyRow()]);

  const buildWorkbook = useCallback(
    (withData) => {
      const data = withData
        ? [TEMPLATE_HEADERS, ...rows
            .filter((r) => Object.values(r).some((v) => String(v).trim() !== ''))
            .map((r) => TEMPLATE_HEADERS.map((h) => r[h] ?? ''))]
        : [TEMPLATE_HEADERS];
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      return wb;
    },
    [rows]
  );

  const downloadTemplate = useCallback(() => {
    const safeName = (sectionName || 'template').replace(/[^a-z0-9-_]+/gi, '-');
    XLSX.writeFile(buildWorkbook(false), `students-${safeName}-template.xlsx`);
  }, [buildWorkbook, sectionName]);

  const downloadCompleted = useCallback(() => {
    const safeName = (sectionName || 'template').replace(/[^a-z0-9-_]+/gi, '-');
    XLSX.writeFile(buildWorkbook(true), `students-${safeName}-completed.xlsx`);
  }, [buildWorkbook, sectionName]);

  useEffect(() => {
    if (autoDownloaded.current) return;
    autoDownloaded.current = true;
    const t = setTimeout(() => downloadTemplate(), 600);
    return () => clearTimeout(t);
  }, [downloadTemplate]);

  const updateRow = (i, field, val) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i) => setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, idx) => idx !== i)));

  const filledCount = rows.filter((r) => Object.values(r).some((v) => String(v).trim() !== '')).length;

  return (
    <div className="min-h-screen bg-[#fbf6eb] font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e0d5] overflow-hidden">
          <div className="bg-[#142a3f] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/10">
                <FileSpreadsheet size={20} className="text-white" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Student Excel Template</h1>
                <p className="text-xs text-white/70 mt-0.5">Fill it out here or in Excel, save it, then upload it back in admin/sections</p>
              </div>
            </div>
            <div className="text-right text-xs text-white/90 bg-white/10 rounded-lg px-3 py-2">
              <div className="font-semibold">{courseName || '—'} — {yearLevel || '—'}</div>
              <div className="text-white/70">{sectionName || '—'} ({sectionId ? 'Selected' : 'None'})</div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-gray-700 leading-relaxed">
              <p className="font-bold text-gray-900 mb-1">How this works</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>A blank Excel template with the required headers was downloaded for you.</li>
                <li>Enter students <strong>directly in the table below</strong> or open the file in Excel / Google Sheets.</li>
                <li>Click <strong>Save / Download Completed Excel File</strong> when finished.</li>
                <li>Return to the original <strong>admin/sections</strong> tab (left open in the background).</li>
                <li>There, click <strong>Import / Upload Completed Excel File</strong> and select your file to preview, review duplicates, and confirm.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-[#e5e0d5] overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Required first-row headers</div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {TEMPLATE_HEADERS.map((h) => (
                  <span key={h} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-800 border border-gray-200">{h}</span>
                ))}
              </div>
              <p className="px-4 pb-3 text-[11px] text-gray-500">Do not rename, remove, or reorder these headers. Extra columns are ignored. Student ID format: 00-0000-000.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-900">Enter students ({filledCount} filled)</p>
                <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-[#0c1925] hover:opacity-90">
                  <Plus size={14} /> Add Row
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#e5e0d5]">
                <table className="w-full text-xs">
                  <thead className="bg-[#142a3f] text-white">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold">#</th>
                      {TEMPLATE_HEADERS.map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
                      ))}
                      <th className="text-left px-3 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-amber-50/30">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        {TEMPLATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2">
                            <input
                              value={r[h]}
                              onChange={(e) => updateRow(i, h, e.target.value)}
                              placeholder={h}
                              className="w-28 px-2 py-1 text-xs border border-[#e5e0d5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1]"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600" title="Remove row">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={downloadCompleted} className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 transition bg-[#22c55e]">
                <Download size={16} /> Save / Download Completed Excel File ({filledCount})
              </button>
              <button onClick={downloadTemplate} className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition">
                <Download size={16} /> Blank Template
              </button>
              <button onClick={() => window.close()} className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition">
                <ArrowLeft size={16} /> Return to Sections Tab
              </button>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-gray-500">
              <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" />
              <p>Your original admin/sections tab was left open. After saving, switch back to it and use the <strong>Import / Upload Completed Excel File</strong> button next to the student list to upload, preview duplicates (in-file + already in section), and confirm the import. Browsers don’t allow auto-detecting the saved file, so uploading it manually is the final step.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStudentImport;
