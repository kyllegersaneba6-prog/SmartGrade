import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, Clock, AlertTriangle, Trash2, Users, BookOpen, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const ReportGenerator = () => {
  const [activityLog, setActivityLog] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dean_activity_log');
    if (saved) {
      setActivityLog(JSON.parse(saved));
    }
  }, []);

  const handleClearLog = () => {
    localStorage.removeItem('dean_activity_log');
    setActivityLog([]);
  };

  const formatTimestamp = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  };

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Stats
  const totalActions = activityLog.length;
  const completedActions = activityLog.filter(a => a.status === 'COMPLETED').length;
  const pendingActions = activityLog.filter(a => a.status === 'PENDING').length;
  const uniqueSections = [...new Set(activityLog.map(a => a.sectionName))].length;

  const displayedLog = showAll ? activityLog : activityLog.slice(0, ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sidebar">Section Management Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track all section assignments, teacher delegations, and subject configurations.
          </p>
        </div>
        {activityLog.length > 0 && (
          <button
            onClick={handleClearLog}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 font-bold text-sm rounded-lg hover:bg-red-100 transition-colors border border-red-200"
          >
            <Trash2 size={14} /> Clear Activity Log
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <ClipboardList size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Actions</h4>
          <div className="text-4xl font-bold text-gold relative z-10">{totalActions}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <CheckCircle size={80} className="absolute -right-4 -bottom-4 text-green-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Completed</h4>
          <div className="text-4xl font-bold text-green-500 relative z-10">{completedActions}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <Clock size={80} className="absolute -right-4 -bottom-4 text-orange-50" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Pending</h4>
          <div className="text-4xl font-bold text-orange-500 relative z-10">{pendingActions}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <Users size={80} className="absolute -right-4 -bottom-4 text-gray-100" />
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Sections Managed</h4>
          <div className="text-4xl font-bold text-sidebar relative z-10">{uniqueSections}</div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-sidebar">Activity History</h2>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-text-muted">
            LIVE SYNC STATUS: <span className="text-[#10b981] flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> ACTIVE</span>
          </div>
        </div>

        {activityLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClipboardList size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-gray-600 text-lg">No activity recorded yet</p>
            <p className="text-sm mt-1">Section assignments will appear here after you publish them from the Student Sections page.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="w-full text-left min-w-[800px]">
                <thead className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="pb-3 pr-3">Action</th>
                    <th className="pb-3 pr-3">Section</th>
                    <th className="pb-3 pr-3">Subject</th>
                    <th className="pb-3 pr-3">Assigned Teacher</th>
                    <th className="pb-3 pr-3 text-center">Students</th>
                    <th className="pb-3 pr-3">Date & Time</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {displayedLog.map((entry) => {
                    const ts = formatTimestamp(entry.timestamp);
                    const isCompleted = entry.status === 'COMPLETED';
                    
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        {/* Action */}
                        <td className="py-4 pr-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-green-100' : 'bg-orange-100'}`}>
                              {isCompleted ? <CheckCircle size={14} className="text-green-600" /> : <Clock size={14} className="text-orange-500" />}
                            </div>
                            <span className="font-semibold text-sidebar text-xs">{entry.action}</span>
                          </div>
                        </td>

                        {/* Section */}
                        <td className="py-4 pr-3">
                          <span className="font-bold text-gold text-sm">{entry.sectionName}</span>
                        </td>

                        {/* Subject */}
                        <td className="py-4 pr-3">
                          <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-gray-400" />
                            <span className={`text-xs font-medium ${entry.subject === 'Not assigned' ? 'text-gray-400 italic' : 'text-sidebar'}`}>
                              {entry.subject}
                            </span>
                          </div>
                        </td>

                        {/* Teacher */}
                        <td className="py-4 pr-3">
                          {entry.teacher === 'Not assigned' ? (
                            <span className="text-xs text-gray-400 italic">Not assigned</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-sidebar flex items-center justify-center text-white text-[10px] font-bold">
                                {entry.teacher.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <span className="font-medium text-sidebar text-xs">{entry.teacher}</span>
                            </div>
                          )}
                        </td>

                        {/* Student Count */}
                        <td className="py-4 pr-3 text-center">
                          <span className="bg-bg-light text-sidebar text-xs font-bold px-2.5 py-1 rounded-full border border-border">
                            {entry.studentCount}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-4 pr-3">
                          <div className="text-xs">
                            <div className="font-medium text-sidebar">{ts.date}</div>
                            <div className="text-text-muted">{ts.time} · <span className="text-gold font-semibold">{timeAgo(entry.timestamp)}</span></div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                            isCompleted 
                              ? 'bg-green-50 text-green-600 border border-green-200'
                              : 'bg-orange-50 text-orange-600 border border-orange-200'
                          }`}>
                            {isCompleted ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-text-muted">
              <span>Showing {displayedLog.length} of {activityLog.length} activities</span>
              {activityLog.length > ITEMS_PER_PAGE && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="font-bold flex items-center gap-1 hover:text-sidebar transition-colors"
                >
                  {showAll ? (
                    <><ChevronUp size={14} /> Show Less</>
                  ) : (
                    <><ChevronDown size={14} /> View All {activityLog.length} Activities</>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
