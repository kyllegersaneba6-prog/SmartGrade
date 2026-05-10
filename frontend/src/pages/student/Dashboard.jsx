import { Flag, AlertTriangle, Info, BookOpen, FlaskConical, Globe, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/* ─── Grade Health Ring ─── */
const GradeHealthRing = () => {
  const score = 88;
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <h3 className="text-gold font-semibold mb-4">Grade Health</h3>
      <div className="h-44 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={78}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-bold text-sidebar">{score}%</span>
          <span className="text-xs font-bold text-gold tracking-widest mt-1">EXCELLENT</span>
        </div>
      </div>
      <p className="text-sm text-text-muted text-center mt-2">
        Average score across all 6 current subjects.
      </p>
    </div>
  );
};

/* ─── Performance Flags ─── */
const PerformanceFlags = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-gold font-semibold">Performance Flags</h3>
      <Flag size={18} className="text-gray-400" />
    </div>

    <div className="space-y-4">
      <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-xl">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sidebar text-sm">Calculus II: Missing Quiz</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Due 2 days ago • Immediate action required.
            </p>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-xl">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sidebar text-sm">Ethics: Assessment Gap</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Score dropped by 12% in the last module.
            </p>
          </div>
        </div>
      </div>
    </div>

    <button className="mt-5 w-full bg-sidebar hover:bg-sidebar-hover text-white font-bold py-3 rounded-lg transition-colors text-sm">
      Compute Analytics
    </button>
  </div>
);

/* ─── Course Progress ─── */
const CourseProgressCard = ({ icon: Icon, iconBg, title, subtitle, progress, color }) => (
  <div className="flex items-center gap-4 p-3">
    <div className={`${iconBg} p-2.5 rounded-xl shrink-0`}>
      <Icon size={20} className="text-gold" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline">
        <h4 className="font-bold text-sidebar text-sm truncate">{title}</h4>
        <span className="text-sm font-bold text-sidebar ml-2">{progress}%</span>
      </div>
      <p className="text-[10px] font-bold text-text-muted tracking-wider uppercase">{subtitle}</p>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  </div>
);

const CourseProgress = () => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-gold font-semibold">Course Progress</h3>
      <button className="text-xs font-bold text-gold hover:text-gold-hover transition-colors">View All</button>
    </div>

    <div className="divide-y divide-border">
      <CourseProgressCard
        icon={TrendingUp}
        iconBg="bg-gold-light"
        title="Advanced Calculus"
        subtitle="Science & Engineering"
        progress={92}
        color="bg-gold"
      />
      <CourseProgressCard
        icon={BookOpen}
        iconBg="bg-gold-light"
        title="Modern History"
        subtitle="Humanities"
        progress={74}
        color="bg-gold"
      />
      <CourseProgressCard
        icon={FlaskConical}
        iconBg="bg-gold-light"
        title="Molecular Biology"
        subtitle="Life Sciences"
        progress={81}
        color="bg-blue-500"
      />
    </div>
  </div>
);

/* ─── Category Performance Semi-Circles ─── */
const SemiCircleGauge = ({ value, label, color }) => {
  const data = [
    { name: 'Score', value },
    { name: 'Rem', value: 100 - value },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="h-20 w-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={28}
              outerRadius={40}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <span className="text-lg font-bold text-sidebar -mt-2">{value}%</span>
      <span className="text-[10px] font-semibold text-text-muted tracking-wider uppercase mt-1">{label}</span>
    </div>
  );
};

const CategoryPerformance = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
    <h3 className="text-gold font-semibold mb-6">Category Performance</h3>
    <div className="flex justify-around">
      <SemiCircleGauge value={88} label="Written Works" color="#eab308" />
      <SemiCircleGauge value={50} label="Performance Tasks" color="#eab308" />
      <SemiCircleGauge value={20} label="Assessment" color="#ef4444" />
    </div>
  </div>
);

/* ─── Submission Timeline Heatmap ─── */
const SubmissionTimeline = () => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const shades = [
    '#fef9c3', '#fde68a', '#eab308', '#ca8a04', '#a16207',
    '#fef9c3', '#eab308', '#ca8a04', '#fde68a', '#eab308',
    '#fef9c3', '#eab308', '#a16207', '#fde68a', '#ca8a04',
    '#e5e7eb', '#e5e7eb', '#fde68a', '#fef9c3', '#e5e7eb',
    '#eab308', '#ca8a04', '#e5e7eb', '#fde68a', '#eab308',
    '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb',
    '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb', '#e5e7eb',
  ];
  const rows = 5;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gold font-semibold">Submission Timeline</h3>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-text-muted">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-[#e5e7eb]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#fef9c3]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#eab308]"></div>
          <div className="w-3 h-3 rounded-sm bg-[#a16207]"></div>
          <span>More</span>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
        {days.map((d, i) => (
          <span key={i} className="text-xs font-semibold text-text-muted">{d}</span>
        ))}
      </div>

      {/* Heatmap grid */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-2 mb-2">
          {days.map((_, col) => {
            const idx = row * 7 + col;
            return (
              <div
                key={col}
                className="h-8 rounded-md transition-transform hover:scale-110"
                style={{ backgroundColor: shades[idx] || '#e5e7eb' }}
              ></div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/* ─── Promo Card ─── */
const PromoCard = () => (
  <div className="bg-sidebar rounded-2xl overflow-hidden relative h-48">
    <div className="absolute inset-0 bg-gradient-to-t from-sidebar/95 via-sidebar/60 to-transparent z-10"></div>
    <div className="absolute inset-0 bg-gold/10"></div>
    <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
      <h4 className="text-white font-bold text-lg">Final Exam Prep</h4>
      <p className="text-gold text-xs font-bold tracking-wider mt-1">3 WEEKS REMAINING</p>
      <button className="mt-3 border-2 border-gold text-gold text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-gold hover:text-sidebar transition-colors">
        VIEW STUDY GUIDE
      </button>
    </div>
  </div>
);

/* ─── Dashboard Page ─── */
const Dashboard = () => {
  return (
    <div className="flex gap-6 items-start max-w-7xl mx-auto">
      {/* Left Column */}
      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <GradeHealthRing />
          <PerformanceFlags />
        </div>
        <CategoryPerformance />
        <SubmissionTimeline />
      </div>

      {/* Right Column */}
      <div className="w-[340px] space-y-6">
        <CourseProgress />
        <PromoCard />
      </div>
    </div>
  );
};

export default Dashboard;
