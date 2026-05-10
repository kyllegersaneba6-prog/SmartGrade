import { Plus, MessageSquare, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const config = {
    'Reassuring': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    'Review Needed': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    'Action Required': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  };
  const c = config[status] || config['Reassuring'];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border} uppercase tracking-wider`}>
      {status}
    </span>
  );
};

/* ─── Class Card ─── */
const ClassCard = ({ subject, section, topic, instructor, initials, avgGrade, attendance, progress, status, borderColor }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-border overflow-hidden`}>
    <div className="p-5">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-3">
          <div className="bg-gold-light p-2.5 rounded-xl shrink-0">
            <TrendingUp size={18} className="text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sidebar text-base">{subject}</h3>
              <StatusBadge status={status} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">{section} • {topic}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 mb-4">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-sidebar">
          {initials}
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Instructor</p>
          <p className="text-sm font-medium text-sidebar">{instructor}</p>
        </div>
      </div>
    </div>

    <div className={`px-5 py-3 border-t-2 ${borderColor}`}>
      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Average Grade</p>
          <p className="text-2xl font-bold text-sidebar">{avgGrade}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Attendance</p>
          <p className="text-2xl font-bold text-sidebar">{attendance}%</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Course Progress</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>

    <div className="px-5 pb-4 pt-3">
      <button className="w-full border-2 border-gold text-gold font-bold py-2 rounded-lg hover:bg-gold-light transition-colors text-sm">
        View Full Record
      </button>
    </div>
  </div>
);

/* ─── Term Performance Trend ─── */
const TermPerformanceTrend = () => {
  const data = [
    { name: 'MATH', value: 88 },
    { name: 'ENGL', value: 82 },
    { name: 'FILI', value: 90 },
    { name: 'SCIE', value: 85 },
    { name: 'HST', value: 65 },
    { name: 'CS', value: 92 },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="text-lg font-medium text-sidebar">Term Performance Trend</h3>
        <TrendingUp size={18} className="text-gold" />
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 'bold' }} />
            <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="value" stroke="#eab308" strokeWidth={3} dot={{ r: 5, fill: '#eab308', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ─── Intervention Summary ─── */
const InterventionSummary = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
    <h3 className="text-lg font-medium text-sidebar mb-2">Intervention Summary</h3>
    <p className="text-sm text-text-muted mb-5">2 priority reviews requested for the current period.</p>

    <div className="space-y-3">
      <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sidebar text-sm">History Quiz 3 Retake</h4>
            <p className="text-xs text-text-muted mt-0.5">Scheduled for Friday, 3:00 PM</p>
          </div>
        </div>
        <button className="text-xs font-bold text-gold hover:text-gold-hover transition-colors">Details</button>
      </div>

      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sidebar text-sm">English Essay Feedback</h4>
            <p className="text-xs text-text-muted mt-0.5">Instructor waiting for response</p>
          </div>
        </div>
        <button className="text-xs font-bold text-gold hover:text-gold-hover transition-colors">Reply</button>
      </div>
    </div>
  </div>
);

/* ─── My Classes Page ─── */
const MyClasses = () => {
  const classes = [
    { subject: 'Mathematics', section: 'Section A-1', topic: 'Advanced Calculus', instructor: 'Dr. Robert Miller', initials: 'RM', avgGrade: 94.5, attendance: 98, progress: 85, status: 'Reassuring', borderColor: 'border-green-400' },
    { subject: 'English', section: 'Section B-4', topic: 'Literature & Analysis', instructor: 'Prof. Sarah Jenkins', initials: 'SJ', avgGrade: 76.2, attendance: 82, progress: 62, status: 'Review Needed', borderColor: 'border-orange-400' },
    { subject: 'Filipino', section: 'Section C-2', topic: 'Panitikang Pilipino', instructor: 'Ms. Maria Santos', initials: 'MS', avgGrade: 89.8, attendance: 95, progress: 92, status: 'Reassuring', borderColor: 'border-green-400' },
    { subject: 'Science', section: 'Section D-1', topic: 'Organic Chemistry', instructor: 'Dr. Alan Turing', initials: 'AT', avgGrade: 91.2, attendance: 94, progress: 45, status: 'Reassuring', borderColor: 'border-green-400' },
    { subject: 'History', section: 'Section E-3', topic: 'World Civilizations', instructor: 'Prof. David Graham', initials: 'DG', avgGrade: 64.5, attendance: 75, progress: 30, status: 'Action Required', borderColor: 'border-red-400' },
    { subject: 'Comp Sci', section: 'Section F-1', topic: 'Data Structures', instructor: 'Dr. Kevin Zhang', initials: 'KZ', avgGrade: 97.0, attendance: 100, progress: 88, status: 'Reassuring', borderColor: 'border-green-400' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-sidebar">My Classes</h1>
          <p className="text-text-muted mt-1">
            Academic Year 2023-2024 • Second Semester. Manage your enrollments, track real-time performance, and access instructor resources.
          </p>
        </div>
        <button className="bg-sidebar hover:bg-sidebar-hover text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors text-sm">
          <Plus size={18} /> Join New Class
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-3 gap-6">
        {classes.map((cls, idx) => (
          <ClassCard key={idx} {...cls} />
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        <TermPerformanceTrend />
        <InterventionSummary />
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-sidebar hover:bg-sidebar-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default MyClasses;
