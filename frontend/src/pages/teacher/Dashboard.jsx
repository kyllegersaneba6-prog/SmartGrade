import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, FileText, AlertTriangle, TrendingDown, Star, CheckCircle, Clock, Users } from 'lucide-react';
import clsx from 'clsx';

const Dashboard = () => {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    // Attempt to load dynamically created sections assigned by the Dean
    const savedSections = localStorage.getItem('student_sections');
    if (savedSections) {
      const parsedSections = JSON.parse(savedSections);
      
      const mappedClasses = parsedSections
        .filter(s => s.subject && s.subject.trim() !== '') // only show sections where a subject was assigned
        .map(section => ({
          title: section.subject || 'Untitled Subject',
          section: section.name || 'Unassigned Section',
        }));
        
      if (mappedClasses.length > 0) {
        setClasses(mappedClasses);
        return;
      }
    }

    // Fallback static classes if no dynamic ones are found, matching MyClasses.jsx
    setClasses([
      { title: 'AP Physics 101', section: 'Section B' },
      { title: 'Computer Science II', section: 'Section A' },
      { title: 'Modern Literature', section: 'Section D' }
    ]);
  }, []);

  const subject1 = classes[0]?.title || 'AP Physics 101';
  const section1 = classes[0]?.section || 'Section B';

  const subject2 = classes[1]?.title || (classes[0]?.title ? `${classes[0].title} (Alt)` : 'Computer Science II');
  const section2 = classes[1]?.section || 'Section A';

  const subject3 = classes[2]?.title || (classes[0]?.title ? `${classes[0].title} (Advanced)` : 'Modern Literature');
  const section3 = classes[2]?.section || 'Section D';

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Export Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gold-light p-2 rounded-lg text-gold">
              <FileSpreadsheet size={24} />
            </div>
            <h2 className="text-xl font-medium text-sidebar">Class Record Export</h2>
          </div>
          <button className="text-sm text-sidebar font-medium hover:text-gold transition-colors">Configuration Settings</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-2 tracking-wider">SELECT ACADEMIC CLASS</label>
            <select className="w-full bg-bg-light border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
              {classes.map((cls, idx) => (
                <option key={idx} value={cls.title}>{cls.title} - {cls.section}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-muted mb-2 tracking-wider">TERM PERIOD</label>
            <select className="w-full bg-bg-light border border-border rounded-lg p-3 text-sm text-text-main focus:outline-none focus:border-gold">
              <option>Fall Quarter 2023</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="flex-1 bg-gold hover:bg-gold-hover text-sidebar font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <FileSpreadsheet size={18} /> EXPORT TO EXCEL
          </button>
          <button className="flex-1 bg-white border-2 border-gold text-gold font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gold-light transition-colors">
            <Download size={18} /> DOWNLOAD PDF
          </button>
          <button className="flex-1 bg-white border-2 border-gold text-gold font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gold-light transition-colors">
            <FileText size={18} /> CSV FORMAT
          </button>
        </div>
      </div>

      {/* Behavioral Summary Alerts */}
      <div>
        <div className="flex justify-between items-center px-1 mb-4">
          <h3 className="text-lg font-medium text-sidebar">Behavioral Summary</h3>
          <button className="text-xs font-bold text-gold bg-gold-light px-3 py-1.5 rounded-full hover:bg-gold transition-colors hover:text-sidebar">VIEW ALL REPORTS</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border-l-4 border-red-500 p-5 rounded-r-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">URGENT</div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-sidebar">Critical Attendance Alert</h4>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  3 students in {subject1} ({section1}) have exceeded the 15% absenteeism threshold this quarter. Immediate parental outreach recommended.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white"></div>
                    <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"></div>
                  </div>
                  <span className="text-xs text-text-muted">+1 other</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-orange-400 p-5 rounded-r-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">MODERATE</div>
            <div className="flex items-start gap-3">
              <TrendingDown className="text-orange-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-sidebar">Engagement Decline</h4>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  {subject2} ({section2}) shows a 14% drop in homework submission rates since the last term. Review of curriculum difficulty advised.
                </p>
                <button className="text-xs font-bold text-sidebar mt-3 hover:text-gold transition-colors">INITIATE INTERVENTION PLAN</button>
              </div>
            </div>
          </div>

          <div className="bg-white border-l-4 border-green-500 p-5 rounded-r-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">POSITIVE</div>
            <div className="flex items-start gap-3">
              <Star className="text-green-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-sidebar">Academic Excellence</h4>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  {subject3} ({section3}) records the highest midterm average in school history (89.4%). Excellence certificates ready for distribution.
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Clock size={12}/> 2 hours ago</span>
                  <span className="flex items-center gap-1"><Users size={12}/> Admin Team</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-border">
          <h3 className="text-lg font-medium text-sidebar">Recent Export History</h3>
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Last 30 Days</span>
        </div>
        <div className="table-responsive"><table className="w-full text-left min-w-[400px]">
          <thead className="bg-bg-light text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">
            <tr>
              <th className="px-6 py-4">Filename</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            <tr>
              <td className="px-6 py-4 flex items-center gap-2 text-sidebar font-medium">
                <FileSpreadsheet size={16} className="text-green-500" /> AdvMath_Sec4B_Finals.xlsx
              </td>
              <td className="px-6 py-4 text-text-muted">Oct 24, 2023</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> COMPLETED
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 flex items-center gap-2 text-sidebar font-medium">
                <FileText size={16} className="text-red-500" /> Midterm_Consolidated_Rpt.pdf
              </td>
              <td className="px-6 py-4 text-text-muted">Oct 21, 2023</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> COMPLETED
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 flex items-center gap-2 text-sidebar font-medium">
                <FileSpreadsheet size={16} className="text-gray-500" /> Student_Demographics_v2.csv
              </td>
              <td className="px-6 py-4 text-text-muted">Oct 18, 2023</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle size={12} /> COMPLETED
                </span>
              </td>
            </tr>
          </tbody>
        </table></div>
      </div>
    </div>
  );
};

export default Dashboard;
