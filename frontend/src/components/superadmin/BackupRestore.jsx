import { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Download, Upload, ShieldCheck, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';
import { downloadBackupFile, readBackupFile, estimateSize, BACKUP_EXT } from '../../utils/backup';

const API = 'http://localhost:5000/api/backup';

export default function BackupRestore() {
  const [cats, setCats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportReport, setExportReport] = useState(null);
  const [error, setError] = useState('');
  // restore state
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState('');
  const [restorePw, setRestorePw] = useState('');
  const [mode, setMode] = useState('merge');
  const [validation, setValidation] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreReport, setRestoreReport] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`${API}/categories`);
        if (res.ok) {
          const data = await res.json();
          setCats(data.categories || []);
          setSelected((data.categories || []).filter((c) => c.id !== 'audit').map((c) => c.id));
        } else setError('Failed to load backup categories.');
      } catch { setError('Network error loading categories.'); }
      finally { setLoading(false); }
    })();
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // client-side dependency hint: requires of selected
  const autoHint = useMemo(() => {
    const need = new Set();
    const byId = Object.fromEntries(cats.map((c) => [c.id, c]));
    const visit = (id) => {
      const c = byId[id];
      if (!c) return;
      for (const d of (c.requires || [])) { if (!selectedSet.has(d)) need.add(d); visit(d); }
    };
    selected.forEach(visit);
    return [...need];
  }, [selected, cats, selectedSet]);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAll = () => setSelected(cats.map((c) => c.id));
  const deselectAll = () => setSelected([]);

  const doExport = async () => {
    setExporting(true); setError(''); setExportReport(null);
    try {
      const res = await api(`${API}/export`, { method: 'POST', body: JSON.stringify({ categories: selected, password: password || null }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'Export failed.'); return; }
      downloadBackupFile(data.filename, data.file);
      setExportReport({
        filename: data.filename, size: estimateSize(data.file),
        categories: data.summary.selectedCategories, auto: data.summary.autoIncluded,
        records: data.summary.totalRecords, counts: data.summary.recordCounts,
        encrypted: Boolean(data.summary.encryption),
      });
      setReviewOpen(false);
    } catch { setError('Network error during export.'); }
    finally { setExporting(false); }
  };

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setValidation(null); setPreview(null); setRestoreReport(null); setError('');
    try {
      const parsed = await readBackupFile(f);
      setFileObj(parsed); setFileName(f.name);
    } catch (err) { setError(err.message); }
  };

  const doValidate = async () => {
    if (!fileObj) return;
    setError('');
    try {
      const res = await api(`${API}/validate`, { method: 'POST', body: JSON.stringify({ file: fileObj, password: restorePw || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.errors?.join('; ') || data.message || 'Validation failed.'); setValidation(null); return; }
      setValidation(data);
    } catch { setError('Network error during validation.'); }
  };

  const doPreview = async () => {
    if (!fileObj) return;
    setError('');
    try {
      const res = await api(`${API}/preview`, { method: 'POST', body: JSON.stringify({ file: fileObj, password: restorePw || undefined, mode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.errors?.join('; ') || data.message || 'Preview failed.'); setPreview(null); return; }
      setValidation({ manifest: data.manifest, tables: data.manifest.tables.map((t) => ({ name: t })) });
      setPreview(data.preview);
    } catch { setError('Network error during preview.'); }
  };

  const doRestore = async () => {
    if (!fileObj) return;
    setRestoring(true); setError('');
    try {
      const res = await api(`${API}/restore`, { method: 'POST', body: JSON.stringify({ file: fileObj, password: restorePw || undefined, mode, confirm: confirmText }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.errors?.join('; ') || data.message || 'Restore failed.'); return; }
      setRestoreReport(data);
      setConfirmText('');
    } catch { setError('Network error during restore.'); }
    finally { setRestoring(false); }
  };

  const needConfirm = mode === 'full' ? 'FULL RESTORE' : 'CONFIRM';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 card-hover">
      <div className="flex items-center gap-2 mb-1">
        <Database size={16} className="text-gray-900" />
        <h2 className="text-sm font-bold text-gray-900">Backup &amp; Restore</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">Selective or complete backups as <code>{BACKUP_EXT}</code> files. Restores are previewed before any change.</p>
      {error && <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      {/* EXPORT */}
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">1 · Select data to back up</h3>
      {loading ? <p className="text-xs text-gray-500">Loading categories…</p> : (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={selectAll} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Select All</button>
            <button onClick={deselectAll} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Deselect All</button>
          </div>
          <div className="space-y-2">
            {cats.map((c) => (
              <label key={c.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer ${selectedSet.has(c.id) ? 'border-[#142a3f] bg-[#142a3f]/5' : 'border-gray-200 bg-gray-50'}`}>
                <input type="checkbox" checked={selectedSet.has(c.id)} onChange={() => toggle(c.id)} className="h-3.5 w-3.5 mt-0.5 accent-blue-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900">{c.label} <span className="ml-1 text-[10px] font-bold text-gray-500">· {c.recordCount ?? '?'} records</span></span>
                  <span className="block text-xs text-gray-500">{c.description}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">Tables: {c.tables.map((t) => `${t.name} (${t.count ?? '?'})`).join(', ')}{c.requires?.length ? ` · Requires: ${c.requires.join(', ')} (auto-included)` : ''}</span>
                </span>
              </label>
            ))}
          </div>
          {autoHint.length > 0 && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">Selecting {selected.join(', ')} will also include dependencies: <strong>{autoHint.join(', ')}</strong>. They are marked auto-included in the backup manifest.</p>}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Encryption password (optional, min 8 chars)</label>
              <div className="flex gap-2">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for unencrypted" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
                <button onClick={() => setShowPw((v) => !v)} className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-100">{showPw ? 'Hide' : 'Show'}</button>
              </div>
              {!password && <p className="text-[11px] text-gray-400 mt-1">Unencrypted backups still validate integrity. Losing an encryption password makes the backup unrecoverable.</p>}
            </div>
            <div className="flex items-end">
              <button onClick={() => setReviewOpen(true)} disabled={selected.length === 0} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm disabled:opacity-50" style={{ background: '#142a3f' }}><ShieldCheck size={15} /> Review &amp; Export</button>
            </div>
          </div>
        </>
      )}
      {exportReport && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-green-800"><CheckCircle2 size={15} /> Export complete — {exportReport.filename}</p>
          <p className="text-xs text-green-800 mt-1">Categories: {exportReport.categories.join(', ') || '—'} · Auto-included: {exportReport.auto.join(', ') || 'none'} · Records: {exportReport.records} · Size: {exportReport.size} · {exportReport.encrypted ? 'Encrypted (AES-256-GCM)' : 'Unencrypted'} · Integrity verified.</p>
        </div>
      )}

      {/* IMPORT / RESTORE */}
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mt-6 mb-2">2 · Import &amp; restore</h3>
      <input ref={fileRef} type="file" accept={BACKUP_EXT} className="hidden" onChange={onPickFile} />
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800"><Upload size={15} /> Choose {BACKUP_EXT} file</button>
        {fileName && <span className="text-xs font-semibold text-gray-600 self-center truncate">{fileName}</span>}
      </div>
      {fileObj && (
        <div className="mt-3 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-600">Backup <strong>{fileObj.manifest?.backupId}</strong> · created {fileObj.manifest?.createdAt} · v{fileObj.manifest?.formatVersion} · {fileObj.manifest?.totalRecords} records {fileObj.manifest?.encryption ? '· Encrypted' : ''}</p>
          {fileObj.manifest?.encryption && (
            <input type="password" value={restorePw} onChange={(e) => setRestorePw(e.target.value)} placeholder="Backup password" className="w-full sm:max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#142a3f]" />
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={doValidate} className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Validate</button>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="text-xs font-bold px-3 py-2 border border-gray-200 rounded-lg bg-white">
              <option value="merge">Merge (safe default)</option>
              <option value="replace">Replace selected categories</option>
              <option value="full">Full restore</option>
            </select>
            <button onClick={doPreview} className="text-xs font-bold px-3 py-2 rounded-lg text-white" style={{ background: '#142a3f' }}>Preview restore</button>
          </div>
          {validation && <p className="text-xs font-semibold text-green-700">Validation passed. Manifest integrity verified.</p>}
          {preview && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-900 mb-2">Preview — {preview.mode}</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {preview.tables.map((t) => (
                  <p key={t.table} className="text-[11px] text-gray-600">{t.table}: backup {t.backup} · would insert {t.insert} · already exist {t.existing}</p>
                ))}
              </div>
              {preview.warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-700 mt-1">⚠ {w}</p>)}
              <div className="mt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Type <strong>{needConfirm}</strong> to confirm {mode} restore</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={needConfirm} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <button onClick={doRestore} disabled={confirmText !== needConfirm || restoring} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"><Download size={14} />{restoring ? 'Restoring…' : 'Restore now'}</button>
                </div>
              </div>
            </div>
          )}
          {restoreReport && <p className="text-xs font-semibold text-green-700">Restore complete ({restoreReport.mode}). Outcome: {JSON.stringify(restoreReport.outcome)}</p>}
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-xl modal-surface p-6 max-w-md w-full mx-4 border border-gray-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Review backup scope</h3>
              <button onClick={() => setReviewOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-600 mb-1">Explicitly selected: <strong>{selected.join(', ') || 'none'}</strong></p>
            <p className="text-xs text-gray-600 mb-3">Auto-included dependencies: <strong>{autoHint.join(', ') || 'none'}</strong></p>
            <p className="text-xs text-gray-600 mb-3">Encryption: <strong>{password ? 'AES-256-GCM (password-protected)' : 'None — integrity checksums only'}</strong></p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReviewOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg">Back</button>
              <button onClick={doExport} disabled={exporting} className="px-4 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50" style={{ background: '#142a3f' }}>{exporting ? 'Exporting…' : 'Export & Download'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
