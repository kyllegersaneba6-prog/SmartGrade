import { useEffect, useRef, useState } from 'react';
import { Archive, BookOpen, Check, ChevronDown, LoaderCircle } from 'lucide-react';

const groupKey = (section) => `${section.school_year}|${section.semester}`;
const getSectionDisplay = (section) => {
  const sectionName = section.sections?.name || 'Section';
  const yearLevel = section.sections?.year_level;
  return {
    title: section.subjects?.name || sectionName,
    details: [
      section.subjects?.code,
      `${sectionName}${yearLevel ? ` (${yearLevel})` : ''}`,
    ].filter(Boolean).join(' — '),
  };
};

const FloatingSectionSelector = ({
  id = 'student-section',
  sections = [],
  value,
  onChange,
  isArchiveMode = false,
  isLoading = false,
}) => {
  const [open, setOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState('');
  const [loadingObserved, setLoadingObserved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (!pendingSelection && ref.current && !ref.current.contains(event.target)) setOpen(false);
      if (event.key === 'Escape' && !pendingSelection) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [pendingSelection]);

  useEffect(() => {
    if (!pendingSelection || String(value) !== pendingSelection) return;
    if (isLoading) {
      if (!loadingObserved) setLoadingObserved(true);
      return;
    }
    if (loadingObserved) {
      setPendingSelection('');
      setLoadingObserved(false);
      setOpen(false);
    }
  }, [isLoading, loadingObserved, pendingSelection, value]);

  const groups = {};
  sections.forEach((section) => {
    const key = groupKey(section);
    if (!groups[key]) groups[key] = { school_year: section.school_year, semester: section.semester, items: [] };
    groups[key].items.push(section);
  });
  const groupKeys = Object.keys(groups);
  const currentSection = sections.find((section) => String(section.section_id) === String(value));
  const currentDisplay = currentSection ? getSectionDisplay(currentSection) : null;

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <button
        id={id}
        type="button"
        data-archive-navigation={isArchiveMode ? 'true' : undefined}
        aria-label="Select section"
        aria-expanded={open}
        aria-busy={Boolean(pendingSelection)}
        disabled={Boolean(pendingSelection)}
        onClick={() => { if (!pendingSelection) setOpen((current) => !current); }}
        className={`flex h-12 w-72 sm:w-80 items-center gap-2 px-4 text-left text-xs bg-white border rounded-lg shadow-elevated transition-all focus:outline-none focus:ring-2 cursor-pointer disabled:cursor-wait ${
          isArchiveMode
            ? 'bg-amber-50 border-gray-200 focus:ring-gray-300/30'
            : open
              ? 'border-[#0c1925] ring-2 ring-[#0c1925]/15'
              : 'border-gray-200 hover:border-[#0c1925]/50 focus:ring-[#0c1925]/30'
        }`}
      >
        <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${currentSection ? 'text-amber-300' : 'text-[#0c1925] bg-[#0c1925]/5'}`} style={currentSection ? { background: '#0c1925' } : {}}>
          {isArchiveMode ? <Archive size={15} /> : <BookOpen size={15} />}
        </span>
        <span className="flex-1 min-w-0">
          {currentSection ? (
            <>
              <span className="block font-bold text-gray-900 truncate leading-tight">{currentDisplay.title}</span>
              <span className="block text-[10px] text-gray-900 truncate leading-tight">{currentDisplay.details}</span>
            </>
          ) : (
            <span className="block font-semibold text-gray-900 truncate">Select Section</span>
          )}
        </span>
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
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> {isArchiveMode ? 'Loading archived section...' : 'Loading section...'}
            </div>
          )}
          {groupKeys.length === 0 && <div className="px-3 py-5 text-[11px] text-gray-900 text-center">No sections found.</div>}
          {groupKeys.map((key) => {
            const group = groups[key];
            return (
              <div key={key}>
                {group.items.map((section) => {
                  const selected = String(section.section_id) === String(value);
                  const display = getSectionDisplay(section);
                  return (
                    <button
                      key={`${section.section_id}-${section.school_year}-${section.semester}`}
                      type="button"
                      data-archive-navigation={isArchiveMode ? 'true' : undefined}
                      role="option"
                      aria-selected={selected}
                      aria-disabled={Boolean(pendingSelection)}
                      disabled={Boolean(pendingSelection)}
                      onClick={() => {
                        if (pendingSelection) return;
                        const nextValue = String(section.section_id);
                        onChange(nextValue);
                        if (!selected) {
                          setLoadingObserved(false);
                          setPendingSelection(nextValue);
                        } else {
                          setOpen(false);
                        }
                      }}
                      className={`h-12 w-full text-left px-4 border-b last:border-0 border-gray-100 transition-colors flex items-center gap-2 cursor-pointer ${
                        selected ? 'bg-[#0c1925]/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${selected ? 'text-amber-300' : 'text-gray-900 bg-gray-100'}`} style={selected ? { background: '#0c1925' } : {}}>
                        {selected ? <Check size={15} /> : isArchiveMode ? <Archive size={15} /> : <BookOpen size={15} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${selected ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-900'}`}>{display.title}</span>
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

export default FloatingSectionSelector;
