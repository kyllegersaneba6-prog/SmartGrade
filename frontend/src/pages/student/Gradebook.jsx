import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Cpu, AlertTriangle, TrendingDown, MessageSquare, ChevronLeft, Calendar } from 'lucide-react';

/* ─── Category Badge Styles ─── */
const getCategoryStyles = (category) => {
  const cat = category?.toUpperCase() || 'QUIZZES';
  if (cat.includes('EXAM')) return 'bg-blue-100 text-blue-700';
  if (cat.includes('PROJECT')) return 'bg-purple-100 text-purple-700';
  if (cat.includes('QUIZ')) return 'bg-orange-100 text-orange-700';
  return 'bg-green-100 text-green-700';
};

/* Mock Datasets for default classes fallback */
const mockData = {
  'mock-math': {
    subject: 'Mathematics',
    courseCode: 'MATH 301',
    topic: 'Advanced Calculus',
    instructor: 'Dr. Robert Miller',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 94.5,
    attendance: 98,
    progress: 85,
    standing: 'Honor Roll',
    target: 'A (93%)',
    flags: [],
    assessments: [
      { name: 'Midterm Examination', date: 'October 15, 2023', category: 'EXAMS', weight: '25.0%', score: '95.0%', classAvg: '78.5%', contribution: '23.75%' },
      { name: 'Multivariable Calculus Project', date: 'November 02, 2023', category: 'PROJECTS', weight: '20.0%', score: '96.0%', classAvg: '82.1%', contribution: '19.20%' },
      { name: 'Quiz 03: Limits & Derivatives', date: 'November 18, 2023', category: 'QUIZZES', weight: '10.0%', score: '90.0%', classAvg: '74.0%', contribution: '9.00%' },
      { name: 'Problem Set 01-05 (Combined)', date: 'Continuous Assessment', category: 'HOMEWORK', weight: '15.0%', score: '94.0%', classAvg: '88.5%', contribution: '14.10%' },
    ],
    attendanceLogs: [
      { date: 'May 18, 2026', status: 'Present' },
      { date: 'May 15, 2026', status: 'Present' },
      { date: 'May 12, 2026', status: 'Present' },
      { date: 'May 10, 2026', status: 'Present' },
      { date: 'May 08, 2026', status: 'Absent' },
    ],
    currentEarned: '66.05 / 70.0',
    projected: 'High Honor'
  },
  'mock-english': {
    subject: 'English',
    courseCode: 'ENGL 102',
    topic: 'Literature & Analysis',
    instructor: 'Prof. Sarah Jenkins',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 76.2,
    attendance: 82,
    progress: 62,
    standing: 'Satisfactory',
    target: 'B (85%)',
    flags: [
      { type: 'warning', title: 'Below Target Average', description: 'Your current course grade is below the target B grade.' }
    ],
    assessments: [
      { name: 'Midterm Essay Draft', date: 'October 12, 2023', category: 'PROJECTS', weight: '30.0%', score: '78.0%', classAvg: '80.0%', contribution: '23.40%' },
      { name: 'Grammar and Syntax Quiz', date: 'November 05, 2023', category: 'QUIZZES', weight: '10.0%', score: '72.0%', classAvg: '76.0%', contribution: '7.20%', flag: true },
      { name: 'Literature Reading Log', date: 'November 20, 2023', category: 'HOMEWORK', weight: '20.0%', score: '82.0%', classAvg: '85.0%', contribution: '16.40%' },
    ],
    attendanceLogs: [
      { date: 'May 18, 2026', status: 'Present' },
      { date: 'May 14, 2026', status: 'Absent' },
      { date: 'May 11, 2026', status: 'Present' },
      { date: 'May 07, 2026', status: 'Absent' },
      { date: 'May 04, 2026', status: 'Present' },
    ],
    currentEarned: '47.0 / 60.0',
    projected: 'Satisfactory Level'
  },
  'mock-filipino': {
    subject: 'Filipino',
    courseCode: 'FILI 101',
    topic: 'Panitikang Pilipino',
    instructor: 'Ms. Maria Santos',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 89.8,
    attendance: 95,
    progress: 92,
    standing: 'Honor Roll',
    target: 'A (93%)',
    flags: [],
    assessments: [
      { name: 'Pagsusuri ng Kwento', date: 'October 10, 2023', category: 'PROJECTS', weight: '25.0%', score: '91.0%', classAvg: '84.0%', contribution: '22.75%' },
      { name: 'Talakayan at Recitation', date: 'Continuous', category: 'HOMEWORK', weight: '25.0%', score: '94.0%', classAvg: '89.0%', contribution: '23.50%' },
      { name: 'Quiz tungkol sa Nobela', date: 'November 15, 2023', category: 'QUIZZES', weight: '20.0%', score: '82.0%', classAvg: '79.0%', contribution: '16.40%' },
    ],
    attendanceLogs: [
      { date: 'May 19, 2026', status: 'Present' },
      { date: 'May 16, 2026', status: 'Present' },
      { date: 'May 13, 2026', status: 'Present' },
      { date: 'May 09, 2026', status: 'Present' },
      { date: 'May 05, 2026', status: 'Present' },
    ],
    currentEarned: '62.65 / 70.0',
    projected: 'Distinction Level'
  },
  'mock-science': {
    subject: 'Science',
    courseCode: 'SCI 204',
    topic: 'Organic Chemistry',
    instructor: 'Dr. Alan Turing',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 91.2,
    attendance: 94,
    progress: 45,
    standing: 'Honor Roll',
    target: 'A (93%)',
    flags: [],
    assessments: [
      { name: 'Chemical Synthesis Lab', date: 'October 18, 2023', category: 'PROJECTS', weight: '20.0%', score: '93.0%', classAvg: '81.0%', contribution: '18.60%' },
      { name: 'Nomenclature Test', date: 'November 08, 2023', category: 'EXAMS', weight: '20.0%', score: '88.0%', classAvg: '77.0%', contribution: '17.60%' },
      { name: 'Lab Report 1-3', date: 'Continuous', category: 'HOMEWORK', weight: '10.0%', score: '92.0%', classAvg: '86.0%', contribution: '9.20%' },
    ],
    attendanceLogs: [
      { date: 'May 17, 2026', status: 'Present' },
      { date: 'May 14, 2026', status: 'Present' },
      { date: 'May 11, 2026', status: 'Present' },
      { date: 'May 08, 2026', status: 'Present' },
      { date: 'May 05, 2026', status: 'Absent' },
    ],
    currentEarned: '45.4 / 50.0',
    projected: 'High Performance'
  },
  'mock-history': {
    subject: 'History',
    courseCode: 'HIST 101',
    topic: 'World Civilizations',
    instructor: 'Prof. David Graham',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 64.5,
    attendance: 75,
    progress: 30,
    standing: 'Academic Warning',
    target: 'C (75%)',
    flags: [
      { type: 'critical', title: 'Below Passing Grade', description: 'Your current grade of 64.5% is failing. Immediate action is required.' },
      { type: 'critical', title: 'Low Attendance Alert', description: 'Your class attendance (75%) is below the institutional 80% threshold.' }
    ],
    assessments: [
      { name: 'Civilizations Project', date: 'October 14, 2023', category: 'PROJECTS', weight: '20.0%', score: '62.0%', classAvg: '78.0%', contribution: '12.40%', flag: true },
      { name: 'Ancient Empires Quiz', date: 'November 04, 2023', category: 'QUIZZES', weight: '10.0%', score: '68.0%', classAvg: '75.0%', contribution: '6.80%', flag: true },
    ],
    attendanceLogs: [
      { date: 'May 18, 2026', status: 'Absent' },
      { date: 'May 15, 2026', status: 'Absent' },
      { date: 'May 12, 2026', status: 'Present' },
      { date: 'May 08, 2026', status: 'Present' },
      { date: 'May 04, 2026', status: 'Present' },
    ],
    currentEarned: '19.2 / 30.0',
    projected: 'Warning Level'
  },
  'mock-compsci': {
    subject: 'Comp Sci',
    courseCode: 'CS 202',
    topic: 'Data Structures',
    instructor: 'Dr. Kevin Zhang',
    academicYear: '2023-24',
    semester: 'Semester II',
    finalGrade: 97.0,
    attendance: 100,
    progress: 88,
    standing: 'Distinction',
    target: 'A+ (98%)',
    flags: [],
    assessments: [
      { name: 'Binary Trees Assignment', date: 'October 20, 2023', category: 'PROJECTS', weight: '30.0%', score: '98.0%', classAvg: '83.0%', contribution: '29.40%' },
      { name: 'Algorithm Coding Quiz', date: 'November 12, 2023', category: 'QUIZZES', weight: '20.0%', score: '95.0%', classAvg: '80.0%', contribution: '19.00%' },
      { name: 'Weekly Programming Tasks', date: 'Continuous', category: 'HOMEWORK', weight: '20.0%', score: '98.0%', classAvg: '90.0%', contribution: '19.60%' },
    ],
    attendanceLogs: [
      { date: 'May 19, 2026', status: 'Present' },
      { date: 'May 16, 2026', status: 'Present' },
      { date: 'May 13, 2026', status: 'Present' },
      { date: 'May 10, 2026', status: 'Present' },
      { date: 'May 07, 2026', status: 'Present' },
    ],
    currentEarned: '68.0 / 70.0',
    projected: 'Highest Honors'
  }
};

