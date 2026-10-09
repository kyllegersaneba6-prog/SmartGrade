import { useEffect, useRef, useState } from 'react';
import { Megaphone } from 'lucide-react';

/**
 * Header notification bell (megaphone) with dropdown panel.
 * Matches the app design system (rounded-xl, navy accents, soft shadows).
 *
 * Props:
 * - items: [{ id, title, desc?, time? }]
 * - loading: show a loading row while items resolve
 */
const NotificationDropdown = ({ items = [], loading = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="p-2 rounded-lg text-amber-400 hover:text-amber-500 transition-colors cursor-pointer"
      >
        <Megaphone size={22} />
      </button>

      {open && (
        <div className="dropdown-pop absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden origin-top-right">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">Loading…</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-8 text-center text-gray-500">
                <Megaphone size={32} className="mb-2 opacity-30" />
                <p className="text-xs font-semibold">No notifications yet.</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="px-4 py-3 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                    {item.time && <span className="text-[10px] text-gray-400 whitespace-nowrap">{item.time}</span>}
                  </div>
                  {item.desc && <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.desc}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
