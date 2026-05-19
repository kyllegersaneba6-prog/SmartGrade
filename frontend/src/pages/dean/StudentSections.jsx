import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, ArrowRight, UserPlus, X, RefreshCw, BookOpen, Search, Eye, Edit, Calendar } from 'lucide-react';

const StudentSections = () => {
  const [allStudents, setAllStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  
  // Published assignment records state
  const [publishedAssignments, setPublishedAssignments] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [selectedViewAssignment, setSelectedViewAssignment] = useState(null);
  
  // Modal for adding a student manually
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Submit state
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync editor state changes to local storage so dean doesn't lose in-progress work
  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem('student_sections_editor', JSON.stringify(sections));
    } else {
      localStorage.removeItem('student_sections_editor');
    }
  }, [sections]);

  useEffect(() => {
    // Load published assignments
    const savedPub = localStorage.getItem('published_assignments');
    if (savedPub) {
      setPublishedAssignments(JSON.parse(savedPub));
    }

    // Load active editor sections
    const savedEditorSections = localStorage.getItem('student_sections_editor');
    if (savedEditorSections) {
      setSections(JSON.parse(savedEditorSections));
    } else {
      // Fallback: migrate from old format if there are saved sections but no published assignments
      const savedSections = localStorage.getItem('student_sections');
      if (savedSections && (!savedPub || JSON.parse(savedPub).length === 0)) {
        setSections(JSON.parse(savedSections));
      }
    }

    // Fetch all users and filter students and teachers
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/users');
        if (res.ok) {
          const data = await res.json();
          
          // Filter students — always keep the full list available
          const studentList = data.filter(u => u.system_role === 'student');
          studentList.sort((a, b) => a.full_name.localeCompare(b.full_name));
          setAllStudents(studentList);
          
          // Filter teachers
          const teacherList = data.filter(u => u.system_role === 'teacher');
          setTeachers(teacherList);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmitAssignments = () => {
    if (sections.length === 0) {
      alert("No sections to publish. Please create at least one section first.");
      return;
    }

    // Check if sections have teachers and subjects assigned
    const incomplete = sections.some(s => !s.teacherId || !s.subject);
    if (incomplete) {
      if (!confirm("Some sections do not have a teacher or subject assigned. Do you want to publish anyway?")) {
        return;
      }
    }

    const savedPublished = JSON.parse(localStorage.getItem('published_assignments') || '[]');
    const now = new Date().toISOString();

    // Map teacher IDs to teacher names for the compilation display
    const compiledSections = sections.map(s => {
      const teacher = teachers.find(t => t.id === s.teacherId);
      return {
        ...s,
        teacherName: teacher ? teacher.full_name : 'Unassigned'
      };
    });

    let updatedPublished = [];
    if (editingAssignmentId) {
      // Update existing assignment
      updatedPublished = savedPublished.map(pub => {
        if (pub.id === editingAssignmentId) {
          return {
            ...pub,
            lastModified: now,
            sections: compiledSections
          };
        }
        return pub;
      });
      setEditingAssignmentId(null);
    } else {
      // Create new assignment
      const newPub = {
        id: `PUB-${Date.now()}`,
        publishDate: now,
        sections: compiledSections
      };
      updatedPublished = [newPub, ...savedPublished];
    }

    localStorage.setItem('published_assignments', JSON.stringify(updatedPublished));

    // Clear active editor sections
    localStorage.removeItem('student_sections_editor');
    setSections([]);

    // Compile ALL sections from all published assignments into `student_sections` for other pages to read
    const flatSections = [];
    updatedPublished.forEach(pub => {
      pub.sections.forEach(s => {
        flatSections.push({
          id: s.id,
          name: s.name,
          teacherId: s.teacherId,
          subject: s.subject,
          students: s.students
        });
      });
    });
    localStorage.setItem('student_sections', JSON.stringify(flatSections));

    // Log a single consolidated entry to dean_activity_log for ReportGenerator
    const existingLog = JSON.parse(localStorage.getItem('dean_activity_log') || '[]');
    const newLogEntry = {
      id: `ACT-${Date.now()}`,
      action: editingAssignmentId ? 'Assignment Updated' : 'Assignment Published',
      sectionName: `${sections.length} Section(s)`,
      subject: sections.map(s => s.subject).filter(Boolean).join(', ') || 'Multiple Subjects',
      teacher: sections.map(s => {
        const teacher = teachers.find(t => t.id === s.teacherId);
        return teacher ? teacher.full_name : '';
      }).filter(Boolean).join(', ') || 'Multiple Teachers',
      studentCount: sections.reduce((sum, s) => sum + s.students.length, 0),
      timestamp: now,
      status: 'COMPLETED'
    };
    localStorage.setItem('dean_activity_log', JSON.stringify([newLogEntry, ...existingLog]));

    // Fetch / update local state
    setPublishedAssignments(updatedPublished);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEditAssignment = (pub) => {
    if (sections.length > 0) {
      if (!confirm("Loading this published assignment will overwrite current items in the editor. Do you want to proceed?")) {
        return;
      }
    }
    setSections(pub.sections);
    setEditingAssignmentId(pub.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDisposeAssignment = (pubId) => {
    if (!confirm("Are you sure you want to delete (dispose) this published assignment? This will remove these sections, subjects, teachers, and student allocations from all classes.")) {
      return;
    }

    const savedPublished = JSON.parse(localStorage.getItem('published_assignments') || '[]');
    const updatedPublished = savedPublished.filter(pub => pub.id !== pubId);
    
    localStorage.setItem('published_assignments', JSON.stringify(updatedPublished));

    // Re-compile student_sections
    const flatSections = [];
    updatedPublished.forEach(pub => {
      pub.sections.forEach(s => {
        flatSections.push({
          id: s.id,
          name: s.name,
          teacherId: s.teacherId,
          subject: s.subject,
          students: s.students
        });
      });
    });
    localStorage.setItem('student_sections', JSON.stringify(flatSections));

    // If we were currently editing the deleted assignment, reset editing state
    if (editingAssignmentId === pubId) {
      setEditingAssignmentId(null);
      setSections([]);
      localStorage.removeItem('student_sections_editor');
    }

    // Log the dispose action
    const existingLog = JSON.parse(localStorage.getItem('dean_activity_log') || '[]');
    const newLogEntry = {
      id: `ACT-${Date.now()}`,
      action: 'Assignment Disposed',
      sectionName: 'N/A',
      subject: 'N/A',
      teacher: 'N/A',
      studentCount: 0,
      timestamp: new Date().toISOString(),
      status: 'COMPLETED'
    };
    localStorage.setItem('dean_activity_log', JSON.stringify([newLogEntry, ...existingLog]));

    setPublishedAssignments(updatedPublished);
  };

  const handleClearEditor = () => {
    if (confirm("Are you sure you want to clear the active sections editor? This will clear all in-progress work in the editor above.")) {
      setSections([]);
      localStorage.removeItem('student_sections_editor');
    }
  };
  
  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    
    setSections([...sections, {
      id: Date.now().toString(),
      name: newSectionName.trim(),
      teacherId: '',
      subject: '',
      students: []
    }]);
    setNewSectionName('');
  };

  const handleRemoveSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  // Auto-sort: distribute ALL students into sections that have empty slots
  // Students CAN appear in multiple sections (different subjects)
  const handleAutoSort = () => {
    if (sections.length === 0) return alert("Please create at least one section first.");

    // Only fill sections that currently have NO students
    const emptySections = sections.filter(s => s.students.length === 0);
    if (emptySections.length === 0) return alert("All sections already have students assigned. Create a new section or clear an existing one.");

    const sorted = [...allStudents].sort((a, b) => a.full_name.localeCompare(b.full_name));

    const updatedSections = sections.map(section => {
      if (section.students.length > 0) return section; // Skip sections that already have students
      const cap = Math.min(40, sorted.length);
      return {
        ...section,
        students: sorted.slice(0, cap)
      };
    });

    setSections(updatedSections);
  };

  const handleRemoveStudentFromSection = (sectionId, studentId) => {
    setSections(sections.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, students: s.students.filter(st => st.id !== studentId) };
    }));
  };

  const handleAddStudentToSection = (student) => {
    if (!targetSectionId) return;

    const sectionIndex = sections.findIndex(s => s.id === targetSectionId);
    if (sectionIndex === -1) return;

    const section = sections[sectionIndex];
    if (section.students.length >= 40) {
      alert("This section is at its maximum capacity of 40 students.");
      return;
    }

    // Prevent duplicate within the SAME section
    if (section.students.some(s => s.id === student.id)) {
      alert("This student is already in this section.");
      return;
    }

    const updatedStudents = [...section.students, student].sort((a, b) => a.full_name.localeCompare(b.full_name));
    const updatedSections = [...sections];
    updatedSections[sectionIndex] = { ...section, students: updatedStudents };

    setSections(updatedSections);
    // Do NOT close modal — allow adding more students quickly
  };

  const handleUpdateSectionDetails = (sectionId, field, value) => {
    const updatedSections = sections.map(s => 
      s.id === sectionId ? { ...s, [field]: value } : s
    );
    setSections(updatedSections);
  };

  const openAddModal = (sectionId) => {
    setTargetSectionId(sectionId);
    setSearchQuery('');
    setIsAddModalOpen(true);
  };

  // Filter students in the Add modal: show all students, but indicate if already in this section
  const getFilteredStudents = () => {
    const section = sections.find(s => s.id === targetSectionId);
    const sectionStudentIds = new Set(section ? section.students.map(s => s.id) : []);
    
    return allStudents
      .filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(s => ({ ...s, alreadyInSection: sectionStudentIds.has(s.id) }));
  };

  // Count how many sections each student appears in (for the right panel)
  const getStudentSectionCount = (studentId) => {
    return sections.filter(s => s.students.some(st => st.id === studentId)).length;
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Edit Mode Warning Banner */}
      {editingAssignmentId && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Currently Editing Published Assignment: {editingAssignmentId}</p>
              <p className="text-xs text-yellow-600">Any changes made will overwrite this record when you click "Update Assignment".</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingAssignmentId(null);
              setSections([]);
              localStorage.removeItem('student_sections_editor');
            }}
            className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-800 text-xs font-bold rounded-lg hover:bg-yellow-100 transition-colors"
          >
            Cancel Edit
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sidebar">Student Sections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign students to sections with teachers & subjects. Students can be enrolled in multiple subjects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sections.length > 0 && !editingAssignmentId && (
            <button
              onClick={handleClearEditor}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2 rounded-lg border border-red-200 transition-colors"
            >
              <Trash2 size={16} /> Clear Editor
            </button>
          )}
          <button
            onClick={handleAutoSort}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-sidebar font-bold px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={16} /> Auto-Sort
          </button>
          <button
            onClick={handleSubmitAssignments}
            className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition-colors ${
              showSuccess 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gold hover:bg-gold-hover text-sidebar'
            }`}
          >
            <BookOpen size={16} /> {showSuccess ? 'Successfully Saved!' : editingAssignmentId ? 'Update Assignment' : 'Publish Assignments'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start h-full">
        
        {/* Left Column: Sections List & Creator */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Section Name</label>
              <input 
                type="text" 
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g., Section A"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <button 
              onClick={handleAddSection}
              disabled={!newSectionName.trim()}
              className="w-full sm:w-auto mt-5 sm:mt-0 px-5 py-2.5 bg-sidebar text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-sidebar-hover disabled:opacity-50 transition-colors"
            >
              <Plus size={16} /> Create Section
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-gray-400">
              <Users size={40} className="mb-3 opacity-50" />
              <p className="font-medium text-gray-600">No sections created in editor.</p>
              <p className="text-sm">Create a section above or load a published assignment to edit.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sections.map(section => (
                <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{section.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${section.students.length >= 40 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {section.students.length} / 40 Students
                        </span>
                        {section.subject && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold-light text-gold">
                            {section.subject}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveSection(section.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="p-4 border-b border-gray-100 bg-white space-y-3">
                    <div className="flex flex-col gap-1">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assign Teacher</label>
                       <select 
                         value={section.teacherId || ''}
                         onChange={(e) => handleUpdateSectionDetails(section.id, 'teacherId', e.target.value)}
                         className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold appearance-none"
                       >
                         <option value="">Select a Teacher...</option>
                         {teachers.map(t => (
                           <option key={t.id} value={t.id}>{t.full_name}</option>
                         ))}
                       </select>
                    </div>
                    <div className="flex flex-col gap-1">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                       <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <BookOpen size={14} className="text-gray-400" />
                         </div>
                         <input 
                           type="text" 
                           value={section.subject || ''}
                           onChange={(e) => handleUpdateSectionDetails(section.id, 'subject', e.target.value)}
                           placeholder="e.g. Mathematics 101"
                           className="w-full text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                         />
                       </div>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 overflow-y-auto min-h-[150px] max-h-[250px] bg-gray-50/50" style={{ scrollbarWidth: 'thin' }}>
                    {section.students.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                        Empty section. Use Auto-sort or add manually.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {section.students.map((student, idx) => (
                          <li key={student.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-sm hover:border-gray-200 group">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}.</span>
                              <div>
                                <p className="text-sm font-semibold text-gray-700">{student.full_name}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveStudentFromSection(section.id, student.id)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Remove from section"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-white">
                    <button 
                      onClick={() => openAddModal(section.id)}
                      disabled={section.students.length >= 40}
                      className="w-full py-2 flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 hover:text-sidebar hover:bg-gray-50 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <UserPlus size={14} /> Add Student Manually
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: All Students Directory */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col sticky top-24 max-h-[calc(100vh-100px)]">
          <div className="p-5 border-b border-gray-100 bg-gray-50 rounded-t-xl shrink-0">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Users size={18} className="text-gold" /> Student Directory
            </h3>
            <p className="text-xs text-gray-500 mt-1">All registered students ({allStudents.length})</p>
          </div>
          
          <div className="p-2 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {allStudents.length === 0 ? (
              <p className="text-xs text-center text-gray-400 italic py-10">No students registered.</p>
            ) : (
              <ul className="space-y-1">
                {allStudents.map(student => {
                  const sectionCount = getStudentSectionCount(student.id);
                  return (
                    <li key={student.id} className="p-2 rounded hover:bg-blue-50 text-sm font-medium text-gray-700 flex items-center justify-between border border-transparent hover:border-blue-100 transition-colors">
                      <span className="truncate">{student.full_name}</span>
                      {sectionCount > 0 && (
                        <span className="text-[10px] font-bold bg-gold-light text-gold px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                          {sectionCount}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Published Assignment Records */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-sidebar flex items-center gap-2">
              <BookOpen size={20} className="text-gold" /> Published Assignment Records
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              List of all previously compiled and published student sections, subjects, and teacher allocations.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-sidebar rounded-full">
            {publishedAssignments.length} Published Batches
          </span>
        </div>

        {publishedAssignments.length === 0 ? (
          <div className="py-12 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
            <BookOpen size={40} className="opacity-40 mb-2" />
            <p className="text-sm font-semibold text-gray-600">No published assignments yet</p>
            <p className="text-xs">Once you publish section assignments, they will be archived here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <table className="w-full text-left min-w-[800px]">
              <thead className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Date Published</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4">Subject & Teacher Allocations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {publishedAssignments.map((pub) => {
                  const date = new Date(pub.publishDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const sectionsCount = pub.sections.length;
                  const totalStudents = pub.sections.reduce((sum, s) => sum + s.students.length, 0);

                  return (
                    <tr key={pub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-sidebar">{pub.id}</td>
                      <td className="py-4 px-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {date}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-gray-800 text-xs">
                            {sectionsCount} {sectionsCount === 1 ? 'Section' : 'Sections'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {totalStudents} {totalStudents === 1 ? 'Student' : 'Students'} total
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {pub.sections.map((s, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold-light/60 text-sidebar text-[11px] font-medium border border-gold-light">
                              <span className="font-bold text-gold">{s.name}:</span>
                              <span>{s.subject || 'No Subject'} ({s.teacherName || 'No Teacher'})</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedViewAssignment(pub)}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEditAssignment(pub)}
                            className="p-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 rounded-lg transition-colors"
                            title="Edit Assignment"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDisposeAssignment(pub.id)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            title="Dispose (Delete)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Assignment Details Modal */}
      {selectedViewAssignment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50 rounded-t-xl shrink-0">
              <div>
                <h3 className="font-bold text-lg text-sidebar flex items-center gap-2">
                  <BookOpen size={20} className="text-gold" /> Assignment Record Details: {selectedViewAssignment.id}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Published on {new Date(selectedViewAssignment.publishDate).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedViewAssignment(null)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 space-y-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedViewAssignment.sections.map((section) => (
                  <div key={section.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-gray-100/70 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sidebar text-base">{section.name}</h4>
                        <p className="text-[11px] text-gray-500 font-medium">Subject: <span className="text-sidebar font-semibold">{section.subject || 'Unassigned'}</span></p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-gold-light text-gold rounded-full border border-gold-light/40">
                        {section.students.length} Students
                      </span>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-100 bg-white">
                      <p className="text-xs text-gray-600">
                        Assigned Teacher: <span className="font-semibold text-sidebar">{section.teacherName || 'Unassigned'}</span>
                      </p>
                    </div>
                    <div className="p-3 max-h-[200px] overflow-y-auto bg-gray-50/30" style={{ scrollbarWidth: 'thin' }}>
                      {section.students.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">No students assigned to this section.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {section.students.map((student, idx) => (
                            <li key={student.id} className="flex items-center gap-2 p-1.5 rounded bg-white border border-gray-100 text-xs text-gray-700">
                              <span className="font-bold text-gray-400 w-4">{idx + 1}.</span>
                              <span className="font-medium">{student.full_name}</span>
                              <span className="text-[9px] text-gray-400 ml-auto truncate">{student.email}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedViewAssignment(null)}
                className="px-5 py-2 bg-sidebar text-white rounded-lg text-sm font-bold hover:bg-sidebar-hover transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-sidebar">Select Student to Add</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin' }}>
              {getFilteredStudents().length === 0 ? (
                <p className="text-sm text-center text-gray-500 italic py-8">No students match your search.</p>
              ) : (
                <div className="space-y-2">
                  {getFilteredStudents().map(student => (
                    <button 
                      key={student.id}
                      onClick={() => !student.alreadyInSection && handleAddStudentToSection(student)}
                      disabled={student.alreadyInSection}
                      className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors ${
                        student.alreadyInSection
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gold hover:bg-yellow-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">{student.full_name}</p>
                        <p className="text-[10px] text-gray-500">
                          {student.alreadyInSection ? 'Already in this section' : student.email || 'Click to add'}
                        </p>
                      </div>
                      {student.alreadyInSection ? (
                        <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Added</span>
                      ) : (
                        <ArrowRight size={16} className="text-gold" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="w-full py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentSections;
