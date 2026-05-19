import React, { useState, useEffect } from 'react';
import { Eye, FileText, Download, X, Calendar, User, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/* Helper to convert percentage score to GPA scale */
const getGpa = (score) => {
  if (score >= 95) return { gpa: '4.00', label: 'Excellent' };
  if (score >= 90) return { gpa: '3.75', label: 'Very Good' };
  if (score >= 85) return { gpa: '3.50', label: 'Good' };
  if (score >= 80) return { gpa: '3.00', label: 'Satisfactory' };
  if (score >= 75) return { gpa: '2.50', label: 'Fair' };
  return { gpa: '1.50', label: 'Failing' };
};

/* Helper for grade badge styles */
const getCategoryStyles = (category) => {
  const cat = category?.toUpperCase() || 'QUIZZES';
  if (cat.includes('EXAM')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (cat.includes('PROJECT')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (cat.includes('QUIZ')) return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

/* Mock Datasets for all Years / Semesters / Terms fallbacks */
const mockReportsData = {
  '2023-24': {
    '2nd Semester': {
      'Prelim': [
        { subject: 'Mathematics', section: 'Section A-1', instructor: 'Dr. Robert Miller', average: 92, status: 'FINALIZED',
          assessments: [
            { name: 'Prelim Written Exam', category: 'EXAMS', weight: 40, score: 90, classAvg: 76 },
            { name: 'Advanced Calculus Assignment', category: 'HOMEWORK', weight: 20, score: 95, classAvg: 85 },
            { name: 'Derivatives Quiz 1', category: 'QUIZZES', weight: 20, score: 92, classAvg: 72 },
            { name: 'Class Participation', category: 'HOMEWORK', weight: 20, score: 95, classAvg: 88 }
          ]
        },
        { subject: 'English', section: 'Section B-4', instructor: 'Prof. Sarah Jenkins', average: 74, status: 'FINALIZED',
          assessments: [
            { name: 'Literature Review Paper', category: 'PROJECTS', weight: 50, score: 72, classAvg: 78 },
            { name: 'Syntax Homework 1', category: 'HOMEWORK', weight: 25, score: 76, classAvg: 80 },
            { name: 'Vocabulary Quiz', category: 'QUIZZES', weight: 25, score: 76, classAvg: 74 }
          ]
        },
        { subject: 'Filipino', section: 'Section C-2', instructor: 'Ms. Maria Santos', average: 88, status: 'FINALIZED',
          assessments: [
            { name: 'Pagsusuri ng Tula', category: 'PROJECTS', weight: 40, score: 86, classAvg: 82 },
            { name: 'Talakayan sa Klase', category: 'HOMEWORK', weight: 30, score: 92, classAvg: 88 },
            { name: 'Pagsusulit sa Balarila', category: 'QUIZZES', weight: 30, score: 87, classAvg: 79 }
          ]
        },
        { subject: 'Science', section: 'Section D-1', instructor: 'Dr. Alan Turing', average: 90, status: 'FINALIZED',
          assessments: [
            { name: 'Organic Syntheses Lab', category: 'PROJECTS', weight: 50, score: 88, classAvg: 81 },
            { name: 'Atomic Structures Quiz', category: 'QUIZZES', weight: 30, score: 92, classAvg: 76 },
            { name: 'Lab Safety Report', category: 'HOMEWORK', weight: 20, score: 94, classAvg: 88 }
          ]
        },
        { subject: 'History', section: 'Section E-3', instructor: 'Prof. David Graham', average: 62, status: 'FINALIZED',
          assessments: [
            { name: 'World War I Essay', category: 'PROJECTS', weight: 50, score: 58, classAvg: 72 },
            { name: 'Chronology Quiz', category: 'QUIZZES', weight: 30, score: 65, classAvg: 74 },
            { name: 'Reading Responses', category: 'HOMEWORK', weight: 20, score: 68, classAvg: 80 }
          ]
        },
        { subject: 'Comp Sci', section: 'Section F-1', instructor: 'Dr. Kevin Zhang', average: 96, status: 'FINALIZED',
          assessments: [
            { name: 'Sorting Algorithm Implementation', category: 'PROJECTS', weight: 50, score: 98, classAvg: 82 },
            { name: 'Complexities Quiz 1', category: 'QUIZZES', weight: 30, score: 92, classAvg: 78 },
            { name: 'Stack & Queue Lab', category: 'HOMEWORK', weight: 20, score: 98, classAvg: 88 }
          ]
        }
      ],
      'Midterm': [
        { subject: 'Mathematics', section: 'Section A-1', instructor: 'Dr. Robert Miller', average: 95, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Calculus Exam', category: 'EXAMS', weight: 50, score: 96, classAvg: 78 },
            { name: 'Limit Computations', category: 'QUIZZES', weight: 25, score: 92, classAvg: 74 },
            { name: 'Calculus Lab 2', category: 'HOMEWORK', weight: 25, score: 96, classAvg: 84 }
          ]
        },
        { subject: 'English', section: 'Section B-4', instructor: 'Prof. Sarah Jenkins', average: 78, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Research Essay', category: 'PROJECTS', weight: 50, score: 80, classAvg: 79 },
            { name: 'Grammar and Syntax Test', category: 'EXAMS', weight: 30, score: 72, classAvg: 75 },
            { name: 'Weekly Reading Responses', category: 'HOMEWORK', weight: 20, score: 82, classAvg: 84 }
          ]
        },
        { subject: 'Filipino', section: 'Section C-2', instructor: 'Ms. Maria Santos', average: 91, status: 'FINALIZED',
          assessments: [
            { name: 'Gitnang Pagsusulit (Midterm)', category: 'EXAMS', weight: 40, score: 90, classAvg: 83 },
            { name: 'Sanaysay tungkol sa Panitikan', category: 'PROJECTS', weight: 40, score: 92, classAvg: 86 },
            { name: 'Maikling Pagsusulit 2', category: 'QUIZZES', weight: 20, score: 91, classAvg: 80 }
          ]
        },
        { subject: 'Science', section: 'Section D-1', instructor: 'Dr. Alan Turing', average: 92, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Exam: Chemistry', category: 'EXAMS', weight: 40, score: 90, classAvg: 79 },
            { name: 'Molecular Modelling Project', category: 'PROJECTS', weight: 40, score: 94, classAvg: 83 },
            { name: 'Nomenclature Exercise', category: 'QUIZZES', weight: 20, score: 92, classAvg: 80 }
          ]
        },
        { subject: 'History', section: 'Section E-3', instructor: 'Prof. David Graham', average: 67, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm History Exam', category: 'EXAMS', weight: 40, score: 64, classAvg: 75 },
            { name: 'Civilizations Project', category: 'PROJECTS', weight: 40, score: 68, classAvg: 78 },
            { name: 'Map Exercise', category: 'HOMEWORK', weight: 20, score: 72, classAvg: 82 }
          ]
        },
        { subject: 'Comp Sci', section: 'Section F-1', instructor: 'Dr. Kevin Zhang', average: 98, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Practical Coding Exam', category: 'EXAMS', weight: 45, score: 98, classAvg: 80 },
            { name: 'Tree Structures Assignment', category: 'PROJECTS', weight: 35, score: 97, classAvg: 84 },
            { name: 'Recursion Quiz', category: 'QUIZZES', weight: 20, score: 100, classAvg: 82 }
          ]
        }
      ],
      'Pre-Finals': [
        { subject: 'Mathematics', section: 'Section A-1', instructor: 'Dr. Robert Miller', average: null, status: 'PENDING' },
        { subject: 'English', section: 'Section B-4', instructor: 'Prof. Sarah Jenkins', average: null, status: 'PENDING' },
        { subject: 'Filipino', section: 'Section C-2', instructor: 'Ms. Maria Santos', average: null, status: 'PENDING' },
        { subject: 'Science', section: 'Section D-1', instructor: 'Dr. Alan Turing', average: null, status: 'PENDING' },
        { subject: 'History', section: 'Section E-3', instructor: 'Prof. David Graham', average: null, status: 'PENDING' },
        { subject: 'Comp Sci', section: 'Section F-1', instructor: 'Dr. Kevin Zhang', average: null, status: 'PENDING' }
      ],
      'Finals': [
        { subject: 'Mathematics', section: 'Section A-1', instructor: 'Dr. Robert Miller', average: null, status: 'PENDING' },
        { subject: 'English', section: 'Section B-4', instructor: 'Prof. Sarah Jenkins', average: null, status: 'PENDING' },
        { subject: 'Filipino', section: 'Section C-2', instructor: 'Ms. Maria Santos', average: null, status: 'PENDING' },
        { subject: 'Science', section: 'Section D-1', instructor: 'Dr. Alan Turing', average: null, status: 'PENDING' },
        { subject: 'History', section: 'Section E-3', instructor: 'Prof. David Graham', average: null, status: 'PENDING' },
        { subject: 'Comp Sci', section: 'Section F-1', instructor: 'Dr. Kevin Zhang', average: null, status: 'PENDING' }
      ]
    },
    '1st Semester': {
      'Prelim': [
        { subject: 'Introduction to IT', section: 'Section IT-1', instructor: 'Dr. John Watson', average: 88, status: 'FINALIZED',
          assessments: [
            { name: 'Hardware Concepts Quiz', category: 'QUIZZES', weight: 50, score: 86, classAvg: 80 },
            { name: 'OS Architecture Paper', category: 'PROJECTS', weight: 50, score: 90, classAvg: 82 }
          ]
        },
        { subject: 'College Algebra', section: 'Section MA-2', instructor: 'Dr. Robert Miller', average: 91, status: 'FINALIZED',
          assessments: [
            { name: 'Linear Equations Exam', category: 'EXAMS', weight: 60, score: 90, classAvg: 76 },
            { name: 'Problem Set 1', category: 'HOMEWORK', weight: 40, score: 92, classAvg: 84 }
          ]
        }
      ],
      'Midterm': [
        { subject: 'Introduction to IT', section: 'Section IT-1', instructor: 'Dr. John Watson', average: 90, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Networking Exam', category: 'EXAMS', weight: 50, score: 88, classAvg: 79 },
            { name: 'Local Network Configuration', category: 'PROJECTS', weight: 50, score: 92, classAvg: 84 }
          ]
        },
        { subject: 'College Algebra', section: 'Section MA-2', instructor: 'Dr. Robert Miller', average: 93, status: 'FINALIZED',
          assessments: [
            { name: 'Midterm Equations Exam', category: 'EXAMS', weight: 60, score: 92, classAvg: 77 },
            { name: 'Quadratic Homework Tasks', category: 'HOMEWORK', weight: 40, score: 95, classAvg: 85 }
          ]
        }
      ],
      'Pre-Finals': [
        { subject: 'Introduction to IT', section: 'Section IT-1', instructor: 'Dr. John Watson', average: 91, status: 'FINALIZED',
          assessments: [
            { name: 'Pre-Final Database Exam', category: 'EXAMS', weight: 50, score: 90, classAvg: 82 },
            { name: 'SQL Query Assignments', category: 'HOMEWORK', weight: 50, score: 92, classAvg: 85 }
          ]
        },
        { subject: 'College Algebra', section: 'Section MA-2', instructor: 'Dr. Robert Miller', average: 92, status: 'FINALIZED',
          assessments: [
            { name: 'Pre-Final Matrices Exam', category: 'EXAMS', weight: 60, score: 90, classAvg: 79 },
            { name: 'Matrix Transformations', category: 'HOMEWORK', weight: 40, score: 95, classAvg: 86 }
          ]
        }
      ],
      'Finals': [
        { subject: 'Introduction to IT', section: 'Section IT-1', instructor: 'Dr. John Watson', average: 92, status: 'FINALIZED',
          assessments: [
            { name: 'Comprehensive Final Exam', category: 'EXAMS', weight: 50, score: 92, classAvg: 80 },
            { name: 'IT Infrastructure Design', category: 'PROJECTS', weight: 50, score: 92, classAvg: 85 }
          ]
        },
        { subject: 'College Algebra', section: 'Section MA-2', instructor: 'Dr. Robert Miller', average: 94, status: 'FINALIZED',
          assessments: [
            { name: 'Comprehensive Algebra Finals', category: 'EXAMS', weight: 60, score: 93, classAvg: 79 },
            { name: 'System of Equations Project', category: 'PROJECTS', weight: 40, score: 95, classAvg: 87 }
          ]
        }
      ]
    }
  }
};

