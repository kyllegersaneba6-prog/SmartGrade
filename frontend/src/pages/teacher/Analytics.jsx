import { Download, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';

const Analytics = () => {
  const scatterData = [
    { x: 20, y: 30 }, { x: 35, y: 50 }, { x: 45, y: 40 }, { x: 60, y: 70 },
    { x: 75, y: 55 }, { x: 85, y: 80 }, { x: 95, y: 35 }
  ];

  const courseData = [
    { name: 'SEC-A', val1: 65, val2: 80, bench: 85 },
    { name: 'SEC-B', val1: 75, val2: 70, bench: 85 }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start">
      {/* Left Column */}
      <div className="flex-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
            <div>
              <h3 className="text-lg font-medium text-sidebar">Academic Performance Distribution</h3>
              <p className="text-sm text-text-muted mt-1">Correlation between participation and final grade outcomes across all sections.</p>
            </div>
            <button className="bg-gold hover:bg-gold-hover text-sidebar font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm">
              <Download size={16} /> EXPORT DATA
            </button>
          </div>

          <div className="h-64 bg-bg-light rounded-xl mb-6 relative">
             <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e0d4" />
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" hide />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Students" data={scatterData} fill="#dca326" />
                <ReferenceLine stroke="#dca326" strokeDasharray="5 5" segment={[{ x: 10, y: 20 }, { x: 100, y: 90 }]} opacity={0.5}/>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="absolute left-0 bottom-0 text-[10px] font-bold text-text-muted tracking-widest uppercase -rotate-90 origin-top-left translate-y-1/2 translate-x-4">Final Performance Index</div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-text-muted tracking-widest uppercase">Student Engagement Metric</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="border border-border p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">R² Correlation</div>
              <div className="text-xl font-bold text-sidebar">0.84</div>
            </div>
            <div className="border border-border p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Mean Performance</div>
              <div className="text-xl font-bold text-sidebar">76.2%</div>
            </div>
            <div className="border border-border p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Outlier Count</div>
              <div className="text-xl font-bold text-sidebar">12</div>
            </div>
            <div className="border border-border p-4 rounded-xl text-center">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Stability Score</div>
              <div className="text-xl font-bold text-green-500">High</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-light p-6 rounded-2xl border border-border">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-sidebar">Performance Analysis by Course Section</h3>
              <p className="text-sm text-text-muted mt-1">Comparative study of average grade vs. benchmark standards.</p>
            </div>
            <div className="flex bg-border p-1 rounded-lg">
              <button className="px-4 py-1.5 text-xs font-bold bg-gold text-sidebar rounded-md">BY SUBJECT</button>
              <button className="px-4 py-1.5 text-xs font-bold text-text-muted">BY FACULTY</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chart 1 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4 text-sm font-medium">
                <span className="text-sidebar">Calculus II</span>
                <span className="text-green-500">+4.2%</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                 <div className="w-1/3 bg-sidebar h-1/2 rounded-t-sm"></div>
                 <div className="w-1/3 bg-gold h-[60%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-blue-300 h-[70%] rounded-t-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-2">
                 <span>SEC-A</span><span>SEC-B</span><span>BENCH</span>
              </div>
            </div>
            {/* Chart 2 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4 text-sm font-medium">
                <span className="text-sidebar">Physics 101</span>
                <span className="text-red-500">-2.8%</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                 <div className="w-1/3 bg-sidebar h-[80%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-gold h-[50%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-blue-300 h-[70%] rounded-t-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-2">
                 <span>SEC-A</span><span>SEC-B</span><span>BENCH</span>
              </div>
            </div>
            {/* Chart 3 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4 text-sm font-medium">
                <span className="text-sidebar">Economics</span>
                <span className="text-green-500">+1.5%</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                 <div className="w-1/3 bg-sidebar h-[30%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-gold h-[40%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-blue-300 h-[35%] rounded-t-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-2">
                 <span>SEC-A</span><span>SEC-B</span><span>BENCH</span>
              </div>
            </div>
            {/* Chart 4 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4 text-sm font-medium">
                <span className="text-sidebar">Biology</span>
                <span className="text-orange-500">STABLE</span>
              </div>
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                 <div className="w-1/3 bg-sidebar h-[65%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-gold h-[65%] rounded-t-sm"></div>
                 <div className="w-1/3 bg-blue-300 h-[65%] rounded-t-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-2">
                 <span>SEC-A</span><span>SEC-B</span><span>BENCH</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-full lg:w-[380px] space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
          <h3 className="text-lg font-medium text-sidebar mb-1">Behavioral Intervention Funnel</h3>
          <p className="text-sm text-text-muted mb-8">Tracking progression from initial flag to resolution.</p>

          <div className="flex flex-col items-center mb-8 gap-1">
             <div className="w-full bg-gold-light py-4 text-center relative border-b border-white">
                <div className="absolute inset-0 bg-gold opacity-20" style={{clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)'}}></div>
                <div className="relative z-10 text-lg font-bold text-sidebar">1,240</div>
                <div className="relative z-10 text-xs text-sidebar font-medium">Initial Behavioral Flags</div>
             </div>
             <div className="w-[90%] bg-gold-light py-4 text-center relative border-b border-white">
                <div className="absolute inset-0 bg-gold opacity-40" style={{clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)'}}></div>
                <div className="relative z-10 text-lg font-bold text-sidebar">856</div>
                <div className="relative z-10 text-xs text-sidebar font-medium">Teacher Reviews</div>
             </div>
             <div className="w-[76%] bg-gold-light py-4 text-center relative border-b border-white">
                <div className="absolute inset-0 bg-gold opacity-60" style={{clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)'}}></div>
                <div className="relative z-10 text-lg font-bold text-sidebar">412</div>
                <div className="relative z-10 text-xs text-sidebar font-medium">Active Interventions</div>
             </div>
             <div className="w-[60%] bg-gold py-4 text-center relative">
                <div className="absolute inset-0 bg-gold-hover" style={{clipPath: 'polygon(0 0, 100% 0, 50% 100%, 50% 100%)'}}></div>
                <div className="relative z-10 text-lg font-bold text-white">318</div>
                <div className="relative z-10 text-xs text-white font-medium">Resolved Cases</div>
             </div>
          </div>

          <div className="bg-bg-light border border-orange-200 p-5 rounded-xl">
             <div className="flex items-center gap-2 text-orange-600 mb-2">
               <AlertCircle size={18} />
               <span className="font-bold text-sm">Critical Drop-off</span>
             </div>
             <p className="text-sm text-text-main mb-4 leading-relaxed">
               48% of reviews do not proceed to intervention. Recommend automated faculty reminders.
             </p>
             <button className="w-full py-2.5 bg-white border border-border text-sidebar font-bold text-xs rounded-lg hover:bg-gray-50 transition-colors">OPTIMIZE WORKFLOW</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border border-l-4 border-l-green-500 flex gap-4 items-center">
            <CheckCircle className="text-green-500" size={24} />
            <div>
               <h4 className="font-bold text-sidebar text-sm">Data Integrity Confirmed</h4>
               <p className="text-xs text-text-muted mt-1">Last synced with Registrar 14 minutes ago.</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-border border-l-4 border-l-gold flex gap-4 items-center relative overflow-hidden">
            <Zap className="text-gold" size={24} />
            <div>
               <h4 className="font-bold text-sidebar text-sm">AI Projection Ready</h4>
               <p className="text-xs text-text-muted mt-1">End-of-term grade predictions available for 84% of students.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
