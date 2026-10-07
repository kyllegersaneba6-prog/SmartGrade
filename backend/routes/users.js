const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// All routes require authentication
router.use(authenticateToken);

// GET /api/users — list users based on role
router.get('/', async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    let query = supabase.from('staff_users').select('*, courses(name)').order('created_at', { ascending: false });

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
      return res.status(500).json({ error: error.message });
    }

    res.json(users);
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
    // If admin creates teacher, inherit admin's department
    let resolvedDepartment = department;
    if (requesterRole === 'admin') {
      const { data: adminUser } = await supabase
        .from('staff_users')
        .select('department')
        .eq('id', req.user.id)
        .single();
      if (adminUser) resolvedDepartment = adminUser.department;
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
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const actingUser = req.user.username || 'System';
    await supabase.from('activity_log').insert([{
      user_name: actingUser,
      action: 'User Created',
      details: `Created ${system_role} "${resolvedFullName}" (${generatedUsername})`,
      department: req.user.department || null
    }]);

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id — update user
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, course_id, department, system_role, username, password } = req.body;
  const { role: requesterRole } = req.user;

  try {
    const { data: targetUser } = await supabase
      .from('staff_users')
      .select('system_role, created_by, department, staff_id, last_name, full_name')
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
    // Recalculate when the ID changes, or when the name changes on a record
    // that already has an ID.
    {
      const clearingStaff = req.body.staff_id !== undefined && String(req.body.staff_id || '').trim() === '';
      const staffChanged = req.body.staff_id !== undefined && !clearingStaff;
      const nameChanged = !clearingStaff && (full_name !== undefined || req.body.last_name !== undefined);
      const effectiveStaff = staffChanged
        ? normalizeStaffId(req.body.staff_id)
        : (targetUser.staff_id || '');
      const effectiveLast = req.body.last_name !== undefined
        ? req.body.last_name
        : full_name !== undefined
          ? (lastNameFromFullName(full_name) || targetUser.last_name)
          : targetUser.last_name;
      if (staffChanged && !effectiveLast) {
        return res.status(400).json({ message: 'Last name is required to generate the username.' });
      }
      if ((staffChanged || nameChanged) && effectiveStaff && effectiveLast) {
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
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const actingUser = req.user.username || 'System';
    await supabase.from('activity_log').insert([{
      user_name: actingUser,
      action: 'User Updated',
      details: `Updated user "${updatedUser.full_name}"`,
      department: req.user.department || null
    }]);

    res.json(updatedUser);
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

    const { error } = await supabase
      .from('staff_users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const actingUser = req.user.username || 'System';
    await supabase.from('activity_log').insert([{
      user_name: actingUser,
      action: 'User Deleted',
      details: `Deleted user "${userToDelete.full_name}" (${userToDelete.system_role})`,
      department: req.user.department || null
    }]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
