const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Columns safe to send to the client. `password` (a bcrypt hash) must never
// be selected or returned by this router.
const USER_PUBLIC_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'full_name',
  'username',
  'staff_id',
  'department',
  'course_id',
  'system_role',
  'created_by',
  'created_at'
].join(', ');

const omitPassword = (row) => {
  if (!row) return row;
  const { password, ...safe } = row;
  return safe;
};

// All routes require authentication
router.use(authenticateToken);

// GET /api/users — list users based on role
router.get('/', async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let query = supabase
      .from('staff_users')
      .select(`${USER_PUBLIC_COLUMNS}, courses(name)`)
      .order('created_at', { ascending: false });

    // Superadmin sees admins + teachers; admin sees teachers in their department; teacher sees only self
    if (role === 'superadmin') {
      query = query.in('system_role', ['superadmin', 'admin', 'teacher']);
    } else if (role === 'admin') {
      const { data: adminUser } = await supabase
        .from('staff_users')
        .select('department')
        .eq('id', userId)
        .single();
      query = query.eq('system_role', 'teacher');
      if (adminUser?.department) query = query.eq('department', adminUser.department);
    } else if (role === 'teacher') {
      query = query.eq('id', userId);
    }

    const { data: users, error } = await query;

    if (error) {
      return sendServerError(res, error);
    }

    res.json((users || []).map(omitPassword));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Username rule: lastname.4512@sg where 4512 = last 2 digits of the first
// 5-digit ID portion + first 2 digits of the second 4-digit portion.
// ("Santos", "123451234") -> "santos.4512@sg". Always strings —
// leading zeros preserved, never integers.
const normalizeLastName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '.')
  .replace(/[^a-z0-9.]/g, '')
  .replace(/\.+/g, '.')
  .replace(/^\.|\.$/g, '');

const lastNameFromFullName = (fullName) => {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
};

const usernameFromLastNameAndId = (lastName, raw9) => {
  const norm = normalizeLastName(lastName);
  const digits = String(raw9 || '');
  if (!norm || digits.length !== 9) return '';
  return `${norm}.${digits.slice(3, 7)}@sg`;
};

// Staff ID: raw 9 digits stored (leading zeros preserved as TEXT).
// Accepts dashed display form too ("00000-1234" -> "000001234").
const normalizeStaffId = (value) => String(value || '').replace(/\D/g, '').slice(0, 9);
const isValidStaffId = (value) => /^[0-9]{9}$/.test(String(value || ''));

