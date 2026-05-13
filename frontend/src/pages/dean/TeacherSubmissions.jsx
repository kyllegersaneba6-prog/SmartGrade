import { Filter, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

const TeacherSubmissions = () => {
  const tableData = [
    { name: 'Dr. Aris Thorne', dept: 'Department of Humanities', code: 'HIST-402', metric: 85, date: 'Oct 12, 2023', time: '10:45 AM', compliance: 'Valid' },
    { name: 'Prof. Sarah Jenkins', dept: 'Applied Physics', code: 'PHYS-101', metric: 42, date: 'Oct 11, 2023', time: '02:15 PM', compliance: 'Outlier' },
    { name: 'Marcus Vane', dept: 'Digital Arts', code: 'DART-220', metric: 98, date: 'Oct 11, 2023', time: '09:00 AM', compliance: 'Perfect' }
  ];

  const trendData = [
    { day: 'MON', val: 40 }, { day: 'TUE', val: 60 }, { day: 'WED', val: 35 }, 
    { day: 'THU', val: 80 }, { day: 'FRI', val: 95 }, { day: 'SAT', val: 10 }, { day: 'SUN', val: 5 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-sidebar">Teacher Submissions</h1>
          <p className="text-text-muted mt-1">Review and approve gradebook submissions for the 2023-2024 Academic Year.</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
          QUEUE STATUS <span className="bg-orange-200 px-2 py-0.5 rounded text-orange-800 ml-1">14 PENDING</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border flex flex-col">
            <div className="p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border">
              <h3 className="text-lg font-medium text-sidebar">Submissions Approval Queue (Batch Review)</h3>
              <button className="text-xs font-bold text-sidebar flex items-center gap-2 hover:text-gold transition-colors">
                <Filter size={14}/> Filter by Department
              </button>
            </div>
            
            <div className="table-responsive"><table className="w-full text-left min-w-[600px]">
              <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">TEACHER NAME</th>
                  <th className="px-4 py-4">COURSE CODE</th>
                  <th className="px-4 py-4">METRICS</th>
                  <th className="px-4 py-4">SUBMISSION DATE</th>
                  <th className="px-6 py-4">COMPLIANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {tableData.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 border border-border"></div>
                      <div>
                        <div className="font-bold text-sidebar">{row.name}</div>
                        <div className="text-[10px] text-text-muted">{row.dept}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-sidebar bg-gray-50 text-[10px] tracking-wider">{row.code}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${row.compliance === 'Outlier' ? 'bg-red-500' : row.compliance === 'Perfect' ? 'bg-green-500' : 'bg-gold'}`} style={{width: `${row.metric}%`}}></div>
                        </div>
                        <div className="text-[10px] font-bold text-sidebar">{row.metric}%<br/><span className="text-text-muted font-normal">Avg</span></div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[10px] text-sidebar font-medium">
                      {row.date}<br/><span className="text-text-muted">{row.time}</span>
                    </td>
                    <td className="px-6 py-4">
                      {row.compliance === 'Valid' && <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={14}/> Valid</span>}
                      {row.compliance === 'Outlier' && <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><AlertTriangle size={14}/> Outlier</span>}
                      {row.compliance === 'Perfect' && <span className="flex items-center gap-1 text-xs font-bold text-green-500"><CheckCircle size={14}/> Perfect</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            
            <div className="mt-auto border-t border-border p-4 text-center">
              <button className="text-sm font-bold text-gold hover:text-gold-hover transition-colors flex items-center justify-center gap-1 w-full">
                View Full Submission Records <ArrowRight size={16}/>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-sidebar">Grade Distribution by Department</h3>
              <div className="flex items-center gap-3 text-[10px] font-bold text-text-muted tracking-wider uppercase">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div> A-B</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gold"></div> C</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> D-F</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-sidebar">Humanities</div>
                <div className="flex-1 h-6 flex rounded-md overflow-hidden text-[10px] text-white font-bold text-center leading-6">
                  <div className="bg-[#10b981]" style={{width: '60%'}}>60%</div>
                  <div className="bg-gold" style={{width: '25%'}}>25%</div>
                  <div className="bg-red-400" style={{width: '15%'}}>15%</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-sidebar">Mathematics</div>
                <div className="flex-1 h-6 flex rounded-md overflow-hidden text-[10px] text-white font-bold text-center leading-6">
                  <div className="bg-[#10b981]" style={{width: '40%'}}>40%</div>
                  <div className="bg-gold" style={{width: '45%'}}>45%</div>
                  <div className="bg-red-400" style={{width: '15%'}}>15%</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 text-xs font-bold text-sidebar">Natural Sciences</div>
                <div className="flex-1 h-6 flex rounded-md overflow-hidden text-[10px] text-white font-bold text-center leading-6">
                  <div className="bg-[#10b981]" style={{width: '72%'}}>72%</div>
                  <div className="bg-gold" style={{width: '18%'}}>18%</div>
                  <div className="bg-red-400" style={{width: '10%'}}>10%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 relative">
            <h3 className="text-lg font-medium text-sidebar mb-6">Submission Compliance Audit Trail</h3>
            
            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-gray-100">
              <div className="relative">
                <div className="absolute -left-6 w-1 h-full bg-[#10b981] rounded-full"></div>
                <div className="bg-bg-light p-3 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1">STEP 01: FORMATTING</div>
                    <div className="text-sm font-bold text-sidebar">Standard Check</div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">98% PASS</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 w-1 h-full bg-gold rounded-full"></div>
                <div className="bg-bg-light p-3 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1">STEP 02: VERIFICATION</div>
                    <div className="text-sm font-bold text-sidebar">Grade Consistency</div>
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded">84% PASS</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 w-1 h-full bg-gray-300 rounded-full"></div>
                <div className="bg-bg-light p-3 rounded-lg border border-border flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">STEP 03: FINAL APPROVAL</div>
                    <div className="text-sm font-bold text-sidebar">Executive Sign-off</div>
                  </div>
                  <span className="bg-gray-200 text-sidebar text-[10px] font-bold px-2 py-1 rounded">12 PENDING</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-medium text-sidebar">Timeliness Trend</h3>
              <span className="text-xs font-bold text-green-500">^+12%</span>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: '#fbf9f4'}} />
                  <Bar dataKey="val" fill="#f3f4f6" radius={[2, 2, 0, 0]}>
                    {trendData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.val > 70 ? '#eab308' : '#f3f4f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-sidebar rounded-2xl shadow-sm p-6 text-white relative overflow-hidden group cursor-pointer">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full group-hover:scale-110 transition-transform"></div>
            <div className="text-[10px] font-bold text-gold tracking-widest uppercase mb-1">REVIEWER HANDBOOK</div>
            <h3 className="text-lg font-bold mb-2">Automated Compliance Rules v2.4</h3>
            <p className="text-xs text-gray-300">Update available for batch approval algorithms.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSubmissions;
