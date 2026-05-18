import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ArrowRight, FileText, Cpu, Network, Shield, Users, GraduationCap, BookOpen, ShieldCheck, Filter, Clock, Activity, CheckCircle, Trash2, Bell, Send, AlertTriangle } from 'lucide-react';


const GlobalAnalytics = () => {
  const [staffUsers, setStaffUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [activityFilter, setActivityFilter] = useState('All');
  const [notification, setNotification] = useState({ title: '', content: '', urgency: 'Not Urgent', audience: 'All' });
  const [notifSuccess, setNotifSuccess] = useState(false);

  const handlePostNotification = (e) => {
    e.preventDefault();
    if (!notification.title || !notification.content) return;
    
    // Simulate posting notification
    console.log('Posting Notification:', notification);
    setNotifSuccess(true);
    setNotification({ title: '', content: '', urgency: 'Not Urgent', audience: 'All' });
    
    setTimeout(() => {
      setNotifSuccess(false);
    }, 3000);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/users');
        if (res.ok) {
          const data = await res.json();
          setStaffUsers(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    const fetchActivity = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/activity');
        if (res.ok) {
          const data = await res.json();
          setActivityLog(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
    fetchActivity();
  }, []);

  // Group users by department
  const deptMap = {};
  staffUsers.forEach(u => {
    const dept = u.department || 'Unassigned';
    if (!deptMap[dept]) deptMap[dept] = { students: 0, teachers: 0, admins: 0, deans: 0 };
    if (u.system_role === 'student') deptMap[dept].students++;
    else if (u.system_role === 'teacher') deptMap[dept].teachers++;
    else if (u.system_role === 'sysadmin' || u.system_role === 'registrar') deptMap[dept].admins++;
    else if (u.system_role === 'dean') deptMap[dept].deans++;
  });
  const departments = Object.entries(deptMap).map(([name, counts]) => ({ name, ...counts, total: counts.students + counts.teachers + counts.admins + counts.deans }));
  const totals = { students: departments.reduce((s, d) => s + d.students, 0), teachers: departments.reduce((s, d) => s + d.teachers, 0), admins: departments.reduce((s, d) => s + d.admins, 0), deans: departments.reduce((s, d) => s + d.deans, 0) };

  return (
  <div>
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>Dashboard</h1>
        <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#6b7280' }}>
          Comprehensive Institutional performance oversight and trend forecasting.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span
          className="text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap"
          style={{ borderColor: '#d1c9ba', color: '#6b7280' }}
        >
          ACADEMIC YEAR 2026-2027
        </span>
        <span
          className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-white whitespace-nowrap"
          style={{ background: '#f5a623' }}
        >
          LIVE DATA
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left 2/3 */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        {/* Department Overview Card */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>
                Department User Overview
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Users per category by department</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: '#1a2233' }}>
              {staffUsers.length} TOTAL
            </span>
          </div>

          {departments.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-6 text-center">No users registered yet. Create users to see department breakdowns.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left pb-3 pr-4 font-medium text-gray-400 w-44">Department</th>
                      {[
                        { label: 'Students', icon: GraduationCap, color: '#3b82f6' },
                        { label: 'Teachers', icon: BookOpen, color: '#22c55e' },
                        { label: 'Admins', icon: ShieldCheck, color: '#f97316' },
                        { label: 'Deans', icon: Users, color: '#8b5cf6' },
                      ].map(({ label, icon: Icon, color }) => (
                        <th key={label} className="pb-3 px-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Icon size={14} style={{ color }} />
                            <span className="font-medium text-gray-400">{label}</span>
                          </div>
                        </th>
                      ))}
                      <th className="pb-3 px-2 font-medium text-gray-400 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.name} className="border-t" style={{ borderColor: '#f0ede6' }}>
                        <td className="py-3 pr-4 font-semibold text-gray-700 text-xs">{dept.name}</td>
                        {[{ val: dept.students, bg: '#eff6ff' }, { val: dept.teachers, bg: '#f0fdf4' }, { val: dept.admins, bg: '#fff7ed' }, { val: dept.deans, bg: '#f5f3ff' }].map((cell, i) => (
                          <td key={i} className="py-3 px-2 text-center">
                            <span
                              className="inline-block w-10 py-1 rounded text-xs font-bold"
                              style={{ background: cell.val > 0 ? cell.bg : '#f9fafb', color: cell.val > 0 ? '#1a2233' : '#d1d5db' }}
                            >
                              {cell.val}
                            </span>
                          </td>
                        ))}
                        <td className="py-3 px-2 text-center">
                          <span className="inline-block w-10 py-1 rounded text-xs font-bold text-white" style={{ background: '#1a2233' }}>
                            {dept.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* System Activities */}
        <div className="rounded-xl p-4 sm:p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm sm:text-base font-bold" style={{ color: '#f5a623' }}>
              System Activities
            </h2>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] border-[#e5e0d5] text-gray-700"
              >
                <option value="All">All Activities</option>
                <option value="User Created">Creations</option>
                <option value="User Deleted">Deletions</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
            {activityLog.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-6 text-center">No recent activities found.</p>
            ) : (
              activityLog
                .filter(log => activityFilter === 'All' || log.action === activityFilter)
                .map((log) => {
                  const isCreate = log.action.toLowerCase().includes('created');
                  const isDelete = log.action.toLowerCase().includes('deleted');
                  const Icon = isCreate ? CheckCircle : isDelete ? Trash2 : Activity;
                  const iconColor = isCreate ? '#22c55e' : isDelete ? '#ef4444' : '#f5a623';
                  const bg = isCreate ? '#f0fdf4' : isDelete ? '#fef2f2' : '#fffbeb';
                  
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(log.created_at).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'Just now';
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    const days = Math.floor(hrs / 24);
                    return `${days}d ago`;
                  })();

                  return (
                    <div key={log.id} className="flex gap-3 p-3 rounded-lg border" style={{ borderColor: '#f0ede6' }}>
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}>
                        <Icon size={14} style={{ color: iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-gray-800 text-xs sm:text-sm">{log.action}</span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
                            <Clock size={10} /> {timeAgo}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-1">{log.details}</p>
                        <p className="text-[10px] font-medium tracking-widest text-gray-400 uppercase">
                          BY {log.user_name}
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Right 1/3 - Notification Broadcaster */}
      <div className="flex flex-col gap-5">
        <div className="rounded-xl p-5 shadow-sm h-full" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} style={{ color: '#f5a623' }} />
            <h2 className="text-sm font-bold" style={{ color: '#1a2233' }}>Broadcast Notification</h2>
          </div>
          <p className="text-[11px] mb-5 text-gray-500">
            Send an update or alert to Users (Teachers, Deans, Admins, Students).
          </p>

          <form onSubmit={handlePostNotification} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Audience</label>
              <select
                value={notification.audience}
                onChange={(e) => setNotification({ ...notification, audience: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-white border-[#e5e0d5]"
              >
                <option value="All">All Users</option>
                <option value="Teachers">Teachers Only</option>
                <option value="Deans">Deans Only</option>
                <option value="Admins">Admins Only</option>
                <option value="Students">Students Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Title</label>
              <input
                type="text"
                placeholder="Notification Title"
                value={notification.title}
                onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-white border-[#e5e0d5]"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Message</label>
              <textarea
                placeholder="Write your message here..."
                value={notification.content}
                onChange={(e) => setNotification({ ...notification, content: e.target.value })}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-white border-[#e5e0d5] resize-none h-24"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Urgency Level</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="Not Urgent"
                    checked={notification.urgency === 'Not Urgent'}
                    onChange={(e) => setNotification({ ...notification, urgency: e.target.value })}
                    className="accent-[#f5a623]"
                  />
                  <span className="text-xs text-gray-700">Not Urgent (Update)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="Urgent"
                    checked={notification.urgency === 'Urgent'}
                    onChange={(e) => setNotification({ ...notification, urgency: e.target.value })}
                    className="accent-red-500"
                  />
                  <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} /> Urgent (Pop-up)
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#1a2233' }}
              disabled={!notification.title || !notification.content}
            >
              <Send size={14} />
              POST NOTIFICATION
            </button>

            {notifSuccess && (
              <div className="mt-2 p-2 rounded-lg bg-green-50 border border-green-100 flex items-center gap-2 text-green-700 text-xs font-medium">
                <CheckCircle size={14} />
                Notification broadcasted successfully!
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  </div>
  );
};

export default GlobalAnalytics;
