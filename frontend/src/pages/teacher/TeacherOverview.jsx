import { useState } from 'react';
import { BookOpen, GraduationCap, Archive } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';
import { SkeletonClassGrid } from '../../components/common/Skeleton';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';

const yearOrder = ['1st', '2nd', '3rd', '4th'];
const yearLabels = { '1st': '1st Year', '2nd': '2nd Year', '3rd': '3rd Year', '4th': '4th Year' };

const TeacherOverview = () => {
  const { assignments, loading, activeTerm, setViewTerm, isArchiveMode } = useTeacher();
  const [searchQuery, setSearchQuery] = useState('');

  const userStr = localStorage.getItem('user');
  const userName = userStr ? JSON.parse(userStr).first_name || JSON.parse(userStr).full_name?.split(' ')[0] || 'Teacher' : 'Teacher';

  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const subName = a.subjects?.name?.toLowerCase() || '';
    const subCode = a.subjects?.code?.toLowerCase() || '';
    const secName = a.sections?.name?.toLowerCase() || '';
    return subName.includes(q) || subCode.includes(q) || secName.includes(q);
  });

  const groupedByYear = {};
  filteredAssignments.forEach((a) => {
    const year = a.sections?.year_level || 'N/A';
    if (!groupedByYear[year]) groupedByYear[year] = [];
    groupedByYear[year].push(a);
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap size={18} style={{ color: '#0c1925' }} />
            {isArchiveMode ? 'Archived Classes' : 'My Assigned Classes'}
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by subject or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-8 py-2 text-xs border border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] focus:border-[#0c1925] bg-white text-gray-900 font-semibold shadow-sm"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

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
        ) : (assignments.length > 0 || searchQuery.trim()) && filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 card-hover text-center text-gray-500">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No classes match your search.</p>
            <p className="text-xs mt-1">Try searching with a different subject or section name.</p>
          </div>
        ) : (
          <div className="grid min-h-[430px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
            {yearOrder.map((year, index) => {
              const items = groupedByYear[year] || [];
              const columnDivider = [
                'flex min-h-[280px] flex-col px-6 py-6',
                index < yearOrder.length - 1 ? 'border-b border-gray-200 sm:border-b-0' : '',
                index % 2 === 0 ? 'sm:border-r sm:border-gray-200' : '',
                index < yearOrder.length - 1 ? 'xl:border-r xl:border-gray-200' : 'xl:border-r-0',
              ].join(' ');
              return (
                <section key={year} aria-label={yearLabels[year]} className={columnDivider}>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-medium uppercase tracking-wide text-gray-700">{yearLabels[year]}</h4>
                    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-gray-100 px-2 text-sm font-medium text-gray-600">{items.length}</span>
                  </div>
                  {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-slate-400">
                        <BookOpen size={22} strokeWidth={1.8} />
                      </span>
                      <p className="text-sm font-semibold text-slate-700">No assigned subjects</p>
                      <p className="mt-2 max-w-[150px] text-xs leading-5 text-slate-500">Classes for this year will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((a) => (
                        <article
                          key={a.id}
                          className="flex min-h-[108px] w-full flex-col justify-between rounded-xl border border-slate-300 bg-[#fbfcfd] p-3"
                        >
                          <div className="min-w-0">
                            {a.subjects?.code && <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{a.subjects.code}</p>}
                            <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">{a.subjects?.name || 'Untitled subject'}</p>
                          </div>
                          <p className="mt-2 text-xs text-gray-700">{a.sections?.name || 'Section not set'}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherOverview;
