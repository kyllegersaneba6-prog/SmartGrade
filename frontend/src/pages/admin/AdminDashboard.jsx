import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Activity, Clock, CheckCircle, Trash2, RefreshCw, UsersRound, GraduationCap } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import api from '../../utils/api';
import { SkeletonMetricCards, SkeletonTable, SkeletonList } from '../../components/common/Skeleton';

const AdminDashboard = () => {
  const { currentTerm, isArchiveMode } = useAdmin();
  const [teachers, setTeachers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [subjectCounts, setSubjectCounts] = useState({});
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Welcome, {JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Admin'}</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>
            Manage departments, Teachers, and monitor activity logs.
          </p>
        </div>
      </div>

      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {initialLoading ? (
          <div className="md:col-span-3" aria-busy="true"><SkeletonMetricCards count={3} /></div>
        ) : (
        <>
        <div className="bg-gray-50 p-5 rounded-2xl shadow-sm card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Total Teachers</span>
            <div className="text-3xl font-extrabold text-[#142a3f]">{teachers.length}</div>
            <span className="text-[11px] text-gray-900">Registered faculty members</span>
          </div>
          <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#142a3f15', color: '#142a3f' }}><UsersRound size={24} /></div>
        </div>

        <div className="bg-gray-50 p-5 rounded-2xl shadow-sm card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Courses</span>
            <div className="text-3xl font-extrabold text-[#142a3f]">{coursesCount}</div>
            <span className="text-[11px] text-gray-900">Active courses</span>
          </div>
          <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#142a3f15', color: '#142a3f' }}><GraduationCap size={24} /></div>
        </div>

        <div className="bg-gray-50 p-5 rounded-2xl shadow-sm card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Activity</span>
            <div className="text-3xl font-extrabold text-[#142a3f]">{activityLog.length}</div>
            <span className="text-[11px] text-gray-900">Total events logged</span>
          </div>
          <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#142a3f15', color: '#142a3f' }}><Activity size={24} /></div>
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
        <div className="rounded-xl p-5 shadow-sm self-start border border-gray-50 card-hover" style={{ background: '#fff' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#0c1925' }}>Teacher Overview</h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-6 text-center">No teachers registered yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Name</th>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Subjects Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                      <td className="py-3 pr-3 font-bold text-gray-900">{t.full_name}</td>
                      <td className="py-3 pr-3">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-3xl bg-white border border-[#142a3f] text-[#142a3f]"
                        >
                          <BookOpen size={16} style={{ color: '#142a3f' }} /> {subjectCounts[t.id] || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {teachers.length > 8 && <p className="text-xs text-gray-400 mt-2">Showing 8 of {teachers.length} teachers</p>}
        </div>

        <div className="rounded-xl p-5 shadow-sm border border-gray-50 card-hover" style={{ background: '#fff' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Recent Activities</h2>
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
            <p className="text-sm text-gray-500 italic py-6 text-center">No recent activities.</p>
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
                  <div key={log.id} className="flex gap-3 p-3 rounded-lg border border-gray-50 card-hover shadow-sm hover:shadow-md transition-all duration-100">
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
    </div>
  );
};

export default AdminDashboard;



