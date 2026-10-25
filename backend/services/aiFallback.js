const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toRatePercent(value) {
  const n = toNumber(value);
  if (n === null) return null;
  const pct = n <= 1 ? n * 100 : n;
  return Math.round(Math.min(Math.max(pct, 0), 100) * 10) / 10;
}

function roundPercent(value) {
  const n = toNumber(value);
  if (n === null) return null;
  return Math.round(Math.min(Math.max(n, 0), 100) * 10) / 10;
}

function uniquePush(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function classifyFailure(error) {
  const message = String(error?.message || '').toLowerCase();
  if (error?.status === 504 || message.includes('timeout') || message.includes('abort')) return 'timeout';
  if (message.includes('not configured')) return 'not_configured';
  if (message.includes('invalid json') || message.includes('failed validation')) return 'invalid_response';
  if (error?.status === 429) return 'rate_limited';
  if (error?.status === 401 || error?.status === 403) return 'auth_error';
  if (error?.status >= 500) return 'provider_error';
  if (
    message.includes('fetch failed') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network')
  ) {
    return 'unreachable';
  }
  return 'provider_error';
}

function buildFallbackReport(profile) {
  const name = profile?.student?.name || 'The student';
  const performance = profile?.performance || {};
  const grade = roundPercent(performance.final_grade);
  const attendance = toRatePercent(performance.attendance_rate);
  const submission = toRatePercent(performance.subject_rate ?? performance.submission_rate);
  const categories = (Array.isArray(profile?.categories) ? profile.categories : [])
    .map((category) => ({
      name: typeof category?.name === 'string' ? category.name.trim() : '',
      performance: roundPercent(category?.performance),
      trend: category?.trend,
    }))
    .filter((category) => category.name);

  const scoredCategories = categories
    .filter((category) => category.performance !== null)
    .sort((a, b) => b.performance - a.performance);

  if (grade === null && attendance === null && submission === null && scoredCategories.length === 0) {
    return {
      summary: `There is not enough recorded data to summarize ${name}'s performance yet. Add scores or attendance before relying on this summary.`,
      strengths: [],
      areas_of_attention: [],
      suggested_actions: ['Record at least one score or attendance entry before requesting another summary.'],
      follow_up: ['Review again after the next recorded assessment.'],
      overall_priority: 'low',
    };
  }

  const strengths = [];
  if (grade !== null && grade >= 85) uniquePush(strengths, `Final grade is strong at ${grade}%.`);
  else if (grade !== null && grade >= 75) uniquePush(strengths, `Final grade is passing at ${grade}%.`);
  if (attendance !== null && attendance >= 90) uniquePush(strengths, `Attendance is consistent at ${attendance}%.`);
  if (submission !== null && submission >= 90) uniquePush(strengths, `Required work is submitted at ${submission}%.`);
  if (scoredCategories[0]?.performance >= 85) {
    uniquePush(strengths, `Strong performance in ${scoredCategories[0].name} (${scoredCategories[0].performance}%).`);
  }
  const topCategoryName = scoredCategories[0]?.performance >= 85 ? scoredCategories[0].name : null;
  categories
    .filter((category) => category.trend === 'improving' && category.name !== topCategoryName)
    .forEach((category) => uniquePush(strengths, `Performance is improving in ${category.name}.`));

  const areaCandidates = [];
  if (grade !== null && grade < 75) {
    areaCandidates.push({
      area: 'Overall grade',
      observation: `Final grade is below passing at ${grade}%.`,
      priority: 'high',
    });
  } else if (grade !== null && grade < 80) {
    areaCandidates.push({
      area: 'Overall grade',
      observation: `Final grade is close to the passing threshold at ${grade}%.`,
      priority: 'medium',
    });
  }
  if (attendance !== null && attendance < 90) {
    areaCandidates.push({
      area: 'Attendance',
      observation: `Attendance is ${attendance}%, below the 90% target.`,
      priority: attendance < 75 ? 'high' : 'medium',
    });
  }
  if (submission !== null && submission < 90) {
    areaCandidates.push({
      area: 'Submission rate',
      observation: `Only ${submission}% of required work has been submitted.`,
      priority: submission < 70 ? 'high' : 'medium',
    });
  }
  scoredCategories
    .filter((category) => category.performance < 80)
    .slice(-2)
    .forEach((category) => {
      areaCandidates.push({
        area: category.name,
        observation: `Performance is ${category.performance}%, below the 80% target.`,
        priority: category.performance < 75 ? 'high' : 'medium',
      });
    });
  categories
    .filter((category) => category.trend === 'declining')
    .forEach((category) => {
      areaCandidates.push({
        area: category.name,
        observation: 'Recent scores are trending downward.',
        priority: 'medium',
      });
    });

  const seenAreas = new Set();
  const areas = areaCandidates
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .filter((area) => {
      if (seenAreas.has(area.area)) return false;
      seenAreas.add(area.area);
      return true;
    })
    .slice(0, 2);

  const actions = [];
  if (attendance !== null && attendance < 90) {
    uniquePush(actions, 'Review attendance patterns with the student and agree on a plan to complete missed work.');
  }
  if (submission !== null && submission < 90) {
    uniquePush(actions, 'List missing submissions and set a short completion timeline.');
  }
  if (areas.some((area) => area.priority === 'high' && !['Attendance', 'Submission rate'].includes(area.area))) {
    uniquePush(actions, 'Schedule a focused check-in to review requirements and available support.');
  }
  const weakest = scoredCategories[scoredCategories.length - 1];
  if (weakest && weakest.performance < 80) {
    uniquePush(actions, `Provide targeted practice or remediation for ${weakest.name}.`);
  }
  const declining = categories.find((category) => category.trend === 'declining');
  if (declining) {
    uniquePush(actions, `Review recent ${declining.name} scores and adjust support before the next assessment.`);
  }
  if (actions.length === 0) {
    uniquePush(actions, 'Maintain current support and reinforce consistent study habits.');
    uniquePush(actions, 'Share positive feedback on the student\'s recent performance.');
  }

  const followUp = [];
  if (attendance !== null && attendance < 90) uniquePush(followUp, 'Recheck attendance over the next two weeks.');
  if (submission !== null && submission < 90) uniquePush(followUp, 'Verify missing work is completed by the next class meeting.');
  if (weakest && weakest.performance < 80) uniquePush(followUp, `Reassess ${weakest.name} after the next graded activity.`);
  if (followUp.length === 0) uniquePush(followUp, 'Review progress after the next assessment.');

  const overallPriority =
    areas.some((area) => area.priority === 'high') ||
    (grade !== null && grade < 75) ||
    (attendance !== null && attendance < 75) ||
    (submission !== null && submission < 70)
      ? 'high'
      : areas.length > 0 ||
          (grade !== null && grade < 85) ||
          (attendance !== null && attendance < 90) ||
          (submission !== null && submission < 90) ||
          scoredCategories.some((category) => category.performance < 80)
        ? 'medium'
        : 'low';

  const metrics = [];
  if (grade !== null) metrics.push(`a final grade of ${grade}%`);
  if (attendance !== null) metrics.push(`${attendance}% attendance`);
  if (submission !== null) metrics.push(`${submission}% submission`);
  const metricSentence = metrics.length
    ? `${name} has ${metrics.join(', ')}.`
    : `Recorded data for ${name} is limited.`;

  const summaryParts = [metricSentence];
  if (areas[0]) {
    summaryParts.push(`The main area to monitor is ${areas[0].area.toLowerCase()}. ${areas[0].observation}`);
  } else if (strengths[0]) {
    summaryParts.push(`${strengths[0]} Continue the current level of support.`);
  } else {
    summaryParts.push('No clear areas of concern appear in the recorded data.');
  }
  summaryParts.push(`Overall priority is ${overallPriority}.`);

  return {
    summary: summaryParts.join(' '),
    strengths: strengths.slice(0, 3),
    areas_of_attention: areas,
    suggested_actions: actions.slice(0, 3),
    follow_up: followUp.slice(0, 2),
    overall_priority: overallPriority,
  };
}

module.exports = { buildFallbackReport, classifyFailure };
