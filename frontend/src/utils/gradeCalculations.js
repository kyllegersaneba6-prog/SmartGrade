export const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];
export const TERM_PCTS = { PRELIMS: '20%', MIDTERMS: '20%', 'PRE-FINALS': '20%', FINALS: '40%' };
export const TERM_WEIGHTS = { PRELIMS: 0.20, MIDTERMS: 0.20, 'PRE-FINALS': 0.20, FINALS: 0.40 };

export const GRADE_RANGES = [
  { min: 98.00, max: 100.00, gp: 1.00, desc: 'Excellent' },
  { min: 95.00, max: 97.99, gp: 1.25, desc: 'Very Good' },
  { min: 92.00, max: 94.99, gp: 1.50, desc: 'Very Good' },
  { min: 89.00, max: 91.99, gp: 1.75, desc: 'Very Good' },
  { min: 86.00, max: 88.99, gp: 2.00, desc: 'Satisfactory' },
  { min: 83.00, max: 85.99, gp: 2.25, desc: 'Satisfactory' },
  { min: 80.00, max: 82.99, gp: 2.50, desc: 'Satisfactory' },
  { min: 77.00, max: 79.99, gp: 2.75, desc: 'Fair' },
  { min: 75.00, max: 76.99, gp: 3.00, desc: 'Fair' },
];

export const SPECIAL_MARKS = {
  DRP: { gp: null, desc: 'Officially Dropped' },
  P: { gp: null, desc: 'Passed' },
  F: { gp: null, desc: 'Failed' },
};

export const gradeToPoint = (grade) => {
  if (typeof grade === 'string' && SPECIAL_MARKS[grade.toUpperCase()]) {
    const mark = SPECIAL_MARKS[grade.toUpperCase()];
    return { gp: mark.gp, desc: mark.desc, mark: grade.toUpperCase() };
  }
  const numGrade = Number(grade);
  if (isNaN(numGrade) || numGrade < 75) return { gp: 5.00, desc: 'Failed' };
  for (const r of GRADE_RANGES) {
    if (numGrade >= r.min) return r;
  }
  return { gp: 5.00, desc: 'Failed' };
};

export const getComponentTotal = (studentId, comp, scores, attScores) => {
  if (comp.is_attendance) return attScores?.scores?.[studentId] ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => {
    const val = a.is_attendance
      ? parseFloat(attScores?.scores?.[studentId] ?? 0)
      : parseFloat(scores?.[a.id]?.[studentId]);
    if (!isNaN(val)) sum += val;
  });
  return sum;
};

export const getComponentMaxTotal = (comp, attScores) => {
  if (comp.is_attendance) return attScores?.max_total ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => {
    sum += a.is_attendance
      ? parseFloat(attScores?.max_total || 0)
      : parseFloat(a.max_score || 0);
  });
  return sum;
};

export const getComponentEquiv = (studentId, comp, scores, attScores) => {
  const total = getComponentTotal(studentId, comp, scores, attScores);
  const maxTotal = getComponentMaxTotal(comp, attScores);
  if (maxTotal === 0) return 0;
  return (total / maxTotal) * 50 + 50;
};

export const getComponentWeighted = (studentId, comp, scores, attScores) => {
  const equiv = getComponentEquiv(studentId, comp, scores, attScores);
  return (equiv * comp.weight) / 100;
};

export const getFinalGrade = (studentId, components, scores, attScores) => {
  let sum = 0;
  components.forEach(c => {
    if (c.is_attendance || c.activities?.length > 0) {
      sum += getComponentWeighted(studentId, c, scores, attScores);
    }
  });
  return sum;
};
