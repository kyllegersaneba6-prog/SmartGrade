import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ArrowRight, FileText, Cpu, Network, Shield, Users, UserGroup, GraduationCap, BookOpen, ShieldCheck, ShieldUser, Clock, Activity, Bell, DatabaseBackup, Download, FilePenLine, Import, CheckCircle, Trash2, Megaphone, Send, AlertTriangle, RefreshCw, User, UserRoundCheck, UserRoundX, Equal, Archive } from 'lucide-react';
import api from '../../utils/api';
import { splitUpdateDescription } from '../../utils/auditText';
import { SkeletonMetricCards, SkeletonTable, SkeletonList } from '../../components/common/Skeleton';
import SuperAdminPageHeading from '../../components/superadmin/SuperAdminPageHeading';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 card-hover hover:shadow-md">
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{title}</span>
      <div className="text-3xl font-extrabold text-[#1a2233]">{value}</div>
      {subtitle && <span className="text-[11px] text-gray-900">{subtitle}</span>}
    </div>
    <div className="p-3.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color: color }}>
      <Icon size={24} />
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const { isArchiveMode, currentTerm, archiveApiUrl } = useSuperAdmin();
  const [staffUsers, setStaffUsers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [liveDeptNames, setLiveDeptNames] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState({ title: '', content: '', urgency: 'Not Urgent', audience: ['Admins', 'Teachers'] });
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifPosting, setNotifPosting] = useState(false);



  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        (async () => {
          try {
            const res = await api(archiveApiUrl('/api/users'));
            if (res.ok) { const data = await res.json(); setStaffUsers(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api(archiveApiUrl('/api/activity'));
            if (res.ok) { const data = await res.json(); setActivityLog(data); }
          } catch (err) { console.error(err); }
        })(),
        (async () => {
          try {
            const res = await api(archiveApiUrl('/api/departments'));
            if (res.ok) {
              const data = await res.json();
              setLiveDeptNames(new Set(data.map((d) => String(d.name || '').trim().toLowerCase())));
            }
          } catch (err) { console.error(err); }
        })(),
      ]);
    } catch (err) { console.error(err); }
  }, [archiveApiUrl]);

  useEffect(() => { loadData().finally(() => setInitialLoading(false)); }, [loadData]);

  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [loadData]);

  const handlePostNotification = async (e) => {
    e.preventDefault();
    const title = notification.title.trim();
    const content = notification.content.trim();
    if (!title || !content || notification.audience.length === 0) {
      setNotifError('Enter a title and message, and select at least one audience.');
      return;
    }

    setNotifPosting(true);
    setNotifError('');
    setNotifSuccess('');
    try {
      const response = await api('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          urgency: notification.urgency,
          audience: notification.audience.map((role) => role === 'Admins' ? 'admin' : 'teacher'),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to send notification.');

      const recipientCount = data.notification?.recipient_count || 0;
      setNotifSuccess(`Notification sent to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`);
      setNotification({ title: '', content: '', urgency: 'Not Urgent', audience: ['Admins', 'Teachers'] });
      window.setTimeout(() => setNotifSuccess(''), 4000);
    } catch (error) {
      setNotifError(error.message || 'Network error. Please try again.');
    } finally {
      setNotifPosting(false);
    }
  };

  const deptMap = {};
  staffUsers.forEach(u => {
    const raw = String(u.department || '').trim();
    // Only departments that still exist get a row — users stranded by a
    // deleted department (or with no department) are excluded entirely.
    if (liveDeptNames && !liveDeptNames.has(raw.toLowerCase())) return;
    const dept = raw || 'Unassigned';
    if (!deptMap[dept]) deptMap[dept] = { admins: 0, teachers: 0 };
    if (u.system_role === 'teacher') deptMap[dept].teachers++;
    else if (u.system_role === 'admin') deptMap[dept].admins++;
  });
  const departments = Object.entries(deptMap).map(([name, counts]) => ({ name, ...counts, total: counts.teachers + counts.admins }));
  const totals = { teachers: departments.reduce((s, d) => s + d.teachers, 0), admins: departments.reduce((s, d) => s + d.admins, 0) };
  const totalAccounts = staffUsers.filter((user) => user.system_role !== 'superadmin').length;

  return (
  <div className="mx-auto w-full max-w-7xl space-y-6">
    <SuperAdminPageHeading
      eyebrow="System overview"
      title="Dashboard"
      description={isArchiveMode
        ? `Read-only overview for ${currentTerm?.school_year} — ${currentTerm?.semester}.`
        : 'Monitor registered users, department distribution, system activities, and broadcast announcements.'}
    />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {initialLoading ? (
        <div className="col-span-2 lg:col-span-4" aria-busy="true"><SkeletonMetricCards count={4} /></div>
      ) : (
      <>
      <MetricCard title="Total Accounts" value={totalAccounts} icon={UserGroup} color="#142a3f" subtitle="Registered members" />
      <MetricCard title="Faculty Members" value={totals.teachers} icon={Users} color="#142a3f" subtitle="Teachers" />
      <MetricCard title="Admin Accounts" value={totals.admins} icon={ShieldUser} color="#142a3f" subtitle="Admins" />
      <MetricCard title="Audit logs" value={activityLog.length} icon={Activity} color="#142a3f" subtitle="Events logged" />
      </>
      )}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {initialLoading ? (
        <>
          <div className="lg:col-span-2" aria-busy="true"><SkeletonTable cols={3} rows={5} /></div>
          <div aria-busy="true"><SkeletonList rows={4} avatar /></div>
        </>
      ) : (
      <>
      <div className="lg:col-span-2 flex flex-col gap-5">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#0c1925' }}>Department User Overview</h2>
              <p className="text-[10px] text-gray-900 uppercase tracking-widest mt-0.5">Users per category by department</p>
            </div>
          </div>
          {departments.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-6 text-center">No users registered yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-44 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-600">Department</th>
                    {[{ label: 'Teachers', icon: Users }, { label: 'Admins', icon: ShieldCheck }].map(({ label, icon: Icon }) => (
                      <th key={label} className="px-2 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1"><Icon size={14} className="text-gray-500" /><span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">{label}</span></div>
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1"><Equal size={14} className="text-gray-500" /><span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">Total</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.name} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                      <td className="px-3 py-3 text-xs font-semibold text-gray-700">{dept.name}</td>
                      {[dept.teachers, dept.admins].map((value, i) => (
                        <td key={i} className="py-3 px-2 text-center">
                          <span
                            className="inline-block w-10 py-1 rounded-md text-xs font-bold border"
                            style={value > 0
                              ? { background: '#e5e7eb', color: '#111827', borderColor: '#d1d5db' }
                              : { background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}
                            title={value === 0 ? 'No users in this category yet' : undefined}
                          >{value}</span>
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center"><span className="inline-block w-10 py-1 rounded-md text-xs font-bold text-white" style={{ background: '#111827' }}>{dept.total}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm card-hover sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm sm:text-base font-bold" style={{ color: '#0c1925' }}>Recent Activities</h2>
          </div>
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
            {activityLog.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-6 text-center">No recent activities found.</p>
            ) : (
              activityLog.slice(0, 10).map((log) => {
                const isCreate = log.action.toLowerCase().includes('created');
                const isDelete = log.action.toLowerCase().includes('deleted');
                const isFailed = log.action.toLowerCase().includes('failed login');
                const isSuccess = log.action.toLowerCase().includes('successful login');
                const isUpdate = log.action.toLowerCase().includes('updated');
                const isNotificationBroadcast = log.action.toLowerCase() === 'notification broadcasted';
                const isBackupAction = ['backup exported', 'backup imported', 'backup restored'].includes(log.action.toLowerCase());
                const isTeacherExport = /^teacher (class record|grade summary) exported$/i.test(log.action);
                const isTeacherClassListImport = /^teacher class list imported$/i.test(log.action);
                const isExportSignatoriesUpdate = log.action.toLowerCase() === 'export signatories updated';
                const Icon = isBackupAction ? DatabaseBackup : isNotificationBroadcast ? Bell : isTeacherClassListImport ? Import : isTeacherExport ? Download : isExportSignatoriesUpdate ? FilePenLine : isCreate ? CheckCircle : isDelete ? Trash2 : isFailed ? UserRoundX : isSuccess ? UserRoundCheck : isUpdate ? RefreshCw : Activity;
                const iconColor = isSuccess || isFailed ? '#000000' : isCreate ? '#22c55e' : isDelete ? '#ef4444' : isUpdate ? '#142a3f' : '#142a3f';
                const bg = isSuccess || isFailed || isTeacherExport || isTeacherClassListImport ? '#f3f4f6' : isCreate ? '#f0fdf4' : isDelete ? '#fef2f2' : isUpdate ? '#e0f2fe' : '#e0f2fe';
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
                const actor = staffUsers.find((u) => u.username === log.user_name || u.full_name === log.user_name);
                const actorLabel = (actor && actor.system_role === 'superadmin') || String(log.user_name || '').trim().toLowerCase() === 'admin'
                  ? 'SUPER ADMIN'
                  : log.user_name;
                return (
                  <div key={log.id} className="flex gap-3 p-3 rounded-xl border border-gray-50 card-hover shadow-sm hover:shadow-md transition-all duration-100">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: bg }}><Icon size={14} style={{ color: iconColor }} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-gray-800 text-xs sm:text-sm">{log.action}</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-900 whitespace-nowrap"><Clock size={10} /> {timeAgo}</span>
                      </div>
                      <p className="text-xs text-gray-900 mb-1 break-words whitespace-normal" title={log.details}>
                        {(() => {
                          const split = log.action.toLowerCase().includes('updated') ? splitUpdateDescription(log.details) : null;
                          return split ? (
                            <>
                              {split.head}
                              <br />
                              <span>{split.label} {split.tail}</span>
                            </>
                          ) : (
                            <span className="block truncate">{log.details}</span>
                          );
                        })()}
                      </p>
                      <p className="text-[10px] font-medium tracking-widest text-gray-600 uppercase">BY {actorLabel}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="h-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm card-hover">
          {isArchiveMode ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Archive size={20} /></div>
              <h2 className="text-sm font-bold text-gray-900">Archived View</h2>
              <p className="mt-1 max-w-xs text-xs text-gray-600">Broadcast notifications are unavailable while viewing a past semester.</p>
            </div>
          ) : (
          <>
          <div className="flex items-center gap-2 mb-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-gray-50"><Megaphone size={16} className="text-sidebar" /></span><h2 className="text-sm font-bold" style={{ color: '#0c1925' }}>Broadcast Notification</h2></div>
          <p className="text-[11px] mb-5 text-slate-500">Send an update or alert to Users (Teachers, Admins).</p>
          <form onSubmit={handlePostNotification} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Audience</label>
              <div className="flex flex-col gap-2 p-3 border rounded-xl bg-gray-50 border-gray-200">
                {['Admins', 'Teachers'].map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-900">
                    <input type="checkbox" checked={notification.audience.includes(role)} onChange={(e) => { let newAudience = [...notification.audience]; if (e.target.checked) newAudience.push(role); else newAudience = newAudience.filter(item => item !== role); setNotification({ ...notification, audience: newAudience }); }} className="rounded border-gray-300 text-[#0c1925] focus:ring-[#0c1925] w-4 h-4 cursor-pointer accent-[#0c1925]" />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Title</label>
              <input type="text" placeholder="Notification Title" value={notification.title} maxLength={160} onChange={(e) => setNotification({ ...notification, title: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] bg-white text-gray-900" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">Message</label>
              <textarea placeholder="Write your message here..." value={notification.content} maxLength={2000} onChange={(e) => setNotification({ ...notification, content: e.target.value })} className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c1925] bg-white text-gray-900 resize-none h-24" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-2">Urgency Level</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value="Not Urgent" checked={notification.urgency === 'Not Urgent'} onChange={(e) => setNotification({ ...notification, urgency: e.target.value })} className="accent-[#0c1925]" /><span className="text-xs text-gray-900">Not Urgent</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="urgency" value="Urgent" checked={notification.urgency === 'Urgent'} onChange={(e) => setNotification({ ...notification, urgency: e.target.value })} className="accent-[#0c1925]" /><span className="text-xs text-gray-900 font-semibold flex items-center gap-1"><AlertTriangle size={14} /> Urgent</span></label>
              </div>
            </div>
            <button type="submit" className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: '#0c1925' }} disabled={!notification.title.trim() || !notification.content.trim() || notification.audience.length === 0 || notifPosting}><Send size={14} /> {notifPosting ? 'SENDING…' : 'POST NOTIFICATION'}</button>
            {notifError && <div role="alert" className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs font-medium text-red-700">{notifError}</div>}
            {notifSuccess && <div role="status" className="mt-2 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-2 text-xs font-medium text-green-700"><CheckCircle size={14} /> {notifSuccess}</div>}
          </form>
          </>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  </div>
  );
};

export default SuperAdminDashboard;

