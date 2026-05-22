const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('staff_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  const { full_name, department, course, system_role, permissions_profile, password } = req.body;

  if (!full_name || !department || !system_role || !permissions_profile || !password) {
    return res.status(400).json({ message: 'All required fields (Full Name, Department, System Role, Permissions Profile, and Password) must be filled' });
  }

  try {
    // Check if user with same name already exists (case-insensitive)
    const { data: existingUser, error: checkError } = await supabase
      .from('staff_users')
      .select('id')
      .ilike('full_name', full_name.trim())
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ message: 'A user with this name already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: newUser, error } = await supabase
      .from('staff_users')
      .insert([
        {
          full_name,
          department: department === 'CICT' ? 'College of Information and Communication Technology (CICT)' : department,
          course: (course === 'BSIT' || course === 'Bachelor of Science in Information Technology (BSIT)') ? 'College of Information and Communication Technology (CICT)' : course,
          system_role,
          permissions_profile,
          password: hashedPassword
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log activity
    await supabase.from('activity_log').insert([{
      user_name: 'Super Admin',
      action: 'User Created',
      details: `Created user "${full_name}" with role ${system_role}`
    }]);

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, course, department, system_role } = req.body;

  try {
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (course !== undefined) {
      updates.course = (course === 'BSIT' || course === 'Bachelor of Science in Information Technology (BSIT)') ? 'College of Information and Communication Technology (CICT)' : course;
    }
    if (department !== undefined) {
      updates.department = department === 'CICT' ? 'College of Information and Communication Technology (CICT)' : department;
    }
    if (system_role !== undefined) {
      updates.system_role = system_role;
      // Auto-assign permissions based on role
      if (system_role === 'sysadmin') updates.permissions_profile = 'manage';
      else if (system_role === 'teacher' || system_role === 'dean') updates.permissions_profile = 'create_update';
      else if (system_role === 'student') updates.permissions_profile = 'read_only';
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

    // Log activity
    await supabase.from('activity_log').insert([{
      user_name: 'Super Admin',
      action: 'User Updated',
      details: `Updated user "${updatedUser.full_name}"`
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
  try {
    // Fetch user name before deleting for the activity log
    const { data: userToDelete } = await supabase
      .from('staff_users')
      .select('full_name, system_role')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('staff_users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log activity
    const deletedName = userToDelete ? userToDelete.full_name : 'Unknown';
    const deletedRole = userToDelete ? userToDelete.system_role : '';
    await supabase.from('activity_log').insert([{
      user_name: 'Super Admin',
      action: 'User Deleted',
      details: `Deleted user "${deletedName}" (${deletedRole})`
    }]);

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
