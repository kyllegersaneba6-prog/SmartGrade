export const TERMS = ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'];
export const TERM_PCTS = { PRELIMS: '20%', MIDTERMS: '20%', 'PRE-FINALS': '20%', FINALS: '40%' };
export const TERM_WEIGHTS = { PRELIMS: 0.20, MIDTERMS: 0.20, 'PRE-FINALS': 0.20, FINALS: 0.40 };

export const GRADE_RANGES = [
  { min: 98, gp: 1.00, desc: 'Excellent' },
  { min: 95, gp: 1.25, desc: 'Very Good' },
  { min: 92, gp: 1.50, desc: 'Very Good' },
  { min: 89, gp: 1.75, desc: 'Very Good' },
  { min: 86, gp: 2.00, desc: 'Satisfactory' },
  { min: 83, gp: 2.25, desc: 'Satisfactory' },
  { min: 80, gp: 2.50, desc: 'Satisfactory' },
  { min: 77, gp: 2.75, desc: 'Fair' },
  { min: 75, gp: 3.00, desc: 'Fair' },
];

export const gradeToPoint = (grade) => {
  if (grade < 75) return { gp: 5.00, desc: 'Failed' };
  for (const r of GRADE_RANGES) {
    if (grade >= r.min) return r;
  }
  return { gp: 5.00, desc: 'Failed' };
};

export const getComponentTotal = (studentId, comp, scores, attScores) => {
  if (comp.is_attendance) return attScores?.scores?.[studentId] ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => {
    const val = parseFloat(scores?.[a.id]?.[studentId]);
    if (!isNaN(val)) sum += val;
  });
  return sum;
};

export const getComponentMaxTotal = (comp, attScores) => {
  if (comp.is_attendance) return attScores?.max_total ?? 0;
  const activities = comp.activities || [];
  let sum = 0;
  activities.forEach(a => sum += parseFloat(a.max_score || 0));
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
