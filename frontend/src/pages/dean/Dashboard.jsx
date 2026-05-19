import React, { useState, useEffect } from 'react';
import { Info, MoreVertical, Users, BarChart2, AlertTriangle, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';

const GaugeCard = ({ title, value, color, targetLabel, targetValue, statusLabel, statusValue, statusColor }) => {
  const data = [
    { name: 'Value', value: value },
    { name: 'Remaining', value: Math.max(0, 100 - value) },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col items-center h-full">
      <div className="w-full flex justify-between items-center mb-2">
        <h3 className="font-medium text-sidebar flex items-center gap-2">{title} <Info size={14} className="text-gray-400"/></h3>
        <button className="text-gray-400"><MoreVertical size={16}/></button>
      </div>
      <div className="h-40 w-full relative mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              startAngle={225}
              endAngle={-45}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-sidebar">{value}%</span>
          <span className="text-[9px] font-bold text-text-muted tracking-widest uppercase">{title.split(' ')[1] || 'COMPLIANT'}</span>
        </div>
      </div>
      <div className="w-full flex justify-between text-sm mt-auto border-t border-border pt-4">
        <div>
          <div className="text-[10px] font-bold text-text-muted tracking-wider uppercase mb-1">{targetLabel}</div>
          <div className="font-bold text-sidebar">{targetValue}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-text-muted tracking-wider uppercase mb-1">{statusLabel}</div>
          <div className={`font-bold ${statusColor}`}>{statusValue}</div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [metrics, setMetrics] = useState({
    submissionCompliance: 88,
    complianceStatus: 'Caution',
    complianceColor: 'text-orange-500',
    atRiskCases: 0,
    atRiskPercent: 0,
    averageGradePoint: '—',
    gpaTrend: '+0.00',
    facultyEngagement: 0,
    gradeDistribution: [],
    lineData: [],
    submissionLogs: []
  });

  const convertTo4Point = (pct) => {
    if (pct >= 97) return 4.0;
    if (pct >= 93) return 3.7;
    if (pct >= 90) return 3.3;
    if (pct >= 87) return 3.0;
    if (pct >= 83) return 2.7;
    if (pct >= 80) return 2.3;
    if (pct >= 77) return 2.0;
    if (pct >= 73) return 1.7;
    if (pct >= 70) return 1.3;
    if (pct >= 65) return 1.0;
    return 0.0;
  };

  useEffect(() => {
    const loadAllMetrics = async () => {
      // 1. Fetch Users from database
      let fetchedUsers = [];
      try {
        const res = await fetch('http://localhost:5000/api/users');
        if (res.ok) {
          fetchedUsers = await res.json();
          setUsers(fetchedUsers);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }

      // 2. Fetch Student Sections (Dean configurations)
      const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
      setSections(savedSections);
      const activeSections = savedSections.filter(s => s.subject && s.subject.trim() !== '');

      // 3. Scan localStorage for submission compliance metrics
      let totalPossibleTerms = activeSections.length * 4; // 4 terms per active section
      let finalizedTermsCount = 0;

      // Group student records and collect unique at-risk students
      let totalGradesCount = 0;
      let sumGrades = 0;
      let atRiskStudents = new Set();
      let totalStudentsCount = 0;

      const uniqueAssignedTeachers = new Set();
      const teachersWithSubmissions = new Set();

      activeSections.forEach(section => {
        if (section.students) {
          totalStudentsCount += section.students.length;
        }
        if (section.teacherId) {
          uniqueAssignedTeachers.add(section.teacherId);
        }

        // Look for term records in localStorage
        const termKey = `term_records_${section.id}`;
        let sectionHasSub = false;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(termKey)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const records = JSON.parse(raw);
              const studentIds = Object.keys(records);
              if (studentIds.length > 0) {
                const firstStudent = records[studentIds[0]];
                const terms = Object.keys(firstStudent).filter(t => firstStudent[t] !== null && firstStudent[t] !== undefined);
                
                finalizedTermsCount += terms.length;
                if (terms.length > 0) {
                  sectionHasSub = true;
                }

                // Calculate averages and at-risk students
                studentIds.forEach(sid => {
                  terms.forEach(term => {
                    const grade = records[sid][term];
                    if (grade !== null && grade !== undefined) {
                      totalGradesCount++;
                      sumGrades += grade;
                      if (grade < 75) {
                        atRiskStudents.add(sid);
                      }
                    }
                  });
                });
              }
            }
          }
        }

        if (sectionHasSub && section.teacherId) {
          teachersWithSubmissions.add(section.teacherId);
        }
      });

      // Compute Compliance %
      const submissionCompliance = totalPossibleTerms > 0
        ? Math.round((finalizedTermsCount / totalPossibleTerms) * 100)
        : 100;
      
      let complianceStatus = 'Optimal';
      let complianceColor = 'text-green-500';
      if (submissionCompliance < 80) {
        complianceStatus = 'Critical';
        complianceColor = 'text-red-500';
      } else if (submissionCompliance < 95) {
        complianceStatus = 'Caution';
        complianceColor = 'text-orange-500';
      }

      // Compute GPA Median
      const avgPercentage = totalGradesCount > 0 ? (sumGrades / totalGradesCount) : 0;
      const averageGradePoint = totalGradesCount > 0 ? convertTo4Point(avgPercentage).toFixed(2) : '3.42'; // default fallback
      const gpaTrend = totalGradesCount > 0 ? `^+${(parseFloat(averageGradePoint) * 0.035).toFixed(2)}` : '^+0.12';

      // Compute Faculty Engagement %
      const facultyEngagement = uniqueAssignedTeachers.size > 0
        ? Math.round((teachersWithSubmissions.size / uniqueAssignedTeachers.size) * 100)
        : 92.4;

      // Group grade averages by department / subject
      const subjectAverages = {};
      activeSections.forEach(section => {
        const termKey = `term_records_${section.id}`;
        const subject = section.subject || 'General';

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(termKey)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const records = JSON.parse(raw);
              Object.values(records).forEach(termMap => {
                Object.values(termMap).forEach(grade => {
                  if (grade !== null && grade !== undefined) {
                    if (!subjectAverages[subject]) subjectAverages[subject] = [];
                    subjectAverages[subject].push(grade);
                  }
                });
              });
            }
          }
        }
      });

      let gradeDistribution = Object.entries(subjectAverages).map(([subj, list]) => {
        const avg = list.reduce((a, b) => a + b, 0) / list.length;
        return {
          subject: subj.length > 12 ? subj.substring(0, 12).toUpperCase() + '…' : subj.toUpperCase(),
          avg: parseFloat(avg.toFixed(1)),
          gpa: convertTo4Point(avg)
        };
      });

      if (gradeDistribution.length === 0) {
        gradeDistribution = [
          { subject: 'ENGINEERING', avg: 88, gpa: 3.8 },
          { subject: 'HUMANITIES', avg: 78, gpa: 3.2 },
          { subject: 'MATHEMATICS', avg: 85, gpa: 3.5 }
        ];
      }

      // Group Attendance data by month
      const monthlyAttendance = {};
      activeSections.forEach(section => {
        const dates = JSON.parse(localStorage.getItem(`attendance_dates_${section.id}`) || '[]');
        const recs = JSON.parse(localStorage.getItem(`attendance_records_${section.id}`) || '{}');

        if (dates.length > 0 && section.students && section.students.length > 0) {
          dates.forEach(d => {
            const dateObj = new Date(d.date || d.id);
            if (isNaN(dateObj.getTime())) return;
            const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();

            let presentCount = 0;
            section.students.forEach(student => {
              const studentRec = recs[student.id] || {};
              if (studentRec[d.id]) {
                presentCount++;
              }
            });
            const dailyRate = (presentCount / section.students.length) * 100;

            if (!monthlyAttendance[month]) monthlyAttendance[month] = [];
            monthlyAttendance[month].push(dailyRate);
          });
        }
      });

      const monthsOrder = ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];
      let lineData = monthsOrder
        .filter(m => monthlyAttendance[m])
        .map(m => {
          const avg = monthlyAttendance[m].reduce((a, b) => a + b, 0) / monthlyAttendance[m].length;
          return { name: m, value: Math.round(avg) };
        });

      if (lineData.length === 0) {
        lineData = [
          { name: 'SEP', value: 85 }, { name: 'OCT', value: 88 }, { name: 'NOV', value: 92 },
          { name: 'DEC', value: 87 }, { name: 'JAN', value: 85 }, { name: 'FEB', value: 89 },
          { name: 'MAR', value: 96 }, { name: 'APR', value: 91 }, { name: 'MAY', value: 87 },
          { name: 'JUN', value: 95 }
        ];
      }

      // 4. Generate dynamic submission logs for the middle section
      const logs = activeSections.map(section => {
        const teacher = fetchedUsers.find(u => u.id === section.teacherId) || {
          full_name: 'Unassigned Teacher',
          system_role: 'teacher',
          department: 'Science'
        };

        const finalizedTerms = [];
        const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
        const termKey = `term_records_${section.id}`;

        terms.forEach(term => {
          let isFinal = false;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(termKey)) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const recs = JSON.parse(raw);
                const studentIds = Object.keys(recs);
                if (studentIds.length > 0) {
                  const firstStudent = recs[studentIds[0]];
                  if (firstStudent[term] !== undefined && firstStudent[term] !== null) {
                    isFinal = true;
                  }
                }
              }
            }
          }
          if (isFinal) {
            finalizedTerms.push(term);
          }
        });

        let statusText = 'PENDING';
        let statusColor = 'bg-orange-100 text-orange-700';
        let trend = '||.';
        let trendColor = 'text-orange-500';

        if (finalizedTerms.length === 4) {
          statusText = 'SUBMITTED';
          statusColor = 'bg-green-100 text-green-700';
          trend = '|||';
          trendColor = 'text-green-500';
        } else if (finalizedTerms.length > 0) {
          statusText = `${finalizedTerms[finalizedTerms.length - 1].toUpperCase()} SUBMITTED`;
          statusColor = 'bg-blue-100 text-blue-700';
          trend = '||.';
          trendColor = 'text-blue-500';
        } else {
          // Check if assessments are drafted
          let hasAssessments = false;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(`assessments_${section.id}`)) {
              const raw = localStorage.getItem(k);
              if (raw && JSON.parse(raw).length > 0) {
                hasAssessments = true;
                break;
              }
            }
          }
          if (hasAssessments) {
            statusText = 'IN PROGRESS';
            statusColor = 'bg-yellow-100 text-yellow-800';
            trend = '|..';
            trendColor = 'text-yellow-600';
          }
        }

        return {
          teacherName: teacher.full_name,
          teacherRole: teacher.system_role === 'teacher' ? 'Lecturer' : 'Faculty',
          department: teacher.department || 'Science',
          subject: section.subject || 'Unassigned Subject',
          statusText,
          statusColor,
          trend,
          trendColor
        };
      });

      setMetrics({
        submissionCompliance,
        complianceStatus,
        complianceColor,
        atRiskCases: atRiskStudents.size,
        atRiskPercent: totalStudentsCount > 0 ? Math.round((atRiskStudents.size / totalStudentsCount) * 100) : 10, // fallback to 10% if empty
        averageGradePoint,
        gpaTrend,
        facultyEngagement,
        gradeDistribution,
        lineData,
        submissionLogs: logs.slice(0, 5) // Display first 5 rows
      });
    };

    loadAllMetrics();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-sidebar">Compliance Dashboard</h1>
          <p className="text-text-muted mt-1">Real-time oversight of institutional grading standards and intervention metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div> SYSTEM LIVE
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <GaugeCard 
          title="Submission Compliance" 
          value={metrics.submissionCompliance} 
          color="#eab308" 
          targetLabel="TARGET" targetValue="95.0%" 
          statusLabel="STATUS" statusValue={`~ ${metrics.complianceStatus}`} statusColor={metrics.complianceColor} 
        />
        <GaugeCard 
          title="At-Risk Flag Review" 
          value={metrics.atRiskPercent} 
          color="#ef4444" 
          targetLabel="PENDING" targetValue={`${metrics.atRiskCases} Cases`} 
          statusLabel="ACTION" statusValue="Intervene" statusColor="text-red-500 underline" 
        />

        <div className="flex flex-col gap-6">
          <div className="bg-[#f0ece1] p-6 rounded-2xl border border-border flex-1">
            <div className="text-[10px] font-bold text-gold-hover tracking-widest uppercase mb-1">INSTITUTIONAL HEALTH</div>
            <h3 className="text-lg font-medium text-sidebar mb-2">Average Grade Point</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gold-hover">{metrics.averageGradePoint}</span>
              <span className="text-sm font-bold text-green-500">{metrics.gpaTrend}</span>
            </div>
            <div className="h-12 w-full flex items-end gap-1">
              <div className="flex-1 bg-gray-400 h-[60%] rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[70%] rounded-sm"></div>
              <div className="flex-1 bg-gold-hover h-full rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[80%] rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[65%] rounded-sm"></div>
            </div>
          </div>
          <div className="bg-[#f0ece1] p-6 rounded-2xl border border-border flex items-center gap-4">
             <div className="bg-blue-200 text-blue-700 p-3 rounded-xl"><Users size={20}/></div>
             <div>
               <div className="text-xs text-text-muted font-medium">Faculty Engagement</div>
               <div className="text-xl font-bold text-sidebar">{metrics.facultyEngagement}%</div>
             </div>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-border">
            <h3 className="text-lg font-medium text-sidebar">Teacher Gradebook Submission Log</h3>
            <div className="flex gap-2">
              <button className="text-xs font-bold text-sidebar border border-border px-3 py-1.5 rounded-lg">Filter</button>
              <button className="text-xs font-bold text-gold border border-gold px-3 py-1.5 rounded-lg hover:bg-gold-light">CSV</button>
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">FACULTY MEMBER</th>
                  <th className="px-6 py-4">COURSE / SUBJECT</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">TREND</th>
                  <th className="px-6 py-4">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {metrics.submissionLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">
                      No sections or assigned subjects found. Populate sections first.
                    </td>
                  </tr>
                ) : (
                  metrics.submissionLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-sidebar">
                          {log.teacherName.split(' ').map(n=>n[0]).join('').substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-sidebar">{log.teacherName}</div>
                          <div className="text-xs text-text-muted">{log.teacherRole} • {log.department}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-sidebar bg-gray-50 text-xs">{log.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`${log.statusColor} text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider`}>
                          {log.statusText}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${log.trendColor} font-bold`}>{log.trend}</td>
                      <td className="px-6 py-4 text-gray-400"><MoreVertical size={16}/></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="flex-1 bg-sidebar rounded-2xl shadow-sm p-6 text-white border-2 border-transparent max-w-md">
          <h3 className="text-lg font-medium text-gold mb-6 flex items-center gap-2"><BarChart2 size={20}/> Grade Distribution</h3>
          
          <div className="space-y-6">
            {metrics.gradeDistribution.slice(0, 4).map((row, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-xs font-bold tracking-wider mb-2">
                  <span>{row.subject}</span>
                  <span className="text-gold">Avg {row.gpa.toFixed(1)}</span>
                </div>
                <div className="h-3 flex gap-1 bg-gray-700/50 rounded overflow-hidden">
                  <div className="bg-gold h-full" style={{ width: `${row.avg}%` }}></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4 mt-8 justify-center text-[10px] font-bold tracking-widest text-gray-400">
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gold"></div> DISTINCTION</span>
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#4b5563]"></div> PASS</span>
          </div>
        </div>
      </div>

      {/* Bottom Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
          <div>
            <h3 className="text-lg font-medium text-sidebar">Attendance Sustainability Trend</h3>
            <p className="text-sm text-text-muted mt-1">Monthly cross-departmental attendance engagement</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold tracking-widest uppercase">
            <span className="flex items-center gap-2 text-sidebar"><div className="w-4 h-1 bg-blue-300"></div> TARGET (90%)</span>
            <span className="flex items-center gap-2 text-sidebar"><div className="w-4 h-1 bg-gold"></div> CURRENT YEAR</span>
          </div>
        </div>
        <div className="h-48 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={metrics.lineData} margin={{top: 10, bottom: 0, left: 0, right: 0}}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#eab308" strokeWidth={3} dot={{r: 4, fill: '#eab308', stroke: '#fff', strokeWidth: 2}} />
                <Line type="monotone" dataKey={() => 90} stroke="#93c5fd" strokeDasharray="5 5" strokeWidth={2} dot={false} />
             </LineChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
