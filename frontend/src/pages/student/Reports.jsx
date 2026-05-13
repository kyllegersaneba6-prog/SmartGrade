import { Sparkles, Download, Filter, Eye, AlertTriangle, TrendingUp, FileText, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/* ─── Reports Table ─── */
const ReportsTable = () => {
  const reports = [
    { name: 'Final Report Card (Q1)', icon: FileText, iconColor: 'text-gold', date: 'Oct 15, 2023', status: 'FINALIZED', statusBg: 'bg-green-100 text-green-700', score: '3.85', scoreLabel: 'GPA', scoreColor: 'text-green-600' },
    { name: 'Final Report Card (Q2)', icon: FileText, iconColor: 'text-gold', date: 'Jan 22, 2024', status: 'FINALIZED', statusBg: 'bg-green-100 text-green-700', score: '3.79', scoreLabel: 'GPA', scoreColor: 'text-green-600' },
    { name: 'Attendance Trend', icon: Clock, iconColor: 'text-blue-500', date: 'Feb 01, 2024', status: 'ACTIVE', statusBg: 'bg-blue-100 text-blue-700', score: '98%', scoreLabel: 'Match', scoreColor: 'text-blue-600' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-border">
        <h3 className="text-gold font-bold text-lg">Generated Reports Breakdown</h3>
        <div className="flex gap-2">
          <button className="text-gray-400 hover:text-sidebar transition-colors"><Filter size={18} /></button>
          <button className="text-gray-400 hover:text-sidebar transition-colors"><Download size={18} /></button>
        </div>
      </div>

      <div className="table-responsive"><table className="w-full text-left min-w-[600px]">
        <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4">Report Name</th>
            <th className="px-6 py-4">Generated Date</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Score</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {reports.map((r, i) => (
            <tr key={i} className="hover:bg-bg-light/50 transition-colors">
              <td className="px-6 py-4 flex items-center gap-3">
                <r.icon size={18} className={r.iconColor} />
                <span className="font-bold text-sidebar">{r.name}</span>
              </td>
              <td className="px-6 py-4 text-text-muted">{r.date}</td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${r.statusBg} uppercase tracking-wider`}>{r.status}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`font-bold ${r.scoreColor}`}>{r.score}</span>
                <span className="text-xs text-text-muted ml-1">{r.scoreLabel}</span>
              </td>
              <td className="px-6 py-4 flex gap-3">
                <button className="text-gray-400 hover:text-sidebar transition-colors flex items-center gap-1 text-xs font-medium">
                  <Eye size={14} /> VIEW
                </button>
                <button className="text-gray-400 hover:text-sidebar transition-colors flex items-center gap-1 text-xs font-medium">
                  <Download size={14} /> DL
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <div className="p-4 text-center">
        <button className="text-sm font-bold text-gold hover:text-gold-hover transition-colors uppercase tracking-wider">
          View All Archived Reports
        </button>
      </div>
    </div>
  );
};

/* ─── Active Interventions ─── */
const ActiveInterventions = () => (
  <div className="space-y-4">
    <h3 className="text-gold font-bold text-lg uppercase tracking-wider">Active Interventions</h3>

    {/* Status Review Needed */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Status Review Needed</span>
        <AlertTriangle size={16} className="text-red-500" />
      </div>
      <h4 className="font-bold text-sidebar mb-1">Mathematics Analysis II</h4>
      <p className="text-xs text-text-muted leading-relaxed">
        Final grade calculation pending instructor review of "Quantum Theory" module.
      </p>
      <button className="mt-3 w-full border-2 border-red-400 text-red-500 font-bold py-2 rounded-lg hover:bg-red-50 transition-colors text-xs uppercase tracking-wider">
        Contact Registrar
      </button>
    </div>

    {/* Processing Report */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Processing Report</span>
        <span className="text-gold text-lg">&ldquo;&rdquo;</span>
      </div>
      <h4 className="font-bold text-sidebar mb-1">Mid-Term Summary</h4>
      <p className="text-xs text-text-muted leading-relaxed">
        Generating consolidated performance data across all stem electives.
      </p>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
        <div className="h-1.5 rounded-full bg-gold animate-pulse" style={{ width: '65%' }}></div>
      </div>
    </div>

    {/* Current Standing */}
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-sidebar uppercase tracking-wider">Current Standing</span>
        <TrendingUp size={16} className="text-gold" />
      </div>
      <div className="flex justify-center mb-4">
        <div className="relative">
          <div className="h-32 w-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: 90 }, { value: 10 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={56}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#eab308" />
                  <Cell fill="#f3f4f6" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-sidebar">90%</span>
            <span className="text-[9px] font-bold text-gold tracking-widest">EXCELLENT</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-text-muted text-center">
        You are in the top 5% of your cohort.
      </p>
    </div>
  </div>
);

/* ─── Reports Page ─── */
const Reports = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start max-w-7xl mx-auto">
      {/* Left Column */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sidebar uppercase tracking-wide">Academic Performance Reports</h1>
            <p className="text-text-muted mt-1">
              Archived and generated records for the 2023-2024 academic year.
            </p>
          </div>
          <button className="w-full sm:w-auto bg-gold hover:bg-gold-hover text-sidebar font-bold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
            <Sparkles size={18} /> Generate New Report
          </button>
        </div>

        {/* Reports Table */}
        <ReportsTable />
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[300px]">
        <ActiveInterventions />
      </div>
    </div>
  );
};

export default Reports;
