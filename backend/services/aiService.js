// AIService — provider-abstracted entry point.
// DescriptiveAnalytics.jsx must only call POST /api/ai/summarize-student,
// never OmniRoute/Combo/Claude details.
const { SYSTEM_PROMPT, buildUserPrompt } = require('./aiPrompts');
const provider = require('./omniRouteProvider');
const { validateReport } = require('./aiValidator');
const { buildFallbackReport, classifyFailure } = require('./aiFallback');
const { getCachedSummary, setCachedSummary } = require('./aiSummaryCache');

// Allowlist the backend-local profile used for cache scoping and local fallback.
function sanitizeProfile(input) {
  if (!input || typeof input !== 'object') {
    const err = new Error('Missing student profile payload');
    err.status = 400;
    throw err;
  }
  const { student, performance, categories, meta } = input;
  const metric = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    student: student ? {
      name: String(student.student_name || student.name || '').slice(0, 160),
      id: String(student.student_id || student.id || '').slice(0, 64),
    } : undefined,
    performance: performance && typeof performance === 'object' ? {
      final_grade: metric(performance.final_grade),
      attendance_rate: metric(performance.attendance_rate),
      overall_performance: metric(performance.overall_performance),
      subject_rate: metric(performance.subject_rate),
      submission_rate: metric(performance.submission_rate),
    } : undefined,
    categories: Array.isArray(categories) ? categories.slice(0, 30).map((category) => ({
      name: typeof category?.name === 'string' ? category.name.trim().slice(0, 80) : '',
      performance: metric(category?.performance),
      trend: ['improving', 'declining', 'stable'].includes(category?.trend) ? category.trend : undefined,
    })) : [],
    meta: meta ? {
      assignment_id: String(meta.assignment_id || '').slice(0, 64),
      term: String(meta.term || '').slice(0, 40),
    } : undefined,
  };
}

async function generateStudentAnalysis(profile) {
  const sanitized = sanitizeProfile(profile);
  try {
    // Provider gets only aggregate performance and category data. Student
    // identifiers and assignment/term metadata stay inside the backend for
    // local fallback and cache scoping.
    const providerProfile = {
      performance: sanitized.performance,
      categories: sanitized.categories,
    };
    const { raw, modelUsed } = await provider.chatJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(providerProfile),
    });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('AI returned invalid JSON');
      err.status = 502;
      throw err;
    }
    const v = validateReport(parsed);
    if (!v.ok) {
      const err = new Error(`AI response failed validation: ${v.errors.join('; ')}`);
      err.status = 502;
      throw err;
    }
    const result = { report: parsed, model: modelUsed, source: 'ai', generated_at: new Date().toISOString() };
    try {
      setCachedSummary(sanitized, result);
    } catch (cacheError) {
      console.warn(`AI summary cache write failed: ${cacheError.message}`);
    }
    return result;
  } catch (e) {
    const reason = classifyFailure(e);
    console.warn(`AI summary fallback (${reason}): ${e.message}`);

    let cached = null;
    try {
      cached = getCachedSummary(sanitized);
    } catch (cacheError) {
      console.warn(`AI summary cache read failed: ${cacheError.message}`);
    }

    if (cached) {
      return {
        report: cached.report,
        model: cached.model,
        source: 'cache',
        cache_status: cached.stale ? 'stale' : 'fresh',
        stale: cached.stale,
        reason,
        notice: cached.stale
          ? 'The AI service is unavailable right now. Showing a cached AI-generated summary from an earlier request. This cached summary is older than the freshness window and may be outdated.'
          : 'The AI service is unavailable right now. Showing a cached AI-generated summary for the same student, term, and recorded data.',
        generated_at: cached.generated_at,
        cached_at: cached.cached_at,
      };
    }

    return {
      report: buildFallbackReport(sanitized),
      model: 'rule-based-fallback',
      source: 'local',
      reason,
      notice: "The AI service is unavailable right now. Showing a rule-based summary generated from this student's recorded data.",
      generated_at: new Date().toISOString(),
    };
  }
}

module.exports = { generateStudentAnalysis, sanitizeProfile };
