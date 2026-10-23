const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
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
    if (error) return sendServerError(res, error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/departments — create department (superadmin only)
router.post('/', authorizeRole('superadmin'), async (req, res) => {
  const { name, abbr } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required' });
  }
  const payload = { name: name.trim() };
  if (abbr && String(abbr).trim()) payload.abbr = String(abbr).trim().toUpperCase();
  try {
    const { data, error } = await supabase
      .from('departments')
      .insert([payload])
      .select()
      .single();
    if (error) return sendServerError(res, error);
    const abbrSuffix = data.abbr ? ` (${data.abbr})` : '';
    await supabase.from('activity_log').insert([{
      user_name: req.user.username || 'System',
      action: 'Department Created',
      details: `The department "${data.name}"${abbrSuffix} was created.`,
      department: req.user.department || null
    }]);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/departments/:id — rename department (superadmin only)
router.patch('/:id', authorizeRole('superadmin'), async (req, res) => {
  const { name, abbr } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Department name is required' });
  }
  const updates = { name: name.trim() };
  if (abbr !== undefined) {
    updates.abbr = String(abbr).trim() ? String(abbr).trim().toUpperCase() : null;
  }
  try {
    const { data: oldDept } = await supabase
      .from('departments')
      .select('name, abbr')
      .eq('id', req.params.id)
      .single();
    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return sendServerError(res, error);
    // staff_users.department is a plain name snapshot (no FK), so a rename
    // must cascade manually — otherwise admin/teacher accounts keep showing
    // the old department name.
    if (oldDept && oldDept.name !== data.name) {
      const { error: cascadeError } = await supabase
        .from('staff_users')
        .update({ department: data.name })
        .eq('department', oldDept.name);
      if (cascadeError) return sendServerError(res, cascadeError);
    }
    const changes = [];
    if (oldDept && oldDept.name !== data.name) {
      changes.push(`name ("${oldDept.name}" → "${data.name}")`);
    }
    if (oldDept && (oldDept.abbr || null) !== (data.abbr || null)) {
      changes.push(`abbreviation ("${oldDept.abbr || '—'}" → "${data.abbr || '—'}")`);
    }
    // Identical resubmits stay invisible in Recent Activities and the Audit Trail.
    if (changes.length > 0) {
      await supabase.from('activity_log').insert([{
        user_name: req.user.username || 'System',
        action: 'Department Updated',
        details: `The department "${data.name}" was updated. Changes made: ${changes.join(', ')}.`,
        department: req.user.department || null
      }]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/departments/:id — delete department (superadmin only)
router.delete('/:id', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('department_id', req.params.id)
      .limit(1);
    if (courses && courses.length > 0) {
      return res.status(400).json({ message: 'Cannot delete department with existing courses. Remove courses first.' });
    }
    const { data: dept } = await supabase
      .from('departments')
      .select('id, name, abbr')
      .eq('id', req.params.id)
      .single();
    if (!dept) {
      return res.status(404).json({ message: 'Department not found.' });
    }
    // Users carry the department as a plain name snapshot (no FK), so without
    // this the deleted name would linger as a ghost row in Department User
    // Overview. Move affected users to Unassigned instead.
    const { error: clearError } = await supabase
      .from('staff_users')
      .update({ department: null })
      .eq('department', dept.name);
    if (clearError) return sendServerError(res, clearError);
    const abbrSuffix = dept.abbr ? ` (${dept.abbr})` : '';
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.id);
    if (error) return sendServerError(res, error);
    await supabase.from('activity_log').insert([{
      user_name: req.user.username || 'System',
      action: 'Department Deleted',
      details: `The department "${dept.name}"${abbrSuffix} was deleted.`,
      department: req.user.department || null
    }]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
