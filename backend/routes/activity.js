const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { role, department } = req.user;
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (role === 'admin' && department) {
      query = query.eq('department', department);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { user_name, action, details, department } = req.body;

  if (!user_name || !action) {
    return res.status(400).json({ message: 'user_name and action are required' });
  }

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert([{ user_name, action, details, department: department || null }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
