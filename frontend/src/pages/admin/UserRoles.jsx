import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, UserPlus, Trash2, Calendar, ChevronDown, ChevronUp, Filter, Pencil, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import CreateUser from './CreateUser';




const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const USERS_PER_PAGE = 10;

const UserRoles = () => {
  const [usersList, setUsersList] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [dropdownMode, setDropdownMode] = useState('main');
  const [sortBy, setSortBy] = useState('default');
  const [filterDept, setFilterDept] = useState(null);
  const [filterRole, setFilterRole] = useState(null);
  const [filterCourse, setFilterCourse] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', course: '', department: '', system_role: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const ACTIVITY_PER_PAGE = 10;

  const [feedbackList, setFeedbackList] = useState([]);
  useEffect(() => {
    const fetchFeedback = () => {
      setFeedbackList(JSON.parse(localStorage.getItem('smartgrade_feedback') || '[]'));
    };
    fetchFeedback();
    window.addEventListener('feedback_added', fetchFeedback);
    return () => window.removeEventListener('feedback_added', fetchFeedback);
  }, []);

  const getProcessedUsers = () => {
    let result = [...usersList];
    if (filterDept) {
      result = result.filter(u => u.dept === filterDept);
    }
    if (filterRole) {
      result = result.filter(u => u.role === filterRole);
    }
    if (filterCourse) {
      result = result.filter(u => u.course === filterCourse);
    }
    if (sortBy === 'department') {
      result.sort((a, b) => (a.dept || '').localeCompare(b.dept || ''));
    } else if (sortBy === 'role') {
      result.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
    } else if (sortBy === 'course') {
      result.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
    }
    return result;
  };

  const exportToExcel = () => {
    const exportData = sortedUsers.map(u => ({
      'User ID': u.id,
      'Name': u.name,
      'Course': u.course,
      'Department': u.dept,
      'Role': u.role,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'SmartGrade_Users.xlsx');
  };

  const openEditModal = (u) => {
    setUserToEdit(u);
    setEditForm({
      full_name: u.name,
      course: u.course || '',
      department: u.dept || '',
      system_role: u.systemRole || '',
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!userToEdit?.rawId) return;
    setEditLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userToEdit.rawId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setUsersList(prev => prev.map(u => {
          if (u.rawId !== userToEdit.rawId) return u;
          let roleName = updated.system_role.toUpperCase();
          if (updated.system_role === 'dean') roleName = 'COLLEGE DEAN';
          if (updated.system_role === 'sysadmin') roleName = 'SYSTEM ADMIN';
          if (updated.system_role === 'registrar') roleName = 'REGISTRAR';
          let color = '#f5a623';
          if (updated.system_role === 'sysadmin') color = '#1a2233';
          if (updated.system_role === 'registrar') color = '#9ca3af';
          let customDots = [];
          if (updated.permissions_profile === 'read_only') customDots = ['#22c55e'];
          else if (updated.permissions_profile === 'create_update') customDots = ['#22c55e', '#f97316'];
          else if (updated.permissions_profile === 'manage') customDots = ['#22c55e', '#f97316', '#ef4444'];
          else customDots = ['#e5e0d5'];
          return { ...u, name: updated.full_name, course: (updated.course === 'BSIT' || updated.course === 'Bachelor of Science in Information Technology (BSIT)') ? 'College of Information and Communication Technology (CICT)' : (updated.course || 'N/A'), dept: updated.department === 'CICT' ? 'College of Information and Communication Technology (CICT)' : (updated.department || 'N/A'), role: roleName, roleColor: color, customDots, systemRole: updated.system_role };
        }));
        fetchActivity();
        setEditModalOpen(false);
        setUserToEdit(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const sortedUsers = getProcessedUsers();
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
  
  const getLocalYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };


  const [errorWeekStart, setErrorWeekStart] = useState(() => {
    const m = getMonday(new Date());
    return getLocalYMD(m);
  });

  const totalActivityPages = Math.max(1, Math.ceil(activityLog.length / ACTIVITY_PER_PAGE));
  const paginatedActivity = activityLog.slice(
    (activityPage - 1) * ACTIVITY_PER_PAGE,
    activityPage * ACTIVITY_PER_PAGE
  );

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

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users');
      if (response.ok) {
        const data = await response.json();
        const dbUsers = data.map((u) => {
          let roleName = u.system_role.toUpperCase();
          if (u.system_role === 'dean') roleName = 'COLLEGE DEAN';
          if (u.system_role === 'sysadmin') roleName = 'SUPER ADMIN';
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
            dept: u.department === 'CICT' ? 'College of Information and Communication Technology (CICT)' : (u.department || 'N/A'),
            course: (u.course === 'BSIT' || u.course === 'Bachelor of Science in Information Technology (BSIT)') ? 'College of Information and Communication Technology (CICT)' : (u.course || 'N/A'),
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

  useEffect(() => {
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
  <div className="space-y-6 max-w-7xl mx-auto">
    {/* Header */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#f5a623' }}>User & Role Management</h1>
        <p className="text-xs sm:text-sm mt-0.5 text-gray-500">
          Provision, edit, and manage all system accounts and role assignments.
        </p>
      </div>
      <span className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: '#1a2233' }}>
        {usersList.length} REGISTERED
      </span>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* User Table and Charts */}
      <div className="col-span-2 flex flex-col gap-5">
        <div className="rounded-xl p-5 shadow-sm" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold" style={{ color: '#f5a623' }}>Global User Provisioning &amp; Roles</h2>
              <span className="text-xs text-gray-400">(Master Control)</span>
            </div>
            <div className="flex gap-2 relative items-center">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-3 h-8 rounded border flex items-center justify-center gap-1.5 text-white text-xs font-bold shadow-sm shrink-0 transition-transform hover:scale-105"
                style={{ background: '#f5a623', borderColor: '#f5a623' }}
              >
                <UserPlus size={14} /> Add User
              </button>
              <button
                onClick={exportToExcel}
                className="px-3 h-8 rounded border flex items-center justify-center gap-1.5 text-white text-xs font-bold shadow-sm shrink-0 transition-all hover:scale-105 hover:opacity-90"
                style={{ background: '#22c55e', borderColor: '#22c55e' }}
              >
                <Download size={14} /> Export to Excel
              </button>
              <button 
                onClick={() => { setFilterDropdownOpen(!filterDropdownOpen); setDropdownMode('main'); }}
                className={`flex items-center gap-1.5 p-1.5 px-3 rounded border text-xs font-bold transition-colors ${filterDept || filterRole || filterCourse || sortBy !== 'default' ? 'bg-[#fbf8f1] text-[#f5a623] border-[#f5a623]' : 'text-gray-700 hover:bg-gray-50 border-[#e5e0d5]'}`}
              >
                <Filter size={14} /> Filter
              </button>

              {filterDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-[#e5e0d5] rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  {dropdownMode === 'main' && (
                    <>
                      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-[#e5e0d5]">Sort Options</div>
                      <button
                        onClick={() => setDropdownMode('course')}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 flex justify-between items-center ${sortBy === 'course' || filterCourse ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        Sort by Course <ChevronRight size={12}/>
                      </button>
                      <button
                        onClick={() => setDropdownMode('department')}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 flex justify-between items-center ${sortBy === 'department' || filterDept ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        Sort by Department <ChevronRight size={12}/>
                      </button>
                      <button
                        onClick={() => setDropdownMode('role')}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 flex justify-between items-center ${sortBy === 'role' || filterRole ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        Sort by Role <ChevronRight size={12}/>
                      </button>
                      <button
                        onClick={() => { setSortBy('default'); setFilterDept(null); setFilterRole(null); setFilterCourse(null); setFilterDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors hover:bg-gray-50 border-t border-[#f0ede6] mt-1 ${sortBy === 'default' && !filterDept && !filterRole && !filterCourse ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-500 font-medium'}`}
                      >
                        Clear Filters & Sorting
                      </button>
                    </>
                  )}

                  {dropdownMode === 'course' && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-[#e5e0d5]">
                        <button onClick={() => setDropdownMode('main')} className="hover:text-gray-700"><ChevronLeft size={12}/></button> Select Course
                      </div>
                      <button
                        onClick={() => { setSortBy('course'); setFilterCourse(null); setFilterDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${!filterCourse && sortBy === 'course' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        All (Sort Only)
                      </button>
                      <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {[...new Set(usersList.map(u => u.course).filter(Boolean))].map(c => (
                          <button
                            key={c}
                            onClick={() => { setFilterCourse(c); setSortBy('course'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${filterCourse === c ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-600'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {dropdownMode === 'department' && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-[#e5e0d5]">
                        <button onClick={() => setDropdownMode('main')} className="hover:text-gray-700"><ChevronLeft size={12}/></button> Select Department
                      </div>
                      <button
                        onClick={() => { setSortBy('department'); setFilterDept(null); setFilterDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${!filterDept && sortBy === 'department' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        All (Sort Only)
                      </button>
                      <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {[...new Set(usersList.map(u => u.dept).filter(Boolean))].map(dept => (
                          <button
                            key={dept}
                            onClick={() => { setFilterDept(dept); setSortBy('department'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${filterDept === dept ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-600'}`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {dropdownMode === 'role' && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-[#e5e0d5]">
                        <button onClick={() => setDropdownMode('main')} className="hover:text-gray-700"><ChevronLeft size={12}/></button> Select Role
                      </div>
                      <button
                        onClick={() => { setSortBy('role'); setFilterRole(null); setFilterDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${!filterRole && sortBy === 'role' ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-700 font-medium'}`}
                      >
                        All (Sort Only)
                      </button>
                      <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {[...new Set(usersList.map(u => u.role).filter(Boolean))].map(r => (
                          <button
                            key={r}
                            onClick={() => { setFilterRole(r); setSortBy('role'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 ${filterRole === r ? 'text-[#f5a623] font-bold bg-[#fbf8f1]' : 'text-gray-600'}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="table-responsive"><table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b" style={{ borderColor: '#f0ede6' }}>
                {['USER ID', 'NAME', 'COURSE', 'DEPARTMENT', 'ROLE', 'PERMISSIONS', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left pb-2 pr-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: '#f0ede6' }}>
                  <td className="py-3 pr-3 text-gray-400">{u.id}</td>
                  <td className="py-3 pr-3 font-bold text-gray-900">{u.name}</td>
                  <td className="py-3 pr-3 text-gray-500">{u.course}</td>
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
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50"
                        title="Edit User"
                      >
                        <Pencil size={14} />
                      </button>
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



        {/* Error trend */}
        <div className="rounded-xl p-5 shadow-sm relative" style={{ background: '#fff', border: '1px solid #e5e0d5' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Error Reporting Trend</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Daily Error Overview</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={errorWeekStart}
                onChange={(e) => setErrorWeekStart(e.target.value)}
                className="text-xs px-2 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] border-[#e5e0d5] text-gray-700"
              />
            </div>
          </div>
          {(() => {
            const ws = new Date(errorWeekStart + 'T00:00:00');
            const errorWeekData = DAY_LABELS.map((label, i) => {
              const dayDate = new Date(ws);
              dayDate.setDate(ws.getDate() + i);
              const dayStr = getLocalYMD(dayDate);
              const dummyBase = [2, 1, 3, 0, 1, 0, 0][i];
              const actualErrors = feedbackList.filter(f => {
                const fDate = f.created_at || f.timestamp || new Date().toISOString();
                return getLocalYMD(new Date(fDate)) === dayStr;
              }).length;
              const dateNum = dayDate.getDate();
              return { day: `${dateNum}`, errors: dummyBase + actualErrors };
            });
            return (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={errorWeekData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0ede6" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ background: '#1a2233', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                    <Line type="monotone" dataKey="errors" stroke="#f5a623" strokeWidth={2.5} dot={{ r: 4, fill: '#f5a623' }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 px-1">
                  <span>Week of {new Date(errorWeekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="font-semibold" style={{ color: '#f5a623' }}>{errorWeekData.reduce((sum, d) => sum + d.errors, 0)} total this week</span>
                </div>
              </>
            );
          })()}
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
              { label: 'Super Admins', value: usersList.filter(u => u.systemRole === 'sysadmin').length },
              { label: 'Teacher', value: usersList.filter(u => u.systemRole === 'teacher').length },
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
                {paginatedActivity.map((a, idx) => {
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
              {activityLog.length > ACTIVITY_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: '#f0ede6' }}>
                  <span className="text-gray-400">Showing {Math.min((activityPage - 1) * ACTIVITY_PER_PAGE + 1, activityLog.length)}–{Math.min(activityPage * ACTIVITY_PER_PAGE, activityLog.length)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActivityPage(p => Math.max(1, p - 1))}
                      disabled={activityPage === 1}
                      className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: '#e5e0d5' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-gray-500 font-medium">{activityPage} / {totalActivityPages}</span>
                    <button
                      onClick={() => setActivityPage(p => Math.min(totalActivityPages, p + 1))}
                      disabled={activityPage === totalActivityPages}
                      className="p-1.5 rounded border text-gray-400 hover:text-sidebar hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      style={{ borderColor: '#e5e0d5' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Department</label>
                <div className="relative">
                  <select 
                    value={editForm.department}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== 'College of Information and Communication Technology (CICT)') {
                        setEditForm({ ...editForm, department: val, course: '' });
                      } else {
                        setEditForm({ ...editForm, department: val });
                      }
                    }}
                    className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm appearance-none"
                  >
                    <option value="" disabled>Select a department</option>
                    <option value="College of Information and Communication Technology (CICT)">College of Information and Communication Technology (CICT)</option>
                    <option value="College of Engineering (COE)">College of Engineering (COE)</option>
                    <option value="College of Business Management and Accountancy (CBMA)">College of Business Management and Accountancy (CBMA)</option>
                    <option value="College of Education, Arts and Sciences (CEAS)">College of Education, Arts and Sciences (CEAS)</option>
                    <option value="College of Hospitality and Tourism Management (CHTM)">College of Hospitality and Tourism Management (CHTM)</option>
                    <option value="College of Criminal Justice Education (CCJE)">College of Criminal Justice Education (CCJE)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Course</label>
                <div className="relative">
                  <select 
                    value={editForm.course}
                    onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                    disabled={editForm.department !== 'College of Information and Communication Technology (CICT)'}
                    className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select a course</option>
                    {editForm.department === 'College of Information and Communication Technology (CICT)' && (
                      <>
                        <option value="Bachelor of Science in Information Technology (BSIT)">Bachelor of Science in Information Technology (BSIT)</option>
                        <option value="Bachelor of Science in Computer Science (BSCS)">Bachelor of Science in Computer Science (BSCS)</option>
                        <option value="Bachelor of Science in Information Systems (BSIS)">Bachelor of Science in Information Systems (BSIS)</option>
                      </>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                <select
                  value={editForm.system_role}
                  onChange={(e) => setEditForm({ ...editForm, system_role: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1] text-sm appearance-none"
                >
                  <option value="sysadmin">Super Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="registrar">Registrar</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setEditModalOpen(false); setUserToEdit(null); }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={editLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading}
                className="px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-md disabled:opacity-50"
                style={{ background: '#f5a623' }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
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
      {createModalOpen && (
        <CreateUser 
          onClose={() => setCreateModalOpen(false)} 
          onSuccess={() => {
            setCreateModalOpen(false);
            fetchUsers();
            fetchActivity();
          }} 
        />
      )}
    </div>
  );
};

export default UserRoles;
