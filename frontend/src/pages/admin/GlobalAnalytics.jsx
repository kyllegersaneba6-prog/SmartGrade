import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ArrowRight, FileText, Cpu, Network, Shield } from 'lucide-react';

const enrollmentData = [
  { month: 'SEP', enrollment: 420, attendance: 390 },
  { month: 'OCT', enrollment: 460, attendance: 410 },
  { month: 'NOV', enrollment: 445, attendance: 400 },
  { month: 'DEC', enrollment: 390, attendance: 360 },
  { month: 'JAN', enrollment: 470, attendance: 435 },
  { month: 'FEB', enrollment: 490, attendance: 455 },
];

const funnelSteps = [
  { label: 'Data Ingestion', pct: 100, color: '#1a2233' },
  { label: 'Normalization', pct: 84, color: '#2a3448' },
  { label: 'Metric Scoring', pct: 62, color: '#3a4a65' },
  { label: 'Final Export', pct: 48, color: '#f5a623' },
];

const descriptiveFunnelItems = [
  { label: 'Heuristic Analysis', sub: 'OPTIMAL ALIGNMENT', icon: Cpu, color: '#f5a623' },
  { label: 'Cross-Campus Sync', sub: 'LAST SYNC: 2M AGO', icon: Network, color: '#f5a623' },
  { label: 'Audit Reliability', sub: '99.9% CONFIDENCE', icon: Shield, color: '#f5a623' },
];

const heatmapRows = [
  { school: 'College of IT', cols: [82, 91, 78, 88] },
  { school: 'College of Education', cols: [75, 85, 90, 72] },
  { school: 'Senior High-STEM', cols: [88, 76, 84, 93] },
  { school: 'Senior High-ABM', cols: [65, 70, 78, 80] },
  { school: 'Junior HS-Rizal', cols: [72, 80, 68, 75] },
];

const heatColor = (val) => {
  if (val >= 88) return '#2d6a4f';
  if (val >= 78) return '#52b788';
  if (val >= 70) return '#d4a017';
  return '#c1440e';
};

const GlobalAnalytics = () => (
  <div>
    {/* Header */}
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f5a623' }}>Global Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
          Comprehensive Institutional performance oversight and trend forecasting.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full border"
          style={{ borderColor: '#d1c9ba', color: '#6b7280' }}
        >
          ACADEMIC YEAR 2024-25
        </span>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full text-white"
          style={{ background: '#f5a623' }}
        >
          LIVE DATA
        </span>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-5">
      {/* Left 2/3 */}
      <div className="col-span-2 flex flex-col gap-5">
        {/* Heatmap Card */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>
              Institutional Performance Heatmap
            </h2>
            <button className="flex items-center gap-1 text-xs font-medium" style={{ color: '#f5a623' }}>
              View Full Details <ArrowRight size={12} />
            </button>
          </div>

          {/* Simple heatmap grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-4 font-medium text-gray-400 w-40">School / Dept</th>
                  {['GPA', 'Pass Rate', 'Retention', 'Attendance'].map((h) => (
                    <th key={h} className="pb-2 px-2 font-medium text-gray-400 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row) => (
                  <tr key={row.school}>
                    <td className="py-1.5 pr-4 font-medium text-gray-600 text-xs">{row.school}</td>
                    {row.cols.map((val, i) => (
                      <td key={i} className="py-1.5 px-2 text-center">
                        <span
                          className="inline-block w-10 py-1 rounded text-white text-xs font-semibold"
                          style={{ background: heatColor(val) }}
                        >
                          {val}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t" style={{ borderColor: '#e5e0d5' }}>
            {[
              { label: 'AVERAGE GPA', value: '3.82', color: '#1a2233' },
              { label: 'PASS RATE', value: '94.2%', color: '#22c55e' },
              { label: 'RETENTION', value: '89%', color: '#1a2233' },
              { label: 'AT RISK', value: '3.1%', color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-gray-400 tracking-widest mb-1">{label}</div>
                <div className="text-xl font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrollment Trend */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>
              System-Wide Enrollment & Attendance Trend
            </h2>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#f5a623' }} />
                Enrollment
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                Attendance
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={enrollmentData} barGap={4}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                cursor={{ fill: 'rgba(245,166,35,0.05)' }}
              />
              <Bar dataKey="enrollment" fill="#f5a623" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" fill="#d1c9ba" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right 1/3 */}
      <div className="flex flex-col gap-5">
        {/* Funnel */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-sm font-bold mb-4" style={{ color: '#1a2233' }}>Multi-Format Report Funnel</h2>
          <div className="flex flex-col gap-2">
            {funnelSteps.map(({ label, pct, color }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ background: color, color: '#fff' }}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm font-bold">{pct}%</span>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <button
            className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: '#f5a623' }}
          >
            ✦ GENERATE MASTER REPORT
          </button>
          <div className="flex gap-2 mt-2">
            {['PDF', 'XLSX', 'CSV'].map((fmt) => (
              <button
                key={fmt}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border"
                style={{ borderColor: '#d1c9ba', color: '#333' }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Descriptive Funnel */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-sm font-bold mb-1" style={{ color: '#1a2233' }}>Institutional Descriptive Funnel</h2>
          <p className="text-[11px] mb-4" style={{ color: '#9ca3af' }}>
            Automated descriptive modeling for multi-campus grade parity.
          </p>
          <div className="flex flex-col gap-3">
            {descriptiveFunnelItems.map(({ label, sub, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#fef9c3' }}
                >
                  <Icon size={15} style={{ color: '#f5a623' }} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">{label}</div>
                  <div className="text-[10px] tracking-widest" style={{ color: '#f5a623' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom metrics */}
        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          {[
            { label: 'FACULTY COMPLIANCE', value: '98.4%', color: '#1a2233' },
            { label: 'AVG RESPONSE TIME', value: '42ms', color: '#1a2233' },
            { label: 'ACTIVE INTERVENTIONS', value: '247', color: '#f5a623' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
              <div className="text-[10px] tracking-wider text-gray-400 uppercase">{label}</div>
              <div className="text-base font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default GlobalAnalytics;
