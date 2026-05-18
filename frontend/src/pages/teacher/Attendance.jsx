import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Download, ChevronLeft, ChevronRight, ClipboardCheck, ArrowLeft, Calendar } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const STUDENTS_PER_PAGE = 10;

const Attendance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // attendance dates: { id, date, totalScore }
  const [attendanceDates, setAttendanceDates] = useState([]);

  // records: { [studentId]: { [dateId]: boolean (present or not) } }
  const [records, setRecords] = useState({});

  // Add date modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTotalScore, setNewTotalScore] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

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

  // Load attendance data when class changes
  useEffect(() => {
    if (selectedClassId) {
      const savedDates = localStorage.getItem(`attendance_dates_${selectedClassId}`);
      if (savedDates) {
        setAttendanceDates(JSON.parse(savedDates));
      } else {
        setAttendanceDates([]);
      }

      const savedRecords = localStorage.getItem(`attendance_records_${selectedClassId}`);
      if (savedRecords) {
        setRecords(JSON.parse(savedRecords));
      } else {
        setRecords({});
      }
      setCurrentPage(1);
    }
  }, [selectedClassId]);

  // Persist attendance data
  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(`attendance_dates_${selectedClassId}`, JSON.stringify(attendanceDates));
    }
  }, [attendanceDates, selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(`attendance_records_${selectedClassId}`, JSON.stringify(records));
    }
  }, [records, selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId) || { name: 'Unknown', subject: 'No Class Selected', students: [] };

  // Pagination
  const totalStudents = selectedClass.students.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / STUDENTS_PER_PAGE));
  const paginatedStudents = selectedClass.students.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE
  );

  const handleAddDate = (e) => {
    e.preventDefault();
    if (!newDate || !newTotalScore) return;

    setAttendanceDates([...attendanceDates, {
      id: Date.now().toString(),
      date: newDate,
      totalScore: parseFloat(newTotalScore)
    }]);
    setNewDate('');
    setNewTotalScore('');
    setShowAddModal(false);
  };

  const handleRemoveDate = (id) => {
    setAttendanceDates(attendanceDates.filter(d => d.id !== id));
    const newRecords = { ...records };
    Object.keys(newRecords).forEach(studentId => {
      delete newRecords[studentId][id];
    });
    setRecords(newRecords);
  };

  const handleToggleAttendance = (studentId, dateId) => {
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [dateId]: !(prev[studentId]?.[dateId])
      }
    }));
  };

  const calculateTotalScore = (studentId) => {
    const studentRecords = records[studentId] || {};
    let totalEarned = 0;
    let totalPossible = 0;

    attendanceDates.forEach(d => {
      totalPossible += d.totalScore;
      if (studentRecords[d.id]) {
        totalEarned += d.totalScore;
      }
    });

    if (totalPossible === 0) return { earned: 0, possible: 0, percentage: '-' };
    return {
      earned: totalEarned,
      possible: totalPossible,
      percentage: ((totalEarned / totalPossible) * 100).toFixed(1)
    };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const countPresent = (dateId) => {
    return selectedClass.students.filter(s => records[s.id]?.[dateId]).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-border">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors"
            title="Back to My Classes"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Attendance — Select Subject</div>
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
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sidebar-hover transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Attendance Date
          </button>
          <button className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-sidebar flex items-center gap-2 hover:bg-gray-50">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <ClipboardCheck size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Students</h4>
          <div className="text-4xl font-bold text-gold relative z-10">{totalStudents}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <Calendar size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Sessions</h4>
          <div className="text-4xl font-bold text-sidebar relative z-10">{attendanceDates.length}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <ClipboardCheck size={80} className="absolute -right-4 -bottom-4 text-green-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Max Possible Score</h4>
          <div className="text-4xl font-bold text-green-500 relative z-10">
            {attendanceDates.reduce((sum, d) => sum + d.totalScore, 0)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <ClipboardCheck size={80} className="absolute -right-4 -bottom-4 text-red-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Low Attendance</h4>
          <div className="text-4xl font-bold text-red-500 relative z-10">
            {selectedClass.students.filter(s => {
              const r = calculateTotalScore(s.id);
              return r.percentage !== '-' && parseFloat(r.percentage) < 75;
            }).length}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-bg-light p-3 md:p-6 rounded-2xl shadow-inner border border-border overflow-x-auto">
        <div className="min-w-max">
          <table className="w-full text-left bg-white rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-sidebar text-xs font-semibold text-white tracking-wider">
              <tr>
                <th className="px-6 py-4 sticky left-0 bg-sidebar z-10 min-w-[200px]">Student Name</th>
                {attendanceDates.map(d => (
                  <th key={d.id} className="px-3 py-4 text-center group min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span>{formatDate(d.date)}</span>
                        <button
                          onClick={() => handleRemoveDate(d.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-200 transition-opacity"
                          title="Remove Date"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gold bg-black/20 px-2 py-0.5 rounded-full">{d.totalScore} pts</span>
                      </div>
                      <span className="text-[9px] text-gray-400">{countPresent(d.id)}/{totalStudents} present</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-4 text-center bg-sidebar font-bold z-10 min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-gold">Total Score</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-right bg-sidebar font-bold text-gold z-10 min-w-[80px]">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={attendanceDates.length + 3} className="px-6 py-10 text-center text-gray-500 italic">
                    No students found in this section.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const totals = calculateTotalScore(student.id);
                  const pctNum = totals.percentage !== '-' ? parseFloat(totals.percentage) : null;
                  const isPoor = pctNum !== null && pctNum < 75;
                  const isGood = pctNum !== null && pctNum >= 90;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-bg-light border border-border flex items-center justify-center text-xs font-bold text-sidebar">
                            {student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="font-medium text-sidebar">{student.full_name}</div>
                        </div>
                      </td>
                      {attendanceDates.map(d => {
                        const isPresent = records[student.id]?.[d.id] || false;
                        return (
                          <td key={d.id} className="px-3 py-3 text-center border-l border-gray-100">
                            <label className="flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={() => handleToggleAttendance(student.id, d.id)}
                                className="sr-only peer"
                              />
                              <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isPresent
                                  ? 'bg-green-500 border-green-500 text-white shadow-sm'
                                  : 'border-gray-300 bg-white hover:border-gray-400 text-transparent'
                              }`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </label>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold text-sidebar border-l-2 border-gray-100 bg-gray-50/50">
                        {totals.earned} / {totals.possible}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-lg border-l border-gray-100 bg-gray-50/50 ${
                        isPoor ? 'text-red-500' : isGood ? 'text-green-500' : 'text-sidebar'
                      }`}>
                        {totals.percentage}{totals.percentage !== '-' && '%'}
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

      {/* Add Date Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-xl text-sidebar mb-4">Add Attendance Date</h3>
            <form onSubmit={handleAddDate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Score Per Attendance</label>
                <input
                  type="number"
                  value={newTotalScore}
                  onChange={(e) => setNewTotalScore(e.target.value)}
                  placeholder="e.g. 5"
                  required
                  min="1"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                />
                <p className="text-[10px] text-gray-400 mt-1">Points awarded to a student if they are present on this date.</p>
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
                  Add Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
