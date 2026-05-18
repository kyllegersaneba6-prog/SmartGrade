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
  const { full_name, department, system_role, permissions_profile, password } = req.body;

  if (!full_name || !department || !system_role || !permissions_profile || !password) {
    return res.status(400).json({ message: 'All five fields (Full Name, Department, System Role, Permissions Profile, and Password) are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { data: newUser, error } = await supabase
      .from('staff_users')
      .insert([
        {
          full_name,
          department,
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
