import { Users, Calendar, AlertOctagon, MoreVertical, Sparkles } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';

const ClassCard = ({ level, title, section, performance, barData }) => {
  const data = [
    { name: 'Completed', value: performance },
    { name: 'Remaining', value: 100 - performance },
  ];
  const COLORS = ['#dca326', '#f3f4f6'];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-xs font-bold text-gold bg-gold-light px-2 py-1 rounded-md mb-2 inline-block uppercase tracking-wider">{level}</span>
          <h3 className="text-lg font-medium text-sidebar">{title}</h3>
          <p className="text-sm text-text-muted">{section}</p>
        </div>
        <button className="text-gray-400 hover:text-sidebar"><MoreVertical size={20}/></button>
      </div>

      <div className="flex items-end justify-between mb-8 gap-4">
        <div className="w-1/2 flex flex-col items-center relative">
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="100%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={30}
                  outerRadius={40}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
             <span className="text-xl font-bold text-sidebar block">{performance}%</span>
             <span className="text-[10px] font-semibold text-text-muted tracking-widest uppercase mt-1">Class<br/>Performance</span>
          </div>
        </div>
        
        <div className="w-1/2 h-20 relative">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={barData} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                <Tooltip cursor={{fill: '#fdfaf5'}} contentStyle={{fontSize: '12px'}}/>
                <Bar dataKey="value" fill="#dca326" radius={[2, 2, 0, 0]} opacity={0.6} />
             </BarChart>
           </ResponsiveContainer>
           <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1 font-bold">
              <span>A</span><span>B</span><span>C</span><span>D</span>
           </div>
        </div>
      </div>

      <div className="mt-auto flex gap-3">
        <button className="flex-1 bg-gold hover:bg-gold-hover text-sidebar font-bold py-2.5 rounded-lg transition-colors text-sm">Compute Grades</button>
        <button className="flex-1 bg-white border border-gold text-gold font-bold py-2.5 rounded-lg hover:bg-gold-light transition-colors text-sm">View Records</button>
      </div>
    </div>
  );
};

const MyClasses = () => {
  const classes = [
    {
      level: 'Advanced Level',
      title: 'AP Physics 101',
      section: 'Section B • Room 402',
      performance: 84,
      barData: [{name:'A', value:30}, {name:'B', value:45}, {name:'C', value:15}, {name:'D', value:10}]
    },
    {
      level: 'Intermediate',
      title: 'Computer Science II',
      section: 'Section A • Lab 210',
      performance: 92,
      barData: [{name:'A', value:50}, {name:'B', value:30}, {name:'C', value:15}, {name:'D', value:5}]
    },
    {
      level: 'General ED',
      title: 'Modern Literature',
      section: 'Section D • Online Hub',
      performance: 68,
      barData: [{name:'A', value:15}, {name:'B', value:25}, {name:'C', value:40}, {name:'D', value:20}]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border border-l-4 border-l-sidebar relative overflow-hidden">
          <Users size={64} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-100" />
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Total Students</p>
          <div className="flex items-baseline gap-3 relative z-10">
            <h2 className="text-4xl font-bold text-sidebar">184</h2>
            <span className="text-sm font-bold text-green-500">~+12%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border border-l-4 border-l-green-400 relative overflow-hidden">
          <Calendar size={64} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-100" />
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Avg. Attendance</p>
          <div className="flex items-baseline gap-3 relative z-10">
            <h2 className="text-4xl font-bold text-sidebar">94.2%</h2>
            <span className="text-sm font-bold text-green-500">~+2.4%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border border-l-4 border-l-red-400 relative overflow-hidden">
          <AlertOctagon size={64} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-50" />
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 relative z-10">Flagged For Intervention</p>
          <div className="flex items-baseline gap-3 relative z-10">
            <h2 className="text-4xl font-bold text-sidebar">8</h2>
            <span className="text-sm font-bold text-red-500">! Critical</span>
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {classes.map((cls, idx) => (
          <ClassCard key={idx} {...cls} />
        ))}
      </div>

      {/* Bulk Sync Footer */}
      <div className="bg-sidebar rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-auto shadow-md">
        <div className="flex items-center gap-4">
          <Sparkles className="text-gold" size={24} />
          <div>
            <h4 className="text-white font-medium">Bulk Grade Sync</h4>
            <p className="text-gray-400 text-sm">Synchronize all classes with the central registry</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
          <button className="text-white bg-sidebar-hover hover:bg-sidebar-active px-6 py-2.5 rounded-lg font-medium transition-colors text-sm">Export All Reports</button>
          <button className="bg-gold hover:bg-gold-hover text-sidebar font-bold px-6 py-2.5 rounded-lg transition-colors text-sm">Start Bulk Sync</button>
        </div>
      </div>
    </div>
  );
};

export default MyClasses;
