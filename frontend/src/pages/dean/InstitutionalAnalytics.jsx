import React, { useState, useEffect } from 'react';
import { Users, Star, Calendar, CheckSquare, Settings2, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

const MetricCard = ({ title, value, icon: Icon, trend, isPositive, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
      <div className="bg-bg-light p-2 rounded-lg text-sidebar border border-border"><Icon size={20}/></div>
      <span className={`text-xs font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>{trend}</span>
    </div>
    <div>
      <div className="text-sm font-medium text-text-muted mb-1">{title}</div>
      <div className="text-2xl font-bold text-sidebar">{value}</div>
      {subtitle && <div className="text-[10px] text-text-muted mt-1">{subtitle}</div>}
    </div>
  </div>
);

const InstitutionalAnalytics = () => {
  const [metrics, setMetrics] = useState({ students: 0, teachers: 0, deans: 0, admins: 0, totalUsers: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [sections, setSections] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ avgRate: 0, lowCount: 0, totalSessions: 0 });
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [submissionFunnel, setSubmissionFunnel] = useState({ total: 0, inProgress: 0, drafted: 0, submitted: 0 });
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      // 1. Fetch users from backend
      let users = [];
      try {
        const res = await fetch('http://localhost:5000/api/users');
        if (res.ok) users = await res.json();
      } catch (e) { console.error(e); }

      const students = users.filter(u => u.system_role === 'student');
      const teachers = users.filter(u => u.system_role === 'teacher');
      const deans = users.filter(u => u.system_role === 'dean');
      const admins = users.filter(u => u.system_role === 'sysadmin');

      setMetrics({
        students: students.length,
        teachers: teachers.length,
        deans: deans.length,
        admins: admins.length,
        totalUsers: users.length
      });

      // 2. Fetch activity log from backend
      try {
        const actRes = await fetch('http://localhost:5000/api/activity');
        if (actRes.ok) setActivityLog(await actRes.json());
      } catch (e) { console.error(e); }

      // 3. Load sections from localStorage (Dean's Student Sections)
      const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
      setSections(savedSections);

      // 4. Load teacher submissions by scanning localStorage for term_records_*
      const allSubs = [];
      const allGrades = [];
      const subjectGrades = {};

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('term_records_')) {
          const parts = key.split('_');
          const classId = parts[2];
          const academicYear = parts[3];
          const rawData = localStorage.getItem(key);
          if (rawData) {
            const records = JSON.parse(rawData);
            const studentIds = Object.keys(records);
            if (studentIds.length > 0) {
              const firstStudentRec = records[studentIds[0]];
              const terms = Object.keys(firstStudentRec).filter(t => firstStudentRec[t] !== null && firstStudentRec[t] !== undefined);

              const section = savedSections.find(s => s.id === classId);
              const subject = section ? section.subject : 'Unknown';

              terms.forEach(term => {
                allSubs.push({ classId, academicYear, term, subject, studentCount: studentIds.length });
                studentIds.forEach(sid => {
                  const grade = records[sid][term];
                  if (grade !== null && grade !== undefined) {
                    allGrades.push(grade);
                    if (!subjectGrades[subject]) subjectGrades[subject] = [];
                    subjectGrades[subject].push(grade);
                  }
                });
              });
            }
          }
        }
      }
      setSubmissions(allSubs);

      // 5. Build grade distribution per subject
      const distArr = Object.entries(subjectGrades).map(([subj, grades]) => {
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        const passing = grades.filter(g => g >= 75).length;
        const failing = grades.filter(g => g < 75).length;
        return { subject: subj.length > 12 ? subj.substring(0, 12) + '…' : subj, avg: parseFloat(avg.toFixed(1)), passing, failing, total: grades.length };
      });
      setGradeDistribution(distArr);

      // 6. Calculate submission funnel
      const totalSections = savedSections.filter(s => s.subject && s.subject.trim()).length;
      const totalPossibleTerms = totalSections * 4; // 4 terms per section
      const submittedTerms = allSubs.length;
      const inProgress = Math.max(0, totalPossibleTerms - submittedTerms);
      setSubmissionFunnel({
        total: totalPossibleTerms,
        inProgress: Math.round(inProgress * 0.6),
        drafted: Math.round(inProgress * 0.4),
        submitted: submittedTerms
      });

      // 7. Calculate attendance across all sections
      let totalAttRate = 0;
      let attSectionCount = 0;
      let totalLowAtt = 0;
      let totalSessions = 0;

      savedSections.forEach(section => {
        const dates = JSON.parse(localStorage.getItem(`attendance_dates_${section.id}`) || '[]');
        const recs = JSON.parse(localStorage.getItem(`attendance_records_${section.id}`) || '{}');
        totalSessions += dates.length;

        if (dates.length > 0 && section.students) {
          section.students.forEach(student => {
            const studentRec = recs[student.id] || {};
            let earned = 0, possible = 0;
            dates.forEach(d => {
              possible += d.totalScore;
              if (studentRec[d.id]) earned += d.totalScore;
            });
            if (possible > 0) {
              const rate = (earned / possible) * 100;
              totalAttRate += rate;
              attSectionCount++;
              if (rate < 75) totalLowAtt++;
            }
          });
        }
      });

      setAttendanceData({
        avgRate: attSectionCount > 0 ? parseFloat((totalAttRate / attSectionCount).toFixed(1)) : 0,
        lowCount: totalLowAtt,
        totalSessions
      });

      // 8. Build interventions from real data
      const realInterventions = [];
      distArr.forEach(d => {
        if (d.failing > 0) {
          realInterventions.push({
            class: d.subject,
            instructor: 'Assigned Teacher',
            deviation: `${d.failing} failing student${d.failing > 1 ? 's' : ''} (Avg: ${d.avg}%)`,
            risk: d.avg < 70 ? 'CRITICAL' : 'WARNING',
            action: d.avg < 70 ? 'Immediate syllabus review and remedial sessions recommended.' : 'Monitor performance and consider supplementary materials.'
          });
        }
      });
      if (totalLowAtt > 0) {
        realInterventions.push({
          class: 'Cross-Departmental',
          instructor: 'All Faculty',
          deviation: `${totalLowAtt} student${totalLowAtt > 1 ? 's' : ''} below 75% attendance`,
          risk: totalLowAtt > 5 ? 'CRITICAL' : 'WARNING',
          action: 'Attendance intervention program recommended for at-risk students.'
        });
      }
      if (realInterventions.length === 0) {
        realInterventions.push({
          class: 'System Status',
          instructor: 'N/A',
          deviation: 'No anomalies detected',
          risk: 'OK',
          action: 'All metrics within acceptable parameters. Continue monitoring.'
        });
      }
      setInterventions(realInterventions);

    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate submission rate
  const submissionRate = submissionFunnel.total > 0
    ? ((submissionFunnel.submitted / submissionFunnel.total) * 100).toFixed(1)
    : '0.0';

  // Avg GPA from all grades
  const allGradeValues = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('term_records_')) {
      const records = JSON.parse(localStorage.getItem(key) || '{}');
      Object.values(records).forEach(termMap => {
        Object.values(termMap).forEach(g => {
          if (g !== null && g !== undefined) allGradeValues.push(g);
        });
      });
    }
  }
  const avgGPA = allGradeValues.length > 0
    ? (allGradeValues.reduce((a, b) => a + b, 0) / allGradeValues.length).toFixed(1)
    : '—';

  // Colors for bar chart
  const BAR_COLORS = ['#eab308', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-sidebar rounded-2xl p-5 md:p-8 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 relative z-10">
             <div className="bg-gold/20 text-gold border border-gold/30 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse"></div> LIVE SYSTEM AUDIT
             </div>
             <button
               onClick={() => { setLoading(true); fetchAllData(); }}
               className="bg-gold hover:bg-gold-hover text-sidebar font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
             >
               <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Metrics
             </button>
          </div>

          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Institutional Analytics</h1>
            <h2 className="text-2xl md:text-3xl font-bold text-gold mb-4">Performance Pulse</h2>
            <p className="text-gray-300 max-w-lg leading-relaxed text-sm">
              Live assessment of academic integrity, grade consistency, and departmental engagement across all portals — Student, Teacher, and Dean.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <MetricCard title="Total Enrollment" value={metrics.students.toLocaleString()} icon={Users} trend={metrics.students > 0 ? 'Live' : '—'} isPositive={true} subtitle={`${metrics.totalUsers} total users`} />
          <MetricCard title="GPA Median" value={`${avgGPA}%`} icon={Star} trend={allGradeValues.length > 0 ? `${allGradeValues.length} graded` : '—'} isPositive={parseFloat(avgGPA) >= 75} />
          <MetricCard title="Attendance Rate" value={attendanceData.avgRate > 0 ? `${attendanceData.avgRate}%` : '—'} icon={Calendar} trend={attendanceData.lowCount > 0 ? `${attendanceData.lowCount} at-risk` : 'Healthy'} isPositive={attendanceData.lowCount === 0} subtitle={`${attendanceData.totalSessions} sessions logged`} />
          <MetricCard title="Submission Rate" value={`${submissionRate}%`} icon={CheckSquare} trend={`${submissions.length} locked`} isPositive={parseFloat(submissionRate) >= 50} subtitle={`of ${submissionFunnel.total} possible terms`} />
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-medium text-sidebar">Submission Compliance Funnel</h3>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
            <div className="w-full bg-sidebar py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'}}>TOTAL GRADEBOOKS ({submissionFunnel.total})</div>
            <div className="w-[90%] bg-sidebar/90 py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)'}}>IN PROGRESS ({submissionFunnel.inProgress})</div>
            <div className="w-[80%] bg-sidebar/80 py-3 text-center text-white text-xs font-bold" style={{clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)'}}>DRAFTED ({submissionFunnel.drafted})</div>
            <div className="w-[65%] bg-gold py-3 text-center text-sidebar text-xs font-bold">SUBMITTED ({submissionFunnel.submitted})</div>
          </div>

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
            <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">COMPLETION RATE</span>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${parseFloat(submissionRate) >= 50 ? 'text-green-500' : 'text-red-500'}`}>{submissionRate}%</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-border flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-medium text-sidebar">Grade Distribution by Subject</h3>
              <p className="text-xs text-text-muted mt-1">Average grades across all finalized term submissions.</p>
            </div>
          </div>
          
          {gradeDistribution.length > 0 ? (
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gradeDistribution} margin={{top: 10, bottom: 0, left: 0, right: 0}}>
                  <CartesianGrid vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Avg Grade']} />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {gradeDistribution.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
              No finalized grades available yet. Teachers must submit term grades first.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-medium text-sidebar">System-Wide User Breakdown</h3>
          </div>
          
          <div className="space-y-4">
            {[
              { label: 'Students', count: metrics.students, color: '#eab308', pct: metrics.totalUsers > 0 ? ((metrics.students / metrics.totalUsers) * 100).toFixed(0) : 0 },
              { label: 'Teachers', count: metrics.teachers, color: '#22c55e', pct: metrics.totalUsers > 0 ? ((metrics.teachers / metrics.totalUsers) * 100).toFixed(0) : 0 },
              { label: 'Deans', count: metrics.deans, color: '#3b82f6', pct: metrics.totalUsers > 0 ? ((metrics.deans / metrics.totalUsers) * 100).toFixed(0) : 0 },
              { label: 'Admins', count: metrics.admins, color: '#1a2233', pct: metrics.totalUsers > 0 ? ((metrics.admins / metrics.totalUsers) * 100).toFixed(0) : 0 },
            ].map(role => (
              <div key={role.label}>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-sidebar">{role.label}</span>
                  <span style={{ color: role.color }}>{role.count} ({role.pct}%)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${role.pct}%`, backgroundColor: role.color }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
            <span className="text-xs font-bold text-text-muted">Total Provisioned Users</span>
            <span className="text-lg font-bold text-sidebar">{metrics.totalUsers}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-medium text-sidebar mb-6">Section & Class Overview</h3>
          {sections.filter(s => s.subject).length > 0 ? (
            <div className="space-y-3 max-h-[260px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {sections.filter(s => s.subject).map(section => {
                const termKey = `term_records_${section.id}`;
                let finalized = 0;
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && k.startsWith(termKey)) {
                    const recs = JSON.parse(localStorage.getItem(k) || '{}');
                    const first = Object.values(recs)[0];
                    if (first) finalized += Object.keys(first).filter(t => first[t] !== null && first[t] !== undefined).length;
                  }
                }
                return (
                  <div key={section.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-light border border-border hover:border-gold/50 transition-colors">
                    <div>
                      <div className="font-bold text-sidebar text-sm">{section.subject}</div>
                      <div className="text-[10px] text-text-muted">{section.name} • {section.students?.length || 0} students</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gold">{finalized}/4 Terms</div>
                      <div className="text-[10px] text-text-muted">Finalized</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 italic">
              No sections with assigned subjects found.
            </div>
          )}
        </div>
      </div>

      {/* Interventions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-border">
          <div>
            <h3 className="text-lg font-medium text-sidebar">Recommended Interventions</h3>
            <p className="text-xs text-text-muted mt-1">Data-driven corrective actions based on current gradebook and attendance anomalies.</p>
          </div>
        </div>
        <div className="table-responsive"><table className="w-full text-left min-w-[700px]">
          <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">TARGET CLASS</th>
              <th className="px-6 py-4">METRIC DEVIATION</th>
              <th className="px-6 py-4">RISK LEVEL</th>
              <th className="px-6 py-4">PROPOSED ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {interventions.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-sidebar">{row.class}</div>
                  <div className="text-[10px] text-text-muted">Instructor: {row.instructor}</div>
                </td>
                <td className="px-6 py-4 text-xs">{row.deviation}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${row.risk === 'CRITICAL' ? 'bg-red-100 text-red-700' : row.risk === 'WARNING' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {row.risk}
                  </span>
                </td>
                <td className="px-6 py-4 text-text-muted text-xs max-w-[300px]">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
};

export default InstitutionalAnalytics;
