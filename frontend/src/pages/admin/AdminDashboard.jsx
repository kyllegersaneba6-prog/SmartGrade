import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Activity, Clock, CheckCircle, Trash2, RefreshCw, UsersRound, GraduationCap, UserRoundCheck, UserRoundX, Filter, Check } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import api from '../../utils/api';
import { splitUpdateDescription, isSentenceDescription } from '../../utils/auditText';
import { SkeletonMetricCards, SkeletonTable, SkeletonList } from '../../components/common/Skeleton';
import AdminPageHeading from '../../components/admin/AdminPageHeading';

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
            const res = await api('/api/users');
            if (res.ok) { const data = await res.json(); setTeachers(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api('/api/activity');
            if (res.ok) { const data = await res.json(); setActivityLog(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api('/api/assignments');
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
            const deptRes = await api('/api/departments');
            if (deptRes.ok) {
              const depts = await deptRes.json();
              const match = depts.find(d => d.name === user.department);
              if (match) {
                const coursesRes = await api(`/api/courses?department_id=${match.id}`);
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

  const [filterOpen, setFilterOpen] = useState(false);
  const [actionFilter, setActionFilter] = useState('ALL');

  const ACTION_FILTERS = [
    { value: 'ALL', label: 'ALL ACTIVITIES' },
    { value: 'CREATED', label: 'CREATED' },
    { value: 'UPDATED', label: 'UPDATED' },
    { value: 'DELETED', label: 'DELETED' },
    { value: 'FAILED', label: 'FAILED LOGINS' },
    { value: 'SUCCESSFUL', label: 'SUCCESSFUL LOGINS' },
  ];

  const filteredActivities = activityLog.filter(log => {
    switch (actionFilter) {
      case 'CREATED': return log.action.toLowerCase().includes('created');
      case 'UPDATED': return log.action.toLowerCase().includes('updated');
      case 'DELETED': return log.action.toLowerCase().includes('deleted');
      case 'FAILED': return log.action.toLowerCase().includes('failed login');
      case 'SUCCESSFUL': return log.action.toLowerCase().includes('successful login');
      default: return true;
    }
  });

  const activityLogToDisplay = filteredActivities;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeading
        eyebrow="Dashboard"
        title={`Welcome, ${JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Admin'}`}
        description="Manage departments, teachers, and monitor activity logs."
      />

      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {initialLoading ? (
          <div className="md:col-span-3" aria-busy="true"><SkeletonMetricCards count={3} /></div>
        ) : (
        <>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Total Teachers</span>
            <div className="text-3xl font-extrabold text-[#142a3f]">{teachers.length}</div>
            <span className="text-[11px] text-gray-900">Registered faculty members</span>
          </div>
          <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#142a3f15', color: '#142a3f' }}><UsersRound size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Courses</span>
            <div className="text-3xl font-extrabold text-[#142a3f]">{coursesCount}</div>
            <span className="text-[11px] text-gray-900">Active courses</span>
          </div>
          <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#142a3f15', color: '#142a3f' }}><GraduationCap size={24} /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 card-hover flex items-center justify-between hover:shadow-md transition-all duration-300">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {initialLoading ? (
          <>
            <div className="lg:col-span-4" aria-busy="true"><SkeletonTable cols={2} rows={5} /></div>
            <div className="lg:col-span-8" aria-busy="true"><SkeletonList rows={4} avatar /></div>
          </>
        ) : (
        <>
        <div className="lg:col-span-4 rounded-2xl p-5 shadow-sm self-start border border-gray-200 card-hover bg-white">
          <h2 className="text-base font-bold mb-4" style={{ color: '#0c1925' }}>Teacher Overview</h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-6 text-center">No teachers registered yet.</p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1">
              <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="border-b sticky top-0 bg-gray-50 z-10" style={{ borderColor: '#e5e7eb' }}>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Name</th>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wide">Subjects Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
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
          {teachers.length > 0 && <p className="text-xs text-gray-400 mt-3">Total: {teachers.length} teachers</p>}
        </div>

        <div className="lg:col-span-8 rounded-2xl p-5 shadow-sm border border-gray-200 card-hover bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Recent Activities</h2>
            <div className="relative">
              <button onClick={() => setFilterOpen(o => !o)} className="p-1.5 rounded flex items-center gap-1" title="Filter by action">
                <Filter size={16} className={actionFilter === 'ALL' ? 'text-black' : 'text-[#0c1925]'} />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-100 bg-white shadow-xl z-20 py-1">
                    {ACTION_FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => { setActionFilter(f.value); setFilterOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wide hover:bg-gray-50 ${actionFilter === f.value ? 'text-[#0c1925]' : 'text-gray-500'}`}
                      >
                        {f.label}
                        {actionFilter === f.value && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {activityLogToDisplay.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-6 text-center">No recent activities found.</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
              {activityLogToDisplay.map((log) => {
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const isOwn = log.user_name === currentUser?.username;
                const diff = Date.now() - new Date(log.created_at).getTime();
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);
                const weeks = Math.floor(days / 7);

                let timeAgo;
                if (minutes < 1) timeAgo = 'Just now';
                else if (minutes < 60) timeAgo = `${minutes}m ago`;
                else if (hours < 24) timeAgo = `${hours}h ago`;
                else if (days < 7) timeAgo = `${days}d ago`;
                else timeAgo = `${weeks}w ago`;
                const isCreate = log.action.toLowerCase().includes('created');
                const isDelete = log.action.toLowerCase().includes('deleted');
                const isFailed = log.action.toLowerCase().includes('failed login');
                const isSuccess = log.action.toLowerCase().includes('successful login');
                const isUpdate = log.action.toLowerCase().includes('updated');
                // The "You …" rewrite only reads correctly on the legacy
                // verb-first format — sentence-style descriptions stand alone.
                const actorText = isOwn && !isSentenceDescription(log.details)
                  ? `You ${String(log.details).charAt(0).toLowerCase() + String(log.details).slice(1)}`
                  : log.details;
                const split = isUpdate ? splitUpdateDescription(actorText) : null;
                const Icon = isCreate ? CheckCircle : isDelete ? Trash2 : isFailed ? UserRoundX : isSuccess ? UserRoundCheck : isUpdate ? RefreshCw : Activity;
                const iconColor = isCreate || isSuccess ? '#22c55e' : isDelete || isFailed ? '#ef4444' : isUpdate ? '#142a3f' : '#142a3f';
                const bg = isCreate || isSuccess ? '#f0fdf4' : isDelete || isFailed ? '#fef2f2' : isUpdate ? '#e0f2fe' : '#e0f2fe';

                return (
                  <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-gray-200 card-hover shadow-sm hover:shadow-md transition-all duration-100">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}><Icon size={14} style={{ color: iconColor }} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-gray-800 text-xs sm:text-sm">{log.action}</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-900 whitespace-nowrap"><Clock size={10} /> {timeAgo}</span>
                      </div>
                      <p className="text-[12px] text-gray-700 mb-1 break-words whitespace-normal" title={actorText}>
                        {split ? (
                          <>
                            {split.head}
                            <br />
                            <span>{split.label} {split.tail}</span>
                          </>
                        ) : (
                          <span className="block truncate">{actorText}</span>
                        )}
                      </p>
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



