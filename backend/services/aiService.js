// AIService — provider-abstracted entry point.
// BehavioralAnalytics.jsx must only call POST /api/ai/summarize-student,
// never OmniRoute/Combo/Claude details.
const { SYSTEM_PROMPT, buildUserPrompt } = require('./aiPrompts');
const provider = require('./omniRouteProvider');
const { validateReport } = require('./aiValidator');

// Allowlist the MVP payload: reuse frontend studentAnalytics, drop anything sensitive.
function sanitizeProfile(input) {
  if (!input || typeof input !== 'object') throw new Error('Missing student profile payload');
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
  return { report: parsed, model: modelUsed, generated_at: new Date().toISOString() };
}

module.exports = { generateStudentAnalysis, sanitizeProfile };
