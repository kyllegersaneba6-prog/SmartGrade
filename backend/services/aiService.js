// AIService — provider-abstracted entry point.
// BehavioralAnalytics.jsx must only call POST /api/ai/summarize-student,
// never OmniRoute/Combo/Claude details.
const { SYSTEM_PROMPT, buildUserPrompt } = require('./aiPrompts');
const provider = require('./omniRouteProvider');
const { validateReport } = require('./aiValidator');
const { buildFallbackReport, classifyFailure } = require('./aiFallback');
const { getCachedSummary, setCachedSummary } = require('./aiSummaryCache');

// Allowlist the MVP payload: reuse frontend studentAnalytics, drop anything sensitive.
function sanitizeProfile(input) {
  if (!input || typeof input !== 'object') {
    const err = new Error('Missing student profile payload');
    err.status = 400;
    throw err;
  }
  const { student, performance, categories, meta } = input;
  return {
    student: student ? { name: student.student_name || student.name, id: student.student_id || student.id } : undefined,
    performance: performance || undefined,
    categories: Array.isArray(categories) ? categories : [],
    meta: meta ? { assignment_id: meta.assignment_id, term: meta.term } : undefined,
  };
}

async function generateStudentAnalysis(profile) {
  const sanitized = sanitizeProfile(profile);
  try {
    const { raw, modelUsed } = await provider.chatJson({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(sanitized),
    });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('AI returned invalid JSON');
      err.status = 502;
      err.detail = raw.slice(0, 500);
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
