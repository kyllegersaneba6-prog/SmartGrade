import { useState } from 'react';
import { Filter, RefreshCw, Download, Share2, FileText, Table2, BookOpen } from 'lucide-react';

const metrics = [
  { label: 'CRITICAL ALERTS', value: '02', color: '#ef4444', bg: '#fee2e2', icon: '⚠' },
  { label: 'SYSTEM ACCESSES', value: '1,482', color: '#1a2233', bg: '#f0ede6', icon: '↗' },
  { label: 'DATA EXPORTS', value: '84', color: '#1a2233', bg: '#f0ede6', icon: '📋' },
  { label: 'UPTIME HEALTH', value: '99.9%', color: '#22c55e', bg: '#dcfce7', icon: '☁' },
];

const auditRows = [
  { ts: '2023-10-24\n09:14:22', user: 'admin.j.doe', role: 'ROOT', roleColor: '#ef4444', action: 'DB_QUERY', desc: 'Global performance re-indexing', count: 1, critical: false },
  { ts: '2023-10-24\n09:12:05', user: 'sys.automation', role: 'SERVICE', roleColor: '#3b82f6', action: 'SYS_CLEAN', desc: 'Purged temporary cache files (4.2GB)', count: 1, critical: false },
  { ts: '2023-10-24\n08:55:12', user: 'user.m.smith', role: 'FACULTY', roleColor: '#6b7280', action: 'EXPORT_PDF', desc: 'Grade report generation – CS101', count: 1, critical: false },
  { ts: '2023-10-24\n08:42:10', user: 'unknown.node', role: 'EXTERNAL', roleColor: '#f97316', action: 'AUTH_FAIL', desc: 'Repeated login attempts detected', count: 8, critical: true },
  { ts: '2023-10-24\n08:30:00', user: 'sys.backup', role: 'SERVICE', roleColor: '#3b82f6', action: 'BKP_FULL', desc: 'Nightly encrypted backup completed', count: 1, critical: false },
];

const outputFormats = [
  { label: 'RAW LOGS', sub: 'JSON/TXT Format', pct: 100, icon: FileText, color: '#b5a98a' },
  { label: 'STRUCTURED CSV', sub: 'Excel Compatible', pct: 64, icon: Table2, color: '#8a9aa5' },
  { label: 'EXECUTIVE PDF', sub: 'Audit Ready', pct: 28, icon: BookOpen, color: '#9a8a7a' },
];

const SecurityAudit = () => {
  const [page, setPage] = useState(1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security &amp; Audit Logs</h1>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {metrics.map(({ label, value, color, bg, icon }) => (
          <div key={label} className="rounded-xl p-4 shadow-sm flex items-center justify-between" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div>
              <div className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">{label}</div>
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: bg }}>{icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Audit Trail */}
        <div className="col-span-2">
          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h2 className="text-base font-bold text-gray-900">Institutional System Audit Trail (Root Access)</h2>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 rounded border" style={{ borderColor: '#e5e0d5' }}><Filter size={14} className="text-gray-400" /></button>
                <button className="p-1.5 rounded border" style={{ borderColor: '#e5e0d5' }}><RefreshCw size={14} className="text-gray-400" /></button>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                  {['Timestamp', 'User', 'Role', 'Action', 'Description', '#'].map((h) => (
                    <th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                    <td className="py-3 pr-3 whitespace-pre font-mono text-[11px]" style={{ color: row.critical ? '#ef4444' : '#555' }}>{row.ts}</td>
                    <td className="py-3 pr-3 font-bold text-gray-800">{row.user}</td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: row.roleColor }}>{row.role}</span>
                    </td>
                    <td className="py-3 pr-3 font-mono text-gray-700">{row.action}</td>
                    <td className="py-3 pr-3 text-gray-500">{row.desc}</td>
                    <td className="py-3 text-gray-400 font-semibold">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
              <span className="text-gray-400">Showing 10 of 1,482 entries</span>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 rounded border text-gray-500" style={{ borderColor: '#e5e0d5' }}>Previous</button>
                {[1, 2, 3].map((p) => (
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded font-semibold"
                    style={page === p ? { background: '#1a2233', color: '#fff' } : { background: '#f0ede6', color: '#6b7280' }}>
                    {p}
                  </button>
                ))}
                <button className="px-3 py-1 rounded border text-gray-500" style={{ borderColor: '#e5e0d5' }}>Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div className="flex items-center gap-2 mb-4">
              <span style={{ color: '#f5a623' }}>▽</span>
              <h2 className="text-sm font-bold text-gray-900">Multi-Format Output</h2>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {outputFormats.map(({ label, sub, pct, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between px-3 py-3 rounded-lg" style={{ background: color, color: '#fff' }}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <div>
                      <div className="text-xs font-bold">{label}</div>
                      <div className="text-[10px] opacity-80">{sub}</div>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{pct}%</span>
                </div>
              ))}
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white mb-2" style={{ background: '#f5a623' }}>
              <Download size={14} /> Generate All Reports
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: '#f5a623', color: '#f5a623' }}>
              <Share2 size={14} /> Secure Transmit
            </button>
          </div>

          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <h2 className="text-sm font-bold text-gray-900 mb-1">Security Overview</h2>
            <p className="text-[11px] text-gray-400 mb-4">Real-time surveillance of global access points.</p>
            <div className="rounded-lg h-24 flex items-center justify-center mb-4" style={{ background: '#f0ede6' }}>
              <div className="text-center text-gray-400">
                <div className="text-2xl mb-1">🛡</div>
                <div className="text-xs">Security Dashboard Preview</div>
              </div>
            </div>
            {[{ label: 'Active Threats', value: '0', color: '#22c55e' }, { label: 'Blocked IPs', value: '3', color: '#f97316' }, { label: 'Auth Failures (24h)', value: '8', color: '#ef4444' }].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center text-xs py-1.5 border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                <span className="text-gray-500">{label}</span>
                <span className="font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
