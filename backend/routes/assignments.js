const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const { canAccessAssignment, canAccessSection, canManageSubject, canManageTeacher, filterAccessible, getRow } = require('../middleware/access');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

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
      .select('*, sections(name, year_level, courses(abbreviation)), subjects(name, code), teacher:teacher_id(full_name)');

    if (teacher_id && role === 'admin') query = query.eq('teacher_id', teacher_id);
    if (role === 'teacher') query = query.eq('teacher_id', id);
    if (role === 'admin') query = query.eq('created_by', id);

    if (subject_id && role === 'admin') query = query.eq('subject_id', subject_id);
    if (school_year) query = query.eq('school_year', school_year);
    if (semester) query = query.eq('semester', semester);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return sendServerError(res, error);
    res.json(await filterAccessible(data, canAccessAssignment, req.user));
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
  if (!school_year || !semester) {
    return res.status(400).json({ message: 'School year and semester are required' });
  }
  try {
    if (!semesters.includes(semester)) return res.status(400).json({ message: 'Invalid semester.' });
    if (!(await canManageTeacher(teacher_id, req.user)) || !(await canAccessSection(section_id, req.user)) ||
        !(await canManageSubject(subject_id, req.user))) {
      return res.status(403).json({ message: 'Teacher, section, and subject must belong to you and your department.' });
    }
    const section = await getRow('sections', section_id);
    const subject = await getRow('subjects', subject_id);
    const teacher = await getRow('staff_users', teacher_id, 'course_id');
    if (!section || !subject || !teacher) return res.status(403).json({ message: 'Access denied.' });
    if (section.school_year !== school_year || section.semester !== semester || (subject.semester && subject.semester !== semester) ||
        subject.year_level !== section.year_level || (subject.course_id && subject.course_id !== section.course_id) ||
        (teacher.course_id && teacher.course_id !== section.course_id)) {
      return res.status(400).json({ message: 'Teacher course, subject, section, year level, and term must be compatible.' });
    }
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (!activeTerm || activeTerm.school_year !== school_year || activeTerm.semester !== semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { data: existing } = await supabase
      .from('teacher_assignments')
      .select('id, teacher:teacher_id(full_name)')
      .eq('section_id', section_id)
      .eq('subject_id', subject_id)
      .eq('school_year', school_year)
      .eq('semester', semester)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: `This section and subject is already assigned to ${existing.teacher.full_name}.` });
    }
    const { data, error } = await supabase
      .from('teacher_assignments')
      .insert([{ teacher_id, section_id, subject_id, school_year, semester, created_by: req.user.id }])
      .select('*, sections(name, year_level), subjects(name, code), teacher:teacher_id(full_name)')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'This teacher is already assigned to this section and subject in this school year and semester.' });
      return sendServerError(res, error);
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
    if (!(await canAccessAssignment(req.params.id, req.user))) return res.status(403).json({ message: 'Access denied.' });
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
    if (error) return sendServerError(res, error);
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
