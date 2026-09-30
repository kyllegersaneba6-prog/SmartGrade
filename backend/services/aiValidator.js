function validateReport(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['Response is not an object'] };
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) errors.push('summary must be a non-empty string');
  if (!Array.isArray(obj.strengths)) errors.push('strengths must be an array');
  if (!Array.isArray(obj.areas_of_attention)) errors.push('areas_of_attention must be an array');
  else {
    obj.areas_of_attention.forEach((a, i) => {
      if (!a || typeof a.area !== 'string' || typeof a.observation !== 'string')
        errors.push(`areas_of_attention[${i}] must have area + observation strings`);
      if (a && a.priority && !['high', 'medium', 'low'].includes(a.priority))
        errors.push(`areas_of_attention[${i}].priority must be high|medium|low`);
    });
  }
  if (!Array.isArray(obj.suggested_actions)) errors.push('suggested_actions must be an array');
  if (!Array.isArray(obj.follow_up)) errors.push('follow_up must be an array');
  if (typeof obj.overall_priority !== 'string') errors.push('overall_priority must be a string');
  return { ok: errors.length === 0, errors };
}

module.exports = { validateReport };