const Gradebook = () => {
  const { classId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!classId) return;

    // Check if mock data key matches
    if (mockData[classId]) {
      setData(mockData[classId]);
      return;
    }

    // Otherwise, load dynamically from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
    const section = savedSections.find(s => s.id === classId);

    if (!section) {
      // Fallback in case class identifier is not resolved
      setData(mockData['mock-math']);
      return;
    }

    const matchStudent = section.students?.find(s => 
      s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
    );
    const resolvedStudentId = matchStudent ? matchStudent.id : user.id;

    // Fetch teachers to resolve name
    let instructorName = 'Assigned Instructor';
    try {
      const raw = localStorage.getItem('users'); // check cached users or API
      if (raw) {
        const users = JSON.parse(raw);
        const t = users.find(u => u.id === section.teacherId);
        if (t) instructorName = t.full_name;
      }
    } catch (e) {}

    // Load dynamic assessments & scores
    const assessments = [];
    const studentGrades = {};
    const allGrades = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`assessments_${classId}_`)) {
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        assessments.push(...list);
      }
      if (key && key.startsWith(`grades_${classId}_`)) {
        const gradesMap = JSON.parse(localStorage.getItem(key) || '{}');
        Object.keys(gradesMap).forEach(sId => {
          const sGrades = gradesMap[sId] || {};
          if (sId === resolvedStudentId) {
            Object.assign(studentGrades, sGrades);
          }
          Object.keys(sGrades).forEach(assId => {
            if (!allGrades[assId]) allGrades[assId] = [];
            if (sGrades[assId] !== undefined && sGrades[assId] !== null && sGrades[assId] !== '') {
              allGrades[assId].push(Number(sGrades[assId]));
            }
          });
        });
      }
    }

    const rows = assessments.map(ass => {
      const rawScore = studentGrades[ass.id];
      const hasScore = rawScore !== undefined && rawScore !== null && rawScore !== '';
      const scorePct = hasScore ? Math.round((Number(rawScore) / ass.totalItems) * 100) : null;
      
      const classScores = allGrades[ass.id] || [];
      const classAvgPct = classScores.length > 0
        ? Math.round((classScores.reduce((a, b) => a + b, 0) / classScores.length / ass.totalItems) * 100)
        : 82;
        
      const weight = ass.weight || 10;
      const contribution = hasScore ? ((Number(rawScore) / ass.totalItems) * weight) : 0;

      return {
        name: ass.title || ass.name,
        date: ass.dueDate || 'Continuous',
        category: ass.category || 'QUIZZES',
        weight: `${weight.toFixed(1)}%`,
        weightVal: weight,
        score: hasScore ? `${scorePct}%` : 'Pending',
        scoreVal: scorePct,
        classAvg: `${classAvgPct}%`,
        contribution: hasScore ? `${contribution.toFixed(2)}%` : '0.00%',
        contributionVal: contribution,
        flag: hasScore && scorePct < 75
      };
    });

    const sumGradedWeights = rows.filter(r => r.score !== 'Pending').reduce((a, b) => a + b.weightVal, 0);
    const sumContribution = rows.reduce((a, b) => a + b.contributionVal, 0);
    const finalGradePct = sumGradedWeights > 0 ? Math.round((sumContribution / sumGradedWeights) * 100) : 85;

    const standing = finalGradePct >= 90 ? 'Honor Roll' : finalGradePct >= 75 ? 'Satisfactory' : 'Academic Warning';
    const letterGrade = finalGradePct >= 95 ? 'A+' : finalGradePct >= 90 ? 'A' : finalGradePct >= 85 ? 'B+' : finalGradePct >= 80 ? 'B' : finalGradePct >= 75 ? 'C' : 'F';

    // Attendance Dates
    const attendanceDates = JSON.parse(localStorage.getItem(`attendance_dates_${classId}`) || '[]');
    const attendanceRecs = JSON.parse(localStorage.getItem(`attendance_records_${classId}`) || '{}');
    const studentAttendance = attendanceRecs[resolvedStudentId] || {};
    
    let presentCount = 0;
    const attendanceLogs = attendanceDates.map(d => {
      const isPresent = studentAttendance[d.id] === true;
      if (isPresent) presentCount++;
      return {
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: isPresent ? 'Present' : 'Absent'
      };
    }).reverse();

    const attendancePct = attendanceDates.length > 0 ? Math.round((presentCount / attendanceDates.length) * 100) : 95;

    // Dynamic performance flags
    const flags = [];
    rows.forEach(r => {
      if (r.score === 'Pending') {
        flags.push({
          type: 'warning',
          title: 'Pending Grade',
          description: `The submission for '${r.name}' is waiting to be evaluated by the teacher.`
        });
      } else if (r.flag) {
        flags.push({
          type: 'critical',
          title: 'Review Required',
          description: `Your score of ${r.score} on '${r.name}' is below target proficiency levels.`
        });
      }
    });

    if (attendancePct < 85) {
      flags.push({
        type: 'critical',
        title: 'Attendance Alert',
        description: `Class attendance rate (${attendancePct}%) has fallen below standard guidelines.`
      });
    }

    setData({
      subject: section.subject,
      courseCode: section.courseCode || 'CRN ' + section.id.substring(0, 4).toUpperCase(),
      topic: section.name,
      instructor: instructorName,
      academicYear: '2025-26',
      semester: 'Semester II',
      finalGrade: finalGradePct,
      attendance: attendancePct,
      progress: Math.min(100, Math.max(15, (sumGradedWeights || 0))),
      standing,
      target: 'A (90%)',
      flags,
      assessments: rows.length > 0 ? rows : [
        { name: 'Standard Assessment', date: 'Continuous', category: 'QUIZZES', weight: '10.0%', score: '85%', classAvg: '80%', contribution: '8.5%' }
      ],
      attendanceLogs: attendanceLogs.length > 0 ? attendanceLogs : [
        { date: 'May 18, 2026', status: 'Present' },
        { date: 'May 15, 2026', status: 'Present' }
      ],
      currentEarned: `${sumContribution.toFixed(1)} / ${sumGradedWeights.toFixed(1)}`,
      projected: standing
    });
  }, [classId]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back to Classes Trail */}
      <div>
        <Link 
          to="/student/classes" 
          className="flex items-center gap-1 text-gold hover:text-gold-hover transition-colors font-bold text-xs uppercase tracking-wider mb-3 w-fit"
        >
          <ChevronLeft size={16} /> Back to My Classes
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
            Classes / <span className="text-gold">{data.subject} ({data.courseCode})</span>
          </p>
          <h1 className="text-3xl font-bold text-sidebar">{data.subject}</h1>
          <p className="text-text-muted mt-1">{data.topic} • {data.instructor} • Academic Year {data.academicYear}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button className="border-2 border-gold text-gold font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 hover:bg-gold-light transition-colors text-sm">
            <Download size={16} /> Export PDF
          </button>
          <button className="bg-sidebar hover:bg-sidebar-hover text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors text-sm">
            <Cpu size={16} /> Compute Projection
          </button>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Active Performance Flags */}
        <div className="bg-gold-light border border-gold/30 p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={18} className="text-gold" />
            <h3 className="text-gold font-bold text-lg">Active Performance Flags</h3>
          </div>

          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {data.flags.length > 0 ? (
              data.flags.map((flag, idx) => (
                <div 
                  key={idx} 
                  className={`border-l-4 p-4 rounded-r-xl bg-white ${
                    flag.type === 'critical' ? 'border-red-500' : 'border-orange-400'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {flag.type === 'critical' ? (
                      <span className="text-red-500 font-bold text-lg leading-none">!</span>
                    ) : (
                      <TrendingDown size={16} className="text-orange-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <h4 className={`font-bold text-sm ${flag.type === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                        {flag.title}
                      </h4>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        {flag.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-text-muted italic bg-white rounded-xl border border-dashed border-gold/20">
                No active critical issues flagged. Keep up the great work!
              </div>
            )}
          </div>
        </div>

        {/* Calculated Final Grade Card */}
        <div className="bg-gold-light border border-gold/30 p-6 rounded-2xl">
          <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">CALCULATED FINAL GRADE</div>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-bold text-sidebar">{data.finalGrade}%</span>
            <span className="text-sm font-bold text-green-500">↑ 1.2%</span>
            <div className="ml-auto w-12 h-12 rounded-full bg-gold flex items-center justify-center text-white font-bold text-lg">
              {data.finalGrade >= 95 ? 'A+' : data.finalGrade >= 90 ? 'A' : data.finalGrade >= 85 ? 'B+' : data.finalGrade >= 80 ? 'B' : data.finalGrade >= 75 ? 'C' : 'F'}
            </div>
          </div>
          <p className="text-sm text-sidebar mt-3 font-medium">Academic Standing: {data.standing}</p>
          <div className="flex items-center justify-between text-xs text-text-muted mt-1 mb-3">
            <span>Target: {data.target}</span>
          </div>
          <div className="w-full bg-white rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500" style={{ width: `${data.finalGrade}%` }}></div>
          </div>
          <p className="text-xs text-gold-hover text-right mt-3 italic">Updated just now</p>
        </div>
      </div>

      {/* Grade Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 border-b border-border gap-4">
          <h3 className="text-gold font-bold text-lg">Grade Breakdown Analysis</h3>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Weighted</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sidebar"></div> Formative</span>
          </div>
        </div>

        <div className="table-responsive w-full overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
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
              {data.assessments.map((a, i) => (
                <tr key={i} className="hover:bg-bg-light/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                      {a.flag && <AlertTriangle size={14} className="text-orange-500 shrink-0" />}
                      <div>
                        <div className="font-bold text-sidebar">{a.name}</div>
                        <div className="text-xs text-text-muted">{a.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${getCategoryStyles(a.category)} uppercase tracking-wider`}>
                      {a.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-muted">{a.weight}</td>
                  <td className={`px-6 py-4 font-bold ${a.flag ? 'text-red-500' : 'text-sidebar'}`}>
                    {a.score}
                  </td>
                  <td className="px-6 py-4 text-text-muted">{a.classAvg}</td>
                  <td className="px-6 py-4 font-bold text-gold">{a.contribution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Row */}
        <div className="px-6 py-4 bg-bg-light border-t-2 border-gold flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-bold text-sidebar uppercase tracking-wider text-sm">TOTAL WEIGHTED CALCULATION</span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-sm w-full sm:w-auto justify-end">
            <div className="text-center">
              <div className="font-bold text-sidebar">{data.progress}%</div>
              <div className="text-[10px] text-text-muted font-semibold uppercase">Graded Weight</div>
            </div>
            <div className="text-center border-l pl-4 sm:pl-8">
              <div className="font-bold text-sidebar">{data.attendance}%</div>
              <div className="text-[10px] text-text-muted font-semibold uppercase">Attendance</div>
            </div>
            <div className="text-3xl font-bold text-gold border-l pl-4 sm:pl-8">{data.finalGrade}%</div>
          </div>
        </div>
      </div>

      {/* Two Column Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Attendance Records Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-gold" />
            <h3 className="text-gold font-bold text-lg">Detailed Attendance Log</h3>
          </div>
          <p className="text-xs text-text-muted mb-4">
            Record of attendance posted by the instructor for this class period.
          </p>

          <div className="overflow-y-auto max-h-[220px] divide-y divide-border border rounded-xl">
            {data.attendanceLogs.length > 0 ? (
              data.attendanceLogs.map((log, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 hover:bg-bg-light/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>
                    <span className="text-sm font-medium text-sidebar">{log.date}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    log.status === 'Present' 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-sm text-text-muted italic">
                No attendance logs found for this course.
              </div>
            )}
          </div>
        </div>

        {/* Calculation Logic */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border h-full">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={18} className="text-gold" />
            <h3 className="text-gold font-bold text-lg">Calculation Logic</h3>
          </div>

          <p className="text-sm text-text-muted mb-4 leading-relaxed">
            Final Grade is computed using the following formula structure set by the teacher:
          </p>
          <div className="bg-bg-light p-3 rounded-lg font-mono text-xs text-sidebar mb-5 text-center">
            Final Grade = Σ (Score × Weight) / Σ (Weights Graded)
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-text-muted">Current Earned Points</span>
              <span className="font-bold text-sidebar">{data.currentEarned}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-text-muted">Attendance Rate</span>
              <span className="font-bold text-sidebar">{data.attendance}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Projected Mastery</span>
              <span className="font-bold text-gold">{data.projected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 bg-sidebar hover:bg-sidebar-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default Gradebook;
