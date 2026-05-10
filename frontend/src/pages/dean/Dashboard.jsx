import { Info, MoreVertical, Users, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from 'recharts';

const GaugeCard = ({ title, value, color, targetLabel, targetValue, statusLabel, statusValue, statusColor }) => {
  const data = [
    { name: 'Value', value: value },
    { name: 'Remaining', value: 100 - value },
  ];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col items-center h-full">
      <div className="w-full flex justify-between items-center mb-2">
        <h3 className="font-medium text-sidebar flex items-center gap-2">{title} <Info size={14} className="text-gray-400"/></h3>
        <button className="text-gray-400"><MoreVertical size={16}/></button>
      </div>
      <div className="h-40 w-full relative mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              startAngle={225}
              endAngle={-45}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-sidebar">{value}%</span>
          <span className="text-[9px] font-bold text-text-muted tracking-widest uppercase">{title.split(' ')[1] || 'COMPLIANT'}</span>
        </div>
      </div>
      <div className="w-full flex justify-between text-sm mt-auto border-t border-border pt-4">
        <div>
          <div className="text-[10px] font-bold text-text-muted tracking-wider uppercase mb-1">{targetLabel}</div>
          <div className="font-bold text-sidebar">{targetValue}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-text-muted tracking-wider uppercase mb-1">{statusLabel}</div>
          <div className={`font-bold ${statusColor}`}>{statusValue}</div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const lineData = [
    { name: 'SEP', value: 85 }, { name: 'OCT', value: 88 }, { name: 'NOV', value: 92 },
    { name: 'DEC', value: 87 }, { name: 'JAN', value: 85 }, { name: 'FEB', value: 89 },
    { name: 'MAR', value: 96 }, { name: 'APR', value: 91 }, { name: 'MAY', value: 87 },
    { name: 'JUN', value: 95 }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="text-3xl font-bold text-sidebar">Compliance Dashboard</h1>
          <p className="text-text-muted mt-1">Real-time oversight of institutional grading standards and intervention metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div> SYSTEM LIVE
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-3 gap-6">
        <GaugeCard 
          title="Submission Compliance" 
          value={88} 
          color="#eab308" 
          targetLabel="TARGET" targetValue="95.0%" 
          statusLabel="STATUS" statusValue="~ Caution" statusColor="text-orange-500" 
        />
        <GaugeCard 
              title="At-Risk Flag Review" 
              value={40} 
              color="#ef4444" 
              targetLabel="PENDING" targetValue="124 Cases" 
              statusLabel="ACTION" statusValue="Intervene" statusColor="text-red-500 underline" 
            />

        <div className="flex flex-col gap-6">
          <div className="bg-[#f0ece1] p-6 rounded-2xl border border-border flex-1">
            <div className="text-[10px] font-bold text-gold-hover tracking-widest uppercase mb-1">INSTITUTIONAL HEALTH</div>
            <h3 className="text-lg font-medium text-sidebar mb-2">Average Grade Point</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gold-hover">3.42</span>
              <span className="text-sm font-bold text-green-500">^+0.12</span>
            </div>
            <div className="h-12 w-full flex items-end gap-1">
              <div className="flex-1 bg-gray-400 h-[60%] rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[70%] rounded-sm"></div>
              <div className="flex-1 bg-gold-hover h-full rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[80%] rounded-sm"></div>
              <div className="flex-1 bg-gray-400 h-[65%] rounded-sm"></div>
            </div>
          </div>
          <div className="bg-[#f0ece1] p-6 rounded-2xl border border-border flex items-center gap-4">
             <div className="bg-blue-200 text-blue-700 p-3 rounded-xl"><Users size={20}/></div>
             <div>
               <div className="text-xs text-text-muted font-medium">Faculty Engagement</div>
               <div className="text-xl font-bold text-sidebar">92.4%</div>
             </div>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-border">
            <h3 className="text-lg font-medium text-sidebar">Teacher Gradebook Submission Log</h3>
            <div className="flex gap-2">
              <button className="text-xs font-bold text-sidebar border border-border px-3 py-1.5 rounded-lg">Filter</button>
              <button className="text-xs font-bold text-gold border border-gold px-3 py-1.5 rounded-lg hover:bg-gold-light">CSV</button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-bg-light text-[10px] font-bold text-text-muted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">FACULTY MEMBER</th>
                <th className="px-6 py-4">COURSE CODE</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4">TREND</th>
                <th className="px-6 py-4">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              <tr>
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-sidebar">DB</div>
                  <div>
                    <div className="font-bold text-sidebar">Dr. David Bennett</div>
                    <div className="text-xs text-text-muted">Senior Lecturer • Science</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-sidebar bg-gray-50 text-xs">BIO-402</td>
                <td className="px-6 py-4"><span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">SUBMITTED</span></td>
                <td className="px-6 py-4 text-green-500 font-bold">|||</td>
                <td className="px-6 py-4 text-gray-400"><MoreVertical size={16}/></td>
              </tr>
              <tr>
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-sidebar">SM</div>
                  <div>
                    <div className="font-bold text-sidebar">Sarah Miller</div>
                    <div className="text-xs text-text-muted">Adjunct Professor • Arts</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-sidebar bg-gray-50 text-xs">ART-110</td>
                <td className="px-6 py-4"><span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">PENDING</span></td>
                <td className="px-6 py-4 text-orange-500 font-bold">||.</td>
                <td className="px-6 py-4 text-gray-400"><MoreVertical size={16}/></td>
              </tr>
              <tr>
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-sidebar">JK</div>
                  <div>
                    <div className="font-bold text-sidebar">James Kovic</div>
                    <div className="text-xs text-text-muted">HOD • Mathematics</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-sidebar bg-gray-50 text-xs">MAT-301</td>
                <td className="px-6 py-4"><span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">OVERDUE</span></td>
                <td className="px-6 py-4 text-red-500 font-bold">||.</td>
                <td className="px-6 py-4 text-gray-400"><MoreVertical size={16}/></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grade Distribution */}
        <div className="flex-1 bg-sidebar rounded-2xl shadow-sm p-6 text-white border-2 border-transparent">
          <h3 className="text-lg font-medium text-gold mb-6 flex items-center gap-2"><BarChart2 size={20}/> Grade Distribution</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold tracking-wider mb-2">
                <span>ENGINEERING</span>
                <span className="text-gold">Avg 3.8</span>
              </div>
              <div className="h-3 flex gap-1">
                <div className="bg-gold h-full rounded-l-sm" style={{width: '60%'}}></div>
                <div className="bg-[#4b5563] h-full rounded-r-sm" style={{width: '40%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold tracking-wider mb-2">
                <span>HUMANITIES</span>
                <span className="text-gold">Avg 3.2</span>
              </div>
              <div className="h-3 flex gap-1">
                <div className="bg-gold h-full rounded-l-sm" style={{width: '40%'}}></div>
                <div className="bg-[#4b5563] h-full rounded-r-sm" style={{width: '60%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold tracking-wider mb-2">
                <span>MATHEMATICS</span>
                <span className="text-gold">Avg 3.5</span>
              </div>
              <div className="h-3 flex gap-1">
                <div className="bg-gold h-full rounded-l-sm" style={{width: '50%'}}></div>
                <div className="bg-[#4b5563] h-full rounded-r-sm" style={{width: '50%'}}></div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-8 justify-center text-[10px] font-bold tracking-widest text-gray-400">
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gold"></div> DISTINCTION</span>
             <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#4b5563]"></div> PASS</span>
          </div>
        </div>
      </div>

      {/* Bottom Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-medium text-sidebar">Attendance Sustainability Trend</h3>
            <p className="text-sm text-text-muted mt-1">Monthly cross-departmental attendance engagement</p>
          </div>
          <div className="flex gap-4 text-[10px] font-bold tracking-widest uppercase">
            <span className="flex items-center gap-2 text-sidebar"><div className="w-4 h-1 bg-blue-300"></div> TARGET (95%)</span>
            <span className="flex items-center gap-2 text-sidebar"><div className="w-4 h-1 bg-gold"></div> CURRENT YEAR</span>
          </div>
        </div>
        <div className="h-48 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={lineData} margin={{top: 10, bottom: 0, left: 0, right: 0}}>
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#eab308" strokeWidth={3} dot={{r: 4, fill: '#eab308', stroke: '#fff', strokeWidth: 2}} />
                <Line type="monotone" dataKey={() => 90} stroke="#93c5fd" strokeDasharray="5 5" strokeWidth={2} dot={false} />
             </LineChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
