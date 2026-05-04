import { Users, Star, Calendar, CheckSquare, Settings2, Download } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MetricCard = ({ title, value, icon: Icon, trend, isPositive }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className="bg-bg-light p-2 rounded-lg text-sidebar border border-border"><Icon size={20}/></div>
      <span className={`text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
    </div>
    <div>
      <div className="text-sm font-medium text-text-muted mb-1">{title}</div>
      <div className="text-2xl font-bold text-sidebar">{value}</div>
    </div>
  </div>
);

const InstitutionalAnalytics = () => {
  const trendData = [
    { month: 'SEP', sci: 3.2, avg: 3.1 }, { month: 'OCT', sci: 3.4, avg: 3.15 },
    { month: 'NOV', sci: 3.3, avg: 3.1 }, { month: 'DEC', sci: 3.6, avg: 3.2 },
    { month: 'JAN', sci: 3.8, avg: 3.1 }, { month: 'FEB', sci: 3.1, avg: 3.2 }
  ];

  const interventions = [
    { class: 'Physics 101 - Sec B', instructor: 'Prof. Starling', deviation: '-14% Median GPA', risk: 'CRITICAL', action: 'Syllabus weight audit suggested.' },
    { class: 'Modern Literature', instructor: 'Dr. Aris', deviation: '+18% Submission Delay', risk: 'WARNING', action: 'LMS notification trigger adjustment.' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-sidebar rounded-2xl p-8 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
             <div className="bg-gold/20 text-gold border border-gold/30 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-gold rounded-full"></div> LIVE SYSTEM AUDIT
             </div>
             <div className="flex gap-3">
               <button className="bg-gold hover:bg-gold-hover text-sidebar font-bold px-4 py-2 rounded-lg text-sm transition-colors">Compute Metrics</button>
               <button className="border border-gold text-gold hover:bg-gold/10 font-bold px-4 py-2 rounded-lg text-sm transition-colors">Quick Audit</button>
             </div>
          </div>

          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Institutional Analytics</h1>
            <h2 className="text-3xl font-bold text-gold mb-4">Performance Pulse</h2>
            <p className="text-gray-300 max-w-lg leading-relaxed text-sm">
              Comprehensive assessment of academic integrity, grade consistency, and departmental engagement across the current academic cycle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard title="Total Enrollment" value="42,892" icon={Users} trend="+12.4%" isPositive={true} />
          <MetricCard title="GPA Median" value="3.42" icon={Star} trend="-2.1%" isPositive={false} />
          <MetricCard title="Absenteeism" value="4.1%" icon={Calendar} trend="-8.3%" isPositive={true} />
          <MetricCard title="Submission Rate" value="92%" icon={CheckSquare} trend="98.2%" isPositive={true} />
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-medium text-sidebar">Submission Compliance Funnel</h3>
            <button className="text-gray-400"><Settings2 size={16}/></button>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
            <div className="w-full bg-sidebar py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'}}>TOTAL ASSIGNMENTS (12.4K)</div>
            <div className="w-[90%] bg-sidebar/90 py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)'}}>IN PROGRESS (8.1K)</div>
            <div className="w-[80%] bg-sidebar/80 py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)'}}>DRAFTED (4.2K)</div>
            <div className="w-[65%] bg-gold py-3 text-center text-sidebar text-xs font-bold">SUBMITTED (3.8K)</div>
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
            <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">DROP-OFF RATE</span>
            <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">12.4% INCREASE</span>
          </div>
        </div>

        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium text-sidebar">Grade Distribution Anomalies</h3>
              <p className="text-xs text-text-muted mt-1">Deviations exceeding σ2 historical median across all departments.</p>
            </div>
            <div className="flex gap-2">
              <button className="p-1.5 border border-border rounded text-gray-400 hover:text-sidebar"><Settings2 size={14}/></button>
              <button className="p-1.5 border border-border rounded text-gray-400 hover:text-sidebar"><Download size={14}/></button>
            </div>
          </div>
          
          <div className="flex-1 border-b border-border mb-4 flex items-end justify-around px-4 pb-2">
             {/* Empty chart area as in mockup */}
             <div className="w-8"></div>
             <div className="w-8"></div>
             <div className="w-8"></div>
             <div className="w-8"></div>
             <div className="w-8"></div>
             <div className="w-8"></div>
          </div>
          <div className="flex justify-around text-[10px] font-bold text-text-muted tracking-widest uppercase">
            <span>MATH</span><span>SCI</span><span>ENG</span><span>HIST</span><span>ARTS</span><span>ECON</span>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-medium text-sidebar">Chronic Absenteeism Hotspots</h3>
             <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest uppercase text-text-muted">
               LOW <div className="w-16 h-1.5 rounded-full bg-linear-to-r from-bg-light via-gold-light to-gold"></div> HIGH
             </div>
          </div>
          
          <div className="grid grid-cols-6 gap-2 mb-4">
            {/* Heatmap Grid Mock */}
            {Array(24).fill(0).map((_, i) => {
              const opacities = [10, 20, 10, 30, 10, 10, 20, 50, 60, 40, 20, 10, 10, 30, 20, 40, 10, 10, 20, 10, 10, 10, 40, 70];
              return <div key={i} className="aspect-square rounded" style={{backgroundColor: `rgba(234, 179, 8, ${opacities[i]/100})`}}></div>
            })}
          </div>
          <p className="text-xs text-text-muted italic">Critical hotspot identified in 12th Grade Humanities (Room 402B).</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-medium text-sidebar mb-6">Departmental Grade Trend</h3>
          <div className="h-40">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={trendData} margin={{top: 10, bottom: 0, left: 0, right: 0}}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sci" stroke="#eab308" strokeWidth={3} dot={{r: 4, fill: '#eab308', stroke: '#fff', strokeWidth: 2}} />
                  <Line type="monotone" dataKey="avg" stroke="#2f3640" strokeDasharray="4 4" strokeWidth={2} dot={false} />
               </LineChart>
             </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-4 text-xs font-bold text-sidebar">
             <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gold"></div> Science Dept.</span>
             <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-sidebar"></div> Average Historical</span>
          </div>
        </div>
      </div>

      {/* Interventions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-border">
          <div>
            <h3 className="text-lg font-medium text-sidebar">Recommended Interventions</h3>
            <p className="text-xs text-text-muted mt-1">AI-suggested corrective actions based on current gradebook anomalies.</p>
          </div>
          <button className="border border-gold text-gold font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 hover:bg-gold-light transition-colors">
            <Star size={14}/> Automate Interventions
          </button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">TARGET CLASS</th>
              <th className="px-6 py-4">METRIC DEVIATION</th>
              <th className="px-6 py-4">RISK LEVEL</th>
              <th className="px-6 py-4">PROPOSED ACTION</th>
              <th className="px-6 py-4">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {interventions.map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4">
                  <div className="font-bold text-sidebar">{row.class}</div>
                  <div className="text-[10px] text-text-muted">Instructor: {row.instructor}</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs">{row.deviation}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${row.risk === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="px-6 py-4 text-text-muted text-xs">{row.action}</td>
                <td className="px-6 py-4 font-bold text-gold hover:text-gold-hover cursor-pointer transition-colors text-xs">Review Record</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstitutionalAnalytics;
