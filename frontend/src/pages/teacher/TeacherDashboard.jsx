import React from 'react';
import { LayoutDashboard, BookOpen, GraduationCap, Archive, Loader } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';
import { SkeletonClassGrid } from '../../components/common/Skeleton';

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
      <div className="p-8 rounded-3xl text-white shadow-md relative" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <LayoutDashboard size={160} className="absolute -right-8 -bottom-8 opacity-10 text-white" />
        <div className="relative z-10 space-y-4">
         
          <div className="flex items-center justify-between flex-wrap gap-4 ">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight mt-2">Welcome, {userName}</h2>
              <p className="text-amber-400 text-sm max-w-xl leading-relaxed mt-1">
                Manage your assigned classes, record grades, and track student performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {isArchiveMode && (
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                <Archive size={12} />
                ARCHIVE
              </span>
            )}
           
            {isArchiveMode && (
              <button
                onClick={() => { setViewTerm(null); }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30 transition-colors flex items-center gap-1 cursor-pointer"
              >
                Exit Archive
              </button>
            )}
          </div>
        </div>
      </div>

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
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-900" />
            <p className="text-sm text-gray-900 font-medium">No active term.</p>
            <p className="text-xs text-gray-900 mt-1">Wait for a superadmin to create a term.</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-gray-900" />
            <p className="text-sm text-gray-900 font-medium">No assignments in this term.</p>
            <p className="text-xs text-gray-900 mt-1">You were not assigned to any class in this academic term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {yearOrder.map((year) => {
              const items = groupedByYear[year];
              if (!items) return null;
              return (
                <div key={year} className="bg-white rounded-xl p-5 shadow-sm border border-gray-50">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">{yearLabels[year]}</h4>
                  <div className="space-y-2">
                    {items.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-300">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{a.subjects?.code ? <span className="text-gray-900 font-mono text-[13px] mr-1.5">{a.subjects.code}</span> : null}{a.subjects?.name}</p>
                          <p className="text-[13px] text-gray-900">{a.sections?.name}</p>
                          <p className="text-[12px] text-gray-900">{a.school_year} {a.semester}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-[#0c1925]" style={{ background: '#f5a623' }}>
                          {a.sections?.year_level}
                        </span>
                      </div>
                    ))}
                  </div>
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


