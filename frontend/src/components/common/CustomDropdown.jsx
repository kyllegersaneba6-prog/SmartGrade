import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * Purpose-built dropdown that matches the app design system
 * (rounded-lg, text-xs/sm, navy #0c1925 accents, soft shadows).
 *
 * Props:
 * - value: selected option value (string)
 * - onChange: (value) => void
 * - options: [{ value, label, sublabel? }]
 * - placeholder: shown when nothing selected
 * - icon: Lucide icon component rendered in the trigger
 * - searchable: show a search field inside the panel
 * - searchPlaceholder
 * - error / errorMessage: red ring + hover tooltip
 * - disabled
 * - emptyMessage
 * - renderOptionSuffix: (option) => ReactNode (e.g. row actions)
 */
const CustomDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  icon: Icon,
  searchable = false,
  searchPlaceholder = 'Search…',
  error = false,
  errorMessage = '',
  disabled = false,
  emptyMessage = 'No options found.',
  renderOptionSuffix,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) =>
        `${o.label || ''} ${o.sublabel || ''}`.toLowerCase().includes(q)
      )
    : options;

  const pick = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative group w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 text-left text-xs bg-white border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500'
            : open
              ? 'border-[#0c1925] ring-2 ring-[#0c1925]/15'
              : 'border-gray-200 hover:border-[#0c1925]/50 focus:ring-[#0c1925]/30'
        }`}
      >
        {Icon && (
          <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${selected ? 'text-white' : 'text-[#0c1925] bg-[#0c1925]/5'}`} style={selected ? { background: '#0c1925' } : {}}>
            <Icon size={15} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          {selected ? (
            <>
              <span className="block font-bold text-gray-900 truncate leading-tight">{selected.label}</span>
              {selected.sublabel && (
                <span className="block text-[10px] text-gray-400 truncate leading-tight">{selected.sublabel}</span>
              )}
            </>
          ) : (
            <span className="block font-semibold text-gray-400 truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-[#0c1925]' : ''}`}
        />
      </button>

      {error && errorMessage && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
          {errorMessage}
        </div>
      )}

      {open && !disabled && (
        <div className="dropdown-pop absolute left-0 right-0 top-full mt-1.5 z-20 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden origin-top">
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-[#0c1925]/20">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>
          )}
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-5 text-[11px] text-gray-400 text-center">{emptyMessage}</p>
            ) : (
              filtered.map((o) => {
                const active = String(o.value) === String(value);
                return (
                  <div
                    key={String(o.value)}
                    onClick={() => pick(o.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                      active ? 'bg-[#0c1925]/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className={`block text-xs truncate ${active ? 'font-bold text-[#0c1925]' : 'font-semibold text-gray-700'}`}>
                        {o.label}
                      </span>
                      {o.sublabel && (
                        <span className="block text-[10px] text-gray-400 truncate">{o.sublabel}</span>
                      )}
                    </span>
                    {renderOptionSuffix?.(o)}
                    {active && <Check size={14} className="shrink-0 font-bold" style={{ color: '#0c1925' }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
