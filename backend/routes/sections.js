const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

const yearLevels = ['1st', '2nd', '3rd', '4th'];
const sectionsByYear = {
  '1st': ['Section A', 'Section B', 'Section C'],
  '2nd': ['Section D', 'Section E', 'Section F'],
  '3rd': ['Section G', 'Section H', 'Section I'],
  '4th': ['Section J', 'Section K', 'Section L'],
};

// GET /api/sections/seed/preview — preview seed data without inserting
router.get('/seed/preview', async (req, res) => {
  try {
    const { course_id, year_level } = req.query;
    if (!course_id || !year_level) return res.status(400).json({ message: 'course_id and year_level are required' });
    const { data: course } = await supabase.from('courses').select('abbreviation').eq('id', course_id).single();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const yearNum = year_level.replace('th', '').replace('nd', '').replace('rd', '').replace('st', '');
    const names = sectionsByYear[year_level] || [];
    const preview = names.map((name) => `${course.abbreviation} ${yearNum}-${name.replace('Section ', '')}`);
    res.json(preview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sections — list sections by year level
router.get('/', async (req, res) => {
  try {
    const { year, course_id, school_year, semester } = req.query;
    const { role, id } = req.user;
    let query = supabase.from('sections').select('*, courses(abbreviation)').order('name', { ascending: true });
    if (role === 'admin') query = query.eq('created_by', id);
    if (year) query = query.eq('year_level', year);
    if (course_id) query = query.eq('course_id', course_id);
    if (school_year) query = query.eq('school_year', school_year);
    if (semester) query = query.eq('semester', semester);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections — create a section
router.post('/', authorizeRole('admin'), async (req, res) => {
  const { name, year_level, course_id, school_year, semester } = req.body;
  if (!name || !year_level) {
    return res.status(400).json({ message: 'Name and year level are required' });
  }
  if (!school_year || !semester) {
    return res.status(400).json({ message: 'School year and semester are required' });
  }
  if (!yearLevels.includes(year_level)) {
    return res.status(400).json({ message: 'Invalid year level' });
  }
  try {
    let resolvedName = name;
    if (course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('abbreviation')
        .eq('id', course_id)
        .single();
      if (course?.abbreviation) {
        const yearNum = year_level.replace('th', '').replace('nd', '').replace('rd', '').replace('st', '');
        resolvedName = `${course.abbreviation} ${yearNum}-${name}`;
      }
    }
    let dupQuery = supabase
      .from('sections')
      .select('id')
      .eq('name', resolvedName)
      .eq('school_year', school_year);
    if (course_id) {
      dupQuery = dupQuery.eq('course_id', course_id);
    } else {
      dupQuery = dupQuery.is('course_id', null);
    }
    const { data: existing } = await dupQuery.maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'A section with this name already exists in this course.' });
    }

    const { data, error } = await supabase
      .from('sections')
      .insert([{ name: resolvedName, year_level, course_id: course_id || null, school_year, semester, created_by: req.user.id }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sections/:id — delete a section (cascades to students)
router.delete('/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: section } = await supabase.from('sections').select('created_by, school_year, semester').eq('id', req.params.id).single();
    if (!section) return res.status(404).json({ message: 'Section not found' });
    if (section.created_by !== req.user.id) return res.status(403).json({ message: 'You can only delete your own sections.' });
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { error } = await supabase.from('sections').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sections/:sectionId/students — get students for a section
router.get('/:sectionId/students', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('section_id', req.params.sectionId)
      .order('student_name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections/:sectionId/students — add a student
router.post('/:sectionId/students', authorizeRole('admin'), async (req, res) => {
  const { student_id, first_name, last_name, mi, gender } = req.body;
  if (!student_id || !first_name || !last_name) {
    return res.status(400).json({ message: 'Student ID, first name, and last name are required' });
  }
  const student_name = [last_name, `${first_name}${mi ? ' ' + mi + '.' : ''}`].join(', ');
  try {
    const { data: section } = await supabase
      .from('sections')
      .select('school_year, semester')
      .eq('id', req.params.sectionId)
      .single();
    if (section) {
      const { data: activeTerm } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
        return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
      }
    }
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', student_id)
      .eq('section_id', req.params.sectionId)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'Student ID already exists in this section.' });
    }
    const { data, error } = await supabase
      .from('students')
      .insert([{ student_id, student_name, first_name, last_name, mi, gender, section_id: req.params.sectionId }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sections/students/:id — delete a single student
router.delete('/students/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('id, section_id')
      .eq('id', req.params.id)
      .single();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const { data: section } = await supabase
      .from('sections')
      .select('school_year, semester')
      .eq('id', student.section_id)
      .single();
    if (section) {
      const { data: activeTerm } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
        return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
      }
    }
    const { error } = await supabase.from('students').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Student removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections/:sectionId/students/bulk — bulk add students (import)
router.post('/:sectionId/students/bulk', authorizeRole('admin'), async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Students array is required' });
  }
  try {
    const { data: section } = await supabase
      .from('sections')
      .select('school_year, semester')
      .eq('id', req.params.sectionId)
      .single();
    if (!section) return res.status(404).json({ message: 'Section not found' });
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { data: existingStudents } = await supabase
      .from('students')
      .select('student_id')
      .eq('section_id', req.params.sectionId);
    const existingIds = new Set((existingStudents || []).map((s) => s.student_id));
    const added = [];
    const skipped = [];
    for (let i = 0; i < students.length; i++) {
      const { student_id, first_name, last_name, mi, gender } = students[i];
      if (!student_id || !first_name || !last_name) {
        skipped.push({ student_id, reason: 'Missing required fields (Student ID, First Name, Last Name)' });
        continue;
      }
      if (existingIds.has(student_id)) {
        skipped.push({ student_id, reason: 'Duplicate ID' });
        continue;
      }
      const student_name = [last_name, `${first_name}${mi ? ' ' + mi + '.' : ''}`].join(', ');
      const { data, error } = await supabase
        .from('students')
        .insert([{ student_id, student_name, first_name, last_name, mi: mi || null, gender: gender || null, section_id: req.params.sectionId }])
        .select()
        .single();
      if (error) {
        skipped.push({ student_id, reason: error.message });
      } else {
        added.push(data);
        existingIds.add(student_id);
      }
    }
    res.json({ added, skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
