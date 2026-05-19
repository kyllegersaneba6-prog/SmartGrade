import React, { useState, useEffect } from 'react';
import { Filter, Download, Zap, TrendingUp, CheckCircle, AlertTriangle, Trash2, Plus, ArrowRight, Lightbulb, ChevronLeft, ChevronRight, ClipboardCheck, Settings, Lock, Calendar, Unlock } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const STUDENTS_PER_PAGE = 10;
const TERMS = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [
  `${currentYear - 1}-${currentYear}`,
  `${currentYear}-${currentYear + 1}`,
  `${currentYear + 1}-${currentYear + 2}`
];

const Gradebook = () => {
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Academic Year, Semester & Term
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [selectedSemester, setSelectedSemester] = useState('2nd Semester');
  const [selectedTerm, setSelectedTerm] = useState('Prelim');
  const [termRecords, setTermRecords] = useState({}); // { [term]: finalGradeValue } per student
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  
  // assessments structure: { id, name, weight, totalItems }
  const [assessments, setAssessments] = useState([]);
  
  // grades structure: { [studentId]: { [assessmentId]: score } }
  const [grades, setGrades] = useState({});
 
  // New assessment modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssessmentName, setNewAssessmentName] = useState('');
  const [newAssessmentWeight, setNewAssessmentWeight] = useState('');
  const [newAssessmentTotalItems, setNewAssessmentTotalItems] = useState('');
 
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
 
  // Attendance integration
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceWeight, setAttendanceWeight] = useState(0);
  const [showAttendanceConfig, setShowAttendanceConfig] = useState(false);
  const [tempAttWeight, setTempAttWeight] = useState('');
 
  // Helper: build a storage key scoped to class + year + semester + term
  const storageKey = (base) => `${base}_${selectedClassId}_${academicYear}_${selectedSemester}_${selectedTerm}`;

  // Load sections from local storage
  useEffect(() => {
    const savedSections = localStorage.getItem('student_sections');
    if (savedSections) {
      const parsedSections = JSON.parse(savedSections).filter(s => s.subject && s.subject.trim() !== '');
      setClasses(parsedSections);
      
      let initialClassId = '';
      if (location.state?.classId) {
        initialClassId = location.state.classId;
      } else if (parsedSections.length > 0) {
        initialClassId = parsedSections[0].id;
      }
      setSelectedClassId(initialClassId);
    }
  }, [location]);

  // Load assessments and grades when class/term/year/semester changes
  useEffect(() => {
    if (selectedClassId) {
      const savedAssessments = localStorage.getItem(storageKey('assessments'));
      setAssessments(savedAssessments ? JSON.parse(savedAssessments) : []);

      const savedGrades = localStorage.getItem(storageKey('grades'));
      setGrades(savedGrades ? JSON.parse(savedGrades) : {});

      setCurrentPage(1);

      // Load attendance data (attendance is per-class, not per-term)
      const savedAttDates = localStorage.getItem(`attendance_dates_${selectedClassId}`);
      setAttendanceDates(savedAttDates ? JSON.parse(savedAttDates) : []);

      const savedAttRecords = localStorage.getItem(`attendance_records_${selectedClassId}`);
      setAttendanceRecords(savedAttRecords ? JSON.parse(savedAttRecords) : {});

      const savedAttWeight = localStorage.getItem(storageKey('att_weight'));
      setAttendanceWeight(savedAttWeight ? parseFloat(savedAttWeight) : 0);

      // Load term records for GPA
      const savedTermRecords = localStorage.getItem(`term_records_${selectedClassId}_${academicYear}_${selectedSemester}`);
      setTermRecords(savedTermRecords ? JSON.parse(savedTermRecords) : {});

      // Load unlock requests to check status
      const savedRequests = localStorage.getItem('unlock_requests');
      setUnlockRequests(savedRequests ? JSON.parse(savedRequests) : []);
    }
  }, [selectedClassId, selectedTerm, academicYear, selectedSemester]);

  // Save assessments and grades when they change
  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(storageKey('assessments'), JSON.stringify(assessments));
    }
  }, [assessments, selectedClassId, selectedTerm, academicYear, selectedSemester]);

  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(storageKey('grades'), JSON.stringify(grades));
    }
  }, [grades, selectedClassId, selectedTerm, academicYear, selectedSemester]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || { name: 'Unknown', subject: 'No Class Selected', students: [] };

  // Pagination logic
  const totalStudents = selectedClass.students.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / STUDENTS_PER_PAGE));
  const paginatedStudents = selectedClass.students.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );

  const handleAddAssessment = (e) => {
    e.preventDefault();
    if (!newAssessmentName.trim() || !newAssessmentWeight || !newAssessmentTotalItems) return;
    
    setAssessments([...assessments, {
      id: Date.now().toString(),
      name: newAssessmentName.trim(),
      weight: parseFloat(newAssessmentWeight),
      totalItems: parseInt(newAssessmentTotalItems)
    }]);
    setNewAssessmentName('');
    setNewAssessmentWeight('');
    setNewAssessmentTotalItems('');
    setShowAddModal(false);
  };

  const handleRemoveAssessment = (id) => {
    setAssessments(assessments.filter(a => a.id !== id));
    // Remove grades for this assessment
    const newGrades = { ...grades };
    Object.keys(newGrades).forEach(studentId => {
      delete newGrades[studentId][id];
    });
    setGrades(newGrades);
  };

  const handleGradeChange = (studentId, assessmentId, value) => {
    const numericValue = parseFloat(value);
    const assessment = assessments.find(a => a.id === assessmentId);
    // Clamp to totalItems
    let clampedValue = isNaN(numericValue) ? '' : numericValue;
    if (assessment && clampedValue !== '' && clampedValue > assessment.totalItems) {
      clampedValue = assessment.totalItems;
    }
    if (clampedValue !== '' && clampedValue < 0) {
      clampedValue = 0;
    }

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [assessmentId]: clampedValue
      }
    }));
  };

  // Calculate attendance rate for a student
  const getAttendanceRate = (studentId) => {
    if (attendanceDates.length === 0) return null;
    const studentRecords = attendanceRecords[studentId] || {};
    let earned = 0;
    let possible = 0;
    attendanceDates.forEach(d => {
      possible += d.totalScore;
      if (studentRecords[d.id]) {
        earned += d.totalScore;
      }
    });
    if (possible === 0) return null;
    return ((earned / possible) * 100);
  };

  const calculateFinalGrade = (studentId) => {
    const studentGrades = grades[studentId] || {};
    let totalWeightedScore = 0;
    let totalWeightUsed = 0;

    assessments.forEach(ass => {
      const score = studentGrades[ass.id];
      if (score !== undefined && score !== '') {
        const percentage = (score / ass.totalItems) * 100;
        totalWeightedScore += (percentage * ass.weight) / 100;
        totalWeightUsed += ass.weight;
      }
    });

    // Include attendance in the final grade if weight > 0 and attendance data exists
    if (attendanceWeight > 0 && attendanceDates.length > 0) {
      const attRate = getAttendanceRate(studentId);
      if (attRate !== null) {
        totalWeightedScore += (attRate * attendanceWeight) / 100;
        totalWeightUsed += attendanceWeight;
      }
    }

    if (totalWeightUsed === 0) return '-';
    const final = ((totalWeightedScore / totalWeightUsed) * 100).toFixed(1);
    return final;
  };

  const calculateTotalWeight = () => {
    return assessments.reduce((sum, ass) => sum + ass.weight, 0) + attendanceWeight;
  };

  const handleSaveAttendanceWeight = () => {
    const w = parseFloat(tempAttWeight);
    if (isNaN(w) || w < 0) return;
    setAttendanceWeight(w);
    localStorage.setItem(storageKey('att_weight'), w.toString());
    setShowAttendanceConfig(false);
  };

  // Check if current term is already finalized
  const isTermFinalized = () => {
    const firstStudent = selectedClass.students[0];
    if (!firstStudent) return false;
    return termRecords[firstStudent.id]?.[selectedTerm] !== undefined;
  };

  // Finalize term: record each student's final grade for the current term
  const handleFinalizeTerm = () => {
    const newTermRecords = { ...termRecords };
    selectedClass.students.forEach(student => {
      if (!newTermRecords[student.id]) newTermRecords[student.id] = {};
      const fg = calculateFinalGrade(student.id);
      newTermRecords[student.id][selectedTerm] = fg !== '-' ? parseFloat(fg) : null;
    });
    setTermRecords(newTermRecords);
    localStorage.setItem(`term_records_${selectedClassId}_${academicYear}_${selectedSemester}`, JSON.stringify(newTermRecords));
    setShowFinalizeModal(false);

    // Auto-advance to next term
    const idx = TERMS.indexOf(selectedTerm);
    if (idx < TERMS.length - 1) {
      setSelectedTerm(TERMS[idx + 1]);
    }
  };

  // Check if current term has a pending unlock request
  const hasPendingUnlock = () => {
    return unlockRequests.some(r => 
      r.classId === selectedClassId && 
      r.academicYear === academicYear && 
      r.semester === selectedSemester &&
      r.term === selectedTerm && 
      r.status === 'PENDING'
    );
  };

  // Request to unlock a finalized term
  const handleRequestUnlock = () => {
    if (!unlockReason.trim()) return;
    const newRequest = {
      id: `REQ-${Date.now()}`,
      teacherName: 'Current Teacher', // Hardcoded for now, in real app from auth context
      classId: selectedClassId,
      className: selectedClass.name,
      subject: selectedClass.subject,
      academicYear,
      semester: selectedSemester,
      term: selectedTerm,
      reason: unlockReason,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    
    const updatedRequests = [...unlockRequests, newRequest];
    setUnlockRequests(updatedRequests);
    localStorage.setItem('unlock_requests', JSON.stringify(updatedRequests));
    setShowUnlockModal(false);
    setUnlockReason('');
  };

  // Calculate GPA (average of finalized term grades)
  const calculateGPA = (studentId) => {
    const rec = termRecords[studentId];
    if (!rec) return '-';
    const graded = TERMS.map(t => rec[t]).filter(v => v !== undefined && v !== null);
    if (graded.length === 0) return '-';
    return (graded.reduce((a, b) => a + b, 0) / graded.length).toFixed(1);
  };

  const handleExportCSV = () => {
    if (!selectedClass || selectedClass.students.length === 0) {
      alert("No students to export.");
      return;
    }

    const headers = ['Student ID', 'Student Name'];
    assessments.forEach(ass => {
      headers.push(`${ass.name} (${ass.weight}%)`);
    });
    if (attendanceWeight > 0) {
      headers.push(`Attendance (${attendanceWeight}%)`);
    }
    headers.push('Final Grade');

    let csvContent = headers.join(',') + '\n';

    selectedClass.students.forEach(student => {
      // Use the exact User ID format generated in the Admin Portal (USR-XXXX)
      const formattedId = student.id ? `USR-${student.id.substring(0,4).toUpperCase()}` : 'UNKNOWN';
      
      const row = [
        formattedId,
        `"${student.full_name}"`
      ];

      assessments.forEach(ass => {
        const score = grades[student.id]?.[ass.id];
        const hasScore = score !== undefined && score !== '';
        if (hasScore) {
          const pct = ((score / ass.totalItems) * 100).toFixed(1);
          row.push(`"${score}/${ass.totalItems} (${pct}%)"`);
        } else {
          row.push('-');
        }
      });

      if (attendanceWeight > 0) {
        const rate = getAttendanceRate(student.id);
        if (rate !== null) {
          row.push(`"${rate.toFixed(1)}%"`);
        } else {
          row.push('-');
        }
      }

      const finalScore = calculateFinalGrade(student.id);
      row.push(finalScore !== '-' ? `"${finalScore}%"` : '-');

      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedClass.subject.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedTerm}_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record the export action in the security audit logs
    try {
      fetch('http://localhost:5000/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: 'Current Teacher',
          action: 'EXPORT_GRADES',
          details: `Exported ${selectedTerm} grades for ${selectedClass.subject} as CSV`
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Select Subject</div>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-lg font-medium text-sidebar bg-transparent border-b-2 border-gold focus:outline-none pb-1 pr-6 cursor-pointer"
              >
                {classes.length === 0 && <option value="">No Assigned Classes</option>}
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.subject} ({c.name})</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Academic Year</div>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="text-sm font-medium text-sidebar bg-transparent border-b-2 border-sidebar focus:outline-none pb-1 pr-4 cursor-pointer"
              >
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Semester</div>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="text-sm font-medium text-sidebar bg-transparent border-b-2 border-sidebar focus:outline-none pb-1 pr-4 cursor-pointer"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <button 
              onClick={() => setShowAddModal(true)}
              disabled={isTermFinalized()}
              className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Add Assessment Column
            </button>
            {!isTermFinalized() && assessments.length > 0 && (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
              >
                <Lock size={16} /> Finalize {selectedTerm}
              </button>
            )}
            <button onClick={handleExportCSV} className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-sidebar flex items-center gap-2 hover:bg-gray-50">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Term Tabs */}
        <div className="flex items-center gap-1 bg-bg-light rounded-lg p-1 w-max">
          {TERMS.map(term => {
            const finalized = (() => {
              const first = selectedClass.students[0];
              return first && termRecords[first.id]?.[term] !== undefined;
            })();
            const isPendingUnlock = unlockRequests.some(r => r.classId === selectedClassId && r.academicYear === academicYear && r.semester === selectedSemester && r.term === term && r.status === 'PENDING');

            return (
              <button
                key={term}
                onClick={() => setSelectedTerm(term)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedTerm === term
                    ? 'bg-sidebar text-white shadow-sm'
                    : finalized
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-500 hover:bg-white'
                }`}
              >
                {finalized && !isPendingUnlock && <CheckCircle size={12} />}
                {isPendingUnlock && <Unlock size={12} className="text-orange-500" />}
                {term}
              </button>
            );
          })}
        </div>
        {isTermFinalized() && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg w-max">
              <Lock size={14} />
              <span className="font-semibold">{selectedTerm} grades have been finalized and recorded.</span>
            </div>
            
            {hasPendingUnlock() ? (
              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg w-max">
                <Unlock size={14} />
                <span className="font-semibold">Unlock request pending Dean's approval.</span>
              </div>
            ) : (
              <button
                onClick={() => setShowUnlockModal(true)}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 underline flex items-center gap-1"
              >
                <Unlock size={14} /> Request Unlock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Students</h4>
          <div className="text-4xl font-bold text-gold relative z-10">{selectedClass.students.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <CheckCircle size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Weight</h4>
          <div className={`text-4xl font-bold relative z-10 ${calculateTotalWeight() === 100 ? 'text-green-500' : 'text-red-500'}`}>
            {calculateTotalWeight()}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <AlertTriangle size={80} className="absolute -right-4 -bottom-4 text-red-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">At-Risk Students</h4>
          <div className="text-4xl font-bold text-red-500 relative z-10">
            {selectedClass.students.filter(s => { const g = calculateFinalGrade(s.id); return g !== '-' && parseFloat(g) < 75; }).length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <CheckCircle size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Assessments</h4>
          <div className="text-4xl font-bold text-sidebar relative z-10">{assessments.length}</div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-bg-light p-3 md:p-6 rounded-2xl shadow-inner border border-border overflow-x-auto">
        <div className="min-w-max">
          <table className="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-sidebar text-xs font-semibold text-white tracking-wider">
              <tr>
                <th className="px-6 py-4 sticky left-0 bg-sidebar z-10 min-w-[200px]">Student Name</th>
                {assessments.map(ass => (
                  <th key={ass.id} className="px-4 py-4 text-center group min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <span>{ass.name}</span>
                        <button 
                          onClick={() => handleRemoveAssessment(ass.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-200 transition-opacity"
                          title="Remove Column"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 bg-black/20 px-2 py-0.5 rounded-full">{ass.totalItems} items</span>
                        <span className="text-[10px] text-gold bg-black/20 px-2 py-0.5 rounded-full">{ass.weight}%</span>
                      </div>
                    </div>
                  </th>
                ))}
                {/* Attendance Column */}
                <th className="px-4 py-4 text-center min-w-[130px] bg-sidebar">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <ClipboardCheck size={14} className="text-green-400" />
                      <span>Attendance</span>
                      <button
                        onClick={() => { setTempAttWeight(attendanceWeight.toString()); setShowAttendanceConfig(true); }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Set Attendance Weight"
                      >
                        <Settings size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 bg-black/20 px-2 py-0.5 rounded-full">{attendanceDates.length} sessions</span>
                      <span className="text-[10px] text-green-300 bg-black/20 px-2 py-0.5 rounded-full">{attendanceWeight}%</span>
                    </div>
                  </div>
                </th>
                <th className="px-6 py-4 text-right bg-sidebar font-bold text-gold z-10 min-w-[120px]">Final Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={assessments.length + 3} className="px-6 py-10 text-center text-gray-500 italic">
                    No students found in this section.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const finalScore = calculateFinalGrade(student.id);
                  const isFail = finalScore !== '-' && parseFloat(finalScore) < 75;
                  const isExcellent = finalScore !== '-' && parseFloat(finalScore) >= 90;
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-bg-light border border-border flex items-center justify-center text-xs font-bold text-sidebar">
                            {student.full_name.split(' ').map(n=>n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-sidebar">{student.full_name}</div>
                          </div>
                        </div>
                      </td>
                      {assessments.map(ass => {
                        const score = grades[student.id]?.[ass.id];
                        const hasScore = score !== undefined && score !== '';
                        const pct = hasScore ? ((score / ass.totalItems) * 100).toFixed(0) : null;
                        return (
                          <td key={ass.id} className="px-4 py-3 text-center border-l border-gray-100">
                            <div className="flex flex-col items-center gap-0.5">
                              <input 
                                type="number"
                                min="0"
                                max={ass.totalItems}
                                className="w-16 text-center text-sm p-1 border border-transparent hover:border-gray-300 focus:border-gold focus:ring-1 focus:ring-gold rounded bg-transparent focus:bg-white transition-all"
                                value={hasScore ? score : ''}
                                onChange={(e) => handleGradeChange(student.id, ass.id, e.target.value)}
                                placeholder="-"
                              />
                              {hasScore && (
                                <span className={`text-[10px] font-semibold ${pct >= 75 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                  {pct}%
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {/* Attendance cell */}
                      <td className="px-4 py-3 text-center border-l-2 border-green-100 bg-green-50/30">
                        {(() => {
                          const rate = getAttendanceRate(student.id);
                          if (rate === null) return <span className="text-gray-400 text-sm">—</span>;
                          const rateStr = rate.toFixed(1);
                          return (
                            <span className={`text-sm font-bold ${rate >= 90 ? 'text-green-500' : rate >= 75 ? 'text-sidebar' : 'text-red-500'}`}>
                              {rateStr}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold text-lg border-l-2 border-gray-100 bg-gray-50/50 ${isFail ? 'text-red-500' : isExcellent ? 'text-gold' : 'text-sidebar'}`}>
                        {finalScore}{finalScore !== '-' && '%'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalStudents > STUDENTS_PER_PAGE && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
            <span className="text-gray-500">
              Showing {(currentPage - 1) * STUDENTS_PER_PAGE + 1}–{Math.min(currentPage * STUDENTS_PER_PAGE, totalStudents)} of {totalStudents} students
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                    page === currentPage
                      ? 'bg-sidebar text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Term GPA Summary */}
      {Object.keys(termRecords).length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-sidebar flex items-center gap-2">
                <Calendar size={20} className="text-gold" />
                Term Grade Summary — A.Y. {academicYear}
              </h3>
              <p className="text-xs text-text-muted mt-1">Finalized grades recorded per term. GPA is the average across all completed terms.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="pb-3 pr-3">Student Name</th>
                  {TERMS.map(t => {
                    const finalized = (() => {
                      const first = selectedClass.students[0];
                      return first && termRecords[first.id]?.[t] !== undefined;
                    })();
                    return (
                      <th key={t} className="pb-3 text-center">
                        <span className={finalized ? 'text-green-600' : 'text-gray-400'}>{t}</span>
                      </th>
                    );
                  })}
                  <th className="pb-3 text-right">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {selectedClass.students.slice(0, 10).map(student => {
                  const gpa = calculateGPA(student.id);
                  const gpaNum = gpa !== '-' ? parseFloat(gpa) : null;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-3 font-medium text-sidebar">{student.full_name}</td>
                      {TERMS.map(t => {
                        const val = termRecords[student.id]?.[t];
                        const hasVal = val !== undefined && val !== null;
                        return (
                          <td key={t} className="py-3 text-center">
                            {hasVal ? (
                              <span className={`text-sm font-bold ${val >= 90 ? 'text-gold' : val >= 75 ? 'text-green-500' : 'text-red-500'}`}>
                                {val.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`py-3 text-right font-bold text-lg ${
                        gpaNum === null ? '' : gpaNum >= 90 ? 'text-gold' : gpaNum >= 75 ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {gpa}{gpa !== '-' && '%'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Assessment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-xl text-sidebar mb-4">Add Assessment</h3>
            <form onSubmit={handleAddAssessment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assessment Label</label>
                <input 
                  type="text" 
                  value={newAssessmentName}
                  onChange={(e) => setNewAssessmentName(e.target.value)}
                  placeholder="e.g. Quiz 1, Midterm Exam, Attendance"
                  required
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Items / Max Score</label>
                <input 
                  type="number" 
                  value={newAssessmentTotalItems}
                  onChange={(e) => setNewAssessmentTotalItems(e.target.value)}
                  placeholder="e.g. 50 (for a 50-item quiz)"
                  required
                  min="1"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="text-[10px] text-gray-400 mt-1">The maximum possible score a student can get for this assessment.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Weight Percentage (%)</label>
                <input 
                  type="number" 
                  value={newAssessmentWeight}
                  onChange={(e) => setNewAssessmentWeight(e.target.value)}
                  placeholder="e.g. 20"
                  required
                  min="1"
                  max="100"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="text-[10px] text-gray-400 mt-1">How much this assessment counts toward the final grade. All weights should add up to 100%.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-sidebar text-white rounded-lg text-sm font-bold hover:bg-sidebar-hover transition-colors"
                >
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Weight Config Modal */}
      {showAttendanceConfig && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <ClipboardCheck size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-sidebar">Attendance Weight</h3>
                <p className="text-xs text-gray-500">How much attendance affects the final grade</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Total Sessions</span>
                <span className="font-bold text-sidebar">{attendanceDates.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Weight</span>
                <span className="font-bold text-green-500">{attendanceWeight}%</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Set Weight Percentage (%)</label>
              <input
                type="number"
                value={tempAttWeight}
                onChange={(e) => setTempAttWeight(e.target.value)}
                placeholder="e.g. 10"
                min="0"
                max="100"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">Set to 0 to exclude attendance from final grade calculation.</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAttendanceConfig(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAttendanceWeight}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
              >
                Save Weight
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Term Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Lock size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-sidebar">Finalize {selectedTerm}?</h3>
                <p className="text-xs text-gray-500">A.Y. {academicYear} · {selectedClass.subject}</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800">
              <strong>Warning:</strong> Finalizing this term will lock all current grades for the <strong>{selectedTerm}</strong> period and record them for GPA calculation. This action advances the gradebook to the next term.
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100 text-sm">
              <div className="flex justify-between mb-1"><span className="text-gray-500">Students</span><span className="font-bold text-sidebar">{selectedClass.students.length}</span></div>
              <div className="flex justify-between mb-1"><span className="text-gray-500">Assessments</span><span className="font-bold text-sidebar">{assessments.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Weight</span><span className={`font-bold ${calculateTotalWeight() === 100 ? 'text-green-500' : 'text-red-500'}`}>{calculateTotalWeight()}%</span></div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeTerm}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={14} /> Finalize & Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Request Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Unlock size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-sidebar">Request Unlock</h3>
                <p className="text-xs text-gray-500">A.Y. {academicYear} · {selectedClass.subject} · {selectedTerm}</p>
              </div>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              You are requesting the Dean's approval to unlock a finalized gradebook. Please provide a reason for this request.
            </div>
            <textarea
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px] mb-4 resize-none"
              placeholder="E.g., Missing submission from student, correction needed..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
            ></textarea>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnlockModal(false); setUnlockReason(''); }}
                className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestUnlock}
                disabled={!unlockReason.trim()}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Gradebook;
