const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

const getCurrentSchoolYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

const semesters = ['1st Semester', '2nd Semester',  'Summer'];

// GET /api/assignments — get assignments (admin sees own, teacher sees own)
// Admin can pass ?teacher_id=xxx to view assignments for a specific teacher
// Admin can pass ?subject_id=xxx to view assignments for a specific subject
router.get('/', async (req, res) => {
  try {
    const { role, id } = req.user;
    const { teacher_id, subject_id, school_year, semester } = req.query;
    let query = supabase
      .from('teacher_assignments')
      .select('*, sections(name, year_level), subjects(name, code), teacher:teacher_id(full_name)');

    if (teacher_id && role === 'admin') query = query.eq('teacher_id', teacher_id);
    else if (role === 'teacher') query = query.eq('teacher_id', id);
    else if (role === 'admin') query = query.eq('created_by', id);

    if (subject_id && role === 'admin') query = query.eq('subject_id', subject_id);
    if (school_year) query = query.eq('school_year', school_year);
    if (semester) query = query.eq('semester', semester);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assignments — create assignment
router.post('/', authorizeRole('admin'), async (req, res) => {
  const { teacher_id, section_id, subject_id, school_year, semester } = req.body;
  if (!teacher_id || !section_id || !subject_id) {
    return res.status(400).json({ message: 'Teacher, section, and subject are required' });
  }
  try {
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    const checkSy = school_year || getCurrentSchoolYear();
    const checkSem = semester || '1st Semester';
    if (!activeTerm || activeTerm.school_year !== checkSy || activeTerm.semester !== checkSem) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { data, error } = await supabase
      .from('teacher_assignments')
      .insert([{ teacher_id, section_id, subject_id, school_year: school_year || getCurrentSchoolYear(), semester: semester || '1st Semester', created_by: req.user.id }])
      .select('*, sections(name, year_level), subjects(name, code), teacher:teacher_id(full_name)')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'This teacher is already assigned to this section and subject in this school year and semester.' });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: assignment } = await supabase.from('teacher_assignments').select('created_by, school_year, semester').eq('id', req.params.id).single();
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.created_by !== req.user.id) return res.status(403).json({ message: 'You can only delete your own assignments.' });
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (!activeTerm || activeTerm.school_year !== assignment.school_year || activeTerm.semester !== assignment.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { error } = await supabase.from('teacher_assignments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
