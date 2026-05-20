import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, AlertTriangle, Info, TrendingUp, X } from 'lucide-react';
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
const ClassCard = ({ id, subject, section, topic, instructor, initials, avgGrade, attendance, progress, status, borderColor, onViewFull }) => (
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
      <button 
        onClick={() => onViewFull(id)}
        className="w-full border-2 border-gold text-gold font-bold py-2 rounded-lg hover:bg-gold-light transition-colors text-sm"
      >
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
  const navigate = useNavigate();
  const [classesList, setClassesList] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [interventions, setInterventions] = useState([]);
  
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleJoinClass = () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a valid subject code.');
      return;
    }
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) {
      setJoinError('User not found. Please log in again.');
      return;
    }

    const code = joinCode.trim().toUpperCase();
    const savedPublished = JSON.parse(localStorage.getItem('published_assignments') || '[]');
    let found = false;
    let alreadyJoined = false;

    const updatedPublished = savedPublished.map(pub => {
      const updatedSections = pub.sections.map(sec => {
        if (sec.subjectCode === code) {
          found = true;
          if (sec.students.some(s => s.id === user.id || s.full_name?.toLowerCase() === user.full_name?.toLowerCase())) {
            alreadyJoined = true;
          } else {
            return {
              ...sec,
              students: [...sec.students, user]
            };
          }
        }
        return sec;
      });
      return { ...pub, sections: updatedSections };
    });

    if (!found) {
      setJoinError('Invalid subject code.');
      return;
    }

    if (alreadyJoined) {
      setJoinError('You are already enrolled in this class.');
      return;
    }

    localStorage.setItem('published_assignments', JSON.stringify(updatedPublished));

    const flatSections = [];
    updatedPublished.forEach(pub => {
      pub.sections.forEach(s => {
        flatSections.push({
          id: s.id,
          name: s.name,
          teacherId: s.teacherId,
          subject: s.subject,
          students: s.students,
          subjectCode: s.subjectCode
        });
      });
    });
    localStorage.setItem('student_sections', JSON.stringify(flatSections));

    setShowJoinModal(false);
    setJoinCode('');
    setJoinError('');
    loadAllClasses();
  };

  const calculateGrade = (studentId, sectionId) => {
    let termGrades = [];
    const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
    
    // Gather finalized term grades from semester-scoped keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`term_records_${sectionId}_`)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const recs = JSON.parse(raw);
          terms.forEach(term => {
            if (recs[studentId] && recs[studentId][term] !== undefined && recs[studentId][term] !== null) {
              termGrades.push(recs[studentId][term]);
            }
          });
        }
      }
    }

    let inProgressGrades = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`grades_${sectionId}_`)) {
        // Key format: grades_{sectionId}_{year}_{semester}_{term}
        const assessmentsKey = key.replace('grades_', 'assessments_');
        const assessmentsRaw = localStorage.getItem(assessmentsKey);
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

        // Progress estimation based on locked terms across all semesters
        let lockedCount = 0;
        const terms = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`term_records_${section.id}_`)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const recs = JSON.parse(raw);
              terms.forEach(t => {
                if (recs[resolvedStudentId]?.[t] !== undefined && recs[resolvedStudentId]?.[t] !== null) lockedCount++;
              });
            }
          }
        }
        const progress = Math.min(100, Math.max(15, lockedCount * 25 + (computedGrade !== null ? 10 : 0)));

        const status = displayGrade >= 85 ? 'Reassuring' : displayGrade >= 75 ? 'Review Needed' : 'Action Required';
        const borderColor = displayGrade >= 85 ? 'border-green-400' : displayGrade >= 75 ? 'border-orange-400' : 'border-red-400';

        if (displayGrade < 75) {
          generatedInterventions.push({
            type: 'critical',
            title: `${section.subject} Quiz Retake`,
            description: `Performance is currently under standard threshold. Contact registrar.`,
            actionText: 'Contact Registrar'
          });
        }

        list.push({
          id: section.id,
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

    setClassesList(list);

    if (list.length > 0) {
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
      setTrendData([]);
      setInterventions([]);
    }
  };

  useEffect(() => {
    loadAllClasses();
  }, []);

  const handleViewFull = (classId) => {
    navigate(`/student/classes/${classId}`);
  };

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
        <button 
          onClick={() => setShowJoinModal(true)}
          className="bg-sidebar hover:bg-sidebar-hover text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <Plus size={18} /> Join New Class
        </button>
      </div>

      {/* Class Cards Grid */}
      {classesList.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center w-full my-8">
          <Info size={48} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-500">No Classes Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mt-2">
            You haven't joined any classes. Click the "Join New Class" button above and enter the subject code provided by your teacher.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
          {classesList.map((cls, idx) => (
            <ClassCard key={idx} {...cls} onViewFull={handleViewFull} />
          ))}
        </div>
      )}

      {/* Bottom Row */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full items-start">
        <TermPerformanceTrend data={trendData} />
        <InterventionSummary interventions={interventions} />
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-sidebar hover:bg-sidebar-hover text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110">
        <MessageSquare size={24} />
      </button>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-sidebar">Join New Class</h3>
              <button onClick={() => {setShowJoinModal(false); setJoinError('');}} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-4">Enter the subject code provided by your instructor or dean to join a class.</p>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subject Code</label>
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => {setJoinCode(e.target.value); setJoinError('');}}
                  placeholder="e.g., A1B2C3"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold font-mono uppercase"
                  maxLength={6}
                />
                {joinError && <p className="text-xs text-red-500 mt-2 font-bold">{joinError}</p>}
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => {setShowJoinModal(false); setJoinError('');}}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinClass}
                className="px-4 py-2 text-white bg-sidebar hover:bg-sidebar-hover text-xs font-bold rounded-lg transition-colors"
              >
                Join Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClasses;
