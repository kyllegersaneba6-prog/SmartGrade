const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { VALID_ROLES, ACCOUNT_COLUMNS, matchesSession, accountDepartment } = require('../services/session');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = typeof authHeader === 'string' && /^Bearer ([^\s]+)$/i.exec(authHeader)?.[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    // Missing, expired, or tampered tokens are an authentication failure
    // (401), not an authorization failure (403). The client logs out on 401
    // and shows the message for 403, so this distinction matters.
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
  try {
    if (!decoded || typeof decoded.id !== 'string' || !decoded.id || !decoded.session || !Number.isInteger(decoded.exp)) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    const { data: account, error } = await supabase.from('staff_users')
      .select(ACCOUNT_COLUMNS).eq('id', decoded.id).maybeSingle();
    if (error) throw error;
    if (!account || !VALID_ROLES.includes(account.system_role) || !matchesSession(account, decoded.session)) {
      return res.status(401).json({ message: 'Account changed or session expired. Please log in again.' });
    }
    const department = await accountDepartment(supabase, account);
    if (account.system_role !== 'superadmin' && !department) {
      return res.status(403).json({ message: 'A valid department is required. Contact your administrator.' });
    }
    req.user = { id: account.id, username: account.username, role: account.system_role,
      department: department?.name || null, department_id: department?.id || null,
      course_id: account.course_id, created_by: account.created_by };
    return next();
  } catch (err) {
    console.error('Account verification failed:', err.message);
    return res.status(503).json({ message: 'Unable to verify your account. Please try again.' });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
