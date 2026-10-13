import { Download, Loader } from 'lucide-react';

// Compact shared Excel/PDF export buttons for teacher pages.
// Props: onExcel, onPdf, disabled, exporting ('excel'|'pdf'|null), error.
const btnClass = 'px-4 py-2 bg-[#0c1925] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function ExportButtons({ onExcel, onPdf, disabled = false, exporting = null, error = '' }) {
  const busy = exporting !== null;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button onClick={onExcel} disabled={disabled || busy} className={btnClass}>
          {exporting === 'excel' ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting === 'excel' ? 'Exporting…' : 'Excel (.xlsx)'}
        </button>
        <button onClick={onPdf} disabled={disabled || busy} className={btnClass}>
          {exporting === 'pdf' ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting === 'pdf' ? 'Exporting…' : 'PDF (.pdf)'}
        </button>
      </div>
      {error && <span className="text-[11px] font-semibold text-red-600">{error}</span>}
    </div>
  );
}
