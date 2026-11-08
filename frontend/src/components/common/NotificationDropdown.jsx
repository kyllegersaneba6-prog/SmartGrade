import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import api from '../../utils/api';

const NotificationDropdown = () => {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api('/api/notifications');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not load notifications.');
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(Number(data.unreadCount) || 0);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void loadNotifications(); }, 0);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications();
    }, 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpen = () => {
    if (!open) void loadNotifications();
    setOpen((wasOpen) => !wasOpen);
  };

  const openNotification = async (item) => {
    setExpandedId((current) => current === item.id ? null : item.id);
    if (item.readAt) return;

    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt } : entry));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      const response = await api(`/api/notifications/${item.id}/read`, { method: 'POST' });
      if (!response.ok) throw new Error('Could not update notification status.');
    } catch (readError) {
      setError(readError.message || 'Could not update notification status.');
      void loadNotifications();
    }
  };

  const dismissNotification = async (item) => {
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (!item.readAt) setUnreadCount((current) => Math.max(0, current - 1));
    if (expandedId === item.id) setExpandedId(null);
    try {
      const response = await api(`/api/notifications/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not dismiss notification.');
    } catch (dismissError) {
      setError(dismissError.message || 'Could not dismiss notification.');
      void loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || bulkAction) return;
    setBulkAction('read');
    const readAt = new Date().toISOString();
    try {
      const response = await api('/api/notifications/read-all', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not mark notifications as read.');
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      setError('');
    } catch (readError) {
      setError(readError.message || 'Could not mark notifications as read.');
      void loadNotifications();
    } finally {
      setBulkAction('');
    }
  };

  const clearAllNotifications = async () => {
    if (items.length === 0 || bulkAction) return;
    setBulkAction('clear');
    try {
      const response = await api('/api/notifications', { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not clear notifications.');
      setItems([]);
      setUnreadCount(0);
      setExpandedId(null);
      setShowAll(false);
      setError('');
    } catch (clearError) {
      setError(clearError.message || 'Could not clear notifications.');
      void loadNotifications();
    } finally {
      setBulkAction('');
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        title="Notifications"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative cursor-pointer rounded-lg p-2 text-[#0c1925] transition-colors hover:bg-gray-100 hover:text-[#24384b]"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-md bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-pop absolute right-0 top-full z-50 mt-2 w-[17rem] max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-gray-900">Notifications</h3>
              <span className="min-w-4 rounded-md bg-gray-100 px-1.5 py-0.5 text-center text-[9px] font-semibold text-gray-600">{items.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && <button type="button" onClick={() => { void markAllAsRead(); }} disabled={Boolean(bulkAction)} className="text-[9px] font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50">{bulkAction === 'read' ? 'Marking…' : 'Mark read'}</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close notifications" className="rounded-lg text-sm leading-none text-gray-400 transition-colors hover:text-gray-800">×</button>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: showAll ? '70vh' : '20rem' }}>
            {loading ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">Loading…</p>
            ) : error && items.length === 0 ? (
              <p role="alert" className="px-4 py-6 text-center text-xs text-red-600">{error}</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-xs font-semibold">No notifications yet.</p>
              </div>
            ) : (
              items.map((item) => {
                const expanded = expandedId === item.id;
                const unread = !item.readAt;
                return (
                  <div key={item.id} className="flex items-start gap-2 border-b border-gray-100 px-3 py-2.5 last:border-0 hover:bg-gray-50">
                    <button
                      type="button"
                      onClick={() => { void openNotification(item); }}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`truncate text-[10px] uppercase text-gray-900 ${unread ? 'font-bold' : 'font-semibold'}`}>{item.title}</span>
                        {item.urgency === 'Urgent' && <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md text-[8px] font-bold uppercase text-amber-700"><AlertTriangle size={10} aria-hidden="true" />Urgent</span>}
                      </span>
                      <span className={`mt-1 block text-[10px] text-gray-700 ${expanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-2'}`}>
                        {item.content}
                      </span>
                      {item.createdAt && <span className="mt-1 block text-[9px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => { void dismissNotification(item); }}
                      aria-label={`Dismiss ${item.title}`}
                      title="Dismiss notification"
                      className="shrink-0 rounded-lg px-1 text-sm leading-none text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
                    >×</button>
                  </div>
                );
              })
            )}
          </div>
          {error && items.length > 0 && <p role="alert" className="border-t border-red-100 px-4 py-2 text-[10px] text-red-600">{error}</p>}
          {items.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
              <button type="button" onClick={() => setShowAll((current) => !current)} className="text-[9px] font-medium text-gray-700 transition-colors hover:text-gray-950">{showAll ? 'Show fewer' : 'View all notifications'}</button>
              <button type="button" onClick={() => { void clearAllNotifications(); }} disabled={Boolean(bulkAction)} className="text-[9px] font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50">{bulkAction === 'clear' ? 'Clearing…' : 'Clear all'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
