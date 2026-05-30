import React, { useState, useEffect, useCallback } from 'react';
import { Settings, CheckCircle, X, Loader } from 'lucide-react';

const getToken = () => localStorage.getItem('token');
const api = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' } });

const AdminSettings = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endSemesterOpen, setEndSemesterOpen] = useState(false);
  const [nextSchoolYear, setNextSchoolYear] = useState('');
  const [nextSemester, setNextSemester] = useState('');
  const [confirmEndText, setConfirmEndText] = useState('');
  const [endingSemester, setEndingSemester] = useState(false);
  const [endSemesterError, setEndSemesterError] = useState('');

  const loadData = useCallback(async () => {
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e0d5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={20} style={{ color: '#f5a623' }} />
            <h1 className="text-xl font-bold" style={{ color: '#f5a623' }}>Settings</h1>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Manage academic terms and system settings</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e0d5]">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Academic Term Management</h2>

        {activeTerm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Active Term</span>
                <p className="text-lg font-extrabold text-gray-900 mt-2">{activeTerm.school_year} — {activeTerm.semester}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sections and assignments can only be added to this term.</p>
              </div>
              <button
                onClick={() => { setEndSemesterOpen(true); setEndSemesterError(''); }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
              >
                End Semester
              </button>
            </div>
          </div>
        )}

        {allTerms.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Term History</h3>
            <div className="space-y-2">
              {allTerms.map(t => (
                <div key={t.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                  t.is_active ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">End Semester</h3>
              <button onClick={() => { setEndSemesterOpen(false); setConfirmEndText(''); setEndSemesterError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This will close <strong>{activeTerm?.school_year} — {activeTerm?.semester}</strong> and open the next term.
              All sections and assignments in this term will be locked (read-only).
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Open next term</label>
              <select
                value={`${nextSchoolYear}|${nextSemester}`}
                onChange={(e) => { const [sy, sem] = e.target.value.split('|'); setNextSchoolYear(sy); setNextSemester(sem); }}
                className="w-full px-3 py-2 border border-[#e5e0d5] rounded-lg bg-[#fbf8f1] text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>CONFIRM</strong> to end</label>
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
    </div>
  );
};

export default AdminSettings;
