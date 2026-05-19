import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, UserPlus, Trash2, Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';




const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const USERS_PER_PAGE = 10;

const UserRoles = () => {
  const [usersList, setUsersList] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [errorChartData, setErrorChartData] = useState([]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    const calculateErrorData = () => {
      const baseData = [
        { t: 'Week 1', v: 12 },
        { t: 'Week 2', v: 15 },
        { t: 'Week 3', v: 8 },
        { t: 'Week 4', v: 5 } // Current week base
      ];
      const feedbackList = JSON.parse(localStorage.getItem('smartgrade_feedback') || '[]');
      // Add feedback clicks to the current week
      baseData[3].v += feedbackList.length;
      setErrorChartData(baseData);
    };

    calculateErrorData();
    window.addEventListener('feedback_added', calculateErrorData);
    return () => window.removeEventListener('feedback_added', calculateErrorData);
  }, []);

  const getSortedUsers = () => {
    if (sortBy === 'department') {
      return [...usersList].sort((a, b) => (a.dept || '').localeCompare(b.dept || ''));
    } else if (sortBy === 'role') {
      return [...usersList].sort((a, b) => (a.role || '').localeCompare(b.role || ''));
    }
    return usersList;
  };

  const sortedUsers = getSortedUsers();
  const totalUserPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PER_PAGE));
  const paginatedUsers = sortedUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE
  );

  // Week picker: default to Monday of the current week
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const [weekStart, setWeekStart] = useState(() => {
    const m = getMonday(new Date());
    return m.toISOString().split('T')[0];
  });

  const confirmDelete = async () => {
    if (confirmText !== 'Confirm' || !userToDelete) return;
    setDeleting(true);
    try {
      if (userToDelete.rawId) {
        const response = await fetch(`http://localhost:5000/api/users/${userToDelete.rawId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setUsersList(usersList.filter(u => u.rawId !== userToDelete.rawId));
          // Re-fetch activity after deletion
          fetchActivity();
        }
      } else {
        // Just remove from local state if it's a hardcoded mock user without rawId
        setUsersList(usersList.filter(u => u.id !== userToDelete.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      setConfirmText('');
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users');
        if (response.ok) {
          const data = await response.json();
          const dbUsers = data.map((u) => {
            let roleName = u.system_role.toUpperCase();
            if (u.system_role === 'dean') roleName = 'COLLEGE DEAN';
            if (u.system_role === 'sysadmin') roleName = 'SYSTEM ADMIN';
            if (u.system_role === 'registrar') roleName = 'REGISTRAR';
            
            let color = '#f5a623';
            if (u.system_role === 'sysadmin') color = '#1a2233';
            if (u.system_role === 'registrar') color = '#9ca3af';

            let customDots = [];
            if (u.permissions_profile === 'read_only') {
              customDots = ['#22c55e'];
            } else if (u.permissions_profile === 'create_update') {
              customDots = ['#22c55e', '#f97316'];
            } else if (u.permissions_profile === 'manage') {
              customDots = ['#22c55e', '#f97316', '#ef4444'];
            } else {
              customDots = ['#e5e0d5'];
            }

            return {
              id: `USR-${u.id.substring(0,4).toUpperCase()}`,
              rawId: u.id,
              name: u.full_name,
              dept: u.department || 'N/A',
              role: roleName,
              roleColor: color,
              customDots: customDots,
              systemRole: u.system_role,
              createdAt: u.created_at
            };
          });
          setUsersList(dbUsers);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

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

  useEffect(() => {
    fetchActivity();
  }, []);

  return (
  <div>
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">User &amp; Role Management</h1>
      <Link
        to="/admin/users/create"
        className="w-20 h-10 rounded-full flex items-center justify-center text-white shadow-md shrink-0 transition-transform hover:scale-105"
        style={{ background: '#1a2233' }}
      >
        <UserPlus size={16} />
      </Link>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
      {/* User Table */}
      <div className="col-span-2">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>Global User Provisioning &amp; Roles</h2>
              <span className="text-xs text-gray-400">(Master Control)</span>
            </div>
            <div className="flex gap-2 relative">
              <button className="p-1.5 rounded border text-gray-500 hover:bg-gray-50 transition-colors" style={{ borderColor: '#e5e0d5' }}>≡</button>
              <button 
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className="flex items-center gap-1.5 p-1.5 px-3 rounded border text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors" 
                style={{ borderColor: '#e5e0d5' }}
              >
                <Filter size={14} /> Filter
              </button>

              {filterDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-[#e5e0d5] rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-[#e5e0d5]">Sort Options</div>
                  <button
                    onClick={() => { setSortBy('department'); setFilterDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 ${sortBy === 'department' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                  >
                    Sort by Department
                  </button>
                  <button
                    onClick={() => { setSortBy('role'); setFilterDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 ${sortBy === 'role' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                  >
                    Sort by Role
                  </button>
                  <button
                    onClick={() => { setSortBy('default'); setFilterDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 border-t border-[#f0ede6] mt-1 ${sortBy === 'default' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-500 font-medium'}`}
                  >
                    Clear Sorting
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="table-responsive"><table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                {['USER ID', 'NAME', 'DEPARTMENT', 'ROLE', 'PERMISSIONS'].map((h) => (
                  <th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                  <td className="py-3 pr-3 text-gray-400">{u.id}</td>
                  <td className="py-3 pr-3 font-bold text-gray-900">{u.name}</td>
                  <td className="py-3 pr-3 text-gray-500">{u.dept}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {u.role.split(' ').reduce((acc, word, i, arr) => {
                        if (i === 0 && arr.length > 2) {
                          acc.push(
                            <span key="a" className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>
                              {arr.slice(0, 2).join(' ')}
                            </span>
                          );
                        } else if (i === 2) {
                          acc.push(
                            <span key="b" className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>
                              {arr.slice(2).join(' ')}
                            </span>
                          );
                        }
                        return acc;
                      }, [])}
                      {u.role.split(' ').length <= 2 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: u.roleColor }}>{u.role}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {u.customDots && u.customDots.map((color, i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        ))}
                      </div>
                      <button 
                        onClick={() => {
                          setUserToDelete(u);
                          setConfirmText('');
                          setDeleteModalOpen(true);
                        }}
                        className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50"
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
            <span className="text-gray-400">Showing {Math.min((userPage - 1) * USERS_PER_PAGE + 1, usersList.length)}–{Math.min(userPage * USERS_PER_PAGE, usersList.length)} of {usersList.length} users</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: '#e5e0d5' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-gray-500 font-medium">Page {userPage} of {totalUserPages}</span>
              <button
                onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                disabled={userPage === totalUserPages}
                className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ borderColor: '#e5e0d5' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: User Flow Stats */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <h2 className="text-sm font-bold text-gray-900 mb-1">Institutional User Flow &amp; Permissions</h2>
          <p className="text-[10px] text-gray-400 mb-4 uppercase tracking-widest">(Audit Trail Funnel)</p>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Total Onboarded', value: usersList.length },
              { label: 'System Admins', value: usersList.filter(u => u.systemRole === 'sysadmin').length },
              { label: 'Registrar', value: usersList.filter(u => u.systemRole === 'registrar').length },
              { label: 'Dean', value: usersList.filter(u => u.systemRole === 'dean').length },
              { label: 'Teacher', value: usersList.filter(u => u.systemRole === 'teacher').length },
              { label: 'Students', value: usersList.filter(u => u.systemRole === 'student').length },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 rounded-lg text-white" style={{ background: '#1a2233' }}>
                <span className="text-xs">{label}</span>
                <span className="text-lg font-extrabold" style={{ color: '#f5a623' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity — separate card */}
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">{activityLog.length} total</span>
          </div>
          {activityLog.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No activity recorded yet.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {(showAllActivity ? activityLog : activityLog.slice(0, 5)).map((a, idx) => {
                  const isCreate = a.action.toLowerCase().includes('created');
                  const isDelete = a.action.toLowerCase().includes('deleted');
                  const dotColor = isCreate ? 'bg-green-400' : isDelete ? 'bg-red-400' : 'bg-yellow-400';
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(a.created_at).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'Just now';
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    const days = Math.floor(hrs / 24);
                    return `${days}d ago`;
                  })();
                  return (
                    <div key={a.id || idx} className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#f0ede6' }}>
                      <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800">{a.action}</div>
                        <div className="text-gray-500 text-[10px] truncate">{a.details}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5">{timeAgo} · {a.user_name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {activityLog.length > 5 && (
                <button
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 py-2 rounded-lg transition-colors hover:bg-[#f0ede6]"
                >
                  {showAllActivity ? (
                    <><ChevronUp size={14} /> Show less</>
                  ) : (
                    <><ChevronDown size={14} /> Show all {activityLog.length} activities</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Bottom charts */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Current Active Users */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Current Active Users</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Weekly Activity Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="text-xs px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] border-[#e5e0d5] text-gray-700"
            />
          </div>
        </div>
        {(() => {
          const ws = new Date(weekStart + 'T00:00:00');
          const weekData = DAY_LABELS.map((label, i) => {
            const dayDate = new Date(ws);
            dayDate.setDate(ws.getDate() + i);
            const dayStr = dayDate.toISOString().split('T')[0];
            const count = usersList.filter(u => {
              if (!u.rawId) return false;
              // Find the raw user's created_at from the fetched data
              const created = u.createdAt;
              if (!created) return false;
              return created.split('T')[0] === dayStr;
            }).length;
            const dateNum = dayDate.getDate();
            return { day: `${label} ${dateNum}`, users: count };
          });
          const maxVal = Math.max(...weekData.map(d => d.users), 1);
          return (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekData} barCategoryGap="20%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }}
                    formatter={(value) => [`${value} user${value !== 1 ? 's' : ''}`, 'Active']}
                  />
                  <Bar dataKey="users" fill="#f5a623" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 px-1">
                <span>Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="font-semibold" style={{ color: '#f5a623' }}>{weekData.reduce((sum, d) => sum + d.users, 0)} total this week</span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Error trend */}
      <div className="rounded-xl p-5 shadow-sm relative" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">Error Reporting Trend</h2>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={errorChartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
            <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
            <Line type="monotone" dataKey="v" stroke="#f5a623" strokeWidth={2.5} dot={{ r: 4, fill: '#f5a623' }} />
          </LineChart>
        </ResponsiveContainer>


      </div>
      </div>
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">Please Type <strong>Confirm</strong> to delete</label>
              <input 
                type="text" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Confirm"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                  setConfirmText('');
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={confirmText !== 'Confirm' || deleting}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                  confirmText === 'Confirm' && !deleting 
                    ? 'bg-red-600 hover:bg-red-700 shadow-md' 
                    : 'bg-red-300 cursor-not-allowed'
                }`}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoles;
