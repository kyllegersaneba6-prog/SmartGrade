const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const {
  checkIpLimit,
  recordIpAttempt,
  checkUsernameLimit,
  recordUsernameFailure,
  clearUsernameFailures,
  shouldLogRateLimitEvent,
} = require('../middleware/loginRateLimit');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OFFLINE_MESSAGE = 'You are currently offline. Please check your Wi-Fi or ethernet connection and try again.';
const RATE_LIMIT_MESSAGE = 'Too many login attempts. Please try again later.';

// Supabase is remote, so a dropped internet connection surfaces as a fetch /
// network error while the local API server itself stays reachable. Detect it so
// login reports "offline" instead of falling through to "Invalid username".
const isOfflineError = (error) => {
  if (!error) return false;
  const message = String(error.message || error).toLowerCase();
  const code = String(error.code || '').toUpperCase();
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('enotfound') ||
    message.includes('econnrefused') ||
    message.includes('timed out') ||
    message.includes('timeout')
  );
};

// Failed-login audit: one row per attempted username per minute. Multiple
// wrong attempts for the same username within 60s coalesce into a single
// "Failed Login" row whose details carry the attempt count (critical alert).
const normalizeAttemptKey = (value) => {
  const key = String(value || '').trim().toLowerCase().slice(0, 64);
  return key || 'unknown';
};

const logFailedLogin = async (attemptedUsername, department) => {
  try {
    const key = normalizeAttemptKey(attemptedUsername);
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('activity_log')
      .select('id')
      .eq('action', 'Failed Login')
      .eq('user_name', key)
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(1);
    // A row already covers this minute — keep a single entry per minute
    // with no attempt count in the description.
    if (recent && recent.length > 0) return;
    await supabase.from('activity_log').insert([{
      user_name: key,
      action: 'Failed Login',
      details: `A login attempt for the account "${key}" failed.`,
      department: department || null
    }]);
  } catch (err) {
    console.error('Failed to log failed login attempt:', err?.message || err);
  }
};

// Rate-limit audit: one row per scope+key per minute. Details never include the
// submitted password, only the attempted username / client IP.
const logRateLimitEvent = async (scope, key, retryAfterSeconds) => {
  if (!shouldLogRateLimitEvent(`${scope}:${key}`)) return;
  const userLabel = scope === 'ip' ? `ip:${key}` : key;
  const details = scope === 'ip'
    ? `Login rate limit reached for IP address ${key} after too many attempts; blocked for ${retryAfterSeconds}s.`
    : `Login rate limit reached for account "${key}" after too many failed attempts; blocked for ${retryAfterSeconds}s.`;
  try {
    await supabase.from('activity_log').insert([{
      user_name: userLabel,
      action: 'Rate Limited Login',
      details,
      department: null,
    }]);
  } catch (err) {
    console.error('Failed to log login rate-limit event:', err?.message || err);
  }
};

const sendRateLimited = async (res, scope, key, retryAfterSeconds) => {
  await logRateLimitEvent(scope, key, retryAfterSeconds);
  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({ message: RATE_LIMIT_MESSAGE });
};

router.post('/login', async (req, res) => {
  let { username, password } = req.body || {};
  username = String(username || '').trim();

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const ipLimit = checkIpLimit(clientIp);
  if (ipLimit.limited) {
    return sendRateLimited(res, 'ip', clientIp, ipLimit.retryAfterSeconds);
  }

  const usernameLimit = checkUsernameLimit(username);
  if (usernameLimit.limited) {
    return sendRateLimited(res, 'username', normalizeAttemptKey(username), usernameLimit.retryAfterSeconds);
  }

  // Counts every processed attempt (success or failure) toward the per-IP
  // window; blocked requests do not extend it.
  recordIpAttempt(clientIp);

  try {
    let user;
    let role;
    let dbUsername = username;

    // 1. Check staff_users table for all roles (superadmin, admin, teacher)
    const { data: staffUser, error: staffError } = await supabase
      .from('staff_users')
      .select('*, courses(name)')
      .eq('username', username)
      .single();

    if (isOfflineError(staffError)) {
      return res.status(503).json({ message: OFFLINE_MESSAGE });
    }

    if (staffUser) {
      user = staffUser;
      role = staffUser.system_role;
      dbUsername = username;
    } else if (username.toUpperCase().startsWith('USR-')) {
      // 2. Fallback: match staff_users by ID prefix
      const shortId = username.substring(4).toLowerCase();
      const { data: staffUsers, error: staffListError } = await supabase
        .from('staff_users')
        .select('*');

      if (isOfflineError(staffListError)) {
        return res.status(503).json({ message: OFFLINE_MESSAGE });
      }

      if (staffUsers && staffUsers.length > 0) {
        const matched = staffUsers.find(u =>
          shortId.length > 0 && u.id.substring(0, shortId.length).toLowerCase() === shortId
        );
        if (matched) {
          user = matched;
          role = matched.system_role;
          dbUsername = `USR-${matched.id.substring(0, 4).toUpperCase()}`;
        }
      }
    }

    if (!user) {
      // Unknown username: counted toward the per-username window but not
      // audited. Only existing accounts produce Failed Login rows in the
      // Institutional System Audit Trail.
      recordUsernameFailure(username);
      return res.status(401).json({ message: 'Invalid username ' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordUsernameFailure(username);
      await logFailedLogin(username, user.department || null);
      return res.status(401).json({ message: 'Invalid password' });
    }

    clearUsernameFailures(username);

    const token = jwt.sign(
      { id: user.id, username: dbUsername, role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Successful-login audit: one row per login in the Institutional
    // System Audit Trail. Never blocks the login response on failure.
    try {
      await supabase.from('activity_log').insert([{
        user_name: user.username || dbUsername,
        action: 'Successful Login',
        details: `The account "${user.username || dbUsername}" logged in successfully.`,
        department: user.department || null
      }]);
    } catch (err) {
      console.error('Failed to log successful login:', err?.message || err);
    }

    res.json({
      token,
      user: {
        id: user.id,
        username: dbUsername,
        role,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name || 'Administrator',
        department: user.department,
        course_id: user.course_id,
        course_name: user.courses?.name || null,
        system_role: role,
      }
    });
  } catch (err) {
    console.error(err);
    if (isOfflineError(err)) {
      return res.status(503).json({ message: OFFLINE_MESSAGE });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
