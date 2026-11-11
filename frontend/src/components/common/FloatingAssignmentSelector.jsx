import { useState, useRef, useEffect } from 'react';
import { BookOpen, Check, ChevronDown, Archive, LoaderCircle } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';

const groupKey = (a) => `${a.school_year}|${a.semester}`;

const FloatingAssignmentSelector = ({ isLoading = false }) => {
  const { assignments, selectedAssignment, setSelectedAssignment, currentAssignment, activeTerm, viewTerm, isArchiveMode, loading } = useTeacher();
  const [open, setOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('');
  const [loadingObserved, setLoadingObserved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!pendingSelection && ref.current && !ref.current.contains(e.target)) { setOpen(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pendingSelection]);

  useEffect(() => {
    if (!pendingSelection || String(selectedAssignment) !== pendingSelection) return;
    if (isLoading) {
      if (!loadingObserved) setLoadingObserved(true);
      return;
    }
    if (loadingObserved) {
      setPendingSelection('');
      setLoadingObserved(false);
      setOpen(false);
    }
  }, [isLoading, loadingObserved, pendingSelection, selectedAssignment]);

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
        data-archive-navigation={isArchiveMode ? 'true' : undefined}
        aria-label="Select class"
        aria-expanded={open}
        aria-busy={Boolean(pendingSelection)}
        disabled={Boolean(pendingSelection)}
        onClick={() => { if (!pendingSelection) setOpen(!open); }}
        className={`flex h-12 w-72 sm:w-80 items-center gap-2 px-4 text-left text-xs bg-white border rounded-lg shadow-elevated transition-all focus:outline-none focus:ring-2 cursor-pointer disabled:cursor-wait ${
          isArchiveMode
            ? 'bg-amber-50 border-gray-200 focus:ring-gray-300/30'
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
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-800 uppercase shrink-0">ARCHIVE</span>
        )}
        {pendingSelection ? (
          <LoaderCircle size={15} className="shrink-0 animate-spin text-amber-600" aria-hidden="true" />
        ) : (
          <ChevronDown size={15} className={`shrink-0 text-gray-900 transition-transform duration-200 ${open ? 'rotate-180 text-[#0c1925]' : ''}`} />
        )}
      </button>

      {open && (
        <div aria-busy={Boolean(pendingSelection)} className="dropdown-pop absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-gray-100 rounded-xl shadow-2xl z-[100] max-h-80 overflow-y-auto origin-top">
          {pendingSelection && (
            <div role="status" aria-live="polite" className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-600">
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> {isArchiveMode ? 'Loading archived class...' : 'Loading class...'}
            </div>
          )}
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
                  const isSelectableTerm = viewTerm
                    ? viewTerm.school_year === group.school_year && viewTerm.semester === group.semester
                    : isActive;
                  const display = getAssignmentDisplay(a);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      data-archive-navigation={isArchiveMode ? 'true' : undefined}
                      role="option"
                      aria-selected={isItemActive}
                      aria-disabled={!isSelectableTerm || Boolean(pendingSelection)}
                      disabled={!isSelectableTerm || Boolean(pendingSelection)}
                      title={!isSelectableTerm ? 'Select this semester from Settings → Term History to browse it.' : undefined}
                      onClick={() => {
                        if (!isSelectableTerm || pendingSelection) return;
                        setSelectedAssignment(a.id);
                        if (!isItemActive) {
                          setLoadingObserved(false);
                          setPendingSelection(String(a.id));
                        } else {
                          setOpen(false);
                        }
                      }}
                      className={`h-12 w-full text-left px-4 border-b last:border-0 border-gray-100 transition-colors flex items-center gap-2 ${
                        !isSelectableTerm ? 'cursor-not-allowed opacity-50' : isItemActive ? 'bg-[#0c1925]/5 cursor-pointer' : 'hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${isItemActive ? 'text-amber-300' : 'text-gray-900 bg-gray-100'}`} style={isItemActive ? { background: '#0c1925' } : {}}>
                        {isItemActive ? <Check size={15} /> : isArchiveMode ? <Archive size={15} /> : <BookOpen size={15} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${isItemActive ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-900'}`}>{display.title}</span>
                        <span className="block text-[10px] text-gray-900 truncate">{display.details}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FloatingAssignmentSelector;
