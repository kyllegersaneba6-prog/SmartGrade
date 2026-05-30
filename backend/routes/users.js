const express = require('express');
const bcrypt = require('bcryptjs');
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
      query = query.in('system_role', ['admin', 'teacher']);
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

// POST /api/users — create user (superadmin creates admin, admin creates teacher)
router.post('/', async (req, res) => {
  const { first_name, last_name, full_name, department, course_id, system_role, password, username } = req.body;
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertData = {
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      full_name: resolvedFullName,
      username: username || resolvedFullName.toLowerCase().replace(/\s+/g, '.'),
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
      details: `Created ${system_role} "${full_name}"`,
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
      .select('system_role, created_by')
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

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (course_id !== undefined) updates.course_id = course_id;
    if (department !== undefined) updates.department = department;
    if (username !== undefined) updates.username = username;
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
