import { useState, useRef, useEffect } from 'react';
import { BookOpen, Check, ChevronDown, Archive } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';

const groupKey = (a) => `${a.school_year}|${a.semester}`;

const FloatingAssignmentSelector = () => {
  const { assignments, selectedAssignment, setSelectedAssignment, currentAssignment, activeTerm, viewTerm, setViewTerm, isArchiveMode, loading } = useTeacher();
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

  const getAssignmentDisplay = (assignment) => {
    const sectionName = assignment.sections?.name || 'Section';
    const yearLevel = assignment.sections?.year_level;
    return {
      title: assignment.subjects?.name || sectionName,
      details: [
        assignment.subjects?.code,
        `${sectionName}${yearLevel ? ` (${yearLevel})` : ''}`,
      ].filter(Boolean).join(' — '),
    };
  };

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button
        type="button"
        aria-label="Select class"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-72 sm:w-80 items-center gap-2 px-4 text-left text-xs bg-white border rounded-lg shadow-elevated transition-all focus:outline-none focus:ring-2 cursor-pointer ${
          isArchiveMode
            ? 'bg-amber-50 border-amber-300 focus:ring-amber-300/30'
            : open
              ? 'border-[#0c1925] ring-2 ring-[#0c1925]/15'
              : 'border-gray-200 hover:border-[#0c1925]/50 focus:ring-[#0c1925]/30'
        }`}
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${currentAssignment ? 'text-amber-300' : 'text-[#0c1925] bg-[#0c1925]/5'}`} style={currentAssignment ? { background: '#0c1925' } : {}}>
          {isArchiveMode ? <Archive size={15} /> : <BookOpen size={15} />}
        </span>
        <span className="flex-1 min-w-0">
          {currentAssignment ? (
            <>
              <span className="block font-bold text-gray-900 truncate leading-tight">{getAssignmentDisplay(currentAssignment).title}</span>
              <span className="block text-[10px] text-gray-900 truncate leading-tight">{getAssignmentDisplay(currentAssignment).details}</span>
            </>
          ) : (
            <span className="block font-semibold text-gray-900 truncate">Select Subject</span>
          )}
        </span>
        {isArchiveMode && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase shrink-0">ARCHIVE</span>
        )}
        <ChevronDown size={15} className={`shrink-0 text-gray-900 transition-transform duration-200 ${open ? 'rotate-180 text-[#0c1925]' : ''}`} />
      </button>

      {open && (
        <div className="dropdown-pop absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-gray-100 rounded-xl shadow-2xl z-[100] max-h-80 overflow-y-auto origin-top">
          {groupKeys.length === 0 && (
            <div className="px-3 py-5 text-[11px] text-gray-900 text-center">No assignments found.</div>
          )}
          {groupKeys.map((gk) => {
            const group = groups[gk];
            const isActive = isActiveTerm(group.school_year, group.semester);
            return (
              <div key={gk}>
                {group.items.map((a) => {
                  const isItemActive = String(a.id) === String(selectedAssignment);
                  const isViewingOtherTerm = viewTerm && (viewTerm.school_year !== group.school_year || viewTerm.semester !== group.semester);
                  const display = getAssignmentDisplay(a);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="option"
                      aria-selected={isItemActive}
                      onClick={() => {
                        setSelectedAssignment(a.id);
                        if (isArchiveMode && isViewingOtherTerm) {
                          setViewTerm({ school_year: group.school_year, semester: group.semester });
                        } else if (!isActive && !viewTerm) {
                          setViewTerm({ school_year: group.school_year, semester: group.semester });
                        }
                        setOpen(false);
                      }}
                      className={`h-12 w-full text-left px-4 border-b last:border-0 border-gray-100 transition-colors flex items-center gap-2 cursor-pointer ${
                        isItemActive ? 'bg-[#0c1925]/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${isItemActive ? 'text-white' : 'text-gray-900 bg-gray-100'}`} style={isItemActive ? { background: '#0c1925' } : {}}>
                        {isItemActive ? <Check size={15} /> : <BookOpen size={15} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${isItemActive ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-900'}`}>{display.title}</span>
                        <span className="block text-[10px] text-gray-900 truncate">{display.details}</span>
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
              type="button"
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
