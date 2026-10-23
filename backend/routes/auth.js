const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OFFLINE_MESSAGE = 'You are currently offline. Please check your Wi-Fi or ethernet connection and try again.';

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

router.post('/login', async (req, res) => {
  let { username, password } = req.body;
  username = username.trim();

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
    } else {
      // 2. Fallback to admin_users table (legacy superadmin)
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .single();

      if (isOfflineError(adminError)) {
        return res.status(503).json({ message: OFFLINE_MESSAGE });
      }

      if (adminUser) {
        user = adminUser;
        role = 'superadmin';
        dbUsername = username;
      } else if (username.toUpperCase().startsWith('USR-')) {
        // 3. Fallback: match staff_users by ID prefix
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
    }

    if (!user) {
      // Unknown username — not audited. Only existing accounts produce
      // Failed Login rows in the Institutional System Audit Trail.
      return res.status(401).json({ message: 'Invalid username ' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logFailedLogin(username, user.department || null);
      return res.status(401).json({ message: 'Invalid password' });
    }

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
