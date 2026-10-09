import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Settings, X, Plus, ChevronDown, Check, CalendarDays } from 'lucide-react';
import api from '../../utils/api';
import { SkeletonSettingsCard } from '../../components/common/Skeleton';

// Academic year starts in August: e.g. June 2026 → 2025-2026, Sept 2026 → 2026-2027.
const getCurrentStartYear = () => {
  const now = new Date();
  return now.getMonth() + 1 >= 8 ? now.getFullYear() : now.getFullYear() - 1;
};

const SuperAdminSettings = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noActiveTerm, setNoActiveTerm] = useState(false);
  const [endSemesterOpen, setEndSemesterOpen] = useState(false);
  const [nextSchoolYear, setNextSchoolYear] = useState('');
  const [nextSemester, setNextSemester] = useState('');
  const [confirmEndText, setConfirmEndText] = useState('');
  const [endingSemester, setEndingSemester] = useState(false);
  const [endSemesterError, setEndSemesterError] = useState('');
  const [createTermOpen, setCreateTermOpen] = useState(false);
  const [newStartYear, setNewStartYear] = useState(null);
  const [newSemester, setNewSemester] = useState('1st Semester');
  const [creatingTerm, setCreatingTerm] = useState(false);
  const [createTermError, setCreateTermError] = useState('');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef(null);

  // Generated dynamically: current academic year + upcoming years, end = start + 1.
  const academicYearOptions = useMemo(() => {
    const base = getCurrentStartYear();
    return Array.from({ length: 6 }, (_, i) => {
      const start_year = base + i;
      return { start_year, end_year: start_year + 1, label: `${start_year}-${start_year + 1}` };
    });
  }, []);

  const newSchoolYear = newStartYear !== null ? `${newStartYear}-${newStartYear + 1}` : '';
  const duplicateTerm = newSchoolYear !== '' && allTerms.some((t) => t.school_year === newSchoolYear && t.semester === newSemester);
  const canCreateTerm = newStartYear !== null && !duplicateTerm && !creatingTerm;

  useEffect(() => {
    if (!yearDropdownOpen) return;
    const onDown = (e) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) setYearDropdownOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setYearDropdownOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [yearDropdownOpen]);

  const loadData = useCallback(async () => {
    setNoActiveTerm(false);
    const [activeRes, allRes] = await Promise.all([
      api('http://localhost:5000/api/terms/active'),
      api('http://localhost:5000/api/terms'),
    ]);
    if (activeRes.ok) {
      const term = await activeRes.json();
      setActiveTerm(term);
      const order = ['1st Semester', '2nd Semester', 'Summer'];
      const idx = order.indexOf(term.semester);
      const parts = term.school_year.split('-').map(Number);
      const nextSy = idx < order.length - 1 ? term.school_year : `${parts[0] + 1}-${parts[1] + 1}`;
      const nextSem = idx < order.length - 1 ? order[idx + 1] : '1st Semester';
      setNextSchoolYear(nextSy);
      setNextSemester(nextSem);
    } else {
      setActiveTerm(null);
      setNoActiveTerm(true);
    }
    if (allRes.ok) setAllTerms(await allRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = async () => { await loadData(); window.dispatchEvent(new CustomEvent('app:reload-done')); };
    window.addEventListener('app:reload', handler);
    return () => window.removeEventListener('app:reload', handler);
  }, [loadData]);

  const endSemester = async () => {
    setEndingSemester(true);
    setEndSemesterError('');
    try {
      const res = await api('http://localhost:5000/api/terms/end', {
        method: 'POST',
        body: JSON.stringify({ next_school_year: nextSchoolYear, next_semester: nextSemester }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTerm(data.next);
        setAllTerms(prev => {
          const filtered = prev.filter(t => t.id !== data.closed.id);
          return [...filtered, data.closed, data.next].sort((a, b) => b.school_year.localeCompare(a.school_year) || b.semester.localeCompare(a.semester));
        });
        setEndSemesterOpen(false);
        setConfirmEndText('');
      } else {
        const data = await res.json();
        setEndSemesterError(data.message || 'Failed to end semester');
      }
    } catch {
      setEndSemesterError('Network error');
    } finally {
      setEndingSemester(false);
    }
  };

  const createTerm = async () => {
    setCreatingTerm(true);
    setCreateTermError('');
    try {
      const res = await api('http://localhost:5000/api/terms/create', {
        method: 'POST',
        body: JSON.stringify({ school_year: newSchoolYear, semester: newSemester }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTerm(data);
        setCreateTermOpen(false);
        setNewStartYear(null);
        setNewSemester('1st Semester');
        setNoActiveTerm(false);
        const order = ['1st Semester', '2nd Semester', 'Summer'];
        const idx = order.indexOf(data.semester);
        const parts = data.school_year.split('-').map(Number);
        const nextSy = idx < order.length - 1 ? data.school_year : `${parts[0] + 1}-${parts[1] + 1}`;
        const nextSem = idx < order.length - 1 ? order[idx + 1] : '1st Semester';
        setNextSchoolYear(nextSy);
        setNextSemester(nextSem);
      } else {
        const data = await res.json();
        setCreateTermError(data.message || 'Failed to create term');
      }
    } catch {
      setCreateTermError('Network error');
    } finally {
      setCreatingTerm(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto" aria-busy="true">
        <SkeletonSettingsCard />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-50 admin-header-card flex flex-col justify-center" style={{ backgroundImage: 'linear-gradient(to right, #0c1925, #102132, #142a3f)' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#ffffff' }}>Settings</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#fbbf24' }}>View academic terms and browse archived semesters</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 card-hover">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Academic Term Management</h2>

        {noActiveTerm ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-1">No active term</p>
            <p className="text-xs text-gray-500 mb-4">Create the first academic term to get started.</p>
            <button
              onClick={() => { setCreateTermOpen(true); setCreateTermError(''); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors"
              style={{ background: '#142a3f' }}
            >
              <Plus size={16} /> Create Term
            </button>
          </div>
        ) : (
          activeTerm && (
            <div className="bg-amber-400 border border-amber-400 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Active Term</span>
                  <p className="text-lg font-extrabold text-gray-900 mt-2">{activeTerm.school_year} — {activeTerm.semester}</p>
                  <p className="text-xs text-gray-900 mt-0.5">Sections and assignments can only be added to this term.</p>
                </div>
                <button
                  onClick={() => { setEndSemesterOpen(true); setEndSemesterError(''); }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
                >
                  End Semester
                </button>
              </div>
            </div>
          )
        )}

        {allTerms.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Term History</h3>
            <div className="space-y-2">
              {allTerms.map(t => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  t.is_active ? 'bg-amber-400 border-amber-400' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {t.is_active && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    <span className={`text-sm font-semibold ${t.is_active ? 'text-gray-900' : 'text-gray-500'}`}>
                      {t.school_year} — {t.semester}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.is_active ? 'bg-amber-100 text-amber-700' : t.is_closed ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                  }`}>
                    {t.is_active ? 'Active' : t.is_closed ? 'Closed' : 'Open'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {endSemesterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">End Semester</h3>
              <button onClick={() => { setEndSemesterOpen(false); setConfirmEndText(''); setEndSemesterError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-900 mb-4">
              This will close <strong>{activeTerm?.school_year} — {activeTerm?.semester}</strong> and open the next term.
              All sections and assignments in this term will be locked (read-only).
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-1.5">Open next term</label>
              <select
                value={`${nextSchoolYear}|${nextSemester}`}
                onChange={(e) => { const [sy, sem] = e.target.value.split('|'); setNextSchoolYear(sy); setNextSemester(sem); }}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]"
              >
                {(() => {
                  if (!activeTerm) return null;
                  const order = ['1st Semester', '2nd Semester', 'Summer'];
                  const idx = order.indexOf(activeTerm.semester);
                  const parts = activeTerm.school_year.split('-').map(Number);
                  const nextSy = `${parts[0] + 1}-${parts[1] + 1}`;
                  const options = [];
                  if (idx < order.length - 1) options.push({ sy: activeTerm.school_year, sem: order[idx + 1] });
                  options.push({ sy: nextSy, sem: '1st Semester' });
                  if (idx < order.length - 2) options.push({ sy: activeTerm.school_year, sem: order[idx + 2] });
                  return options.map((o) => (
                    <option key={`${o.sy}|${o.sem}`} value={`${o.sy}|${o.sem}`}>{o.sy} — {o.sem}</option>
                  ));
                })()}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-900 mb-1">Type <strong>CONFIRM</strong> to end</label>
              <input type="text" value={confirmEndText} onChange={(e) => setConfirmEndText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="CONFIRM" />
            </div>
            {endSemesterError && <p className="text-xs font-semibold text-red-500 mb-3">{endSemesterError}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEndSemesterOpen(false); setConfirmEndText(''); setEndSemesterError(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={endingSemester}>Cancel</button>
              <button onClick={endSemester} disabled={confirmEndText !== 'CONFIRM' || endingSemester} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${confirmEndText === 'CONFIRM' && !endingSemester ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'bg-red-300 cursor-not-allowed'}`}>{endingSemester ? 'Ending...' : 'End Semester'}</button>
            </div>
          </div>
        </div>
      )}

      {createTermOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Term</h3>
              <button onClick={() => { setCreateTermOpen(false); setNewStartYear(null); setNewSemester('1st Semester'); setCreateTermError(''); setYearDropdownOpen(false); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Create the first active academic term. This will enable admins and teachers to start working.
            </p>
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">School Year</label>
              <div ref={yearDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setYearDropdownOpen((v) => !v)}
                  className={`w-full flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 text-left text-sm bg-[#fbf8f1] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142a3f] transition-colors ${yearDropdownOpen ? 'border-[#142a3f]' : 'border-gray-50 hover:border-[#142a3f]/40'}`}
                >
                  <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${newStartYear !== null ? 'text-white' : 'text-[#142a3f] bg-[#142a3f]/5'}`} style={newStartYear !== null ? { background: '#142a3f' } : {}}>
                    <CalendarDays size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    {newStartYear !== null ? (
                      <span className="block font-bold text-gray-900 leading-tight">{newSchoolYear}</span>
                    ) : (
                      <span className="block font-semibold text-gray-400">Select school year</span>
                    )}
                  </span>
                  <ChevronDown size={15} className={`shrink-0 text-gray-400 transition-transform duration-200 ${yearDropdownOpen ? 'rotate-180 text-[#142a3f]' : ''}`} />
                </button>
                {yearDropdownOpen && (
                  <div className="dropdown-pop absolute left-0 right-0 top-full mt-1.5 z-20 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden origin-top">
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {academicYearOptions.map((o) => {
                        const active = o.start_year === newStartYear;
                        return (
                          <div
                            key={o.label}
                            onClick={() => { setNewStartYear(o.start_year); setYearDropdownOpen(false); setCreateTermError(''); }}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-[#142a3f]/5' : 'hover:bg-gray-100'}`}
                          >
                            <span className={`flex-1 text-sm ${active ? 'font-bold text-[#142a3f]' : 'font-semibold text-gray-700'}`}>{o.label}</span>
                            {active && <Check size={14} className="shrink-0" style={{ color: '#142a3f' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Semester</label>
              <select
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
            {duplicateTerm && <p className="text-xs font-semibold text-red-500 mb-3">The {newSchoolYear} — {newSemester} combination already exists. Choose a different school year or semester.</p>}
            {createTermError && <p className="text-xs font-semibold text-red-500 mb-3">{createTermError}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCreateTermOpen(false); setNewStartYear(null); setNewSemester('1st Semester'); setCreateTermError(''); setYearDropdownOpen(false); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={creatingTerm}>Cancel</button>
              <button onClick={createTerm} disabled={!canCreateTerm} className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${canCreateTerm ? 'shadow-sm' : 'opacity-50 cursor-not-allowed'}`} style={{ background: canCreateTerm ? '#142a3f' : '#d1d5db' }}>{creatingTerm ? 'Creating...' : 'Create Term'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSettings;


