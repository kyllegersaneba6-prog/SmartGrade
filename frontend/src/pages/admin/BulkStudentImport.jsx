import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, X, UserPlus, Loader, Check, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../utils/api';

const formatStudentId = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 9);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
};

const BulkStudentImport = () => {
  const [searchParams] = useSearchParams();
  const sectionId = searchParams.get('section_id') || '';
  const courseName = searchParams.get('course') || '';
  const yearLevel = searchParams.get('year') || '';
  const sectionName = searchParams.get('section') || '';

  const [rows, setRows] = useState([{ student_id: '', student_name: '', gender: '' }]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const addRow = () => setRows((r) => [...r, { student_id: '', student_name: '', gender: '' }]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length === 0) { setError('File is empty.'); return; }
        const mapped = json.map((row, i) => ({
          student_id: String(row['Student ID'] || row['student_id'] || '').trim(),
          student_name: String(row['Student Name'] || row['student_name'] || row['First Name'] || '').trim(),
          gender: String(row['Gender'] || row['gender'] || '').trim(),
        }));
        setRows(mapped.length ? mapped : [{ student_id: '', student_name: '', gender: '' }]);
        setError('');
      } catch {
        setError('Failed to read Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!sectionId) { setError('No section selected.'); return; }
    const valid = rows.filter((r) => r.student_id.trim() && r.student_name.trim());
    if (valid.length === 0) { setError('Enter at least one student.'); return; }
    setImporting(true); setError(''); setResult(null);
    try {
      const payload = valid.map((r) => ({
        student_id: formatStudentId(r.student_id),
        first_name: r.student_name.split(' ')[0] || r.student_name,
        last_name: r.student_name.split(' ').slice(1).join(' ') || '',
        gender: r.gender || 'Male',
        mi: '',
      }));
      const res = await api(`http://localhost:5000/api/sections/${sectionId}/students/bulk`, {
        method: 'POST',
        body: JSON.stringify({ students: payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ added: data.added?.length || valid.length, skipped: data.skipped?.length || 0 });
      } else {
        const d = await res.json();
        setError(d.message || 'Import failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf6eb] font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        <div className="bg-white rounded-2xl shadow-lg border border-[#e5e0d5] overflow-hidden">
          <div className="bg-[#0f4a82] px-6 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Bulk Student Import</h1>
              <p className="text-xs text-white/70 mt-1">Add multiple students to a section at once</p>
            </div>
            <div className="text-right text-xs text-white/90 bg-white/10 rounded-lg px-3 py-2">
              <div className="font-semibold">{courseName || '—'} — {yearLevel || '—'}</div>
              <div className="text-white/70">{sectionName || '—'} ({sectionId ? 'Selected' : 'None'})</div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <ArrowRight size={18} className="text-amber-600 shrink-0" />
              <span className="font-medium">Course:</span> <span className="font-bold text-gray-800">{courseName || '—'}</span>
              <span className="text-gray-300">|</span>
              <span className="font-medium">Year:</span> <span className="font-bold text-gray-800">{yearLevel || '—'}</span>
              <span className="text-gray-300">|</span>
              <span className="font-medium">Section:</span> <span className="font-bold text-gray-800">{sectionName || '—'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition bg-[#3b82f6]">
                <Upload size={16} /> Upload Excel (.xlsx)
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              <button onClick={addRow} className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition bg-[#f5a623]">
                <UserPlus size={16} /> Add Row
              </button>
            </div>

            {error && <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

            <div className="overflow-x-auto rounded-xl border border-[#e5e0d5]">
              <table className="w-full text-xs">
                <thead className="bg-[#0f4a82] text-white">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">#</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Student ID</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Student Name</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Gender</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-amber-50/30 transition-colors">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2"><input value={r.student_id} onChange={(e) => updateRow(i, 'student_id', e.target.value)} placeholder="00-0000-000" className="w-36 px-2 py-1 text-xs border border-[#e5e0d5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1]" /></td>
                      <td className="px-3 py-2"><input value={r.student_name} onChange={(e) => updateRow(i, 'student_name', e.target.value)} placeholder="First Last" className="w-48 px-2 py-1 text-xs border border-[#e5e0d5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1]" /></td>
                      <td className="px-3 py-2"><input value={r.gender} onChange={(e) => updateRow(i, 'gender', e.target.value)} placeholder="Male / Female" className="w-28 px-2 py-1 text-xs border border-[#e5e0d5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-[#fbf8f1]" /></td>
                      <td className="px-3 py-2"><button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">Enter Student ID, Name, and Gender. Upload an .xlsx file to populate automatically.</p>
              <button onClick={handleSave} disabled={importing || !sectionId} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 disabled:opacity-50 transition bg-[#22c55e]">
                {importing ? <Loader size={16} className="animate-spin" /> : <Check size={16} />} {importing ? 'Importing...' : 'Import / Save'}
              </button>
            </div>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 font-medium">
                Import complete: <strong>{result.added}</strong> student(s) added{result.skipped ? `, ${result.skipped} skipped` : ''}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStudentImport;
