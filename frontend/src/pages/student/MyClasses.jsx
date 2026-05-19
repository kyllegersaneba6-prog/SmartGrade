import React, { useState, useEffect } from 'react';
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
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-sidebar uppercase">
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
const TermPerformanceTrend = ({ data }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex-1">
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
const InterventionSummary = ({ interventions }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex-1">
    <h3 className="text-lg font-medium text-sidebar mb-2">Intervention Summary</h3>
    <p className="text-sm text-text-muted mb-5">
      {interventions.length} priority review{interventions.length !== 1 ? 's' : ''} requested for the current period.
    </p>

    <div className="space-y-3">
      {interventions.map((row, idx) => (
        <div 
          key={idx} 
          className={`border p-4 rounded-xl flex items-start justify-between ${
            row.type === 'critical' 
              ? 'bg-red-50 border-red-200' 
              : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {row.type === 'critical' ? (
              <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            ) : (
              <Info size={16} className="text-orange-500 mt-0.5 shrink-0" />
            )}
            <div>
              <h4 className="font-bold text-sidebar text-sm">{row.title}</h4>
              <p className="text-xs text-text-muted mt-0.5">{row.description}</p>
            </div>
          </div>
          <button className="text-xs font-bold text-gold hover:text-gold-hover transition-colors whitespace-nowrap ml-2">
            {row.actionText}
          </button>
        </div>
      ))}
    </div>
  </div>
);

/* ─── My Classes Page ─── */
const MyClasses = () => {
  const [classesList, setClassesList] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [interventions, setInterventions] = useState([]);

  const calculateGrade = (studentId, sectionId) => {
    let termGrades = [];
    const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
    
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
    return null;
  };

  const loadAllClasses = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    let fetchedUsers = [];
    try {
      const res = await fetch('http://localhost:5000/api/users');
      if (res.ok) fetchedUsers = await res.json();
    } catch (e) {
      console.error(e);
    }

    const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
    const activeSections = savedSections.filter(s => s.subject && s.subject.trim() !== '');

    const list = [];
    const generatedInterventions = [];

    activeSections.forEach(section => {
      const isEnrolled = section.students && section.students.some(s => 
        s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
      );

      if (isEnrolled) {
        const matchStudent = section.students.find(s => 
          s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
        );
        const resolvedStudentId = matchStudent ? matchStudent.id : user.id;

        const teacher = fetchedUsers.find(u => u.id === section.teacherId) || {
          full_name: 'Assigned Teacher',
          department: 'Science & Engineering'
        };

        const computedGrade = calculateGrade(resolvedStudentId, section.id);
        const displayGrade = computedGrade !== null ? computedGrade : 85;

        // Attendance
        const dates = JSON.parse(localStorage.getItem(`attendance_dates_${section.id}`) || '[]');
        const recs = JSON.parse(localStorage.getItem(`attendance_records_${section.id}`) || '{}');
        let presentCount = 0;
        let attendancePct = 95;

        if (dates.length > 0) {
          const studentRec = recs[resolvedStudentId] || {};
          dates.forEach(d => {
            if (studentRec[d.id]) presentCount++;
          });
          attendancePct = Math.round((presentCount / dates.length) * 100);
        }

        // Progress mock estimation based on locked terms
        let lockedCount = 0;
        const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
        terms.forEach(t => {
          const key = `term_records_${section.id}`;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(key)) {
              const raw = localStorage.getItem(k);
              if (raw && JSON.parse(raw)[resolvedStudentId]?.[t] !== undefined) lockedCount++;
            }
          }
        });
        const progress = Math.min(100, Math.max(15, lockedCount * 25 + (computedGrade !== null ? 10 : 0)));

        const status = displayGrade >= 85 ? 'Reassuring' : displayGrade >= 75 ? 'Review Needed' : 'Action Required';
        const borderColor = displayGrade >= 85 ? 'border-green-400' : displayGrade >= 75 ? 'border-orange-400' : 'border-red-400';

        // Add to interventions if status is critical
        if (displayGrade < 75) {
          generatedInterventions.push({
            type: 'critical',
            title: `${section.subject} Quiz Retake`,
            description: `Performance is currently under standard threshold. Contact registrar.`,
            actionText: 'Contact Registrar'
          });
        }

        list.push({
          subject: section.subject,
          section: section.name,
          topic: teacher.department || 'Science & Engineering',
          instructor: teacher.full_name,
          initials: teacher.full_name.split(' ').map(n => n[0]).join('').substring(0, 2),
          avgGrade: displayGrade,
          attendance: attendancePct,
          progress: progress,
          status,
          borderColor
        });
      }
    });

    if (list.length > 0) {
      setClassesList(list);
      setTrendData(list.map(c => ({
        name: c.subject.substring(0, 4).toUpperCase(),
        value: c.avgGrade
      })));

      if (generatedInterventions.length === 0) {
        generatedInterventions.push({
          type: 'warning',
          title: 'Feedback Request',
          description: 'Instructor waiting for project submission feedback response.',
          actionText: 'Reply'
        });
      }
      setInterventions(generatedInterventions);
    } else {
      // Default Mock Data
      setClassesList([
        { subject: 'Mathematics', section: 'Section A-1', topic: 'Advanced Calculus', instructor: 'Dr. Robert Miller', initials: 'RM', avgGrade: 94.5, attendance: 98, progress: 85, status: 'Reassuring', borderColor: 'border-green-400' },
        { subject: 'English', section: 'Section B-4', topic: 'Literature & Analysis', instructor: 'Prof. Sarah Jenkins', initials: 'SJ', avgGrade: 76.2, attendance: 82, progress: 62, status: 'Review Needed', borderColor: 'border-orange-400' },
        { subject: 'Filipino', section: 'Section C-2', topic: 'Panitikang Pilipino', instructor: 'Ms. Maria Santos', initials: 'MS', avgGrade: 89.8, attendance: 95, progress: 92, status: 'Reassuring', borderColor: 'border-green-400' },
        { subject: 'Science', section: 'Section D-1', topic: 'Organic Chemistry', instructor: 'Dr. Alan Turing', initials: 'AT', avgGrade: 91.2, attendance: 94, progress: 45, status: 'Reassuring', borderColor: 'border-green-400' },
        { subject: 'History', section: 'Section E-3', topic: 'World Civilizations', instructor: 'Prof. David Graham', initials: 'DG', avgGrade: 64.5, attendance: 75, progress: 30, status: 'Action Required', borderColor: 'border-red-400' },
        { subject: 'Comp Sci', section: 'Section F-1', topic: 'Data Structures', instructor: 'Dr. Kevin Zhang', initials: 'KZ', avgGrade: 97.0, attendance: 100, progress: 88, status: 'Reassuring', borderColor: 'border-green-400' },
      ]);
      setTrendData([
        { name: 'MATH', value: 88 },
        { name: 'ENGL', value: 82 },
        { name: 'FILI', value: 90 },
        { name: 'SCIE', value: 85 },
        { name: 'HST', value: 65 },
        { name: 'CS', value: 92 },
      ]);
      setInterventions([
        { type: 'critical', title: 'History Quiz 3 Retake', description: 'Scheduled for Friday, 3:00 PM', actionText: 'Details' },
        { type: 'warning', title: 'English Essay Feedback', description: 'Instructor waiting for response', actionText: 'Reply' }
      ]);
    }
  };

  useEffect(() => {
    loadAllClasses();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-sidebar">My Classes</h1>
          <p className="text-text-muted mt-1">
            Track real-time performance, attendance compliance, and active instructor milestones.
          </p>
        </div>
        <button className="bg-sidebar hover:bg-sidebar-hover text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors text-sm">
          <Plus size={18} /> Join New Class
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {classesList.map((cls, idx) => (
          <ClassCard key={idx} {...cls} />
        ))}
      </div>

      {/* Bottom Row */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full items-start">
        <TermPerformanceTrend data={trendData} />
        <InterventionSummary interventions={interventions} />
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-sidebar hover:bg-sidebar-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default MyClasses;
