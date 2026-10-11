const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/courses — list courses, optionally filtered by department_id
router.get('/', async (req, res) => {
  try {
    const { department_id } = req.query;
    let query = supabase
      .from('courses')
      .select('*, departments(name)')
      .order('name', { ascending: true });
    if (department_id) query = query.eq('department_id', department_id);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/courses — create course (superadmin only)
router.post('/', authorizeRole('superadmin'), async (req, res) => {
  const { name, abbreviation, department_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Course name is required' });
  }
  if (!abbreviation || !abbreviation.trim()) {
    return res.status(400).json({ message: 'Course abbreviation is required' });
  }
  if (!department_id) {
    return res.status(400).json({ message: 'Department ID is required' });
  }
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert([{ name: name.trim(), abbreviation: abbreviation.trim().toUpperCase(), department_id }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const abbrSuffix = data.abbreviation ? ` (${data.abbreviation})` : '';
    await supabase.from('activity_log').insert([{
      user_name: req.user.username || 'System',
      action: 'Course Created',
      details: `Created course "${data.name}"${abbrSuffix}`,
      department: req.user.department || null
    }]);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/courses/:id — edit course (superadmin only)
router.patch('/:id', authorizeRole('superadmin'), async (req, res) => {
  const { name, abbreviation } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Course name is required' });
  }
  try {
    const { data: oldCourse } = await supabase
      .from('courses')
      .select('name, abbreviation')
      .eq('id', req.params.id)
      .single();
    const updates = { name: name.trim() };
    if (abbreviation !== undefined) updates.abbreviation = abbreviation.trim().toUpperCase();
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    const changes = [];
    if (oldCourse && oldCourse.name !== data.name) {
      changes.push(`name ("${oldCourse.name}" → "${data.name}")`);
    }
    if (oldCourse && (oldCourse.abbreviation || null) !== (data.abbreviation || null)) {
      changes.push(`abbreviation ("${oldCourse.abbreviation || '—'}" → "${data.abbreviation || '—'}")`);
    }
    // Identical resubmits stay invisible in Recent Activities and the Audit Trail.
    if (changes.length > 0) {
      await supabase.from('activity_log').insert([{
        user_name: req.user.username || 'System',
        action: 'Course Updated',
        details: `Updated course "${data.name}" — changed: ${changes.join(', ')}`,
        department: req.user.department || null
      }]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/courses/:id — delete course (superadmin only)
router.delete('/:id', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { data: course } = await supabase
      .from('courses')
      .select('id, name, abbreviation')
      .eq('id', req.params.id)
      .single();
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }
    const { data: users } = await supabase
      .from('staff_users')
      .select('id')
      .eq('course_id', req.params.id)
      .limit(1);
    if (users && users.length > 0) {
      return res.status(400).json({ message: 'Cannot delete course assigned to users. Reassign users first.' });
    }
    const { data: sections } = await supabase
      .from('sections')
      .select('id')
      .eq('course_id', req.params.id)
      .limit(1);
    if (sections && sections.length > 0) {
      return res.status(400).json({ message: 'Cannot delete course with existing sections. Remove sections first.' });
    }
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', req.params.id);
    if (error) {
      // Foreign-key violation from any other dependent record — explain instead of 500ing
      if (error.code === '23503') {
        return res.status(400).json({ message: 'Cannot delete course because it is still referenced by other records.' });
      }
      return res.status(500).json({ error: error.message });
    }
    const abbrSuffix = course.abbreviation ? ` (${course.abbreviation})` : '';
    await supabase.from('activity_log').insert([{
      user_name: req.user.username || 'System',
      action: 'Course Deleted',
      details: `Deleted course "${course.name}"${abbrSuffix}`,
      department: req.user.department || null
    }]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
