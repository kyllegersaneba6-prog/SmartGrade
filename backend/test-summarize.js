// Live test: aiService with realistic studentAnalytics-style payload. Run: node test-summarize.js
require('dotenv').config();
const { generateStudentAnalysis } = require('./services/aiService');

const payload = {
  student: { student_name: 'Ali, Noah Z.', student_id: '22-3146-264' },
  performance: { final_grade: 90.17, attendance_rate: 0.667, overall_performance: 82.9, subject_rate: 0.917 },
  categories: [
    { name: 'Attendance', weight: 10, equivalent: 83.33, performance: 66.7, total: 4, maxTotal: 6, trend: 'stable', records: [] },
    { name: 'Quiz', weight: 10, equivalent: 95.83, performance: 91.7, trend: 'improving', records: [{ name: 'Q1', score: 25, max: 30, percentage: 83.3 }, { name: 'Q2', score: 30, max: 30, percentage: 100 }] },
    { name: 'PT', weight: 30, equivalent: 95.0, performance: 90.0, trend: 'stable', records: [{ name: 'PT1', score: 45, max: 50, percentage: 90 }] },
    { name: 'Exam', weight: 50, equivalent: 87.5, performance: 75.0, trend: 'stable', records: [{ name: 'Exam', score: 75, max: 100, percentage: 75 }] },
  ],
  meta: { assignment_id: 'test', term: 'PRELIMS' },
};

(async () => {
  const r = await generateStudentAnalysis(payload);
  console.log('MODEL:', r.model);
  console.log('KEYS:', Object.keys(r.report).join(','));
  console.log('SUMMARY:', r.report.summary.slice(0, 200));
  console.log('STRENGTHS:', r.report.strengths.length, '| AREAS:', r.report.areas_of_attention.length);
  console.log('PASS');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
