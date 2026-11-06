import { useEffect, useRef, useState } from 'react';
import { Archive, BookOpen, Check, ChevronDown } from 'lucide-react';

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
  onExitArchive,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

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
        aria-label="Select section"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-12 w-72 sm:w-80 items-center gap-2 px-4 text-left text-xs bg-white border rounded-lg shadow-elevated transition-all focus:outline-none focus:ring-2 cursor-pointer ${
          isArchiveMode
            ? 'bg-amber-50 border-amber-300 focus:ring-amber-300/30'
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
        {isArchiveMode && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase shrink-0">ARCHIVE</span>}
        <ChevronDown size={15} className={`shrink-0 text-gray-900 transition-transform duration-200 ${open ? 'rotate-180 text-[#0c1925]' : ''}`} />
      </button>

      {open && (
        <div className="dropdown-pop absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-gray-100 rounded-xl shadow-2xl z-[100] max-h-80 overflow-y-auto origin-top">
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
                      role="option"
                      aria-selected={selected}
                      onClick={() => { onChange(String(section.section_id)); setOpen(false); }}
                      className={`h-12 w-full text-left px-4 border-b last:border-0 border-gray-100 transition-colors flex items-center gap-2 cursor-pointer ${
                        selected ? 'bg-[#0c1925]/5' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${selected ? 'text-white' : 'text-gray-900 bg-gray-100'}`} style={selected ? { background: '#0c1925' } : {}}>
                        {selected ? <Check size={15} /> : <BookOpen size={15} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-xs truncate ${selected ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-900'}`}>{display.title}</span>
                        <span className="block text-[10px] text-gray-900 truncate">{display.details}</span>
                      </span>
                      {selected && <Check size={14} className="shrink-0 font-bold" style={{ color: '#0c1925' }} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {isArchiveMode && onExitArchive && (
            <button
              type="button"
              onClick={() => { onExitArchive(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-t border-amber-200 transition-colors flex items-center gap-2"
            >
              <Archive size={14} /> Exit Archive Mode
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingSectionSelector;
