import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarCheck, Loader, Plus, X, Trash2, ArrowLeft, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../../contexts/TeacherContext';
import AssignmentSelector from '../../components/teacher/FloatingAssignmentSelector';
import api from '../../utils/api';

const LS_PREFIX = 'pending_attendance_';

const lsKey = (assignmentId, term) => `${LS_PREFIX}${assignmentId}_${term}`;

const loadPending = (assignmentId, term) => {
  try {
    return JSON.parse(localStorage.getItem(lsKey(assignmentId, term)) || '{}');
  } catch { return {}; }
};

const savePending = (assignmentId, term, map) => {
  if (Object.keys(map).length === 0) {
    localStorage.removeItem(lsKey(assignmentId, term));
  } else {
    localStorage.setItem(lsKey(assignmentId, term), JSON.stringify(map));
  }
};

const persistKey = (assignmentId, term, key, data) => {
  const pending = loadPending(assignmentId, term);
  pending[key] = data;
  savePending(assignmentId, term, pending);
};

const clearPendingKey = (assignmentId, term, key) => {
  const pending = loadPending(assignmentId, term);
  delete pending[key];
  savePending(assignmentId, term, pending);
};

const COMPONENT_COLORS = [
  { bg: '#3b82f6', border: '#2563eb', light: '#eff6ff', headerBg: '#3b82f6', headerBorder: '#2563eb' },
  { bg: '#8b5cf6', border: '#7c3aed', light: '#f5f3ff', headerBg: '#8b5cf6', headerBorder: '#7c3aed' },
  { bg: '#06b6d4', border: '#0891b2', light: '#ecfeff', headerBg: '#06b6d4', headerBorder: '#0891b2' },
  { bg: '#f97316', border: '#ea580c', light: '#fff7ed', headerBg: '#f97316', headerBorder: '#ea580c' },
  { bg: '#84cc16', border: '#65a30d', light: '#f7fee7', headerBg: '#84cc16', headerBorder: '#65a30d' },
  { bg: '#ec4899', border: '#db2777', light: '#fdf2f8', headerBg: '#ec4899', headerBorder: '#db2777' },
];

const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const getColor = (idx) => COMPONENT_COLORS[idx % COMPONENT_COLORS.length];

const makeKey = (date, session, type) => `${date}|${session}|${type}`;
const parseKey = (key) => {
  const parts = key.split('|');
  return { date: parts[0], session: parts[1] || 'AM', type: parts[2] || 'Lecture' };
};
const formatDate = (key) => {
  const { date } = parseKey(key);
  return date ? date.split('-').slice(1).join('/') : date;
};

