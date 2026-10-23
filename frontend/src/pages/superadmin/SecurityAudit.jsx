import { useState, useEffect } from 'react';
import { Filter, Download, Share2, FileText, Table2, BookOpen, ChevronLeft, ChevronRight, Info, Check, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { splitUpdateDescription } from '../../utils/auditText';
import { SkeletonTable } from '../../components/common/Skeleton';

const outputFormats = [
  { label: 'RAW LOGS', sub: 'JSON/TXT Format', pct: 100, icon: FileText, color: '#b5a98a' },
  { label: 'STRUCTURED CSV', sub: 'Excel Compatible', pct: 64, icon: Table2, color: '#8a9aa5' },
  { label: 'EXECUTIVE PDF', sub: 'Audit Ready', pct: 28, icon: BookOpen, color: '#9a8a7a' },
];

const SecurityAudit = () => {
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const ACTION_FILTERS = [
    { value: 'ALL', label: 'ALL ACTIVITIES' },
    { value: 'CREATED', label: 'CREATED' },
    { value: 'UPDATED', label: 'UPDATED' },
    { value: 'DELETED', label: 'DELETED' },
    { value: 'FAILED', label: 'FAILED LOGINS' },
    { value: 'SUCCESSFUL', label: 'SUCCESSFUL LOGINS' },
  ];



  const fetchData = async () => {
    setLoading(true);
    try {
      const [activityRes, usersRes] = await Promise.all([
        api('/api/activity'),
        api('/api/users')
      ]);
      const activityData = activityRes.ok ? await activityRes.json() : [];
      const usersData = usersRes.ok ? await usersRes.json() : [];
      setUsers(usersData);
      setLogs(activityData);
    } catch (err) {
      console.error("Failed to fetch audit data", err);
    } finally {
      setLoading(false);
    }
  };

  // Silent background refresh — updates the trail when new logs exist
  // without flashing the skeleton or resetting pagination.
  const refreshQuiet = async () => {
    try {
      const [activityRes, usersRes] = await Promise.all([
        api('/api/activity'),
        api('/api/users')
      ]);
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setLogs((prev) => {
          if (prev.length === activityData.length && prev[0]?.id === activityData[0]?.id
            && prev[0]?.created_at === activityData[0]?.created_at) return prev;
          return activityData;
        });
      }
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (err) {
      console.error("Failed to refresh audit data", err);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh the trail every 10s while the tab is visible.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refreshQuiet();
    }, 10000);
    // Immediate refresh when other pages broadcast changes.
    const handler = async () => { await refreshQuiet(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => {
      clearInterval(id);
      window.removeEventListener('app:reload', handler);
    };
  }, []);

  const getRoleInfo = (userName) => {
    const user = users.find(u => u.username === userName || u.full_name === userName);
    if (!user) return { role: 'system', color: '#0c1925', name: userName };
    switch (user.system_role) {
      case 'superadmin': return { role: 'system', color: '#0c1925', name: user.full_name };
      case 'admin': return { role: 'admin', color: ' #fbbf24 ' , name: user.full_name };
      case 'teacher': return { role: 'teacher', color: '#fbbf24', name: user.full_name };
      default: return { role: 'system', color: '#3b82f6', name: user.full_name };
    }
  };

  const formatAction = (actionStr) => {
    if (!actionStr) return 'UNKNOWN';
    return actionStr.toUpperCase().replace(/\s+/g, '_');
  };

  const isCritical = (actionStr, descStr) => {
    const combined = (actionStr + ' ' + descStr).toLowerCase();
    return combined.includes('delete') || combined.includes('fail') || combined.includes('error') || combined.includes('critical');
  };

  const dynamicRows = logs.map(log => {
    const actionLower = String(log.action || '').toLowerCase();
    // Login rows (failed + successful) show a dash for User and Role.
    const isLoginRow = actionLower.includes('failed login') || actionLower.includes('successful login');
    const roleInfo = getRoleInfo(log.user_name);
    const critical = isCritical(log.action, log.details);
    const dateObj = new Date(log.created_at);
    const ts = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}\n${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
    return { id: log.id, ts, user: isLoginRow ? '-' : roleInfo.name, role: isLoginRow ? '-' : roleInfo.role, roleColor: isLoginRow ? '' : roleInfo.color, action: formatAction(log.action), desc: log.details || 'No description provided', split: actionLower.includes('updat') ? splitUpdateDescription(log.details) : null, critical };
  });

  const criticalCount = dynamicRows.filter(r => r.critical).length;
  const totalEvents = logs.length;

  const metrics = [
    { label: 'CRITICAL ALERTS', value: criticalCount.toString(), color: '#FF0000', bg: '#957272', icon: '⚠', tooltip: 'High-risk system activities requiring immediate administrator attention.' },
    { label: 'TOTAL LOGGED EVENTS', value: totalEvents.toLocaleString(), color: '#0c1925', bg: '#fbbf24', icon: '↗', tooltip: 'Total events recorded in the institutional audit trail.' },
  ];

  const ROWS_PER_PAGE = 10;
  const filteredRows = actionFilter === 'ALL'
    ? dynamicRows
    : dynamicRows.filter(r => r.action.includes(actionFilter === 'CREATED' ? 'CREAT' : actionFilter === 'UPDATED' ? 'UPDAT' : actionFilter === 'DELETED' ? 'DELET' : actionFilter === 'SUCCESSFUL' ? 'SUCCESS' : 'FAIL'));
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = filteredRows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  const getPageNumbers = () => {
    let pages = [];
    if (totalPages <= 3) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { if (page === 1) pages = [1, 2, 3]; else if (page === totalPages) pages = [totalPages - 2, totalPages - 1, totalPages]; else pages = [page - 1, page, page + 1]; }
    return pages;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Security & Audit</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>Review critical alerts and trace every system access in the institutional audit trail.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {metrics.map(({ label, value, color, bg, icon, tooltip }) => (
          <div key={label} className="rounded-xl p-4 shadow-sm flex items-center justify-between border border-[#F9FAFB] card-hover" style={{ background: '#fff' }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-gray-900 tracking-widest uppercase">{label}</span>
                <div className="relative group flex items-center">
                  <Info size={11} className="text-gray-300 hover:text-gray-500 transition-colors cursor-help shrink-0" />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-3 bg-gray-900/95 backdrop-blur-sm text-gray-100 text-[10px] rounded-lg shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50 text-center font-normal normal-case leading-relaxed border border-gray-800">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: bg }}>{icon}</div>
          </div>
        ))}
      </div>

      <div className="w-full">
        <div>
          <div className="rounded-xl p-5 shadow-sm border border-[#F9FAFB] card-hover" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><span className="text-lg">🔄</span><h2 className="text-[16px] font-bold text-gray-900">Institutional System Audit Trail (Root Access)</h2></div>
              <div className="flex gap-2">
                <button onClick={async () => { setRefreshing(true); try { await refreshQuiet(); } finally { setRefreshing(false); } }} disabled={refreshing} className="p-1.5 rounded text-black hover:text-[#0c1925] disabled:opacity-50" title="Refresh audit trail">
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <div className="relative">
                  <button onClick={() => setFilterOpen(o => !o)} className="p-1.5 rounded flex items-center gap-1" title="Filter by action">
                    <Filter size={16} className={actionFilter === 'ALL' ? 'text-black' : 'text-[#0c1925]'} />
                  </button>
                  {filterOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                      <div className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-100 bg-white shadow-xl z-20 py-1">
                        {ACTION_FILTERS.map((f) => (
                          <button
                            key={f.value}
                            onClick={() => { setActionFilter(f.value); setPage(1); setFilterOpen(false); }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wide hover:bg-gray-50 ${actionFilter === f.value ? 'text-[#0c1925]' : 'text-gray-500'}`}
                          >
                            {f.label}
                            {actionFilter === f.value && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="table-responsive"><table className="w-full text-[12px] min-w-[800px]">
              <thead><tr className="border-b" style={{ borderColor: '#f0ede6' }}>{['Timestamp', 'User', 'Role', 'Action', 'Description'].map((h) => (<th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[12px] uppercase tracking-wide">{h}</th>))}</tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="py-4"><div aria-busy="true"><SkeletonTable cols={5} rows={6} /></div></td></tr>
                ) : paginatedRows.length === 0 ? (<tr><td colSpan="5" className="py-8 text-center text-gray-500">No activity recorded yet.</td></tr>
                ) : paginatedRows.map((row, i) => (
                  <tr key={row.id || i} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                    <td className="py-3 pr-3 whitespace-pre font-mono text-[12px]" style={{ color: '#0c1925' }}>{row.ts}</td>
                    <td className="py-3 pr-3 font-bold text-gray-800 text-[12px]">{row.user === '-' ? <span className="text-gray-900">-</span> : row.user}</td>
                    <td className="py-3 pr-3">{row.role === '-' ? <span className="text-gray-900 font-semibold text-[12px]">-</span> : <span className={`px-2 py-0.5 rounded text-[12px] font-bold ${!row.role ? '' : row.role === 'admin' ? 'text-black' : 'text-white'}`} style={row.role ? { background: row.roleColor } : undefined}>{row.role}</span>}</td>
                    <td className="py-3 pr-3 font-mono font-bold text-[12px]" style={{ color: row.action.includes('DELET') || row.action.includes('FAIL') ? '#dc2626' : row.action.includes('UPDAT') ? '#2563eb' : row.action.includes('CREAT') || row.action.includes('SUCCESS') ? '#16a34a' : '#4b5563' }}>{row.action}</td>
                    <td className="py-3 pr-3 text-gray-700 max-w-[300px] text-[12px]" title={row.desc}>
                      {row.split ? (
                        <span className="block break-words whitespace-normal">
                          {row.split.head}
                          <br />
                          <span>{row.split.label} {row.split.tail}</span>
                        </span>
                      ) : (
                        <span className="block truncate">{row.desc}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-[12px]" style={{ borderColor: '#f0ede6' }}>
              <span className="text-gray-900 text-[12px]">Showing {Math.min((page - 1) * ROWS_PER_PAGE + 1, filteredRows.length)} to {Math.min(page * ROWS_PER_PAGE, filteredRows.length)} of {filteredRows.length.toLocaleString()} entries</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border text-gray-500 disabled:opacity-50" style={{ borderColor: '#e5e0d5' }}>Previous</button>
                {getPageNumbers().map((p) => (<button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded font-semibold" style={page === p ? { background: '#0c1925', color: '#fff' } : { background: '#f0ede6', color: '#6b7280' }}>{p}</button>))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="px-3 py-1 rounded border text-gray-500 disabled:opacity-50" style={{ borderColor: '#e5e0d5' }}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;


