import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Loader, Archive, X, Lock } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';

const AdminSettings = () => {
  const { activeTerm, allTerms, viewTerm, setViewTerm, isArchiveMode, loading } = useAdmin();
  const [confirmTerm, setConfirmTerm] = useState(null);
  const navigate = useNavigate();

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
        <p className="text-xs text-gray-500 mt-1">View academic terms and browse archived semesters</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e0d5]">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Academic Term Information</h2>

        {isArchiveMode && viewTerm && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-gray-800">
                Currently viewing: <strong>{viewTerm.school_year} — {viewTerm.semester}</strong>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Read Only</span>
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
            <p className="text-xs text-gray-400 mt-1">Contact superadmin to create a term.</p>
          </div>
        )}

        {activeTerm && !isArchiveMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Active Term</span>
                <p className="text-lg font-extrabold text-gray-900 mt-2">{activeTerm.school_year} — {activeTerm.semester}</p>
                <p className="text-xs text-gray-500 mt-0.5">Sections and assignments can only be added to this term.</p>
              </div>
            </div>
          </div>
        )}

        {allTerms.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Term History</h3>
            <p className="text-[10px] text-gray-400 mb-3">Click a past term to browse its data in read-only mode.</p>
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
                    className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      isCurrentlyViewing ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300' :
                      isActive ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' :
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Viewing</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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

      {confirmTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-100">
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
    </div>
  );
};

export default AdminSettings;
