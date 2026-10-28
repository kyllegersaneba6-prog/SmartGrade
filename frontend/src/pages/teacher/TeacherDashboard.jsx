import React from 'react';
import { BookOpen, GraduationCap, Archive, Loader } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';
import { SkeletonClassGrid } from '../../components/common/Skeleton';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';

const yearOrder = ['1st', '2nd', '3rd', '4th'];
const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

const TeacherDashboard = () => {
  const { assignments, loading, activeTerm, viewTerm, setViewTerm, isArchiveMode } = useTeacher();

  const userStr = localStorage.getItem('user');
  const userName = userStr ? JSON.parse(userStr).first_name || JSON.parse(userStr).full_name?.split(' ')[0] || 'Teacher' : 'Teacher';

  const groupedByYear = {};
  assignments.forEach((a) => {
    const year = a.sections?.year_level || 'N/A';
    if (!groupedByYear[year]) groupedByYear[year] = [];
    groupedByYear[year].push(a);
  });

  const currentTerm = viewTerm || activeTerm;

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pt-0">
      <TeacherPageHeading
        eyebrow={isArchiveMode ? 'Archived classes' : 'My classes'}
        title={`Welcome, ${userName}`}
        description="Manage your assigned classes, record grades, and track student performance."
        actions={isArchiveMode && (
          <button onClick={() => setViewTerm(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100">
            <Archive size={14} /> Exit archive
          </button>
        )}
      />

      <div>
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap size={18} style={{ color: '#0c1925' }} />
          {isArchiveMode ? 'Archived Classes' : 'My Assigned Classes'}
        </h3>

        {loading ? (
          <div aria-busy="true">
            <SkeletonClassGrid count={4} />
          </div>
        ) : !activeTerm && !isArchiveMode ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 card-hover text-center text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No active term.</p>
            <p className="text-xs mt-1">Wait for a superadmin to create a term.</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 card-hover text-center text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No assignments in this term.</p>
            <p className="text-xs mt-1">You were not assigned to any class in this academic term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {yearOrder.map((year) => {
              const items = groupedByYear[year] || [];
              return (
                <div key={year} className="bg-white rounded-xl p-5 shadow-sm border border-gray-50 card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{yearLabels[year]}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No assigned subjects.</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((a) => (
                        <div key={a.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-300">
                          <p className="text-sm font-semibold text-gray-900">
                            {a.subjects?.code ? <span className="text-gray-900 font-mono text-[13px] mr-1.5">{a.subjects.code}</span> : null}
                            {a.subjects?.name}
                          </p>
                          <p className="text-[13px] text-gray-900">{a.sections?.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;