const Reports = () => {
  // Filter States
  const [selectedYear, setSelectedYear] = useState('2025-26');
  const [selectedSemester, setSelectedSemester] = useState('2nd Semester');
  const [selectedTerm, setSelectedTerm] = useState('Prelim');

  // Reports list and current statistics
  const [reportsList, setReportsList] = useState([]);
  const [averageTermGrade, setAverageTermGrade] = useState(0);
  
  // Modal State for breakdown
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Load reports based on filters
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

      if (isEnrolled) {
        const matchStudent = section.students.find(s => 
          s.id === studentId || s.full_name?.toLowerCase() === user.full_name?.toLowerCase()
        );
        const resolvedStudentId = matchStudent ? matchStudent.id : studentId;

        const teacher = fetchedUsers.find(u => u.id === section.teacherId) || {
          full_name: 'Assigned Teacher'
        };

        // Try to load term records key: term_records_${section.id}_${selectedYear}
        const termKey = `term_records_${section.id}_${selectedYear}`;
        const raw = localStorage.getItem(termKey);
        let finalGrade = null;
        let status = 'PENDING';

        if (raw) {
          const data = JSON.parse(raw);
          const studentGrades = data[resolvedStudentId];
          if (studentGrades && studentGrades[selectedTerm] !== undefined && studentGrades[selectedTerm] !== null) {
            finalGrade = studentGrades[selectedTerm];
            status = 'FINALIZED';
          }
        }

        // Get assessments lists to compile the breakdown
        const assessments = [];
        const studentGrades = {};
        
        // Scan for assessments in local storage matching this year/term
        const assessmentsRaw = localStorage.getItem(`assessments_${section.id}_${selectedYear}_${selectedTerm}`);
        const gradesRaw = localStorage.getItem(`grades_${section.id}_${selectedYear}_${selectedTerm}`);

        if (assessmentsRaw && gradesRaw) {
          const list = JSON.parse(assessmentsRaw);
          const grades = JSON.parse(gradesRaw);
          const sGrades = grades[resolvedStudentId] || {};

          list.forEach(ass => {
            const rawScore = sGrades[ass.id];
            if (rawScore !== undefined && rawScore !== null && rawScore !== '') {
              assessments.push({
                name: ass.title || ass.name,
                category: ass.category || 'QUIZZES',
                weight: ass.weight,
                score: Math.round((Number(rawScore) / ass.totalItems) * 100),
                classAvg: 82 // default average fallback
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
      }
    });

    // If live records exist, use them. Otherwise, fall back to historical mock data.
    let finalReports = [];
    
    if (parsedList.length > 0) {
      finalReports = parsedList;
    } else {
      // Mock Fallback
      const yearSet = mockReportsData[selectedYear] || mockReportsData['2023-24'];
      const semSet = yearSet[selectedSemester] || yearSet['2nd Semester'];
      finalReports = semSet[selectedTerm] || [];
    }

    setReportsList(finalReports);

    // Compute Term average GPA
    const finalizedGrades = finalReports.filter(r => r.status === 'FINALIZED' && r.average !== null);
    if (finalizedGrades.length > 0) {
      const sum = finalizedGrades.reduce((acc, curr) => acc + curr.average, 0);
      setAverageTermGrade(Math.round(sum / finalizedGrades.length));
    } else {
      setAverageTermGrade(0);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedYear, selectedSemester, selectedTerm]);

  const handleOpenBreakdown = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const currentGpaInfo = averageTermGrade > 0 ? getGpa(averageTermGrade) : { gpa: '0.00', label: 'No Grades' };

  // Calculate dynamic interventions for this term
  const interventions = reportsList.filter(r => r.status === 'FINALIZED' && r.average !== null && r.average < 75);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-sidebar uppercase tracking-wide">
          Academic Performance Reports
        </h1>
        <p className="text-text-muted mt-1">
          Explore finalized report card releases posted by teachers upon the conclusion of each academic term.
        </p>
      </div>

      {/* Filter Selection Panel */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
          <Calendar size={14} className="text-gold" /> Filter Performance Records
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Academic Year Selection */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Academic Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none"
            >
              <option value="2025-26">2025-2026</option>
              <option value="2024-25">2024-2025</option>
              <option value="2023-24">2023-2024</option>
            </select>
          </div>

          {/* Semester Selection */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none"
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>

          {/* Term Selection */}
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Academic Term
            </label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 bg-bg-light border border-border rounded-lg text-sm text-sidebar font-medium focus:ring-2 focus:ring-gold focus:border-gold outline-none"
            >
              <option value="Prelim">Prelim</option>
              <option value="Midterm">Midterm</option>
              <option value="Pre-Finals">Pre-Finals</option>
              <option value="Finals">Finals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Reports List */}
        <div className="flex-1 w-full space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center bg-white">
              <h3 className="text-gold font-bold text-lg">
                Report Cards ({selectedTerm} - {selectedSemester})
              </h3>
              <span className="text-xs text-text-muted font-bold">
                {reportsList.length} Class Record{reportsList.length !== 1 ? 's' : ''}
              </span>
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
                  {reportsList.length > 0 ? (
                    reportsList.map((r, i) => (
                      <tr key={i} className="hover:bg-bg-light/40 transition-colors">
                        <td className="px-6 py-4 font-bold text-sidebar">
                          <div className="flex items-center gap-2.5">
                            <FileText size={18} className="text-gold" />
                            {r.subject}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-text-muted">{r.section}</td>
                        <td className="px-6 py-4 text-sidebar font-medium">{r.instructor}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            r.status === 'FINALIZED'
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {r.average !== null ? (
                            <span className="font-bold text-sidebar text-base">{r.average}%</span>
                          ) : (
                            <span className="text-text-muted italic text-xs">Pending Submission</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenBreakdown(r)}
                            disabled={r.status !== 'FINALIZED'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                              r.status === 'FINALIZED'
                                ? 'border-gold text-gold hover:bg-gold-light'
                                : 'border-gray-200 text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <Eye size={14} /> VIEW BREAKDOWN
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-sm text-text-muted italic">
                        No report records compiled for the selected term and semester.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Statistics & Stands */}
        <div className="w-full lg:w-[320px] space-y-6">
          {/* GPA Scale Summary Card */}
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
                      <Pie
                        data={[{ value: averageTermGrade || 1 }, { value: 100 - (averageTermGrade || 1) }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill={averageTermGrade > 0 ? '#eab308' : '#f3f4f6'} />
                        <Cell fill="#f3f4f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-sidebar">
                    {averageTermGrade > 0 ? currentGpaInfo.gpa : '—'}
                  </span>
                  <span className="text-[9px] font-bold text-gold tracking-widest uppercase mt-0.5">
                    {currentGpaInfo.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-2 border-t pt-4">
              <p className="text-xs text-text-muted">
                {averageTermGrade > 0 
                  ? `Computed overall term average score is ${averageTermGrade}%.`
                  : 'Term average is not computed yet.'
                }
              </p>
              {averageTermGrade >= 90 && (
                <span className="inline-block bg-yellow-50 text-gold text-[10px] font-bold px-2 py-0.5 border border-yellow-200 rounded-full uppercase tracking-wider">
                  Dean's Lister Cohort
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Interventions */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border">
            <h3 className="text-xs font-bold text-sidebar uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-gold" /> Active Review Flags
            </h3>
            
            <div className="space-y-3">
              {interventions.length > 0 ? (
                interventions.map((r, idx) => (
                  <div key={idx} className="border border-red-200 bg-red-50/50 p-4 rounded-xl">
                    <h4 className="font-bold text-sidebar text-xs mb-1">{r.subject}</h4>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Finalized average grade ({r.average}%) is below academic proficiency standard.
                    </p>
                    <button className="mt-2.5 w-full border border-red-300 text-red-600 font-bold py-1.5 rounded-lg bg-white hover:bg-red-50 transition-colors text-[10px] uppercase tracking-wider">
                      Request Consultation
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-text-muted italic border border-dashed border-border rounded-xl">
                  No academic warnings listed for this term period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-sidebar p-5 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  Term Grade Breakdown Card
                </span>
                <h3 className="text-xl font-bold mt-0.5">{selectedReport.subject}</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Instructor: {selectedReport.instructor} • {selectedTerm} {selectedYear}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <h4 className="text-sm font-bold text-sidebar uppercase tracking-wider mb-3">
                Graded Contributions
              </h4>

              <div className="border rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left">
                  <thead className="bg-bg-light text-[9px] font-bold text-text-muted uppercase tracking-wider border-b">
                    <tr>
                      <th className="px-4 py-3">Task Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">Score %</th>
                      <th className="px-4 py-3">Class Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {selectedReport.assessments && selectedReport.assessments.length > 0 ? (
                      selectedReport.assessments.map((ass, idx) => (
                        <tr key={idx} className="hover:bg-bg-light/40">
                          <td className="px-4 py-3 font-semibold text-sidebar">{ass.name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryStyles(ass.category)}`}>
                              {ass.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{ass.weight}%</td>
                          <td className="px-4 py-3 font-bold text-sidebar">{ass.score}%</td>
                          <td className="px-4 py-3 text-text-muted">{ass.classAvg}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-xs text-text-muted italic">
                          No itemized task breakdowns have been posted for this term report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Footer inside Modal */}
              <div className="bg-gold-light border border-gold/30 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Overall Term Performance
                  </span>
                  <div className="text-base font-bold text-sidebar mt-0.5">
                    {selectedReport.subject} Summary
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block">
                    Term Final Average
                  </span>
                  <span className="text-3xl font-extrabold text-gold">
                    {selectedReport.average}%
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-bg-light px-6 py-4 flex justify-end gap-3 border-t">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border-2 border-gold text-gold font-bold rounded-lg text-xs hover:bg-gold-light transition-colors uppercase tracking-wider"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-sidebar hover:bg-sidebar-hover text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors uppercase tracking-wider">
                <Download size={14} /> Export Report Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
