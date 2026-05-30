import React, { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, Activity, Clock, GraduationCap } from 'lucide-react';

const AdminDashboard = () => {
  const [teachers, setTeachers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [activeTerm, setActiveTerm] = useState(null);
  const [coursesCount, setCoursesCount] = useState(0);
  const [subjectCounts, setSubjectCounts] = useState({});

  const getToken = () => localStorage.getItem('token');
  const api = (url) => fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } });

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
            const res = await api('http://localhost:5000/api/terms/active');
            if (res.ok) setActiveTerm(await res.json());
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [loadData]);

  const recentActivity = activityLog.slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-sidebar to-sidebar-hover p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <Users size={160} className="absolute -right-8 -bottom-8 opacity-10 text-white" />
        <div className="relative z-10 space-y-4">
          <span className="text-[10px] bg-gold/20 text-gold border border-gold/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">ADMIN PORTAL</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">Welcome, {JSON.parse(localStorage.getItem('user') || '{}')?.full_name || 'Admin'}</h2>
          {(JSON.parse(localStorage.getItem('user') || '{}')?.department) && (
            <p className="text-xs text-gold font-semibold mt-1">{JSON.parse(localStorage.getItem('user') || '{}').department}</p>
          )}
          <p className="text-gray-300 text-sm max-w-xl leading-relaxed mt-2">Manage teacher accounts, monitor activity, and oversee academic operations.</p>
        </div>
      </div>

      {activeTerm && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Active Term</span>
            <span className="text-sm font-semibold text-gray-800">{activeTerm.school_year} — {activeTerm.semester}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Teachers</span>
            <div className="p-2 rounded-lg" style={{ background: '#f0fdf4' }}><BookOpen size={18} className="text-green-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#1a2233]">{teachers.length}</div>
          <span className="text-[11px] text-gray-500">Registered faculty members</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Courses</span>
            <div className="p-2 rounded-lg" style={{ background: '#e0f2fe' }}><BookOpen size={18} className="text-sky-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#1a2233]">{coursesCount}</div>
          <span className="text-[11px] text-gray-500">Active courses</span>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity</span>
            <div className="p-2 rounded-lg" style={{ background: '#ede9fe' }}><Activity size={18} className="text-purple-600" /></div>
          </div>
          <div className="text-3xl font-extrabold text-[#1a2233]">{activityLog.length}</div>
          <span className="text-[11px] text-gray-500">Total events logged</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#f5a623' }}>Teacher Overview</h2>
          {teachers.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No teachers registered yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Name</th>
                    <th className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">Subjects Taught</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.slice(0, 8).map((t) => (
                    <tr key={t.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                      <td className="py-3 pr-3 font-bold text-gray-900">{t.full_name}</td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <GraduationCap size={12} /> {subjectCounts[t.id] || 0}
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

        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: '#f5a623' }}>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No recent activities.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentActivity.map((log) => {
                const diff = Date.now() - new Date(log.created_at).getTime();
                const mins = Math.floor(diff / 60000);
                const timeAgo = mins < 1 ? 'Just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                return (
                  <div key={log.id} className="flex gap-3 p-3 rounded-lg border" style={{ borderColor: '#f0ede6' }}>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-800 text-xs">{log.action}</span>
                      <p className="text-[10px] text-gray-500 truncate">{log.details}</p>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5"><Clock size={10} /> {timeAgo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