const Attendance = () => {
  const navigate = useNavigate();

  const { selectedAssignment, currentAssignment, isReadOnly, loading: ctxLoading, refreshAssignments } = useTeacher();

  const [students, setStudents] = useState([]);
  const [columns, setColumns] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedTerm, setSelectedTerm] = useState('PRELIMS');
  const [loading, setLoading] = useState(true);
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [newDate, setNewDate] = useState(todayStr());
  const [newSession, setNewSession] = useState('AM');
  const [newType, setNewType] = useState('Lecture');
  const [confirmRemoveKey, setConfirmRemoveKey] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [removing, setRemoving] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [clampWarnings, setClampWarnings] = useState({});
  const [syncing, setSyncing] = useState(false);
  const datePickerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const columnsRef = useRef(columns);
  const studentsRef = useRef(students);
  const assignmentRef = useRef(selectedAssignment);
  const termRef = useRef(selectedTerm);
  const inputRefs = useRef({});

  const handleKeyDown = useCallback((e, studentId, colId, studentIndex, filteredStudents, editableIds) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      const totalCols = editableIds.length;
      const currentColIdx = editableIds.indexOf(colId);
      if (currentColIdx === -1) return;
      let ns = studentIndex;
      let nc = currentColIdx + dir;
      if (nc < 0) { nc = totalCols - 1; ns--; }
      else if (nc >= totalCols) { nc = 0; ns++; }
      if (ns < 0 || ns >= filteredStudents.length) return;
      const el = inputRefs.current[`${filteredStudents[ns].id}:${editableIds[nc]}`];
      if (el) { el.focus(); el.select(); }
      return;
    }
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const totalCols = editableIds.length;
    const currentColIdx = editableIds.indexOf(colId);
    if (currentColIdx === -1) return;
    let ns = studentIndex;
    let nc = currentColIdx;
    if (e.key === 'ArrowLeft') nc = Math.max(0, currentColIdx - 1);
    else if (e.key === 'ArrowRight') nc = Math.min(totalCols - 1, currentColIdx + 1);
    else if (e.key === 'ArrowUp') ns = Math.max(0, studentIndex - 1);
    else if (e.key === 'ArrowDown') ns = Math.min(filteredStudents.length - 1, studentIndex + 1);
    const el = inputRefs.current[`${filteredStudents[ns].id}:${editableIds[nc]}`];
    if (el) { el.focus(); el.select(); }
  }, []);

  useEffect(() => { columnsRef.current = columns; }, [columns]);
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { assignmentRef.current = selectedAssignment; }, [selectedAssignment]);
  useEffect(() => { termRef.current = selectedTerm; }, [selectedTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) setAddDateOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const sectionId = currentAssignment?.section_id;
        if (!sectionId) return;
        const [studentsRes, attendanceRes] = await Promise.all([
          api(`http://localhost:5000/api/sections/${sectionId}/students`),
          api(`http://localhost:5000/api/attendance?teacher_assignment_id=${selectedAssignment}&term=${selectedTerm}`),
        ]);
        if (studentsRes.ok) setStudents(await studentsRes.json());
        if (attendanceRes.ok) {
          const records = await attendanceRes.json();
          const map = {};
          const keySet = new Set();
          records.forEach((r) => {
            const key = makeKey(r.date, r.session || 'AM', r.type || 'Lecture');
            if (!map[key]) map[key] = {};
            map[key][r.student_id] = r.score ?? 0;
            keySet.add(key);
          });
          setAttendanceMap(map);
          setColumns([...keySet].sort());
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedAssignment, selectedTerm]);

  useEffect(() => {
    const handler = async () => {
      setLoading(true);
      await refreshAssignments();
      setLoading(false);
      window.dispatchEvent(new CustomEvent('app:reload-done'));
    };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [refreshAssignments]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // Flush pending saves from localStorage after data is loaded
  useEffect(() => {
    if (isReadOnly || !selectedAssignment || students.length === 0 || columns.length === 0) return;
    const pending = loadPending(selectedAssignment, selectedTerm);
    const keys = Object.keys(pending);
    if (keys.length === 0) return;
    setSyncing(true);
    (async () => {
      for (const key of keys) {
        const { date, session, type } = parseKey(key);
        const records = students.map((s) => ({
          student_id: s.id,
          score: pending[key]?.[s.id] ?? 0,
        }));
        try {
          const res = await api('http://localhost:5000/api/attendance/bulk', {
            method: 'POST',
            body: JSON.stringify({ teacher_assignment_id: selectedAssignment, date, records, session, type, term: selectedTerm }),
          });
          if (res.ok) clearPendingKey(selectedAssignment, selectedTerm, key);
        } catch (err) { console.error('Failed to flush pending:', err); }
      }
      setSyncing(false);
    })();
  }, [selectedAssignment, students, selectedTerm]);

  // Periodic retry of pending saves every 30s
  useEffect(() => {
    if (isReadOnly || !selectedAssignment || students.length === 0) return;
    const interval = setInterval(async () => {
      const pending = loadPending(selectedAssignment, selectedTerm);
      const keys = Object.keys(pending);
      if (keys.length === 0) return;
      setSyncing(true);
      for (const key of keys) {
        const { date, session, type } = parseKey(key);
        const records = students.map((s) => ({
          student_id: s.id,
          score: pending[key]?.[s.id] ?? 0,
        }));
        try {
          const res = await api('http://localhost:5000/api/attendance/bulk', {
            method: 'POST',
            body: JSON.stringify({ teacher_assignment_id: selectedAssignment, date, records, session, type, term: selectedTerm }),
          });
          if (res.ok) clearPendingKey(selectedAssignment, selectedTerm, key);
        } catch (err) { console.error('Periodic flush failed:', err); }
      }
      setSyncing(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedAssignment, selectedTerm, students, isReadOnly]);

  // Warn on reload if pending saves exist
  useEffect(() => {
    const handler = (e) => {
      const pending = loadPending(assignmentRef.current, termRef.current);
      if (Object.keys(pending).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const isPastDate = (dateStr) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    return dateStr < today;
  };

  const addDate = () => {
    if (!newDate) return;
    if (isPastDate(newDate)) {
      setError('Cannot add a past date.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const key = makeKey(newDate, newSession, newType);
    if (columns.includes(key)) {
      setError('This date with the same session and type already exists.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setColumns((prev) => [...prev, key].sort());
    const defaults = {};
    students.forEach((s) => { defaults[s.id] = 0; });
    setAttendanceMap((prev) => ({ ...prev, [key]: defaults }));
    setAddDateOpen(false);
    setError('');
  };

  const removeColumn = async () => {
    if (!confirmRemoveKey || confirmText !== 'CONFIRM') return;
    setRemoving(true);
    const { date, session, type } = parseKey(confirmRemoveKey);
    try {
      const res = await api('http://localhost:5000/api/attendance/date', {
        method: 'DELETE',
        body: JSON.stringify({ teacher_assignment_id: selectedAssignment, date, session, type, term: selectedTerm }),
      });
      if (res.ok) {
        setColumns((prev) => prev.filter((k) => k !== confirmRemoveKey));
        setAttendanceMap((prev) => {
          const copy = { ...prev };
          delete copy[confirmRemoveKey];
          return copy;
        });
      } else {
        const err = await res.json();
        setError('Error: ' + (err.message || 'Failed to delete'));
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) { console.error(err); }
    finally { setRemoving(false); setConfirmRemoveKey(null); setConfirmText(''); }
  };

  const handleScoreChange = (key, studentId, value) => {
    const raw = value === '' ? null : parseInt(value, 10);
    const clamped = value === '' ? 0 : Math.max(0, Math.min(2, raw || 0));
    if (raw !== null && raw !== clamped) {
      const ck = `${key}-${studentId}`;
      setClampWarnings(prev => ({ ...prev, [ck]: true }));
      setTimeout(() => {
        setClampWarnings(prev => { const c = { ...prev }; delete c[ck]; return c; });
      }, 3000);
    }
    setAttendanceMap((prev) => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), [studentId]: clamped } };
      persistKey(assignmentRef.current, selectedTerm, key, next[key]);
      scheduleAutoSave(next, selectedTerm);
      return next;
    });
  };

  const scheduleAutoSave = (map, term) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const cols = columnsRef.current;
      const studs = studentsRef.current;
      const assignId = assignmentRef.current;
      const currentTerm = term || termRef.current;
      for (const key of cols) {
        if (!map[key]) continue;
        const { date, session, type } = parseKey(key);
        const records = studs.map((s) => ({
          student_id: s.id,
          score: map[key]?.[s.id] ?? 0,
        }));
        const res = await api('http://localhost:5000/api/attendance/bulk', {
          method: 'POST',
          body: JSON.stringify({ teacher_assignment_id: assignId, date, records, session, type, term: currentTerm }),
        });
        if (res.ok) clearPendingKey(assignId, currentTerm, key);
      }
    }, 800);
  };

  const getStudentTotal = (studentId) => {
    let sum = 0;
    columns.forEach((k) => {
      const val = parseFloat(attendanceMap[k]?.[studentId]);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  if (ctxLoading || loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-gray-400" /></div>;
  }

  if (!currentAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CalendarCheck size={48} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No class assignments yet.</p>
        <p className="text-xs mt-1">Ask an admin to assign you to a class.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AssignmentSelector />
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/teacher/dashboard')} className="p-2 rounded-lg hover:bg-gray-100 text-sidebar transition-colors cursor-pointer" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1 font-sans">
              SmartGrade — Attendance
            </div>
            <span className="text-sm font-bold text-gray-700">{currentAssignment.subjects?.name} — {currentAssignment.sections?.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center bg-bg-light border border-border rounded-lg p-1">
            {TERMS.map((t) => (
              <button
                key={t}
                onClick={() => { if (t !== selectedTerm) { setSelectedTerm(t); setColumns([]); setAttendanceMap({}); } }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  selectedTerm === t
                    ? 'bg-sidebar text-white shadow-sm'
                    : 'text-text-muted hover:text-sidebar'
                }`}
              >
                {t}
              </button>
            ))}
            {loading && <Loader size={14} className="animate-spin text-sidebar/40 ml-2" />}
          </div>
          <div className="relative" ref={datePickerRef}>
            <button onClick={() => { setAddDateOpen(!addDateOpen); setNewDate(todayStr()); setNewSession('AM'); setNewType('Lecture'); setError(''); }} disabled={isReadOnly} className="flex items-center gap-1.5 px-4 py-2 bg-sidebar text-white rounded-lg text-sm font-bold hover:bg-sidebar-hover transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={16} /> Add Date
            </button>
            {addDateOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50 min-w-[240px]">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Select Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40 mb-3"
                />
                {error && <div className="text-xs text-red-500 font-semibold mb-2">{error}</div>}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block mb-1">Session</label>
                    <select value={newSession} onChange={(e) => setNewSession(e.target.value)} className="w-full text-xs font-semibold px-2 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold/40">
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block mb-1">Type</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full text-xs font-semibold px-2 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold/40">
                      <option value="Lecture">Lecture</option>
                      <option value="Laboratory">Laboratory</option>
                    </select>
                  </div>
                </div>
                <button onClick={addDate} className="w-full text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: '#f5a623' }}>
                  Add to Table
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-9.364a9 9 0 11-12.728 0 9 9 0 0112.728 0z" /></svg>
          <span>This term is closed. Viewing only.</span>
        </div>
      )}
      <div className="flex items-center gap-4 text-xs font-semibold px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
        <span>Attendance Key:</span>
        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">2 = Present</span>
        <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">1 = Late</span>
        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">0 = Absent</span>
        {syncing && (
          <span className="ml-auto flex items-center gap-1.5 text-blue-700 bg-blue-100 border border-blue-200 px-3 py-0.5 rounded">
            <Cloud size={13} className="animate-pulse" />
            Syncing unsaved data…
          </span>
        )}
      </div>

      <div className="mb-2 px-1 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700">{currentAssignment?.subjects?.name} — {currentAssignment?.sections?.name}</span>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold bg-white"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        {columns.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CalendarCheck size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No attendance dates yet.</p>
            <p className="text-xs mt-1">Click "Add Date" to start recording attendance.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full pb-4" style={{ scrollbarWidth: 'auto' }}>
            <table className="text-xs select-none" style={{ width: 'fit-content', minWidth: 'max-content', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th colSpan={3} className="bg-sidebar border-b-2 border-r-2 border-border p-3 text-white text-left font-bold min-w-[352px] sticky left-0 z-20">
                    <div className="flex justify-between items-center">
                      <span>STUDENT INFORMATION</span>
                      <span className="text-[10px] text-gray-300">{searchQuery ? `${students.filter(s => s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())).length}/${students.length}` : students.length} students</span>
                    </div>
                  </th>
                  {columns.map((key, idx) => {
                    const color = getColor(idx);
                    const { session, type } = parseKey(key);
                    return (
                      <th key={key} className="border-b-2 border-r-2 border-gray-200 p-3 text-sidebar text-center font-bold text-sm uppercase tracking-wider relative group z-0 bg-gray-100">
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-center leading-tight">
                            <div className="text-sm font-bold">{formatDate(key)}</div>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <span style={{ backgroundColor: session === 'AM' ? '#f97316' : '#6366f1', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>{session}</span>
                              <span style={{ backgroundColor: type === 'Laboratory' ? '#f97316' : '#16a34a', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>{type === 'Laboratory' ? 'LAB' : 'LEC'}</span>
                            </div>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => { setConfirmRemoveKey(key); setConfirmText(''); }}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="bg-green-700 border-b-2 border-green-800 p-3 text-white text-center font-bold text-base uppercase tracking-wider min-w-[100px] relative z-0">
                    TOTAL
                  </th>
                </tr>

                <tr className="bg-gray-50 border-b border-border text-center font-semibold text-sidebar">
                  <th className="px-1 py-2.5 text-center sticky bg-gray-50 border-r border-border z-20 w-12" style={{ left: 0 }}>#</th>
                  <th className="px-3 py-2.5 text-left sticky bg-gray-50 border-r border-border z-20 w-28" style={{ left: '48px' }}>Stud ID</th>
                  <th className="px-4 py-2.5 text-left sticky bg-gray-50 border-r-2 border-border z-20 min-w-[180px]" style={{ left: '160px' }}>Student Name</th>
                  {columns.map((key, idx) => {
                    return (
                      <th key={key} className="px-2 py-2.5 border-r border-gray-200 bg-gray-50 w-14 relative z-0">
                        SCORE
                      </th>
                    );
                  })}
                  <th className="px-3 py-2.5 bg-white text-green-900 font-extrabold text-xs w-20 relative z-0">TOTAL</th>
                </tr>

                <tr className="bg-white border-b border-border text-center font-bold text-sidebar select-none">
                  <td className="px-1 py-2 text-center sticky bg-white border-r border-border z-20 w-12" style={{ left: 0 }}></td>
                  <td className="px-3 py-2 text-left sticky bg-white border-r border-border z-20 text-[10px] text-gray-700 w-28" style={{ left: '48px' }}>MAX SCORE</td>
                  <td className="px-4 py-2 text-left sticky bg-white border-r-2 border-border z-20 text-[10px] text-gray-700 font-normal italic min-w-[180px]" style={{ left: '160px' }}>Maximum target scores</td>
                  {columns.map((key, idx) => {
                    return (
                      <td key={key} className="p-1 border-r border-b border-gray-200 bg-gray-50 relative z-0">
                        <input type="number" step="any" value={2}
                          className="w-full text-center text-xs font-black text-gray-700 p-1 border border-transparent rounded bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none opacity-40 cursor-default"
                          disabled
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 bg-white font-extrabold text-green-900 text-center text-xs relative z-0 border-b border-gray-200">{(columns.length * 2).toFixed(0)}</td>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtered = searchQuery
                    ? students.filter(s =>
                        s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : students;
                  return students.length === 0 ? (
                    <tr>
                      <td colSpan={3 + columns.length + 1} className="px-6 py-10 text-center text-gray-500 italic">
                        No students in this section.
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={3 + columns.length + 1} className="px-6 py-10 text-center text-gray-500 italic">
                        No students match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((student, index) => {
                    const studentTotal = getStudentTotal(student.id);
                    return (
                      <tr key={student.id} className={`transition-colors ${selectedRow === student.id ? 'bg-green-200' : 'hover:bg-green-50/10'}`}>
                        <td className={`px-1 py-1 text-center sticky border-r border-b border-gray-200 z-30 w-12 text-gray-400 text-[10px] cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: 0 }} onClick={() => setSelectedRow(student.id)}>{index + 1}</td>
                        <td className={`px-2 py-1 sticky border-r border-b border-gray-200 z-20 w-28 text-xs font-mono font-semibold text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '48px' }} onClick={() => setSelectedRow(student.id)}>{student.student_id}</td>
                        <td className={`px-2 py-1 sticky border-r-2 border-b border-border z-20 min-w-[180px] text-xs font-medium text-sidebar cursor-pointer select-none ${selectedRow === student.id ? 'bg-green-200' : 'bg-white'}`} style={{ left: '160px' }} onClick={() => setSelectedRow(student.id)}>{student.student_name}</td>
                        {columns.map((key) => {
                          const isSelected = selectedRow === student.id;
                          const clampKey = `${key}-${student.id}`;
                          const isClamped = clampWarnings[clampKey];
                          return (
                            <td key={key} className={`p-0.5 border-r border-b border-gray-200 ${isSelected ? 'bg-green-200' : 'bg-white'}`}>
                              <div className="relative">
                                <input type="text" inputMode="numeric"
                                  ref={el => { if (el) inputRefs.current[`${student.id}:${key}`] = el; }}
                                  value={attendanceMap[key]?.[student.id] ?? 0}
                                  onFocus={(e) => e.target.select()}
                                  onClick={(e) => e.target.select()}
                                  onChange={(e) => {
                                    if (isReadOnly) return;
                                    const raw = e.target.value;
                                    if (raw === '') { handleScoreChange(key, student.id, 0); return; }
                                    if (/^[0-2]$/.test(raw)) {
                                      handleScoreChange(key, student.id, parseInt(raw, 10));
                                    }
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, student.id, key, index, filtered, columns)}
                                  className={`w-full text-center text-xs font-medium text-sidebar p-1 border rounded focus:outline-none focus:ring-1 focus:ring-gold bg-transparent hover:bg-gray-100 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isClamped ? 'border-amber-400 bg-amber-50' : 'border-transparent'}`}
                                  disabled={isReadOnly}
                                />
                                {isClamped && (
                                  <div className="absolute -top-1 right-0 w-2 h-2 bg-amber-400 rounded-full" title="Value clamped to 0–2 range" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className={`px-2 py-2 text-center font-extrabold text-sm border-b border-gray-200 bg-white text-green-900`}>
                          {studentTotal.toFixed(0)}
                        </td>
                      </tr>
                    );
                  })
                  )})()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmRemoveKey && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-bold text-gray-800 mb-2">Remove Date</h3>
            <p className="text-sm text-gray-700 mb-1">
              This will delete all attendance records for <strong>{confirmRemoveKey}</strong>.
            </p>
            <p className="text-xs text-gray-600 mb-4">Type <strong>CONFIRM</strong> to proceed.</p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type CONFIRM"
              className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400/40 mb-4 text-gray-900 font-semibold"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmRemoveKey(null); setConfirmText(''); }} className="text-xs font-bold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={removeColumn} disabled={confirmText !== 'CONFIRM' || removing} className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50" style={{ background: '#ef4444' }}>
                {removing ? <Loader size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {removing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
