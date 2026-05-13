import { FileText, FileSpreadsheet, FileJson, Mail, Sparkles, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';

const ReportGenerator = () => {
  const history = [
    { id: '#REP-0021-X', on: 'Oct 24, 2023 | 14:30', recipient: 'Dr. Arthur Richards', status: 'DELIVERED' },
    { id: '#REP-0022-X', on: 'Oct 25, 2023 | 09:12', recipient: 'Dr. Sarah Chen', status: 'PROCESSING' },
    { id: '#REP-0023-X', on: 'Oct 26, 2023 | 11:45', recipient: 'Prof. Marcus Lowe', status: 'DELIVERED' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Left Column - Form */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border p-4 md:p-6 lg:p-8">
          <div className="flex items-start gap-4 mb-8">
            <p className="text-sidebar text-sm leading-relaxed flex-1 mt-1">Configure parameters for cross-departmental auditing and compliance verification.</p>
            <div className="bg-gold-light p-3 rounded-full text-gold shrink-0"><FileText size={20}/></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-sidebar tracking-wider uppercase mb-2">INSTITUTIONAL LEVEL</label>
              <select className="w-full bg-white border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
                <option>Higher Education Consortium</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sidebar tracking-wider uppercase mb-2">REPORTING PERIOD</label>
              <select className="w-full bg-white border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
                <option>Q3 Academic Review (2023-24)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sidebar tracking-wider uppercase mb-2">COMPLIANCE CATEGORY</label>
              <select className="w-full bg-white border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
                <option>Standardized Grading Protocol</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-sidebar tracking-wider uppercase mb-2">DATA DENSITY</label>
              <select className="w-full bg-white border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
                <option>Executive Summary (High Density)</option>
              </select>
            </div>
          </div>

          <label className="block text-xs font-bold text-sidebar tracking-wider uppercase mb-4">OUTPUT FORMAT & DELIVERY</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-8">
            <button className="border-2 border-gold rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-gold/5 text-sidebar transition-colors">
              <FileText className="text-gold" size={24} />
              <span className="text-xs font-bold">Adobe PDF</span>
            </button>
            <button className="border border-border hover:border-gold rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-text-muted hover:text-sidebar transition-colors">
              <FileSpreadsheet size={24} />
              <span className="text-xs font-bold">Excel<br/>Spreadsheet</span>
            </button>
            <button className="border border-border hover:border-gold rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-text-muted hover:text-sidebar transition-colors">
              <FileJson size={24} />
              <span className="text-xs font-bold">CSV Raw Data</span>
            </button>
            <button className="border border-border hover:border-gold rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-text-muted hover:text-sidebar transition-colors">
              <Mail size={24} />
              <span className="text-xs font-bold">Email Direct</span>
            </button>
          </div>

          <div className="flex justify-end">
             <button className="bg-gold hover:bg-gold-hover text-sidebar font-bold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition-colors">
               <Sparkles size={18} /> GENERATE REPORT
             </button>
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="flex-1 space-y-6">
          <div className="bg-sidebar rounded-2xl shadow-sm p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[350px]">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
             
             <h3 className="text-lg font-bold text-gold relative z-10 leading-tight">Institutional Descriptive Funnel</h3>
             
             <div className="space-y-2 mt-8 relative z-10 text-sm font-medium ">
                <div className="flex justify-between items-center bg-white/10 p-3 rounded backdrop-blur-sm px-12" style={{clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)'}}>
                  <span>Total<br/>Submissions</span>
                  <span className="text-lg">14,209</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-3 rounded backdrop-blur-sm ml-4 mr-4 px-12" style={{clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)'}}>
                  <span>Validated<br/>Records</span>
                  <span className="text-lg">12,844</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-3 rounded backdrop-blur-sm ml-8 mr-8 px-12" style={{clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)'}}>
                  <span>Compliant<br/>Entries</span>
                  <span className="text-lg">11,102</span>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-3 rounded backdrop-blur-sm ml-12 mr-12 text-gold">
                  <span>Final<br/>Export Ready</span>
                  <span className="text-lg font-bold">10,950</span>
                </div>
             </div>

             <div className="flex justify-between items-end mt-8 pt-4 border-t border-white/20 relative z-10">
                <div>
                   <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">INSTITUTIONAL GRADE</div>
                   <div className="text-4xl font-bold text-gold">A+</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">ACCURACY RATE</div>
                   <div className="text-xl font-bold text-[#10b981]">98.4%</div>
                </div>
             </div>
          </div>

          <div className="bg-sidebar rounded-2xl shadow-sm p-5 text-white relative overflow-hidden group cursor-pointer border border-border/10">
             <div className="bg-gold text-sidebar text-[10px] font-bold px-2 py-0.5 rounded inline-block mb-2 uppercase tracking-wider">NEW FEATURE</div>
             <h3 className="text-sm font-bold">Auto-Audit Engine is now active</h3>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-text-muted">
          LIVE SYNC STATUS: <span className="text-[#10b981] flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> ACTIVE</span>
        </div>
        
        <div className="table-responsive"><table className="w-full text-left mt-8 min-w-[700px]">
          <thead className="text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
            <tr>
              <th className="pb-4">Report ID</th>
              <th className="pb-4">Report Subject</th>
              <th className="pb-4">Generated On</th>
              <th className="pb-4">Recipient Institutional Head</th>
              <th className="pb-4">Current Status</th>
              <th className="pb-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {history.map((row, idx) => (
              <tr key={idx}>
                <td className="py-4 font-bold text-gold">{row.id}</td>
                <td className="py-4 text-text-muted"></td>
                <td className="py-4 text-text-muted text-xs">{row.on}</td>
                <td className="py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold">
                    {row.recipient.split(' ')[1][0]}
                  </div>
                  <span className="font-bold text-sidebar text-xs">{row.recipient}</span>
                </td>
                <td className="py-4">
                  <span className={`flex items-center gap-1 w-max px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${row.status === 'DELIVERED' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                    {row.status === 'DELIVERED' ? <CheckCircle size={12}/> : <RefreshCw size={12}/>} {row.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button className="text-gold font-bold text-xs hover:underline flex items-center justify-end gap-1 w-full">
                    {row.status === 'DELIVERED' ? 'View Full Record' : 'Awaiting File...'} {row.status === 'DELIVERED' && <ExternalLink size={12}/>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-text-muted">
           <span>Showing last 3 exports</span>
           <button className="font-bold flex items-center gap-1 hover:text-sidebar transition-colors">View All Historical Exports</button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
