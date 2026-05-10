import { Download, Cpu, AlertTriangle, TrendingDown, MessageSquare } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/* ─── Active Performance Flags ─── */
const ActivePerformanceFlags = () => (
  <div className="bg-gold-light border border-gold/30 p-6 rounded-2xl">
    <div className="flex items-center gap-2 mb-4">
      <Cpu size={18} className="text-gold" />
      <h3 className="text-gold font-bold text-lg">Active Performance Flags</h3>
    </div>

    <div className="space-y-3">
      <div className="border-l-4 border-red-500 bg-white p-4 rounded-r-xl">
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold text-lg leading-none">!</span>
          <div>
            <h4 className="font-bold text-red-600 text-sm">Critical Contribution Missing</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              The 'Final Thesis Draft' is overdue. Current grade reflects a 0% for this 15% weighted category.
            </p>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-orange-400 bg-white p-4 rounded-r-xl">
        <div className="flex items-start gap-2">
          <TrendingDown size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-orange-600 text-sm">Recent Performance Trend</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Quiz 04 score (72%) is significantly below your average (91%). Consider reviewing Topic 4.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Calculated Final Grade Card ─── */
const CalculatedGradeCard = () => {
  const gradeData = [
    { name: 'Progress', value: 70 },
    { name: 'Remaining', value: 30 },
  ];

  return (
    <div className="bg-gold-light border border-gold/30 p-6 rounded-2xl">
      <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">CALCULATED FINAL GRADE</div>
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold text-sidebar">88.0%</span>
        <span className="text-sm font-bold text-green-500">↑ 2.4%</span>
        <div className="ml-auto w-12 h-12 rounded-full bg-gold flex items-center justify-center text-white font-bold text-lg">
          B+
        </div>
      </div>
      <p className="text-sm text-sidebar mt-3 font-medium">Academic Standing: Honor Roll</p>
      <div className="flex items-center justify-between text-xs text-text-muted mt-1 mb-3">
        <span>Target: A (93%)</span>
      </div>
      <div className="w-full bg-white rounded-full h-2">
        <div className="h-2 rounded-full bg-blue-500" style={{ width: '88%' }}></div>
      </div>
      <p className="text-xs text-gold-hover text-right mt-3 italic">Updated 2 hours ago</p>
    </div>
  );
};

/* ─── Grade Breakdown Table ─── */
const GradeBreakdownTable = () => {
  const assessments = [
    { name: 'Midterm Examination', date: 'October 15, 2023', category: 'EXAMS', catBg: 'bg-blue-100 text-blue-700', weight: '25.0%', score: '92.0%', scoreColor: 'text-sidebar', classAvg: '78.5%', contribution: '23.00%', contribColor: 'text-gold' },
    { name: 'Algorithm Design Project', date: 'November 02, 2023', category: 'PROJECTS', catBg: 'bg-purple-100 text-purple-700', weight: '20.0%', score: '95.0%', scoreColor: 'text-sidebar', classAvg: '82.1%', contribution: '19.00%', contribColor: 'text-gold' },
    { name: 'Quiz 04: Dynamic Programming', date: 'November 18, 2023', category: 'QUIZZES', catBg: 'bg-orange-100 text-orange-700', weight: '10.0%', score: '72.0%', scoreColor: 'text-red-500', classAvg: '74.0%', contribution: '7.20%', contribColor: 'text-gold', flag: true },
    { name: 'Problem Set 01-05 (Combined)', date: 'Continuous Assessment', category: 'HOMEWORK', catBg: 'bg-green-100 text-green-700', weight: '15.0%', score: '94.0%', scoreColor: 'text-sidebar', classAvg: '88.5%', contribution: '14.10%', contribColor: 'text-gold' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-border">
        <h3 className="text-gold font-bold text-lg">Grade Breakdown Analysis</h3>
        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Weighted</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sidebar"></div> Formative</span>
        </div>
      </div>

      <table className="w-full text-left">
        <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4">Assessment Name</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Weight</th>
            <th className="px-6 py-4">Score</th>
            <th className="px-6 py-4">Class Avg</th>
            <th className="px-6 py-4">Contribution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {assessments.map((a, i) => (
            <tr key={i} className="hover:bg-bg-light/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {a.flag && <AlertTriangle size={14} className="text-orange-500 shrink-0" />}
                  <div>
                    <div className="font-bold text-sidebar">{a.name}</div>
                    <div className="text-xs text-text-muted">{a.date}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${a.catBg} uppercase tracking-wider`}>{a.category}</span>
              </td>
              <td className="px-6 py-4 text-text-muted">{a.weight}</td>
              <td className={`px-6 py-4 font-bold ${a.scoreColor}`}>{a.score}</td>
              <td className="px-6 py-4 text-text-muted">{a.classAvg}</td>
              <td className={`px-6 py-4 font-bold ${a.contribColor}`}>{a.contribution}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remaining Potential */}
      <div className="px-6 py-3 border-t border-dashed border-border flex justify-between items-center text-sm italic text-text-muted">
        <span>Remaining Potential (Final Exam & Participation)</span>
        <span className="font-bold text-sidebar not-italic">30.0% Rem.</span>
      </div>

      {/* Total Row */}
      <div className="px-6 py-4 bg-bg-light border-t-2 border-gold flex justify-between items-center">
        <span className="font-bold text-sidebar uppercase tracking-wider text-sm">TOTAL WEIGHTED CALCULATION</span>
        <div className="flex items-center gap-8 text-sm">
          <div className="text-center">
            <div className="font-bold text-sidebar">70.0%</div>
            <div className="text-[10px] text-text-muted font-semibold">Done</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-sidebar">AVG: 88.3%</div>
          </div>
          <div className="text-3xl font-bold text-gold">88.0%</div>
        </div>
      </div>
    </div>
  );
};

/* ─── Calculation Logic Card ─── */
const CalculationLogic = () => {
  const gradeData = [
    { name: 'Written Works', value: 88 },
    { name: 'Rest', value: 12 },
  ];
  const assessData = [
    { name: 'Assessment', value: 20 },
    { name: 'Rest', value: 80 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Cpu size={18} className="text-gold" />
        <h3 className="text-gold font-bold text-lg">Calculation Logic</h3>
      </div>

      <p className="text-sm text-text-muted mb-4">
        Final Grade = Σ (Score × Weight) / Σ (Weights Graded)
      </p>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Current Earned Points</span>
          <span className="font-bold text-sidebar">63.3 / 70.0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Projected Mastery</span>
          <span className="font-bold text-gold">Distinction Level</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Gradebook Page ─── */
const Gradebook = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
            Classes / <span className="text-gold">CS 402: Advanced Algorithms</span>
          </p>
          <h1 className="text-3xl font-bold text-sidebar">Detailed Performance Gradebook</h1>
          <p className="text-text-muted mt-1">Academic Year 2023-24 • Semester II</p>
        </div>
        <div className="flex gap-3">
          <button className="border-2 border-gold text-gold font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 hover:bg-gold-light transition-colors text-sm">
            <Download size={16} /> Export PDF
          </button>
          <button className="bg-sidebar hover:bg-sidebar-hover text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors text-sm">
            <Cpu size={16} /> Compute Projection
          </button>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-2 gap-6">
        <ActivePerformanceFlags />
        <CalculatedGradeCard />
      </div>

      {/* Grade Breakdown Table */}
      <GradeBreakdownTable />

      {/* Bottom Row */}
      <CalculationLogic />

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-sidebar hover:bg-sidebar-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default Gradebook;
