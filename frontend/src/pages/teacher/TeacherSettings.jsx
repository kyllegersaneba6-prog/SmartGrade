import React, { useState } from 'react';
import { Archive, CornerDownLeft, LoaderCircle } from 'lucide-react';
import { useTeacher } from '../../contexts/TeacherContext';
import { SkeletonSettingsCard } from '../../components/common/Skeleton';
import TeacherPageHeading from '../../components/teacher/TeacherPageHeading';

const TeacherSettings = () => {
  const { activeTerm, allTerms, viewTerm, setViewTerm, isArchiveMode, loading } = useTeacher();
  const [confirmTerm, setConfirmTerm] = useState(null);
  const [confirmCurrentTermReturn, setConfirmCurrentTermReturn] = useState(false);
  const [termTransition, setTermTransition] = useState(null);

  const handleViewArchive = async () => {
    if (!confirmTerm || termTransition) return;
    const selectedTerm = confirmTerm;
    setTermTransition('archive');
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    setViewTerm({ school_year: selectedTerm.school_year, semester: selectedTerm.semester });
    setConfirmTerm(null);
    setTermTransition(null);
  };

  const handleReturnToCurrent = async () => {
    if (!confirmCurrentTermReturn || termTransition) return;
    setTermTransition('current');
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    setViewTerm(null);
    setConfirmCurrentTermReturn(false);
    setTermTransition(null);
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
      <TeacherPageHeading
        eyebrow="Preferences"
        title="Settings"
        description="View academic terms and browse archived semesters."
      />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-50 card-hover">
        <h2 className="text-sm font-bold text-gray-900 mb-4">{isArchiveMode ? 'Academic Term Management' : 'Academic Term Information'}</h2>

        {isArchiveMode && viewTerm && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-300 p-5">
            <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">Archived Term · Read Only</span>
            <p className="mt-2 text-lg font-extrabold text-gray-900">{viewTerm.school_year} — {viewTerm.semester}</p>
            <p className="mt-1 text-xs text-gray-700">Class and term data cannot be changed while browsing a past semester.</p>
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
                <p className="text-xs text-gray-900 mt-0.5">You are currently working in this term.</p>
              </div>
            </div>
          </div>
        )}

        {allTerms.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Term History</h3>
            <p className="text-[10px] text-gray-900 mb-3">Select a closed term to browse its data; select the active term to return to the current semester.</p>
            <div className="scrollbar-hidden max-h-[108px] space-y-2 overflow-y-auto pr-1">
              {allTerms.map(t => {
                const isActive = t.is_active;
                const isCurrentlyViewing = viewTerm && viewTerm.school_year === t.school_year && viewTerm.semester === t.semester;
                const isSelectedTerm = Boolean(isCurrentlyViewing || (isActive && !isArchiveMode));
                const canBrowse = Boolean(t.is_closed) && !isCurrentlyViewing;
                const canReturnToCurrent = Boolean(isActive && isArchiveMode);
                const isInteractive = canBrowse || canReturnToCurrent;
                return (
                  <div
                    key={t.id}
                    role={isInteractive ? 'button' : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    onClick={isInteractive ? () => {
                      if (canBrowse) setConfirmTerm(t);
                      else setConfirmCurrentTermReturn(true);
                    } : undefined}
                    onKeyDown={isInteractive ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (canBrowse) setConfirmTerm(t);
                        else setConfirmCurrentTermReturn(true);
                      }
                    } : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 ${
                      isSelectedTerm ? 'bg-amber-300 border-amber-200' : 'bg-gray-150 border-gray-200'
                    } ${isInteractive ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400' : 'cursor-default'} ${isInteractive && !isSelectedTerm ? 'hover:!bg-gray-300 hover:scale-[1.01]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {isActive && <span className="h-[10px] w-[10px] rounded-full border border-black bg-green-500" />}
                      {t.is_closed && <Archive size={14} className={isCurrentlyViewing ? 'text-amber-600' : 'text-gray-500'} />}
                      <span className={`text-sm font-semibold ${isSelectedTerm ? 'text-gray-900' : 'text-gray-500'}`}>
                        {t.school_year} — {t.semester}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {canBrowse && <span className="text-[10px] font-semibold text-gray-500">View Semester Archive</span>}
                      {canReturnToCurrent && <span className="text-[10px] font-semibold text-gray-500">Return to current</span>}
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

      {confirmTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-2xl modal-surface p-6 max-w-md w-full min-h-[220px] mx-4 border border-gray-100" aria-busy={termTransition === 'archive'}>
            {termTransition === 'archive' ? (
              <div role="status" aria-live="polite" className="flex min-h-[172px] flex-col items-center justify-center gap-3 text-center">
                <LoaderCircle size={30} className="animate-spin text-amber-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-gray-700">Loading archived semester...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-amber-50"><Archive size={20} className="text-amber-600" /></div>
                  <h3 className="text-lg font-bold text-gray-900">Browse Archived Term</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  View <strong>{confirmTerm.school_year} — {confirmTerm.semester}</strong>?
                </p>
                <p className="text-xs text-gray-900 mb-5">
                  You will be redirected to this archived term. All pages will show data from this semester in <strong>read-only mode</strong>. You cannot add, edit, or delete any data while viewing a past term.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmTerm(null)}
                    data-archive-navigation="true"
                    disabled={Boolean(termTransition)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleViewArchive}
                    data-archive-navigation="true"
                    disabled={Boolean(termTransition)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-900 rounded-lg shadow-sm bg-amber-300 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Archive size={14} /> View Archive
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmCurrentTermReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-2xl modal-surface p-6 max-w-md w-full min-h-[220px] mx-4 border border-gray-100" aria-busy={termTransition === 'current'}>
            {termTransition === 'current' ? (
              <div role="status" aria-live="polite" className="flex min-h-[172px] flex-col items-center justify-center gap-3 text-center">
                <LoaderCircle size={30} className="animate-spin text-amber-500" aria-hidden="true" />
                <span className="text-sm font-semibold text-gray-700">Returning to current semester...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-amber-50"><CornerDownLeft size={20} className="text-amber-600" /></div>
                  <h3 className="text-lg font-bold text-gray-900">Return to Current Semester?</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Return from <strong>{viewTerm?.school_year} — {viewTerm?.semester}</strong> to the active semester <strong>{activeTerm?.school_year} — {activeTerm?.semester}</strong>?
                </p>
                <p className="text-xs text-gray-500 mb-5">Teacher pages will switch back to current semester data.</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setConfirmCurrentTermReturn(false)}
                    data-archive-navigation="true"
                    disabled={Boolean(termTransition)}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReturnToCurrent}
                    data-archive-navigation="true"
                    disabled={Boolean(termTransition)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-900 rounded-lg shadow-sm bg-amber-300 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <CornerDownLeft size={14} /> Return to Current
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSettings;