// POST /api/users — create user (superadmin creates admin, admin creates teacher)
router.post('/', async (req, res) => {
  const { first_name, last_name, full_name, department, course_id, system_role, password } = req.body;
  const staffId = normalizeStaffId(req.body.staff_id);
  const { role: requesterRole } = req.user;

  const resolvedFullName = full_name || (first_name && last_name ? `${first_name.trim()} ${last_name.trim()}` : null);
  const resolvedFirstName = first_name || (resolvedFullName ? resolvedFullName.split(' ')[0] : null);
  const resolvedLastName = last_name || (resolvedFullName ? resolvedFullName.split(' ').slice(1).join(' ') : null);

  // Validate role assignment
  if (requesterRole === 'superadmin' && system_role !== 'admin') {
    return res.status(403).json({ message: 'Superadmin can only create admin accounts.' });
  }
  if (requesterRole === 'admin' && system_role !== 'teacher') {
    return res.status(403).json({ message: 'Admin can only create teacher accounts.' });
  }
  if (requesterRole === 'teacher') {
    return res.status(403).json({ message: 'Teachers cannot create users.' });
  }

  if (!resolvedFullName || !system_role || !password) {
    return res.status(400).json({ message: 'All required fields must be filled' });
  }

  try {
    // If admin creates teacher, inherit admin's department.
    // The creator row must still exist: created_by references it, so a
    // stale token (deleted/recreated admin, restored backup) would otherwise
    // surface as a raw 23503 FK violation on insert.
    let resolvedDepartment = department;
    if (requesterRole === 'admin') {
      const { data: adminUser } = await supabase
        .from('staff_users')
        .select('department')
        .eq('id', req.user.id)
        .single();
      if (!adminUser) {
        return res.status(401).json({ message: 'Session expired. Please log out and log in again.' });
      }
      if (adminUser.department) resolvedDepartment = adminUser.department;
    }

    const { data: existingUser, error: checkError } = await supabase
      .from('staff_users')
      .select('id')
      .ilike('full_name', resolvedFullName.trim())
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ message: 'A user with this name already exists' });
    }

    // Staff ID is required for new admin/teacher accounts (legacy rows may stay NULL)
    if ((system_role === 'admin' || system_role === 'teacher') && !isValidStaffId(staffId)) {
      return res.status(400).json({ message: 'ID must contain exactly 9 digits (format 00000-0000).' });
    }
    if (staffId) {
      const { data: existingId } = await supabase
        .from('staff_users')
        .select('id')
        .eq('staff_id', staffId)
        .limit(1);
      if (existingId && existingId.length > 0) {
        return res.status(400).json({ message: 'ID already exists. Please enter a different ID.' });
      }
    }

    // One admin per department
    if (system_role === 'admin' && resolvedDepartment) {
      const { data: existingAdmin } = await supabase
        .from('staff_users')
        .select('id')
        .eq('system_role', 'admin')
        .eq('department', resolvedDepartment)
        .limit(1);
      if (existingAdmin && existingAdmin.length > 0) {
        return res.status(400).json({ message: 'An admin already exists in this department.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Server-generated identity: fresh UUID becomes the record id; the
    // username is derived strictly from last name + staff ID (no silent fallback).
    const generatedId = crypto.randomUUID();
    const generatedUsername = staffId
      ? usernameFromLastNameAndId(resolvedLastName, staffId)
      : null;
    if (staffId && !generatedUsername) {
      return res.status(400).json({ message: 'Last name is required to generate the username.' });
    }
    if (generatedUsername) {
      const { data: existingUsername } = await supabase
        .from('staff_users')
        .select('id')
        .eq('username', generatedUsername)
        .limit(1);
      if (existingUsername && existingUsername.length > 0) {
        return res.status(400).json({ message: 'Username already exists. Please enter a different ID.' });
      }
    }

    const insertData = {
      id: generatedId,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      full_name: resolvedFullName,
      username: generatedUsername,
      staff_id: staffId || null,
      department: resolvedDepartment || null,
      course_id: course_id || null,
      system_role,
      password: hashedPassword,
      created_by: requesterRole === 'admin' ? req.user.id : null
    };

    const { data: newUser, error } = await supabase
      .from('staff_users')
      .insert([insertData])
      .select(USER_PUBLIC_COLUMNS)
      .single();

    if (error) {
      const dbMessage = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      if (error.code === '23505' && /one_admin_per_department/i.test(dbMessage)) {
        return res.status(400).json({ message: 'An admin already exists in this department.' });
      }
      // 23503 on created_by = stale admin session (creator row gone);
      // surface it as session-expired instead of a raw FK error.
      if (error.code === '23503' && /created_by/i.test(error.message)) {
        return res.status(401).json({ message: 'Session expired. Please log out and log in again.' });
      }
      if (error.code === '23503') {
        return res.status(400).json({ message: 'Invalid reference (course or creator). Please refresh and try again.' });
      }
      return sendServerError(res, error);
    }

    const actingUser = req.user.username || 'System';
    await supabase.from('activity_log').insert([{
      user_name: actingUser,
      action: 'User Created',
      details: `A new ${system_role} account for "${resolvedFullName}" was created with the username "${generatedUsername}".`,
      department: req.user.department || null
    }]);

    res.status(201).json(omitPassword(newUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id — update user
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, first_name, last_name, course_id, department, system_role, username, password } = req.body;
  const { role: requesterRole } = req.user;

  try {
    const { data: targetUser } = await supabase
      .from('staff_users')
      .select('system_role, created_by, department, staff_id, first_name, last_name, full_name, username, course_id')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (requesterRole === 'superadmin' && targetUser.system_role !== 'admin') {
      return res.status(403).json({ message: 'Superadmin can only edit admin accounts.' });
    }
    if (requesterRole === 'admin' && targetUser.system_role !== 'teacher') {
      return res.status(403).json({ message: 'Admin can only edit teacher accounts.' });
    }
    if (requesterRole === 'admin' && targetUser.created_by !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit teachers you created.' });
    }
    if (requesterRole === 'teacher') {
      return res.status(403).json({ message: 'Teachers cannot edit users.' });
    }

    // One admin per department — check on department or role change
    if (targetUser.system_role === 'admin' && department !== undefined && department) {
      const { data: existingAdmin } = await supabase
        .from('staff_users')
        .select('id')
        .eq('system_role', 'admin')
        .eq('department', department)
        .neq('id', id)
        .limit(1);
      if (existingAdmin && existingAdmin.length > 0) {
        return res.status(400).json({ message: 'An admin already exists in this department.' });
      }
    }
    if (targetUser.system_role !== 'admin' && system_role === 'admin' && targetUser.department) {
      const { data: existingAdmin } = await supabase
        .from('staff_users')
        .select('id')
        .eq('system_role', 'admin')
        .eq('department', targetUser.department)
        .limit(1);
      if (existingAdmin && existingAdmin.length > 0) {
        return res.status(400).json({ message: 'An admin already exists in this department.' });
      }
    }

    const updates = {};
    // Staff ID edit: same format + global uniqueness (excluding self). Empty clears back to NULL.
    if (req.body.staff_id !== undefined) {
      const raw = String(req.body.staff_id || '').trim();
      if (raw === '') {
        updates.staff_id = null;
      } else {
        const normalized = normalizeStaffId(raw);
        if (!isValidStaffId(normalized)) {
          return res.status(400).json({ message: 'ID must contain exactly 9 digits (format 00000-0000).' });
        }
        const { data: existingId } = await supabase
          .from('staff_users')
          .select('id')
          .eq('staff_id', normalized)
          .neq('id', id)
          .limit(1);
        if (existingId && existingId.length > 0) {
          return res.status(400).json({ message: 'ID already exists. Please enter a different ID.' });
        }
        updates.staff_id = normalized;
      }
    }

    // Username always follows last name + staff ID — never edited directly.
    // Only the LAST name drives the username, so editing the first name
    // (which may be a double name like "Mary Jane") never changes it.
    // Recalculate only when the last name or the staff ID actually changes.
    {
      const clearingStaff = req.body.staff_id !== undefined && String(req.body.staff_id || '').trim() === '';
      const staffChanged = req.body.staff_id !== undefined && !clearingStaff;
      const effectiveStaff = staffChanged
        ? normalizeStaffId(req.body.staff_id)
        : (targetUser.staff_id || '');
      const effectiveLast = last_name !== undefined
        ? last_name
        : full_name !== undefined
          ? (lastNameFromFullName(full_name) || targetUser.last_name)
          : targetUser.last_name;
      const lastChanged = last_name !== undefined
        && normalizeLastName(last_name) !== normalizeLastName(targetUser.last_name || '');
      // Legacy path: full_name sent without an explicit last_name (old
      // clients). Only treat as a last-name change when the parsed last
      // name actually differs, so first-name-only edits keep the username.
      const parsedLastChanged = last_name === undefined && full_name !== undefined
        && normalizeLastName(lastNameFromFullName(full_name) || '') !== normalizeLastName(targetUser.last_name || '');
      if (staffChanged && !effectiveLast) {
        return res.status(400).json({ message: 'Last name is required to generate the username.' });
      }
      if ((staffChanged || lastChanged || parsedLastChanged) && effectiveStaff && effectiveLast) {
        const derivedUsername = usernameFromLastNameAndId(effectiveLast, effectiveStaff);
        if (derivedUsername) {
          const { data: existingUsername } = await supabase
            .from('staff_users')
            .select('id')
            .eq('username', derivedUsername)
            .neq('id', id)
            .limit(1);
          if (existingUsername && existingUsername.length > 0) {
            return res.status(400).json({ message: 'Username already exists. Please enter a different ID.' });
          }
          updates.username = derivedUsername;
        }
      }
    }

    if (full_name !== undefined) updates.full_name = full_name;
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    // Keep full_name consistent when first/last are sent without it.
    if (full_name === undefined && (first_name !== undefined || last_name !== undefined)) {
      const effFirst = first_name !== undefined ? String(first_name).trim() : String(targetUser.first_name || '').trim();
      const effLast = last_name !== undefined ? String(last_name).trim() : String(targetUser.last_name || '').trim();
      const combined = `${effFirst} ${effLast}`.trim();
      if (combined) updates.full_name = combined;
    }
    if (course_id !== undefined) updates.course_id = course_id;
    if (department !== undefined) updates.department = department;
    if (password !== undefined && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
    }
    if (system_role !== undefined) {
      updates.system_role = system_role;
    }

    const { data: updatedUser, error } = await supabase
      .from('staff_users')
      .update(updates)
      .eq('id', id)
      .select(USER_PUBLIC_COLUMNS)
      .single();

    if (error) {
      const dbMessage = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      if (error.code === '23505' && /one_admin_per_department/i.test(dbMessage)) {
        return res.status(400).json({ message: 'An admin already exists in this department.' });
      }
      return sendServerError(res, error);
    }

    const actingUser = req.user.username || 'System';
    // Specify exactly what changed so Recent Activities and the Audit Trail
    // show field-level details (password value itself is never logged).
    const roleWord = targetUser.system_role || 'user';
    const norm = (v) => String(v ?? '').trim();
    const fmtId = (digits) => {
      const d = String(digits || '').replace(/\D/g, '');
      return d.length === 9 ? `${d.slice(0, 5)}-${d.slice(5)}` : (d || '—');
    };
    const changes = [];
    if (updates.full_name !== undefined && norm(updates.full_name) !== norm(targetUser.full_name)) {
      changes.push(`name ("${norm(targetUser.full_name) || '—'}" → "${norm(updates.full_name)}")`);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'staff_id') && normalizeStaffId(updates.staff_id) !== normalizeStaffId(targetUser.staff_id)) {
      changes.push(`ID (${fmtId(targetUser.staff_id)} → ${fmtId(updates.staff_id)})`);
    }
    if (updates.department !== undefined && norm(updates.department) !== norm(targetUser.department)) {
      changes.push(`department ("${norm(targetUser.department) || '—'}" → "${norm(updates.department)}")`);
    }
    if (updates.username !== undefined && norm(updates.username) !== norm(targetUser.username)) {
      changes.push(`username ("${norm(targetUser.username) || '—'}" → "${norm(updates.username)}")`);
    }
    if (updates.system_role !== undefined && norm(updates.system_role) !== norm(targetUser.system_role)) {
      changes.push(`role ("${norm(targetUser.system_role)}" → "${norm(updates.system_role)}")`);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'course_id') && norm(updates.course_id) !== norm(targetUser.course_id)) {
      changes.push('course assignment');
    }
    if (updates.password !== undefined) {
      changes.push('password');
    }
    // Only log when something actually changed — identical resubmits
    // stay invisible in Recent Activities and the Audit Trail.
    if (changes.length > 0) {
      const details = `The ${roleWord} account "${updatedUser.full_name}" was updated. Changes made: ${changes.join(', ')}.`;
      await supabase.from('activity_log').insert([{
        user_name: actingUser,
        action: 'User Updated',
        details,
        department: req.user.department || null
      }]);
    }

    res.json(omitPassword(updatedUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { role: requesterRole } = req.user;

  try {
    const { data: userToDelete } = await supabase
      .from('staff_users')
      .select('full_name, system_role, created_by')
      .eq('id', id)
      .single();

    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (requesterRole === 'superadmin' && userToDelete.system_role !== 'admin') {
      return res.status(403).json({ message: 'Superadmin can only delete admin accounts.' });
    }
    if (requesterRole === 'admin' && userToDelete.system_role !== 'teacher') {
      return res.status(403).json({ message: 'Admin can only delete teacher accounts.' });
    }
    if (requesterRole === 'admin' && userToDelete.created_by !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete teachers you created.' });
    }
    if (requesterRole === 'teacher') {
      return res.status(403).json({ message: 'Teachers cannot delete users.' });
    }

    // Allow deleting an admin even when teacher accounts (or sections /
    // subjects / assignments) still reference it via created_by. Detach
    // those creator links first so the FK (NO ACTION) doesn't block the
    // delete. Teacher accounts themselves are kept — only the creator
    // reference is cleared.
    const detachTables = ['staff_users', 'sections', 'subjects', 'teacher_assignments'];
    for (const table of detachTables) {
      const { error: detachError } = await supabase
        .from(table)
        .update({ created_by: null })
        .eq('created_by', id);
      // Ignore "table/column missing" errors so this stays robust across
      // schema variants; fail only on real DB errors.
      if (detachError && detachError.code !== 'PGRST205' && detachError.code !== '42703') {
        // If the table doesn't exist in this install, Supabase returns
        // PGRST205 — safe to continue. Otherwise log and continue anyway;
        // the final delete will surface any true blocker.
        console.warn(`Detach created_by on ${table} failed:`, detachError.message);
      }
    }

    const { error } = await supabase
      .from('staff_users')
      .delete()
      .eq('id', id);

    if (error) {
      return sendServerError(res, error);
    }

    const actingUser = req.user.username || 'System';
    await supabase.from('activity_log').insert([{
      user_name: actingUser,
      action: 'User Deleted',
      details: `The ${userToDelete.system_role} account "${userToDelete.full_name}" was deleted.`,
      department: req.user.department || null
    }]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
