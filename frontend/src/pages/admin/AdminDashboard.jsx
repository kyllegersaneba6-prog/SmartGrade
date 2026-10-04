import React, { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, Activity, Clock, GraduationCap, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import api from '../../utils/api';
import { SkeletonMetricCards, SkeletonTable, SkeletonList } from '../../components/common/Skeleton';

const AdminDashboard = () => {
  const { currentTerm, isArchiveMode } = useAdmin();
  const [teachers, setTeachers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        (async () => {
          try {
            const res = await api('http://localhost:5000/api/users');
            if (res.ok) { const data = await res.json(); setTeachers(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api('http://localhost:5000/api/activity');
            if (res.ok) { const data = await res.json(); setActivityLog(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api('http://localhost:5000/api/assignments');
            if (res.ok) {
              const data = await res.json();
              const counts = {};
              data.forEach(a => { counts[a.teacher_id] = (counts[a.teacher_id] || 0) + 1; });
              setSubjectCounts(counts);
              setAssignments(data);
            }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const deptRes = await api('http://localhost:5000/api/departments');
            if (deptRes.ok) {
              const depts = await deptRes.json();
              const match = depts.find(d => d.name === user.department);
              if (match) {
                const coursesRes = await api(`http://localhost:5000/api/courses?department_id=${match.id}`);
                if (coursesRes.ok) {
                  const courses = await coursesRes.json();
                  setCoursesCount(courses.length);
                }
              }
            }
          } catch (err) { console.error(err); }
        })(),
      ]);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadData().finally(() => setInitialLoading(false)); }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [loadData]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(activityLog.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayActivity = activityLog.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pt-0">
      <div className="p-8 rounded-3xl text-white shadow-md relative" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <Users size={160} className="absolute -right-8 -bottom-8 opacity-10 text-white" />
        <div className="relative z-10 space-y-4">
          
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">Welcome, {JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Admin'}</h2>
          <p className="text-amber-400 text-sm max-w-xl leading-relaxed mt-1">
            Manage departments, Teachers, and monitor activity logs.
          </p>       
        </div>
      </div>

      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {initialLoading ? (
          <div className="md:col-span-3" aria-busy="true"><SkeletonMetricCards count={3} /></div>
        ) : (
        <>
        <div className="p-5 rounded-2xl shadow-sm border border-gray-50" >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-black uppercase tracking-widest">Total Teachers</span>
            <div className="p-2 rounded-lg" style={{ background: '#f0fdf4' }}><BookOpen size={18} className="text-green-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-black">{teachers.length}</div>
          <span className="text-[12px]" style={{ color: '#000000' }}>Registered faculty members</span>
        </div>

        <div className="p-5 rounded-2xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-black uppercase tracking-widest">Courses</span>
            <div className="p-2 rounded-lg" style={{ background: '#e0f2fe' }}><BookOpen size={18} className="text-sky-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-black">{coursesCount}</div>
          <span className="text-[12px]" style={{ color: '#000000' }}>Active courses</span>
        </div>

        <div className="p-5 rounded-2xl shadow-sm border border-gray-50" >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-black uppercase tracking-widest">Activity</span>
            <div className="p-2 rounded-lg" style={{ background: '#ede9fe' }}><Activity size={18} className="text-purple-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-black">{activityLog.length}</div>
          <span className="text-[12px]" style={{ color: '#000000' }}>Total events logged</span>
        </div>
        </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {initialLoading ? (
          <>
            <div aria-busy="true"><SkeletonTable cols={2} rows={5} /></div>
            <div aria-busy="true"><SkeletonList rows={4} avatar /></div>
          </>
        ) : (
        <>
        <div className="rounded-xl p-5 shadow-sm self-start border border-gray-50" style={{ background: '#fff' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#0c1925' }}>Teacher Overview</h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-gray-900 italic py-6 text-center">No teachers registered yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Name</th>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Subjects Handled</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                      <td className="py-3 pr-3 font-bold text-gray-900">{t.full_name}</td>
                      <td className="py-3 pr-3">
                        <button
                          onClick={() => setSelectedTeacher(t)}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                          title={`View subjects handled by ${t.full_name}`}
                        >
                          <GraduationCap size={12} /> {subjectCounts[t.id] || 0}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {teachers.length > 8 && <p className="text-xs text-gray-400 mt-2">Showing 8 of {teachers.length} teachers</p>}
        </div>

        <div className="rounded-xl p-5 shadow-sm border border-gray-50" style={{ background: '#fff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Recent Activity</h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-[10px] font-bold text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-[10px] bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          {displayActivity.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No recent activities.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {displayActivity.map((log) => {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const isOwn = log.user_name === currentUser?.username;
                const diff = Date.now() - new Date(log.created_at).getTime();
                const mins = Math.floor(diff / 60000);
                const timeAgo = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                const isCreate = log.action.toLowerCase().includes('created');
                const isDelete = log.action.toLowerCase().includes('deleted');
                const isUpdate = log.action.toLowerCase().includes('updated');
                const Icon = isCreate ? CheckCircle : isDelete ? Trash2 : isUpdate ? RefreshCw : Activity;
                const iconColor = isCreate ? '#22c55e' : isDelete ? '#ef4444' : isUpdate ? '#142a3f' : '#142a3f';
                const bg = isCreate ? '#f0fdf4' : isDelete ? '#fef2f2' : isUpdate ? '#e0f2fe' : '#e0f2fe';

                return (
                  <div key={log.id} className="flex gap-3 p-3 rounded-lg border border-gray-50 shadow-sm hover:shadow-md transition-all duration-100">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}><Icon size={14} style={{ color: iconColor }} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-gray-800 text-xs sm:text-sm">{log.action}</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-900 whitespace-nowrap"><Clock size={10} /> {timeAgo}</span>
                      </div>
                      <p className="text-[12px] text-gray-700 truncate">{isOwn ? `You ${log.details.charAt(0).toLowerCase() + log.details.slice(1)}` : log.details}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Subjects Handled Modal */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1925]/20" onClick={() => setSelectedTeacher(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">Subjects Handled</h3>
              <button onClick={() => setSelectedTeacher(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-1">×</button>
            </div>
            <p className="text-sm text-gray-900 mb-4">{selectedTeacher.full_name}</p>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const handled = assignments.filter((a) => a.teacher_id === selectedTeacher.id);
                if (handled.length === 0) {
                  return <p className="text-sm text-gray-400 italic py-6 text-center">No subjects assigned to this teacher yet.</p>;
                }
                return (
                  <div className="space-y-2">
                    {handled.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {a.subjects?.code ? <span className="font-mono text-[13px] mr-1.5 text-gray-900">{a.subjects.code}</span> : null}
                            {a.subjects?.name || 'Unknown subject'}
                          </p>
                          <p className="text-[11px] text-gray-900 mt-0.5">
                            {a.sections?.name || 'No section'}{a.school_year ? ` · ${a.school_year}` : ''}{a.semester ? ` ${a.semester}` : ''}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 ml-2">
                          {a.sections?.year_level || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
              <button onClick={() => setSelectedTeacher(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;



