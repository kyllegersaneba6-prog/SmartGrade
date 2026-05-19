import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, Lock, Unlock, X, Check, Search, Filter } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

const TeacherSubmissions = () => {
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load Unlock Requests
    const savedRequests = localStorage.getItem('unlock_requests');
    if (savedRequests) {
      setUnlockRequests(JSON.parse(savedRequests).filter(r => r.status === 'PENDING'));
    }

    // Load Submissions by scanning localStorage for term_records_*
    const allSubmissions = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('term_records_')) {
        // format: term_records_{classId}_{academicYear}_{semester}
        const withoutPrefix = key.substring('term_records_'.length);
        const segments = withoutPrefix.split('_');
        if (segments.length < 3) continue;
        const classId = segments[0];
        const academicYear = segments[1];
        const semester = segments.slice(2).join('_');
        const rawData = localStorage.getItem(key);
        
        if (rawData) {
          const records = JSON.parse(rawData);
          const studentIds = Object.keys(records);
          if (studentIds.length > 0) {
            const firstStudentRecords = records[studentIds[0]];
            const terms = Object.keys(firstStudentRecords).filter(term => firstStudentRecords[term] !== null && firstStudentRecords[term] !== undefined);
            
            const savedSections = localStorage.getItem('student_sections');
            let className = 'Unknown Class';
            let subject = 'Unknown Subject';
            let teacherName = 'Unknown Teacher';
            let studentsData = [];
            
            if (savedSections) {
              const sections = JSON.parse(savedSections);
              const section = sections.find(s => s.id === classId);
              if (section) {
                className = section.name;
                subject = section.subject;
                teacherName = 'Assigned Teacher'; 
                studentsData = section.students || [];
              }
            }

            terms.forEach(term => {
              allSubmissions.push({
                id: `${classId}-${academicYear}-${semester}-${term}`,
                classId,
                className,
                subject,
                teacherName,
                academicYear,
                semester,
                term,
                studentCount: studentIds.length,
                studentGrades: studentsData.map(s => ({
                  id: s.id,
                  name: s.full_name,
                  grade: records[s.id] ? records[s.id][term] : null
                }))
              });
            });
          }
        }
      }
    }
    setSubmissions(allSubmissions);
  };

  const handleApproveUnlock = (req) => {
    // 1. Remove the term from term_records for that class
    const key = req.semester
      ? `term_records_${req.classId}_${req.academicYear}_${req.semester}`
      : `term_records_${req.classId}_${req.academicYear}`;
    const rawData = localStorage.getItem(key);
    if (rawData) {
      const records = JSON.parse(rawData);
      Object.keys(records).forEach(studentId => {
        delete records[studentId][req.term];
      });
      localStorage.setItem(key, JSON.stringify(records));
    }

    // 2. Remove the request
    const allReqs = JSON.parse(localStorage.getItem('unlock_requests') || '[]');
    const updatedReqs = allReqs.filter(r => r.id !== req.id);
    localStorage.setItem('unlock_requests', JSON.stringify(updatedReqs));
    
    loadData(); // Refresh UI
  };

  const handleDenyUnlock = (reqId) => {
    const allReqs = JSON.parse(localStorage.getItem('unlock_requests') || '[]');
    const updatedReqs = allReqs.filter(r => r.id !== reqId);
    localStorage.setItem('unlock_requests', JSON.stringify(updatedReqs));
    loadData(); // Refresh UI
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-sidebar">Teacher Submissions</h1>
          <p className="text-text-muted mt-1">Review finalized grades and manage gradebook unlock requests.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase border border-green-200">
          <CheckCircle size={14} /> {submissions.length} Finalized Submissions
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content (Left) */}
        <div className="flex-1 space-y-6">
          
          {/* Unlock Requests Section */}
          {unlockRequests.length > 0 && (
            <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                <Unlock size={20} /> Action Required: Unlock Requests
              </h3>
              <div className="space-y-4">
                {unlockRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-xl p-5 border border-orange-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sidebar">{req.subject}</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{req.className}</span>
                        <span className="text-xs bg-orange-100 px-2 py-0.5 rounded text-orange-700 font-bold">{req.term}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Teacher: <span className="font-medium text-sidebar">{req.teacherName}</span> • A.Y. {req.academicYear}
                      </p>
                      <div className="bg-orange-50 p-3 rounded-lg text-sm text-orange-800 border border-orange-100">
                        <span className="font-bold block mb-1">Reason for request:</span>
                        {req.reason}
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <button 
                        onClick={() => handleApproveUnlock(req)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      >
                        <Check size={16} /> Approve & Unlock
                      </button>
                      <button 
                        onClick={() => handleDenyUnlock(req.id)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                      >
                        <X size={16} /> Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Submissions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-border flex flex-col">
            <div className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border">
              <h3 className="text-lg font-bold text-sidebar">Finalized Gradebooks</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search subject..." className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold" />
                </div>
              </div>
            </div>
            
            {submissions.length === 0 ? (
              <div className="p-12 text-center">
                <Lock size={48} className="mx-auto text-gray-200 mb-4" />
                <h4 className="text-lg font-medium text-sidebar mb-1">No Submissions Yet</h4>
                <p className="text-sm text-gray-500">Teachers have not finalized any terms.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Subject & Class</th>
                      <th className="px-4 py-4">Term</th>
                      <th className="px-4 py-4">Academic Year</th>
                      <th className="px-4 py-4 text-center">Students</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {submissions.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sidebar">{sub.subject}</div>
                          <div className="text-xs text-text-muted">{sub.className} • {sub.teacherName}</div>
                        </td>
                        <td className="px-4 py-4 font-bold text-gold">{sub.term}</td>
                        <td className="px-4 py-4 text-gray-600 font-medium">{sub.academicYear}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold border border-gray-200">
                            {sub.studentCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-green-200">
                            <Lock size={12} /> Locked
                          </span>
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="text-xs font-bold text-gold hover:text-gold-hover underline"
                          >
                            View Grades
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Analytics) */}
        <div className="flex-1 lg:max-w-xs space-y-6">
          <div className="bg-sidebar rounded-2xl shadow-sm p-6 text-white relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="text-[10px] font-bold text-gold tracking-widest uppercase mb-1">DEAN OVERVIEW</div>
            <h3 className="text-lg font-bold mb-4">Submission Rate</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold">{submissions.length}</span>
              <span className="text-sm text-gray-400 mb-1">Total Submissions</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Tracking all locked terms across all sections. 
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
             <h4 className="font-medium text-sidebar mb-4 flex items-center gap-2">
               <AlertTriangle size={16} className="text-gold" /> Quick Actions
             </h4>
             <div className="space-y-3">
               <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gold hover:bg-gold/5 transition-colors text-sm font-medium text-sidebar">
                 Generate Dean's Report
               </button>
               <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gold hover:bg-gold/5 transition-colors text-sm font-medium text-sidebar">
                 Broadcast Reminder to Teachers
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* View Grades Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl text-sidebar mb-1 flex items-center gap-2">
                  <Lock size={18} className="text-green-600" />
                  {selectedSubmission.subject} ({selectedSubmission.className})
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedSubmission.term} Term Grades • A.Y. {selectedSubmission.academicYear} • Teacher: {selectedSubmission.teacherName}
                </p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-bg-light/30">
              <table className="w-full text-left border border-border rounded-lg overflow-hidden">
                <thead className="bg-bg-light text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 border-b border-border">Student Name</th>
                    <th className="px-4 py-3 border-b border-border text-right">Final Grade</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-border text-sm">
                  {selectedSubmission.studentGrades.map((student) => {
                    const grade = student.grade;
                    const gradeStr = grade !== null && grade !== undefined ? `${parseFloat(grade).toFixed(1)}%` : '—';
                    const colorClass = grade === null || grade === undefined ? 'text-gray-400' : (grade >= 90 ? 'text-gold' : grade >= 75 ? 'text-green-600' : 'text-red-500');
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-sidebar">{student.name}</td>
                        <td className={`px-4 py-3 text-right font-bold ${colorClass}`}>
                          {gradeStr}
                        </td>
                      </tr>
                    );
                  })}
                  {selectedSubmission.studentGrades.length === 0 && (
                    <tr>
                      <td colSpan="2" className="px-4 py-6 text-center text-gray-500 italic">No students found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mt-4 text-xs text-gray-500 flex items-center justify-center gap-2">
                 <AlertTriangle size={14} className="text-orange-400" /> This is a read-only view. Only the assigned teacher can edit grades.
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-6 py-2 bg-sidebar text-white rounded-lg text-sm font-bold hover:bg-sidebar-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherSubmissions;
