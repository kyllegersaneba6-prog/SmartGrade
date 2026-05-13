import { FileText, FileSpreadsheet, Plus, Filter, Download, Users, BookOpen, CheckCircle, Lightbulb } from 'lucide-react';

const TemplateCard = ({ title, desc, format, status, isArchived }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-border p-5 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
       <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${isArchived ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'}`}>
         {status}
       </span>
       <div className="text-gray-400">
         {format === 'EXCEL' ? <FileSpreadsheet size={16}/> : <FileText size={16}/>}
       </div>
    </div>
    <div>
      <h3 className="font-bold text-sidebar mb-1 text-sm">{title}</h3>
      <p className="text-[10px] text-text-muted leading-relaxed mb-4">{desc}</p>
    </div>
    <div className="flex justify-between items-center mt-auto border-t border-border pt-4">
       <span className="text-[10px] font-bold text-sidebar flex items-center gap-1"><FileText size={12}/> {format}</span>
       <button className="text-[10px] font-bold text-gold bg-gold-light px-3 py-1 rounded hover:bg-gold hover:text-sidebar transition-colors uppercase">
         {isArchived ? 'Restore' : 'Edit'}
       </button>
    </div>
  </div>
);

const TemplateSettings = () => {
  const auditData = [
    { version: 'V2.4.1', name: 'DepEd ECR Standard', desc: 'Updated formula for Weighted Average based on DepEd Order No. 31', by: 'Sarah Jenkins', status: 'Published' },
    { version: 'V1.9.0', name: 'Custom School Report Card', desc: 'Added institutional logo branding to header section', by: 'Mark Thompson', status: 'Draft' },
    { version: 'V3.0.0-rc', name: 'Faculty Evaluation', desc: 'Restructured survey questions for semester performance', by: 'Dr. Elena Rodriguez', status: 'Archived' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gold mb-1">Template Settings</h1>
        <p className="text-sm text-text-muted">Manage and configure academic reporting templates for institutional standards.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-sidebar">Active Report Templates</h2>
              <button className="text-xs font-bold text-gold flex items-center gap-1 hover:text-gold-hover transition-colors">
                <Plus size={16} /> Create Template
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TemplateCard title="DepEd ECR Standard" desc="Official Electronic Class Record for public schools." format="EXCEL" status="IN USE" isArchived={false} />
              <TemplateCard title="Custom School Report Card" desc="Branded institutional progress report template." format="PDF" status="IN USE" isArchived={false} />
              <TemplateCard title="Faculty Evaluation Summary" desc="Historical evaluation metrics for legacy staff." format="EXCEL" status="ARCHIVED" isArchived={true} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-bold text-sidebar">Template Version History & Audit Trail</h2>
               <div className="flex gap-2">
                 <button className="bg-bg-light border border-border p-2 rounded-lg text-sidebar hover:bg-gray-100 transition-colors"><Filter size={16}/></button>
                 <button className="bg-bg-light border border-border p-2 rounded-lg text-sidebar hover:bg-gray-100 transition-colors"><Download size={16}/></button>
               </div>
             </div>

             <div className="table-responsive"><table className="w-full text-left min-w-[600px]">
               <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
                 <tr>
                   <th className="px-4 py-4">VERSION ID</th>
                   <th className="px-4 py-4">TEMPLATE NAME</th>
                   <th className="px-4 py-4">CHANGE DESCRIPTION</th>
                   <th className="px-4 py-4">MODIFIED BY</th>
                   <th className="px-4 py-4">STATUS</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border text-sm">
                 {auditData.map((row, idx) => (
                   <tr key={idx}>
                     <td className="px-4 py-4 font-bold text-sidebar">{row.version}</td>
                     <td className="px-4 py-4 font-bold text-sidebar">{row.name}</td>
                     <td className="px-4 py-4 text-xs text-text-muted max-w-[200px] leading-relaxed">{row.desc}</td>
                     <td className="px-4 py-4 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-sidebar flex items-center justify-center text-[10px] text-white font-bold">{row.by.split(' ')[0][0]}</div>
                       <span className="font-bold text-sidebar text-xs">{row.by}</span>
                     </td>
                     <td className="px-4 py-4">
                       <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${row.status === 'Published' ? 'bg-green-50 text-green-600' : row.status === 'Draft' ? 'bg-gold-light text-gold' : 'bg-gray-100 text-gray-500'}`}>
                         {row.status}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table></div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-bold text-sidebar mb-1">Performance Funnel</h2>
            <p className="text-xs text-text-muted mb-8">Real-time institutional throughput metrics.</p>

            <div className="flex flex-col items-center gap-2 mb-8">
               <div className="w-full bg-bg-light border border-gold/20 p-5 rounded-r-xl border-l-4 border-l-gold-hover relative">
                 <div className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-1">TOTAL MANAGED TEACHERS</div>
                 <div className="text-2xl font-bold text-sidebar">1,248</div>
                 <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={24}/>
               </div>
               
               <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gold-hover/50"></div>

               <div className="w-[90%] bg-gold-light border border-gold/30 p-5 rounded-r-xl border-l-4 border-l-gold relative">
                 <div className="text-[10px] font-bold text-sidebar tracking-widest uppercase mb-1">GRADEBOOKS CREATED</div>
                 <div className="text-2xl font-bold text-sidebar">10,854</div>
                 <BookOpen className="absolute right-4 top-1/2 -translate-y-1/2 text-gold" size={24}/>
               </div>

               <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gold/50"></div>

               <div className="w-[80%] bg-gold/80 p-5 rounded-r-xl border-l-4 border-l-gold-hover relative text-white">
                 <div className="text-[10px] font-bold tracking-widest uppercase mb-1">COMPUTED/VALIDATED</div>
                 <div className="text-2xl font-bold">9,421</div>
                 <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50" size={24}/>
               </div>

               <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gold-hover/50"></div>

               <div className="w-[70%] bg-gold-hover p-5 rounded-r-xl border-l-4 border-l-gold relative text-sidebar">
                 <div className="text-[10px] font-bold tracking-widest uppercase mb-1">REPORTS EXPORTED</div>
                 <div className="text-2xl font-bold">8,912</div>
                 <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-sidebar/30" size={24}/>
               </div>
            </div>

            <div className="border-t border-border pt-6 mb-8">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-sidebar tracking-wider uppercase">Global Conversion Rate</span>
                 <span className="text-xs font-bold text-[#10b981]">94.6%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#10b981] h-full" style={{width: '94.6%'}}></div>
              </div>
            </div>

            <div className="bg-bg-light border border-gold/20 p-5 rounded-xl flex gap-4">
              <Lightbulb className="text-gold shrink-0 mt-0.5" size={20}/>
              <div>
                <h4 className="text-xs font-bold text-sidebar mb-1">Optimization Tip</h4>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  Gradebook validation is taking longer for the 'Arts' department. Consider simplifying their custom formula template.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSettings;
