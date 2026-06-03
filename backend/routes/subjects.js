const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

const yearLevels = ['1st', '2nd', '3rd', '4th'];

// GET /api/subjects — list all subjects, optionally filtered
router.get('/', async (req, res) => {
  try {
    const { year, semester, course_id } = req.query;
    const { role, id } = req.user;
    let query = supabase.from('subjects').select('*').order('name', { ascending: true });
    if (role === 'admin') query = query.eq('created_by', id);
    if (year) query = query.eq('year_level', year);
    if (semester) query = query.or(`semester.eq.${semester},semester.is.null`);
    if (course_id) query = query.or(`course_id.eq.${course_id},course_id.is.null`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/subjects — create a subject
router.post('/', authorizeRole('admin'), async (req, res) => {
  const { name, code, year_level, semester, course_id: rawCourseId } = req.body;
  const course_id = rawCourseId || null;
  if (!name || !year_level) {
    return res.status(400).json({ message: 'Name and year level are required' });
  }
  if (!yearLevels.includes(year_level)) {
    return res.status(400).json({ message: 'Invalid year level' });
  }
  try {
    let dupQuery = supabase.from('subjects').select('id').eq('name', name);
    if (course_id) {
      dupQuery = dupQuery.eq('course_id', course_id);
    } else {
      dupQuery = dupQuery.is('course_id', null);
    }
    const { data: existing } = await dupQuery.maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'A subject with this name already exists in this course.' });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name, code: code || null, year_level, semester: semester || null, course_id, created_by: req.user.id }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/subjects/:id — delete a subject
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: subject } = await supabase.from('subjects').select('created_by').eq('id', req.params.id).single();
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    if (subject.created_by !== req.user.id) return res.status(403).json({ message: 'You can only delete your own subjects.' });
    const { error } = await supabase.from('subjects').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
