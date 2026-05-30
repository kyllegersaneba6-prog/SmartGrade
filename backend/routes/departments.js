const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/departments — list all departments
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/departments — create department (superadmin only)
router.post('/', authorizeRole('superadmin'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required' });
  }
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert([{ name: name.trim() }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/departments/:id — rename department (superadmin only)
router.patch('/:id', authorizeRole('superadmin'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required' });
  }
  try {
    const { data, error } = await supabase
      .from('departments')
      .update({ name: name.trim() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/departments/:id — delete department (superadmin only)
router.delete('/:id', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { data: courses, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('department_id', req.params.id)
      .limit(1);
    if (courses && courses.length > 0) {
      return res.status(400).json({ message: 'Cannot delete department with existing courses. Remove courses first.' });
    }
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
