const crypto = require('crypto');

const VALID_ROLES = ['superadmin', 'admin', 'teacher'];
const ACCOUNT_COLUMNS = 'id, username, password, system_role, department, course_id, created_by';

// A keyed digest, never the password hash itself, is carried in the JWT.
// Re-reading these fields makes deleted accounts and old permissions fail closed.
const sessionFingerprint = (account) => crypto.createHmac('sha256', process.env.JWT_SECRET)
  .update('smartgrade-session-v1:')
  .update(JSON.stringify([account.id, account.password, account.system_role,
    account.username, account.department, account.course_id, account.created_by]))
  .digest('hex');

const matchesSession = (account, fingerprint) => {
  if (typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) return false;
  return crypto.timingSafeEqual(Buffer.from(sessionFingerprint(account), 'hex'), Buffer.from(fingerprint, 'hex'));
};

const accountDepartment = async (db, account) => {
  if (!account.department) return null;
  const { data, error } = await db.from('departments').select('id, name')
    .eq('name', account.department).maybeSingle();
  if (error) throw error;
  return data;
};

module.exports = { VALID_ROLES, ACCOUNT_COLUMNS, sessionFingerprint, matchesSession, accountDepartment };
