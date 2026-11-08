import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, CheckCircle2, Save, X } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { SkeletonSettingsCard } from '../../components/common/Skeleton';
import AdminPageHeading from '../../components/admin/AdminPageHeading';
import api from '../../utils/api';
import { DEFAULT_EXPORT_SETTINGS } from '../../utils/exportSettings';

const AdminSettings = () => {
  const { activeTerm, allTerms, viewTerm, setViewTerm, isArchiveMode, loading } = useAdmin();
  const [confirmTerm, setConfirmTerm] = useState(null);
  const [exportSettings, setExportSettings] = useState(DEFAULT_EXPORT_SETTINGS);
  const [exportSettingsLoading, setExportSettingsLoading] = useState(true);
  const [savingExportSettings, setSavingExportSettings] = useState(false);
  const [exportSettingsError, setExportSettingsError] = useState('');
  const [exportSettingsSaved, setExportSettingsSaved] = useState(false);
  const [showExportSaveConfirm, setShowExportSaveConfirm] = useState(false);
  const [exportSaveConfirmation, setExportSaveConfirmation] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const loadExportSettings = async () => {
      try {
        const response = await api('/api/export-settings');
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'Could not load export settings.');
        if (active) setExportSettings({ ...DEFAULT_EXPORT_SETTINGS, ...data });
      } catch (error) {
        if (active) setExportSettingsError(error.message || 'Could not load export settings.');
      } finally {
        if (active) setExportSettingsLoading(false);
      }
    };
    loadExportSettings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!exportSettingsSaved) return undefined;
    const timeoutId = window.setTimeout(() => setExportSettingsSaved(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [exportSettingsSaved]);

  const handleSaveExportSettings = (event) => {
    event.preventDefault();
    if (savingExportSettings) return;
    setExportSettingsError('');
    setExportSettingsSaved(false);
    setExportSaveConfirmation('');
    setShowExportSaveConfirm(true);
  };

  const confirmSaveExportSettings = async (event) => {
    event.preventDefault();
    if (savingExportSettings || exportSaveConfirmation.trim() !== 'Confirm') return;
    setSavingExportSettings(true);
    setExportSettingsError('');
    setExportSettingsSaved(false);
    try {
      const response = await api('/api/export-settings', {
        method: 'PUT',
        body: JSON.stringify(exportSettings),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Could not save export settings.');
      setExportSettings({ ...DEFAULT_EXPORT_SETTINGS, ...data });
      setExportSettingsSaved(true);
      setShowExportSaveConfirm(false);
      setExportSaveConfirmation('');
    } catch (error) {
      setExportSettingsError(error.message || 'Could not save export settings.');
      setShowExportSaveConfirm(false);
      setExportSaveConfirmation('');
    } finally {
      setSavingExportSettings(false);
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
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeading
        eyebrow="Preferences"
        title="Settings"
        description="Manage export signatories, view academic terms, and browse archived semesters."
      />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 card-hover">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Academic Term Information</h2>

        {isArchiveMode && viewTerm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-gray-800">
                Currently viewing: <strong>{viewTerm.school_year} — {viewTerm.semester}</strong>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">Read Only</span>
            </div>
            <button
              onClick={() => { setViewTerm(null); navigate('/admin'); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-700 border border-red-200 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              <X size={12} /> Exit Archive
            </button>
          </div>
        )}

        {!activeTerm && !isArchiveMode && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center mb-6">
            <p className="text-sm font-semibold text-gray-500">No active term</p>
            <p className="text-xs text-gray-500 mt-1">Contact superadmin to create a term.</p>
          </div>
        )}

        {activeTerm && !isArchiveMode && (
          <div className="bg-amber-300 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md uppercase tracking-wider">Active Term</span>
                <p className="text-lg font-extrabold text-gray-900 mt-2">{activeTerm.school_year} — {activeTerm.semester}</p>
                <p className="text-xs text-gray-900 mt-0.5">Teachers can import class lists only for the active term.</p>
              </div>
            </div>
          </div>
        )}

        {allTerms.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Term History</h3>
            <p className="text-[10px] text-gray-900 mb-3">Click a past term to browse its data in read-only mode.</p>
            <div className="space-y-2">
              {allTerms.map(t => {
                const isActive = t.is_active;
                const isCurrentlyViewing = viewTerm && viewTerm.school_year === t.school_year && viewTerm.semester === t.semester;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (isActive) {
                        if (isArchiveMode) { setViewTerm(null); navigate('/admin'); }
                      } else {
                        setConfirmTerm(t);
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                      isCurrentlyViewing ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' :
                      isActive ? 'bg-amber-300 border-amber-200 hover:bg-amber-100' :
                      'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isActive && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                      {isCurrentlyViewing && !isActive && <Archive size={14} className="text-amber-600" />}
                      <span className={`text-sm font-semibold ${isActive ? 'text-gray-900' : isCurrentlyViewing ? 'text-amber-900' : 'text-gray-500'}`}>
                        {t.school_year} — {t.semester}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrentlyViewing && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">Viewing</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isActive ? 'bg-amber-100 text-amber-700' : t.is_closed ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                      }`}>
                        {isActive ? 'Active' : t.is_closed ? 'Closed' : 'Open'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveExportSettings} className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 card-hover">
        <div className="mb-5">
          <h2 className="text-sm font-bold text-gray-900">Exports</h2>
          <p className="mt-1 text-xs text-gray-600">These names appear in Class Record and Grade Summary XLSX and PDF exports.</p>
        </div>

        {exportSettingsError && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{exportSettingsError}</div>}
        {exportSettingsSaved && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800"><CheckCircle2 size={14} /> Export signatories saved.</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-bold text-gray-800">Program Head — BSIT
            <input type="text" maxLength={160} required value={exportSettings.program_head_bsit} onChange={(event) => { setExportSettings((current) => ({ ...current, program_head_bsit: event.target.value })); setExportSettingsSaved(false); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0c1925] disabled:bg-gray-100" disabled={exportSettingsLoading || savingExportSettings} />
          </label>
          <label className="block text-xs font-bold text-gray-800">Program Head — BSCS
            <input type="text" maxLength={160} required value={exportSettings.program_head_bscs} onChange={(event) => { setExportSettings((current) => ({ ...current, program_head_bscs: event.target.value })); setExportSettingsSaved(false); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0c1925] disabled:bg-gray-100" disabled={exportSettingsLoading || savingExportSettings} />
          </label>
          <label className="block text-xs font-bold text-gray-800 sm:col-span-2">Dean — CICT
            <input type="text" maxLength={160} required value={exportSettings.dean_cict} onChange={(event) => { setExportSettings((current) => ({ ...current, dean_cict: event.target.value })); setExportSettingsSaved(false); }} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0c1925] disabled:bg-gray-100" disabled={exportSettingsLoading || savingExportSettings} />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={exportSettingsLoading || savingExportSettings} className="inline-flex items-center gap-2 rounded-lg bg-[#0c1925] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#142a3f] disabled:cursor-not-allowed disabled:opacity-50">
            <Save size={14} /> {savingExportSettings ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      {confirmTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-2xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-amber-50"><Archive size={20} className="text-amber-600" /></div>
              <h3 className="text-lg font-bold text-gray-900">Browse Archived Term</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              View <strong>{confirmTerm.school_year} — {confirmTerm.semester}</strong>?
            </p>
            <p className="text-xs text-gray-500 mb-5">
              You will be redirected to this archived term. All admin pages will show data from this semester in <strong>read-only mode</strong>. You cannot add, edit, or delete any data while viewing a past term.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmTerm(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setViewTerm({ school_year: confirmTerm.school_year, semester: confirmTerm.semester });
                  setConfirmTerm(null);
                  navigate('/admin');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm hover:scale-105 transition-transform cursor-pointer"
                style={{ background: '#f5a623' }}
              >
                <Archive size={14} /> View Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportSaveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4">
          <form onSubmit={confirmSaveExportSettings} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <h3 id="export-save-confirm-title" className="text-lg font-bold text-gray-900">Confirm export settings</h3>
            <p className="mt-2 text-sm text-gray-600">Type <strong>Confirm</strong> to save these signatory names.</p>
            <label htmlFor="export-save-confirmation" className="mt-4 block text-xs font-bold text-gray-800">Type Confirm</label>
            <input
              id="export-save-confirmation"
              type="text"
              autoComplete="off"
              autoFocus
              value={exportSaveConfirmation}
              onChange={(event) => setExportSaveConfirmation(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0c1925]"
              aria-labelledby="export-save-confirm-title"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowExportSaveConfirm(false); setExportSaveConfirmation(''); }}
                disabled={savingExportSettings}
                className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingExportSettings || exportSaveConfirmation.trim() !== 'Confirm'}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0c1925] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#142a3f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={14} /> {savingExportSettings ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;


