const crypto = require('crypto');

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const cache = new Map();

function envNumber(name, fallback) {
  const raw = String(process.env[name] ?? '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function ttlMs() {
  return envNumber('AI_SUMMARY_CACHE_TTL_MS', DEFAULT_TTL_MS);
}

function maxAgeMs() {
  return Math.max(ttlMs(), envNumber('AI_SUMMARY_CACHE_MAX_AGE_MS', DEFAULT_MAX_AGE_MS));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? 'null' : serialized;
}

function fingerprint(profile) {
  return crypto.createHash('sha256').update(stableStringify(profile)).digest('hex');
}

function buildCacheKey(profile) {
  const studentId = profile?.student?.id;
  const assignmentId = profile?.meta?.assignment_id;
  const term = profile?.meta?.term;
  if (!studentId || !assignmentId || !term) return null;
  return `${assignmentId}\u0000${term}\u0000${studentId}\u0000${fingerprint(profile)}`;
}

function setCachedSummary(profile, result) {
  const key = buildCacheKey(profile);
  if (!key || !result?.report) return false;

  const now = Date.now();
  const entry = {
    report: result.report,
    model: result.model,
    generated_at: result.generated_at || new Date(now).toISOString(),
    cached_at: new Date(now).toISOString(),
    cached_at_ms: now,
  };

  cache.delete(key);
  cache.set(key, entry);

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  return true;
}

function getCachedSummary(profile) {
  const key = buildCacheKey(profile);
  if (!key) return null;

  const entry = cache.get(key);
  if (!entry) return null;

  const ageMs = Date.now() - entry.cached_at_ms;
  if (ageMs > maxAgeMs()) {
    cache.delete(key);
    return null;
  }

  return {
    report: entry.report,
    model: entry.model,
    generated_at: entry.generated_at,
    cached_at: entry.cached_at,
    ageMs,
    stale: ageMs > ttlMs(),
  };
}

function clearSummaryCache() {
  cache.clear();
}

module.exports = {
  buildCacheKey,
  getCachedSummary,
  setCachedSummary,
  clearSummaryCache,
};
