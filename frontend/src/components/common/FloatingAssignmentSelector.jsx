import { useState, useRef, useEffect } from 'react';
import { BookOpen, Check, ChevronDown, Archive } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';

const groupKey = (a) => `${a.school_year}|${a.semester}`;

const FloatingAssignmentSelector = () => {
  const { assignments, selectedAssignment, setSelectedAssignment, currentAssignment, activeTerm, setViewTerm, isArchiveMode, loading } = useTeacher();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (loading) return null;

  const isActiveTerm = (school_year, semester) =>
    activeTerm && activeTerm.school_year === school_year && activeTerm.semester === semester;

  const groups = {};
  assignments.forEach((a) => {
    const gk = groupKey(a);
    if (!groups[gk]) groups[gk] = { school_year: a.school_year, semester: a.semester, items: [] };
    groups[gk].items.push(a);
  });
  const groupKeys = Object.keys(groups);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 text-left text-xs bg-white border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 cursor-pointer ${
          isArchiveMode
            ? 'bg-amber-50 border-amber-300 focus:ring-amber-400/30'
            : open
              ? 'border-[#0c1925] ring-2 ring-[#0c1925]/15'
              : 'border-gray-200 hover:border-[#0c1925]/50 focus:ring-[#0c1925]/30'
        }`}
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${currentAssignment ? 'text-white' : 'text-[#0c1925] bg-[#0c1925]/5'}`} style={currentAssignment ? { background: '#0c1925' } : {}}>
          {isArchiveMode ? <Archive size={15} /> : <BookOpen size={15} />}
        </span>
        <span className="flex-1 min-w-0">
          {currentAssignment ? (
            <>
              <span className="block font-bold text-gray-900 truncate leading-tight">{currentAssignment.subjects?.code} — {currentAssignment.sections?.name}</span>
              <span className="block text-[10px] text-gray-400 truncate leading-tight">{currentAssignment.school_year} | {currentAssignment.semester}</span>
            </>
          ) : (
            <span className="block font-semibold text-gray-400 truncate">Select Subject</span>
          )}
        </span>
        {isArchiveMode && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase shrink-0">ARCHIVE</span>
        )}
        <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-[#0c1925]' : ''}`} />
      </button>

      {open && (
        <div className="dropdown-pop absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto origin-top">
          {groupKeys.length === 0 && (
            <div className="px-3 py-5 text-[11px] text-gray-500 text-center">No assignments found.</div>
          )}
          {groupKeys.map((gk) => {
            const group = groups[gk];
            const isActive = isActiveTerm(group.school_year, group.semester);
            return (
              <div key={gk}>
                <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-border sticky top-0 z-10 ${
                  isActive ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                }`}>
                  {group.school_year} | {group.semester}
                  {isActive ? <span className="ml-1.5 text-green-600">(Active)</span> : <span className="ml-1.5 text-gray-400">(Archive)</span>}
                </div>
                {group.items.map((a) => {
                  const isItemActive = String(a.id) === String(selectedAssignment);
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAssignment(a.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 border-b last:border-0 border-gray-100 transition-colors flex items-center gap-2 cursor-pointer ${
                        isItemActive ? 'bg-[#0c1925]/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${isItemActive ? 'text-white' : 'text-gray-400 bg-gray-100'}`} style={isItemActive ? { background: '#0c1925' } : {}}>
                        {isItemActive ? <Check size={15} /> : <BookOpen size={15} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${isItemActive ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-700'}`}>{a.subjects?.name}</span>
                        <span className="block text-[10px] text-gray-400 truncate">{a.subjects?.code} — {a.sections?.name} ({a.sections?.year_level})</span>
                      </span>
                      {isItemActive && <Check size={14} className="shrink-0 font-bold" style={{ color: '#0c1925' }} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {isArchiveMode && (
            <button
              onClick={() => { setViewTerm(null); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-t border-amber-200 transition-colors flex items-center gap-2"
            >
              <Archive size={14} />
              Exit Archive Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingAssignmentSelector;
