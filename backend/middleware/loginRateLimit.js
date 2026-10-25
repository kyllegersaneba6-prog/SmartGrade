// Login rate limiting (sliding window).
//
// Counters live in memory so a single backend process enforces limits without
// extra infrastructure. Each attempt is timestamped; old timestamps expire one
// by one (sliding window) and a periodic sweeper removes empty buckets, so
// counters recover gradually instead of being reset in bulk.
//
// Multi-instance deployments must share counters. Replace `attempts` with a
// Redis-backed store (e.g. a sorted set per key, or INCR + PEXPIRE) so every
// process sees the same window. Until then each process enforces its own
// limits (verified in docs/06-decisions/decisions.md).

const positiveNumber = (raw, fallback) => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const WINDOW_MS = positiveNumber(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const IP_MAX = positiveNumber(process.env.LOGIN_RATE_LIMIT_IP_MAX, 10);
const USERNAME_MAX = positiveNumber(process.env.LOGIN_RATE_LIMIT_USERNAME_MAX, 5);
const LOG_COALESCE_MS = 60 * 1000;
const SWEEP_MS = Math.min(WINDOW_MS, 60 * 1000);

const attempts = new Map();
const lastLoggedAt = new Map();

const ipKey = (ip) => `ip:${String(ip || '').trim() || 'unknown'}`;
const usernameKey = (username) => `user:${String(username || '').trim().toLowerCase().slice(0, 64) || 'unknown'}`;

const prune = (key, now) => {
  const timestamps = attempts.get(key);
  if (!timestamps) return [];
  const cutoff = now - WINDOW_MS;
  const kept = timestamps.filter((ts) => ts > cutoff);
  if (kept.length === 0) attempts.delete(key);
  else attempts.set(key, kept);
  return kept;
};

const status = (key, max) => {
  const now = Date.now();
  const timestamps = prune(key, now);
  const limited = timestamps.length >= max;
  const retryAfterMs = limited ? Math.max(1, timestamps[0] + WINDOW_MS - now) : 0;
  return {
    limited,
    count: timestamps.length,
    max,
    retryAfterMs,
    retryAfterSeconds: retryAfterMs ? Math.ceil(retryAfterMs / 1000) : 0,
  };
};

const record = (key) => {
  const now = Date.now();
  const timestamps = prune(key, now);
  timestamps.push(now);
  attempts.set(key, timestamps);
};

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const key of attempts.keys()) prune(key, now);
  for (const [key, ts] of lastLoggedAt) {
    if (now - ts >= LOG_COALESCE_MS) lastLoggedAt.delete(key);
  }
}, SWEEP_MS);
if (typeof sweeper.unref === 'function') sweeper.unref();

module.exports = {
  config: {
    windowMs: WINDOW_MS,
    ipMax: IP_MAX,
    usernameMax: USERNAME_MAX,
  },
  ipKey,
  usernameKey,
  checkIpLimit: (ip) => status(ipKey(ip), IP_MAX),
  recordIpAttempt: (ip) => record(ipKey(ip)),
  checkUsernameLimit: (username) => status(usernameKey(username), USERNAME_MAX),
  recordUsernameFailure: (username) => record(usernameKey(username)),
  clearUsernameFailures: (username) => { attempts.delete(usernameKey(username)); },
  // One audit row per scope+key per minute, so a sustained attack cannot flood
  // activity_log while the block is active.
  shouldLogRateLimitEvent: (scopeKey) => {
    const now = Date.now();
    const last = lastLoggedAt.get(scopeKey);
    if (last !== undefined && now - last < LOG_COALESCE_MS) return false;
    lastLoggedAt.set(scopeKey, now);
    return true;
  },
  reset: () => {
    attempts.clear();
    lastLoggedAt.clear();
  },
};
