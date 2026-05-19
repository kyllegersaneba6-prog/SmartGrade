import React, { useState, useEffect } from 'react';
import { Flag, AlertTriangle, Info, BookOpen, FlaskConical, Globe, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/* ─── Grade Health Ring ─── */
const GradeHealthRing = ({ score, classCount }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  let statusText = 'EXCELLENT';
  let statusColor = 'text-gold';
  if (score < 75) {
    statusText = 'NEEDS FOCUS';
    statusColor = 'text-red-500';
  } else if (score < 85) {
    statusText = 'GOOD';
    statusColor = 'text-orange-500';
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex-1 flex flex-col justify-between">
      <div>
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
            <span className={`text-xs font-bold ${statusColor} tracking-widest mt-1`}>{statusText}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-text-muted text-center mt-4">
        Average score across all {classCount} current subjects.
      </p>
    </div>
  );
};

/* ─── Performance Flags ─── */
const PerformanceFlags = ({ flags, onCompute }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex-1 flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-gold font-semibold">Performance Flags</h3>
        <Flag size={18} className="text-gray-400" />
      </div>

      <div className="space-y-4 max-h-[190px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {flags.map((flag, idx) => (
          <div 
            key={idx} 
            className={`border-l-4 ${
              flag.type === 'critical' ? 'border-red-500 bg-red-50' : 'border-orange-400 bg-orange-50'
            } p-4 rounded-r-xl`}
          >
            <div className="flex items-start gap-2">
              {flag.type === 'critical' ? (
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
              ) : (
                <Info size={16} className="text-orange-500 mt-0.5 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-sidebar text-sm">{flag.title}</h4>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {flag.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <button 
      onClick={onCompute}
      className="mt-5 w-full bg-sidebar hover:bg-sidebar-hover text-white font-bold py-3 rounded-lg transition-colors text-sm shrink-0"
    >
      Compute Analytics
    </button>
  </div>
);

/* ─── Course Progress Card ─── */
const CourseProgressCard = ({ icon: Icon, iconBg, title, subtitle, progress, color, grade }) => (
  <div className="flex items-center gap-4 p-3">
    <div className={`${iconBg} p-2.5 rounded-xl shrink-0`}>
      <Icon size={20} className="text-gold" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline">
        <h4 className="font-bold text-sidebar text-sm truncate">{title}</h4>
        <span className="text-sm font-bold text-sidebar ml-2">{grade}%</span>
      </div>
      <p className="text-[10px] font-bold text-text-muted tracking-wider uppercase">{subtitle}</p>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  </div>
);

const CourseProgress = ({ classes }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-gold font-semibold">Course Progress</h3>
      <button className="text-xs font-bold text-gold hover:text-gold-hover transition-colors">View All</button>
    </div>

    <div className="divide-y divide-border max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      {classes.map((cls, idx) => {
        let Icon = BookOpen;
        if (cls.department.toLowerCase().includes('science') || cls.department.toLowerCase().includes('life')) {
          Icon = FlaskConical;
        } else if (cls.department.toLowerCase().includes('engineering') || cls.department.toLowerCase().includes('math')) {
          Icon = TrendingUp;
        } else if (cls.department.toLowerCase().includes('global') || cls.department.toLowerCase().includes('history')) {
          Icon = Globe;
        }

        return (
          <CourseProgressCard
            key={idx}
            icon={Icon}
            iconBg="bg-gold-light"
            title={cls.subject}
            subtitle={cls.department}
            progress={cls.progress}
            grade={cls.avgGrade}
            color={cls.avgGrade >= 85 ? 'bg-gold' : cls.avgGrade >= 75 ? 'bg-orange-400' : 'bg-red-500'}
          />
        );
      })}
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

const CategoryPerformance = ({ categories }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
    <h3 className="text-gold font-semibold mb-6">Category Performance</h3>
    <div className="flex justify-around">
      <SemiCircleGauge value={categories.written} label="Written Works" color="#eab308" />
      <SemiCircleGauge value={categories.performance} label="Performance Tasks" color="#eab308" />
      <SemiCircleGauge value={categories.assessment} label="Assessment" color={categories.assessment >= 75 ? '#eab308' : '#ef4444'} />
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
  const [currentUser, setCurrentUser] = useState(null);
  const [myClasses, setMyClasses] = useState([]);
  const [flags, setFlags] = useState([]);
  const [categories, setCategories] = useState({ written: 88, performance: 50, assessment: 20 });
  const [overallGrade, setOverallGrade] = useState(88);

  const calculateGrade = (studentId, sectionId) => {
    let termGrades = [];
    const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
    
    // 1. Gather finalized term grades
    terms.forEach(term => {
      const termKey = `term_records_${sectionId}`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(termKey)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const recs = JSON.parse(raw);
            if (recs[studentId] && recs[studentId][term] !== undefined && recs[studentId][term] !== null) {
              termGrades.push(recs[studentId][term]);
            }
          }
        }
      }
    });

    // 2. Gather in-progress assessment grades
    let inProgressGrades = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`grades_${sectionId}_`)) {
        const parts = key.split('_');
        const academicYear = parts[2];
        const term = parts[3];
        
        const assessmentsRaw = localStorage.getItem(`assessments_${sectionId}_${academicYear}_${term}`);
        const gradesRaw = localStorage.getItem(key);
        
        if (assessmentsRaw && gradesRaw) {
          const assessments = JSON.parse(assessmentsRaw);
          const grades = JSON.parse(gradesRaw);
          const studentGrades = grades[studentId] || {};
          
          let sumWeighted = 0;
          let sumWeight = 0;
          assessments.forEach(ass => {
            const score = studentGrades[ass.id];
            if (score !== undefined && score !== null && score !== '') {
              sumWeighted += (score / ass.totalItems) * ass.weight;
              sumWeight += ass.weight;
            }
          });
          if (sumWeight > 0) {
            inProgressGrades.push((sumWeighted / sumWeight) * 100);
          }
        }
      }
    }

    if (termGrades.length > 0) {
      return Math.round(termGrades.reduce((a, b) => a + b, 0) / termGrades.length);
    } else if (inProgressGrades.length > 0) {
      return Math.round(inProgressGrades.reduce((a, b) => a + b, 0) / inProgressGrades.length);
    }
    return null; // indicates no grades recorded yet
  };

  const loadData = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    // Fetch users list to map teacher names
    let fetchedUsers = [];
    try {
      const res = await fetch('http://localhost:5000/api/users');
      if (res.ok) fetchedUsers = await res.json();
    } catch (e) {
      console.error(e);
    }

    const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
    const activeSections = savedSections.filter(s => s.subject && s.subject.trim() !== '');

    const enrolledList = [];
    const generatedFlags = [];
    const categoryScores = { written: [], performance: [], assessment: [] };

    activeSections.forEach(section => {
      const isEnrolled = section.students && section.students.some(s => 
        s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
      );

      if (isEnrolled) {
        // Resolve student key inside section students array
        const matchStudent = section.students.find(s => 
          s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
        );
        const resolvedStudentId = matchStudent ? matchStudent.id : user.id;

        const teacher = fetchedUsers.find(u => u.id === section.teacherId) || {
          full_name: 'Assigned Teacher',
          department: 'Science & Engineering'
        };

        const computedGrade = calculateGrade(resolvedStudentId, section.id);
        const displayGrade = computedGrade !== null ? computedGrade : 85; // baseline fallback

        // Gather category breakdown
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`assessments_${section.id}`)) {
            const parts = key.split('_');
            const academicYear = parts[2];
            const term = parts[3];
            
            const assessmentsRaw = localStorage.getItem(key);
            const gradesRaw = localStorage.getItem(`grades_${section.id}_${academicYear}_${term}`);
            
            if (assessmentsRaw && gradesRaw) {
              const assessments = JSON.parse(assessmentsRaw);
              const grades = JSON.parse(gradesRaw);
              const studentGrades = grades[resolvedStudentId] || {};
              
              assessments.forEach(ass => {
                const score = studentGrades[ass.id];
                if (score !== undefined && score !== null && score !== '') {
                  const pct = (score / ass.totalItems) * 100;
                  const nameLower = ass.name.toLowerCase();
                  
                  if (nameLower.includes('quiz') || nameLower.includes('hw') || nameLower.includes('homework') || nameLower.includes('assignment') || nameLower.includes('written') || nameLower.includes('sheet')) {
                    categoryScores.written.push(pct);
                  } else if (nameLower.includes('project') || nameLower.includes('task') || nameLower.includes('performance') || nameLower.includes('lab') || nameLower.includes('laboratory') || nameLower.includes('presentation')) {
                    categoryScores.performance.push(pct);
                  } else if (nameLower.includes('exam') || nameLower.includes('midterm') || nameLower.includes('final') || nameLower.includes('test') || nameLower.includes('pre-final')) {
                    categoryScores.assessment.push(pct);
                  } else {
                    categoryScores.written.push(pct);
                  }
                }
              });
            }
          }
        }

        // Attendance
        const dates = JSON.parse(localStorage.getItem(`attendance_dates_${section.id}`) || '[]');
        const recs = JSON.parse(localStorage.getItem(`attendance_records_${section.id}`) || '{}');
        let presentCount = 0;
        let attendancePct = 95; // default fallback

        if (dates.length > 0) {
          const studentRec = recs[resolvedStudentId] || {};
          dates.forEach(d => {
            if (studentRec[d.id]) presentCount++;
          });
          attendancePct = Math.round((presentCount / dates.length) * 100);
        }

        // Generate flags
        if (computedGrade !== null && computedGrade < 75) {
          generatedFlags.push({
            type: 'critical',
            title: `${section.subject}: Low Grade Alert`,
            description: `Current average score is ${computedGrade}%. Immediate tutor or retake consultation recommended.`
          });
        }
        if (attendancePct < 85) {
          generatedFlags.push({
            type: 'warning',
            title: `${section.subject}: Attendance Flag`,
            description: `Your attendance has dropped to ${attendancePct}%. Contact your instructor to resolve lecture attendance.`
          });
        }

        enrolledList.push({
          subject: section.subject,
          section: section.name,
          department: teacher.department || 'Science & Engineering',
          instructor: teacher.full_name,
          avgGrade: displayGrade,
          progress: computedGrade !== null ? 70 : 45, // progressive mockup depending on finalized grades
        });
      }
    });

    if (enrolledList.length > 0) {
      setMyClasses(enrolledList);

      // Compute overall grade health
      const avg = Math.round(enrolledList.reduce((sum, c) => sum + c.avgGrade, 0) / enrolledList.length);
      setOverallGrade(avg);

      // Compute category breakdowns
      const written = categoryScores.written.length > 0 
        ? Math.round(categoryScores.written.reduce((a, b) => a + b, 0) / categoryScores.written.length) 
        : 88;
      const performance = categoryScores.performance.length > 0 
        ? Math.round(categoryScores.performance.reduce((a, b) => a + b, 0) / categoryScores.performance.length) 
        : 50;
      const assessment = categoryScores.assessment.length > 0 
        ? Math.round(categoryScores.assessment.reduce((a, b) => a + b, 0) / categoryScores.assessment.length) 
        : 20;

      setCategories({ written, performance, assessment });

      if (generatedFlags.length === 0) {
        generatedFlags.push({
          type: 'warning',
          title: 'All Clear: No Flags',
          description: 'Your academic scores and attendance rates meet or exceed standard requirements.'
        });
      }
      setFlags(generatedFlags);
    } else {
      // Fallback standard mock items from the screenshot
      setMyClasses([
        { subject: 'Advanced Calculus', department: 'SCIENCE & ENGINEERING', progress: 92, avgGrade: 92 },
        { subject: 'Modern History', department: 'HUMANITIES', progress: 74, avgGrade: 74 },
        { subject: 'Molecular Biology', department: 'LIFE SCIENCES', progress: 81, avgGrade: 81 }
      ]);
      setFlags([
        { type: 'critical', title: 'Calculus II: Missing Quiz', description: 'Due 2 days ago • Immediate action required.' },
        { type: 'warning', title: 'Ethics: Assessment Gap', description: 'Score dropped by 12% in the last module.' }
      ]);
      setCategories({ written: 88, performance: 50, assessment: 20 });
      setOverallGrade(88);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleComputeAnalytics = () => {
    loadData();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start max-w-7xl mx-auto w-full">
      {/* Left Column */}
      <div className="flex-1 space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <GradeHealthRing score={overallGrade} classCount={myClasses.length} />
          <PerformanceFlags flags={flags} onCompute={handleComputeAnalytics} />
        </div>
        <CategoryPerformance categories={categories} />
        <SubmissionTimeline />
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[340px] space-y-6 shrink-0">
        <CourseProgress classes={myClasses} />
        <PromoCard />
      </div>
    </div>
  );
};

export default Dashboard;
