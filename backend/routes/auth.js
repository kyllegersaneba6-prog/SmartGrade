const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Login Route
router.post('/login', async (req, res) => {
  let { username, password } = req.body;
  username = username.trim();

  try {
    // 1. Find user in Supabase
    let user;
    let role = 'admin';
    let dbUsername = username;

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .single();

    if (adminUser) {
      user = adminUser;
    } else if (username.toUpperCase().startsWith('USR-')) {
      // The 'id' column is a UUID type — ilike won't work on it.
      // Fetch all staff users and match the ID prefix in code instead.
      const shortId = username.substring(4).toLowerCase();
      const { data: staffUsers } = await supabase
        .from('staff_users')
        .select('*');

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
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 2. Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, username: dbUsername, role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: dbUsername,
        role,
        full_name: user.full_name,
        department: user.department,
        system_role: user.system_role,
        permissions_profile: user.permissions_profile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
