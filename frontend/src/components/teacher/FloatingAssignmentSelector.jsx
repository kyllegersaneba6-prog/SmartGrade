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
        className={`flex items-center gap-2 px-3 py-2 border rounded-xl hover:shadow-md transition-all text-sidebar text-xs font-bold cursor-pointer ${
          isArchiveMode ? 'bg-amber-50 border-amber-300' : 'bg-white border-border'
        }`}
      >
        {isArchiveMode ? <Archive size={16} className="text-amber-600 shrink-0" /> : <BookOpen size={16} className="text-gold shrink-0" />}
        <span className="truncate max-w-[160px] sm:max-w-[220px]">
          {currentAssignment ? `${currentAssignment.subjects?.code} — ${currentAssignment.sections?.name}` : 'Select Subject'}
        </span>
        {currentAssignment && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            isArchiveMode ? 'bg-amber-200 text-amber-800' : 'bg-sidebar/10 text-sidebar/60'
          }`}>{currentAssignment.school_year} | {currentAssignment.semester}</span>
        )}
        {isArchiveMode && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase shrink-0">ARCHIVE</span>
        )}
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-border rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
          {groupKeys.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 text-xs">No assignments found.</div>
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
                      className={`w-full text-left px-4 py-3 border-b last:border-0 border-border hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                        isItemActive ? 'bg-amber-50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isItemActive ? 'bg-gold text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {isItemActive ? <Check size={16} /> : <BookOpen size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-800 leading-tight truncate">{a.subjects?.name}</div>
                        <div className="text-[11px] text-gray-600 leading-tight">{a.subjects?.code} — {a.sections?.name} ({a.sections?.year_level})</div>
                        <div className="text-[10px] text-gray-400 leading-tight">{a.school_year} {a.semester}</div>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sidebar/10 text-sidebar/60 shrink-0">{a.semester}</span>
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