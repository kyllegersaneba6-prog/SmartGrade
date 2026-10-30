import { useState, useRef, useEffect } from 'react';
import { Download, Loader, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';

// Compact shared Excel/PDF export dropdown for teacher pages.
// Props: onExcel, onPdf, disabled, disabledReason, exporting ('excel'|'pdf'|null), error.
export default function ExportButtons({ onExcel, onPdf, disabled = false, disabledReason = '', exporting = null, error = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const busy = exporting !== null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col items-end gap-1 relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || busy}
        title={disabled && disabledReason ? disabledReason : undefined}
        aria-disabled={disabled || busy}
        className="px-4 py-2 bg-[#0c1925] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
        {busy ? 'Exporting…' : 'Export'}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-pop absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden origin-top-right py-1">
          <button
            onClick={() => { setIsOpen(false); onExcel(); }}
            disabled={disabled || busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-sidebar hover:bg-gray-50 transition-colors text-left disabled:opacity-50 cursor-pointer"
          >
            {exporting === 'excel' ? <Loader size={14} className="animate-spin text-[#0c1925]" /> : <FileSpreadsheet size={14} className="text-emerald-600" />}
            {exporting === 'excel' ? 'Exporting Excel…' : 'Excel (.xlsx)'}
          </button>
          <button
            onClick={() => { setIsOpen(false); onPdf(); }}
            disabled={disabled || busy}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-sidebar hover:bg-gray-50 transition-colors text-left disabled:opacity-50 border-t border-gray-100 cursor-pointer"
          >
            {exporting === 'pdf' ? <Loader size={14} className="animate-spin text-[#0c1925]" /> : <FileText size={14} className="text-red-600" />}
            {exporting === 'pdf' ? 'Exporting PDF…' : 'PDF (.pdf)'}
          </button>
        </div>
      )}

      {disabled && disabledReason && !error && (
        <span className="text-[11px] font-semibold text-amber-700 max-w-[200px] text-right leading-snug">{disabledReason}</span>
      )}
      {error && <span className="text-[11px] font-semibold text-red-600 mt-1">{error}</span>}
    </div>
  );
}
