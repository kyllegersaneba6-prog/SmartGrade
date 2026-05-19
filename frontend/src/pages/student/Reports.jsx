import React, { useState, useEffect } from 'react';
import { Eye, FileText, Download, X, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const getGpa = (score) => {
  if (score >= 95) return { gpa: '4.00', label: 'Excellent' };
  if (score >= 90) return { gpa: '3.75', label: 'Very Good' };
  if (score >= 85) return { gpa: '3.50', label: 'Good' };
  if (score >= 80) return { gpa: '3.00', label: 'Satisfactory' };
  if (score >= 75) return { gpa: '2.50', label: 'Fair' };
  return { gpa: '1.50', label: 'Failing' };
};

const getCategoryStyles = (category) => {
  const cat = category?.toUpperCase() || 'QUIZZES';
  if (cat.includes('EXAM')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (cat.includes('PROJECT')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (cat.includes('QUIZ')) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const ALL_TERMS = ['Prelim', 'Midterm', 'Pre-Finals', 'Finals'];

/**
 * Scan localStorage for all term_records_* keys and discover which
 * academic years, semesters and terms actually have finalized data.
 * Key format written by teacher: term_records_{classId}_{year}_{semester}
 * Value: { [studentId]: { [term]: grade } }
 */
const discoverAvailableFilters = () => {
  const map = {}; // { year: { semester: Set<term> } }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('term_records_')) continue;

    // term_records_{classId}_{year}_{semester}
    // Split carefully — semester value contains a space e.g. "1st Semester"
    const withoutPrefix = key.substring('term_records_'.length); // classId_year_semester
    const parts = withoutPrefix.split('_');
    if (parts.length < 3) continue;

    const classId = parts[0];
    const year = parts[1];
    const semester = parts.slice(2).join('_'); // rejoin in case semester has underscores... but it shouldn't

    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const records = JSON.parse(raw);
    const studentIds = Object.keys(records);
    if (studentIds.length === 0) continue;

    // Check which terms have finalized grades
    const firstRec = records[studentIds[0]];
    const finalizedTerms = ALL_TERMS.filter(t => firstRec[t] !== undefined && firstRec[t] !== null);
    if (finalizedTerms.length === 0) continue;

    if (!map[year]) map[year] = {};
    if (!map[year][semester]) map[year][semester] = new Set();
    finalizedTerms.forEach(t => map[year][semester].add(t));
  }

  // Convert sets to arrays sorted by ALL_TERMS order
  const result = {};
  Object.keys(map).sort().reverse().forEach(year => {
    result[year] = {};
    Object.keys(map[year]).sort().forEach(sem => {
      result[year][sem] = ALL_TERMS.filter(t => map[year][sem].has(t));
    });
  });
  return result;
};

const Reports = () => {
  const [availableFilters, setAvailableFilters] = useState({});
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const [reportsList, setReportsList] = useState([]);
  const [averageTermGrade, setAverageTermGrade] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // On mount, discover what data exists
  useEffect(() => {
    const filters = discoverAvailableFilters();
    setAvailableFilters(filters);

    const years = Object.keys(filters);
    if (years.length > 0) {
      const firstYear = years[0];
      setSelectedYear(firstYear);
      const semesters = Object.keys(filters[firstYear]);
      if (semesters.length > 0) {
        const firstSem = semesters[0];
        setSelectedSemester(firstSem);
        const terms = filters[firstYear][firstSem];
        if (terms.length > 0) setSelectedTerm(terms[0]);
      }
    }
  }, []);

  // When year changes, auto-select first available semester & term
  useEffect(() => {
    if (!selectedYear || !availableFilters[selectedYear]) return;
    const semesters = Object.keys(availableFilters[selectedYear]);
    if (semesters.length > 0 && !semesters.includes(selectedSemester)) {
      setSelectedSemester(semesters[0]);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedYear || !selectedSemester || !availableFilters[selectedYear]?.[selectedSemester]) return;
    const terms = availableFilters[selectedYear][selectedSemester];
    if (terms.length > 0 && !terms.includes(selectedTerm)) {
      setSelectedTerm(terms[0]);
    }
  }, [selectedSemester, selectedYear]);

  // Load reports when filters change
  useEffect(() => {
    if (!selectedYear || !selectedSemester || !selectedTerm) return;
    loadReports();
  }, [selectedYear, selectedSemester, selectedTerm]);

  const loadReports = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentId = user.id;

    let fetchedUsers = [];
    try {
      const res = await fetch('http://localhost:5000/api/users');
      if (res.ok) fetchedUsers = await res.json();
    } catch (e) {}

    const savedSections = JSON.parse(localStorage.getItem('student_sections') || '[]');
    const activeSections = savedSections.filter(s => s.subject && s.subject.trim() !== '');
    const parsedList = [];

    activeSections.forEach(section => {
      const isEnrolled = section.students?.some(s =>
        s.id === studentId || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
      );
      if (!isEnrolled) return;

      const matchStudent = section.students.find(s =>
        s.id === studentId || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
      );
      const resolvedStudentId = matchStudent ? matchStudent.id : studentId;

      const teacher = fetchedUsers.find(u => u.id === section.teacherId) || { full_name: 'Assigned Teacher' };

      // Read semester-scoped term records
      const termKey = `term_records_${section.id}_${selectedYear}_${selectedSemester}`;
      const raw = localStorage.getItem(termKey);
      let finalGrade = null;
      let status = 'PENDING';

      if (raw) {
        const data = JSON.parse(raw);
        const sg = data[resolvedStudentId];
        if (sg && sg[selectedTerm] !== undefined && sg[selectedTerm] !== null) {
          finalGrade = sg[selectedTerm];
          status = 'FINALIZED';
        }
      }

      // Only show subjects that have finalized data for this term
      if (status !== 'FINALIZED') return;

      // Load assessments breakdown
      const assessments = [];
      const assessmentsRaw = localStorage.getItem(`assessments_${section.id}_${selectedYear}_${selectedSemester}_${selectedTerm}`);
      const gradesRaw = localStorage.getItem(`grades_${section.id}_${selectedYear}_${selectedSemester}_${selectedTerm}`);

      if (assessmentsRaw && gradesRaw) {
        const list = JSON.parse(assessmentsRaw);
        const grades = JSON.parse(gradesRaw);
        const sGrades = grades[resolvedStudentId] || {};
        const allStudentIds = Object.keys(grades);

        list.forEach(ass => {
          const rawScore = sGrades[ass.id];
          if (rawScore !== undefined && rawScore !== null && rawScore !== '') {
            // Calculate real class average
            let classTotal = 0, classCount = 0;
            allStudentIds.forEach(sid => {
              const sv = grades[sid]?.[ass.id];
              if (sv !== undefined && sv !== null && sv !== '') {
                classTotal += (Number(sv) / ass.totalItems) * 100;
                classCount++;
              }
            });
            assessments.push({
              name: ass.title || ass.name,
              category: ass.category || 'QUIZZES',
              weight: ass.weight,
              score: Math.round((Number(rawScore) / ass.totalItems) * 100),
              classAvg: classCount > 0 ? Math.round(classTotal / classCount) : 0
            });
          }
        });
      }

      parsedList.push({
        subject: section.subject,
        section: section.name,
        instructor: teacher.full_name,
        average: finalGrade,
        status,
        assessments
      });
    });

    setReportsList(parsedList);

    const finalizedGrades = parsedList.filter(r => r.average !== null);
    if (finalizedGrades.length > 0) {
      const sum = finalizedGrades.reduce((acc, curr) => acc + curr.average, 0);
      setAverageTermGrade(Math.round(sum / finalizedGrades.length));
    } else {
      setAverageTermGrade(0);
    }
  };

  const handleOpenBreakdown = (report) => { setSelectedReport(report); setShowModal(true); };
  const currentGpaInfo = averageTermGrade > 0 ? getGpa(averageTermGrade) : { gpa: '0.00', label: 'No Grades' };
  const interventions = reportsList.filter(r => r.average !== null && r.average < 75);

  const yearOptions = Object.keys(availableFilters);
  const semesterOptions = selectedYear && availableFilters[selectedYear] ? Object.keys(availableFilters[selectedYear]) : [];
  const termOptions = selectedYear && selectedSemester && availableFilters[selectedYear]?.[selectedSemester] ? availableFilters[selectedYear][selectedSemester] : [];
  const hasData = yearOptions.length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-sidebar uppercase tracking-wide">
          Academic Performance Reports
        </h1>
        <p className="text-text-muted mt-1">
          View finalized report cards posted by your teachers upon completion of each academic term.
        </p>
      </div>

      {!hasData ? (
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-border text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-sidebar mb-2">No Finalized Reports Available</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Your teachers have not yet finalized and submitted any term grades. Reports will appear here automatically once grades are posted.
          </p>
        </div>
      ) : (
        <>
          {/* Filter Selection Panel */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-gold" /> Filter Performance Records
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Academic Year</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none">
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none">
                  {semesterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Academic Term</label>
                <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none">
                  {termOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center bg-white">
                  <h3 className="text-gold font-bold text-lg">Report Cards ({selectedTerm} - {selectedSemester})</h3>
                  <span className="text-xs text-text-muted font-bold">{reportsList.length} Class Record{reportsList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="table-responsive w-full overflow-x-auto">
                  <table className="w-full text-left min-w-[650px]">
                    <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Course Subject</th>
                        <th className="px-6 py-4">Section Name</th>
                        <th className="px-6 py-4">Instructor</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Term Average</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {reportsList.length > 0 ? reportsList.map((r, i) => (
                        <tr key={i} className="hover:bg-bg-light/40 transition-colors">
                          <td className="px-6 py-4 font-bold text-sidebar">
                            <div className="flex items-center gap-2.5"><FileText size={18} className="text-gold" />{r.subject}</div>
                          </td>
                          <td className="px-6 py-4 text-text-muted">{r.section}</td>
                          <td className="px-6 py-4 text-sidebar font-medium">{r.instructor}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider bg-green-50 border-green-200 text-green-700">FINALIZED</span>
                          </td>
                          <td className="px-6 py-4"><span className="font-bold text-sidebar text-base">{r.average}%</span></td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleOpenBreakdown(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors border-gold text-gold hover:bg-gold-light">
                              <Eye size={14} /> VIEW BREAKDOWN
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="6" className="text-center py-10 text-sm text-text-muted italic">No finalized report records for this selection.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-[320px] space-y-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Semester Standing</span>
                  <TrendingUp size={16} className="text-gold" />
                </div>
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="h-36 w-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ value: averageTermGrade || 1 }, { value: 100 - (averageTermGrade || 1) }]}
                            cx="50%" cy="50%" innerRadius={45} outerRadius={60} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                            <Cell fill={averageTermGrade > 0 ? '#eab308' : '#f3f4f6'} />
                            <Cell fill="#f3f4f6" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-sidebar">{averageTermGrade > 0 ? currentGpaInfo.gpa : '—'}</span>
                      <span className="text-[9px] font-bold text-gold tracking-widest uppercase mt-0.5">{currentGpaInfo.label}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-2 border-t pt-4">
                  <p className="text-xs text-text-muted">{averageTermGrade > 0 ? `Computed overall term average score is ${averageTermGrade}%.` : 'Term average is not computed yet.'}</p>
                  {averageTermGrade >= 90 && (
                    <span className="inline-block bg-yellow-50 text-gold text-[10px] font-bold px-2 py-0.5 border border-yellow-200 rounded-full uppercase tracking-wider">Dean's Lister Cohort</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
                <h3 className="text-xs font-bold text-sidebar uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-gold" /> Active Review Flags
                </h3>
                <div className="space-y-3">
                  {interventions.length > 0 ? interventions.map((r, idx) => (
                    <div key={idx} className="border border-red-200 bg-red-50/50 p-4 rounded-xl">
                      <h4 className="font-bold text-sidebar text-xs mb-1">{r.subject}</h4>
                      <p className="text-[11px] text-text-muted leading-relaxed">Finalized average grade ({r.average}%) is below academic proficiency standard.</p>
                      <button className="mt-2.5 w-full border border-red-300 text-red-600 font-bold py-1.5 rounded-lg bg-white hover:bg-red-50 transition-colors text-[10px] uppercase tracking-wider">Request Consultation</button>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-xs text-text-muted italic border border-dashed border-border rounded-xl">No academic warnings listed for this term period.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Modal */}
          {showModal && selectedReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
                <div className="bg-sidebar p-5 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-gold uppercase tracking-wider">Term Grade Breakdown Card</span>
                    <h3 className="text-xl font-bold mt-0.5">{selectedReport.subject}</h3>
                    <p className="text-xs text-gray-300 mt-0.5">Instructor: {selectedReport.instructor} • {selectedTerm} {selectedYear}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">
                  <h4 className="text-sm font-bold text-sidebar uppercase tracking-wider mb-3">Graded Contributions</h4>
                  <div className="border rounded-xl overflow-hidden mb-6">
                    <table className="w-full text-left">
                      <thead className="bg-bg-light text-[9px] font-bold text-text-muted uppercase tracking-wider border-b">
                        <tr><th className="px-4 py-3">Task Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Score %</th><th className="px-4 py-3">Class Avg</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border text-xs">
                        {selectedReport.assessments?.length > 0 ? selectedReport.assessments.map((ass, idx) => (
                          <tr key={idx} className="hover:bg-bg-light/40">
                            <td className="px-4 py-3 font-semibold text-sidebar">{ass.name}</td>
                            <td className="px-4 py-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryStyles(ass.category)}`}>{ass.category}</span></td>
                            <td className="px-4 py-3 text-text-muted">{ass.weight}%</td>
                            <td className="px-4 py-3 font-bold text-sidebar">{ass.score}%</td>
                            <td className="px-4 py-3 text-text-muted">{ass.classAvg}%</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="5" className="text-center py-6 text-xs text-text-muted italic">No itemized task breakdowns have been posted for this term report.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gold-light border border-gold/30 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Overall Term Performance</span>
                      <div className="text-base font-bold text-sidebar mt-0.5">{selectedReport.subject} Summary</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">Term Final Average</span>
                      <span className="text-3xl font-extrabold text-gold">{selectedReport.average}%</span>
                    </div>
                  </div>
                </div>
                <div className="bg-bg-light px-6 py-4 flex justify-end gap-3 border-t">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 border-2 border-gold text-gold font-bold rounded-lg text-xs hover:bg-gold-light transition-colors uppercase tracking-wider">Close</button>
                  <button className="px-4 py-2 bg-sidebar hover:bg-sidebar-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors uppercase tracking-wider"><Download size={14} /> Export Report Card</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
