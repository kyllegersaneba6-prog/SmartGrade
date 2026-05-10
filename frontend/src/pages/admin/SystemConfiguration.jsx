import { useState } from 'react';
import { Clock, School, Pencil, Copy, ArrowLeft, ArrowRight } from 'lucide-react';

const templates = [
  {
    id: 1,
    badge: 'OFFICIAL STANDARD',
    badgeColor: '#f5a623',
    name: 'DepEd ECR',
    desc: 'Official Electronic Class Record v4.2',
    ago: '2 days ago',
    schools: 142,
  },
  {
    id: 2,
    badge: 'CUSTOMIZED',
    badgeColor: '#3b82f6',
    name: 'Custom School Report Card',
    desc: 'High School Personalized Template',
    ago: '1 month ago',
    schools: 12,
  },
];

const auditLogs = [
  {
    version: 'v4.2.0-stable',
    template: 'DepEd ECR',
    change: 'Updated quarter calculation logic for SHS...',
    by: 'JD',
    byName: 'Jane Doe',
    ts: '2023-10-24 14:32',
    status: 'PUBLISHED',
    action: 'Revert',
  },
  {
    version: 'v1.1.2-alpha',
    template: 'Custom School RC',
    change: 'Modified logo positioning in PDF header',
    by: 'SM',
    byName: 'System Master',
    ts: '2023-10-22 09:15',
    status: 'DRAFT',
    action: 'Edit',
  },
  {
    version: 'v4.1.9-legacy',
    template: 'DepEd ECR',
    change: 'Security patch for data validation layer',
    by: 'SA',
    byName: 'Admin Root',
    ts: '2023-10-18 21:04',
    status: 'ARCHIVED',
    action: 'View',
  },
];

const funnelRows = [
  { label: 'RAW DATA INGESTION', width: '100%' },
  { label: 'VALIDATION', width: '82%' },
  { label: 'CALCULATION', width: '65%' },
  { label: 'REPORTS', width: '48%', highlight: true },
];

const statusStyles = {
  PUBLISHED: { bg: '#dcfce7', color: '#15803d' },
  DRAFT: { bg: '#f0ede6', color: '#6b7280' },
  ARCHIVED: { bg: '#fee2e2', color: '#991b1b' },
};

const SystemConfiguration = () => {
  const [logFilter, setLogFilter] = useState('All Logs');

  return (
    <div>
      {/* Breadcrumb + Title */}
      <div className="mb-1 text-xs text-gray-400 tracking-wide uppercase">
        Portal / Global Settings
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium rounded-lg border"
            style={{ borderColor: '#d1c9ba', color: '#333' }}
          >
            Backup Data
          </button>
          <button
            className="px-4 py-2 text-sm font-bold text-white rounded-lg"
            style={{ background: '#f5a623' }}
          >
            Global Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left 2/3 */}
        <div className="col-span-2 flex flex-col gap-5">
          {/* Active Report Templates */}
          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">≡</span>
                <h2 className="text-base font-bold text-gray-900">Active Report Templates</h2>
              </div>
              <button className="text-xs font-semibold flex items-center gap-1" style={{ color: '#f5a623' }}>
                + Create New Template
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: '#e5e0d5' }}
                >
                  {/* Preview area */}
                  <div className="relative h-32 flex items-center justify-center" style={{ background: '#f0ede6' }}>
                    <div className="text-center">
                      <div className="text-3xl mb-1">📄</div>
                      <div className="text-xs text-gray-400">Template Preview</div>
                    </div>
                    <span
                      className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ background: t.badgeColor }}
                    >
                      {t.badge}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-gray-900">{t.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                      </div>
                      <div className="flex gap-2">
                        <Pencil size={14} className="text-gray-400 cursor-pointer" />
                        <Copy size={14} className="text-gray-400 cursor-pointer" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={10} />{t.ago}</span>
                      <span className="flex items-center gap-1"><School size={10} />{t.schools} Schools</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span>🔄</span>
                <h2 className="text-base font-bold text-gray-900">Template Version History & Audit Trail</h2>
              </div>
              <div className="flex gap-2">
                {['All Logs', 'Critical Only'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className="px-3 py-1 text-xs rounded-lg font-medium transition-colors"
                    style={
                      logFilter === f
                        ? { background: '#1a2233', color: '#fff' }
                        : { background: '#f0ede6', color: '#6b7280' }
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">Full record of configuration changes and publication logs</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                    {['VERSION ID', 'TEMPLATE NAME', 'CHANGE DESCRIPTION', 'MODIFIED BY', 'TIMESTAMP', 'STATUS', 'ACTIONS'].map((h) => (
                      <th key={h} className="text-left pb-2 pr-4 font-semibold text-gray-400 tracking-wide text-[10px] uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.version} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                      <td className="py-3 pr-4 font-semibold" style={{ color: '#f5a623' }}>{log.version}</td>
                      <td className="py-3 pr-4 font-medium text-gray-800">{log.template}</td>
                      <td className="py-3 pr-4 text-gray-500 max-w-[160px]">{log.change}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: '#1a2233' }}
                          >
                            {log.by}
                          </span>
                          <span className="text-gray-700">{log.byName}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{log.ts}</td>
                      <td className="py-3 pr-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={statusStyles[log.status]}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 font-semibold" style={{ color: '#f5a623' }}>{log.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
              <span>Showing 3 of 142 audit logs</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded border text-gray-500 flex items-center gap-1" style={{ borderColor: '#e5e0d5' }}>
                  <ArrowLeft size={12} /> Prev
                </button>
                <button className="px-3 py-1 rounded border text-gray-500 flex items-center gap-1" style={{ borderColor: '#e5e0d5' }}>
                  Next <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#f5a623' }}>▽</span>
              <h2 className="text-sm font-bold text-gray-900">Descriptive Funnel Audit</h2>
            </div>
            <p className="text-[11px] text-gray-400 mb-5">Institutional data flow efficiency metric</p>

            <div className="flex flex-col gap-2">
              {funnelRows.map(({ label, width, highlight }) => (
                <div key={label}>
                  <div
                    className="flex items-center justify-center py-2.5 rounded text-xs font-bold text-white"
                    style={{
                      background: highlight ? '#f5a623' : '#1a2233',
                      width,
                      minWidth: '60%',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t" style={{ borderColor: '#f0ede6' }}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 tracking-wide">SYSTEM RELIABILITY</span>
                <span className="font-bold" style={{ color: '#22c55e' }}>99.98%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: '#f0ede6' }}>
                <div className="h-1.5 rounded-full" style={{ background: '#f5a623', width: '99.98%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div
        className="fixed bottom-0 left-44 right-0 flex items-center justify-between px-6 py-3 text-xs font-medium"
        style={{ background: '#1a2233', color: '#fff' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span>SYSTEM LIVE</span>
          <span className="text-white/40 ml-3">Global Grade Computation Engine: <span className="text-white">READY</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex">
            {['JS', 'MT'].map((u) => (
              <span key={u} className="w-7 h-7 -ml-1.5 first:ml-0 rounded-full border-2 border-[#1a2233] bg-[#f5a623] flex items-center justify-center text-[10px] font-bold text-white">
                {u}
              </span>
            ))}
            <span className="w-7 h-7 -ml-1.5 rounded-full border-2 border-[#1a2233] bg-gray-500 flex items-center justify-center text-[10px] font-bold text-white">+4</span>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: '#f5a623' }}
          >
            ⚡ EXECUTE GLOBAL RE-SYNC
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;
