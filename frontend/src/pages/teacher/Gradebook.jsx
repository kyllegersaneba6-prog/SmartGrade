import { Filter, Download, Zap, TrendingUp, CheckCircle, AlertTriangle, Check, X, Flag, Lightbulb } from 'lucide-react';

const Gradebook = () => {
  const students = [
    { id: 'SG-2024-001', name: 'Alexander Hamilton', att: '98%', q1: 88, mid: 92, a3: true, proj: 95, status: 'EXCELLENT', grade: 91 },
    { id: 'SG-2024-002', name: 'Beatrix Burnier', att: '72%', q1: 64, mid: 58, a3: false, proj: 42, status: 'AT RISK', grade: 54 },
    { id: 'SG-2024-003', name: 'Caspian Draken', att: '85%', q1: 78, mid: 81, a3: true, proj: 74, status: 'ON TRACK', grade: 77 },
    { id: 'SG-2024-004', name: 'Evelyn Frost', att: '100%', q1: 98, mid: 96, a3: true, proj: 100, status: 'SUPERIOR', grade: 98 },
    { id: 'SG-2024-005', name: 'Gregory Locke', att: '82%', q1: 72, mid: 75, a3: 'flag', proj: 68, status: 'NEEDS REVIEW', grade: 71 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-border">
        <div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Current Module</div>
          <div className="text-lg font-medium text-sidebar">Advanced Calculus II</div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-sidebar flex items-center gap-2 hover:bg-gray-50">
            <Filter size={16} /> Filter View
          </button>
          <button className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-sidebar flex items-center gap-2 hover:bg-gray-50">
            <Download size={16} /> Export Data
          </button>
          <button className="px-5 py-2 bg-gold hover:bg-gold-hover text-sidebar rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Zap size={16} /> Compute Grades (Automated)
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Class Average</h4>
          <div className="text-4xl font-bold text-gold relative z-10">84.2%</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <CheckCircle size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Completion Rate</h4>
          <div className="text-4xl font-bold text-green-500 relative z-10">98.5%</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <AlertTriangle size={80} className="absolute -right-4 -bottom-4 text-red-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">At-Risk Students</h4>
          <div className="text-4xl font-bold text-red-500 relative z-10">3</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col justify-center items-center relative group cursor-pointer">
           <div className="text-sidebar font-bold tracking-widest uppercase relative z-10">COURSE PROGRESS</div>
           <div className="absolute inset-0 bg-gold/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-sidebar text-white text-xs px-3 py-1 rounded-full">View Matrix</span>
           </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-bg-light p-6 rounded-2xl shadow-inner border border-border">
        <table className="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm">
          <thead className="bg-sidebar text-xs font-semibold text-white tracking-wider">
            <tr>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-4 py-4 text-center">Attendance</th>
              <th className="px-4 py-4 text-center">Quiz 01</th>
              <th className="px-4 py-4 text-center">Midterm</th>
              <th className="px-4 py-4 text-center">Assignment 03</th>
              <th className="px-4 py-4 text-center">Project Alpha</th>
              <th className="px-4 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Final Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {students.map((student, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-light border border-border flex items-center justify-center text-xs font-bold text-sidebar">
                      {student.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-medium text-sidebar">{student.name}</div>
                      <div className="text-[10px] text-text-muted">ID: {student.id}</div>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-4 text-center font-medium ${parseInt(student.att) < 80 ? 'text-red-500' : 'text-green-500'}`}>
                  {student.att}
                </td>
                <td className="px-4 py-4 text-center text-sidebar">{student.q1}</td>
                <td className="px-4 py-4 text-center text-sidebar">{student.mid}</td>
                <td className="px-4 py-4 text-center">
                  {student.a3 === true && <CheckCircle size={16} className="text-green-500 mx-auto" />}
                  {student.a3 === false && <X size={16} className="text-red-500 mx-auto" />}
                  {student.a3 === 'flag' && <Flag size={16} className="text-orange-400 mx-auto" />}
                </td>
                <td className="px-4 py-4 text-center text-sidebar">{student.proj}</td>
                <td className="px-4 py-4 text-center">
                  <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded border ${
                    student.status === 'EXCELLENT' || student.status === 'SUPERIOR' ? 'bg-green-50 text-green-600 border-green-200' :
                    student.status === 'AT RISK' ? 'bg-red-50 text-red-600 border-red-200' :
                    student.status === 'NEEDS REVIEW' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    'bg-gray-50 text-sidebar border-gray-200'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-bold text-lg ${student.grade < 60 ? 'text-red-500' : student.grade > 89 ? 'text-gold' : 'text-sidebar'}`}>
                  {student.grade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section */}
      <div className="flex gap-6">
        <div className="flex-2 bg-bg-light p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium text-sidebar">Class Performance Trends</h3>
              <p className="text-sm text-text-muted mt-1">Weekly average grade distribution across all modules</p>
            </div>
            <button className="text-sm font-bold text-gold hover:text-gold-hover transition-colors">Full Analytics Report</button>
          </div>
          <div className="h-48 flex items-end gap-2 px-4">
             <div className="flex-1 bg-blue-200/50 h-[30%] rounded-t-sm"></div>
             <div className="flex-1 bg-blue-300/50 h-[45%] rounded-t-sm"></div>
             <div className="flex-1 bg-sidebar/50 h-[40%] rounded-t-sm"></div>
             <div className="flex-1 bg-gold/70 h-[70%] rounded-t-sm"></div>
             <div className="flex-1 bg-gold h-[90%] rounded-t-sm"></div>
             <div className="flex-1 bg-blue-200/50 h-[50%] rounded-t-sm"></div>
             <div className="flex-1 bg-blue-100/50 h-[40%] rounded-t-sm"></div>
             <div className="flex-1 bg-sidebar/30 h-[60%] rounded-t-sm"></div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-gold relative overflow-hidden">
             <div className="flex items-center gap-2 text-sidebar mb-4">
               <Lightbulb size={20} className="text-gold" />
               <h4 className="font-bold">Smart Insight</h4>
             </div>
             <p className="text-sm text-text-muted italic leading-relaxed">
               "The average grade for 'Project Alpha' is 12% higher than last semester. Consider increasing the difficulty for the next cohort."
             </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
             <h4 className="font-medium text-sidebar mb-4">Class Spotlight</h4>
             <div className="bg-bg-light h-24 rounded-lg mb-4 flex items-center justify-center text-xs text-text-muted border border-dashed border-gray-300">
                Activity Heatmap
             </div>
             <p className="text-xs text-text-muted leading-relaxed">
               Total active students: 34. Recent activity spiked in Module 04 homework submissions.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gradebook;
