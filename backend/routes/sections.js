const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const { canAccessSection, canAccessCourse, filterAccessible, getRow } = require('../middleware/access');
const { assertActiveTerm } = require('../middleware/termLock');
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
const blockAdminRosterManagement = (req, res, next) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Teachers create sections and manage rosters by importing the class-list PDF in My Students.' });
  }
  return next();
};

// GET /api/sections/seed/preview — preview seed data without inserting
router.get('/seed/preview', async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Teachers create their sections from the class-list PDF.' });
    const { course_id, year_level } = req.query;
    if (!course_id || !year_level) return res.status(400).json({ message: 'course_id and year_level are required' });
    if (!(await canAccessCourse(course_id, req.user))) return res.status(403).json({ message: 'Access denied.' });
    const { data: course } = await supabase.from('courses').select('abbreviation').eq('id', course_id).single();
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const yearNum = year_level.replace('th', '').replace('nd', '').replace('rd', '').replace('st', '');
    const names = sectionsByYear[year_level] || [];
    const preview = names.map((name) => `${course.abbreviation}-${yearNum}${name.replace('Section ', '')}`);
    res.json(preview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sections/find-student — find a student across sections by student_id
router.get('/find-student', async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Student records are available from teacher class lists.' });
    const { student_id } = req.query;
    if (!student_id) return res.status(400).json({ message: 'student_id is required' });
    const { data: matches, error } = await supabase
      .from('students')
      .select('*, sections(id, name, year_level, course_id, school_year, semester)')
      .eq('student_id', student_id);
    if (error) return sendServerError(res, error);
    const accessible = [];
    for (const student of matches || []) {
      if (await canAccessSection(student.section_id, req.user)) accessible.push(student);
    }
    if (!accessible.length) return res.status(404).json({ message: 'Student not found' });
    // Prefer a current-term enrollment; do not let foreign/archived duplicates
    // turn a legitimate transfer lookup into an unscoped maybeSingle failure.
    const { data: activeTerm, error: termError } = await supabase.from('academic_terms')
      .select('school_year, semester').eq('is_active', true).maybeSingle();
    if (termError) return sendServerError(res, termError);
    const current = accessible.filter(s => s.sections?.school_year === activeTerm?.school_year && s.sections?.semester === activeTerm?.semester);
    const candidates = current.length ? current : accessible;
    if (candidates.length !== 1) return res.status(409).json({ message: 'Multiple accessible enrollments found. Use the section roster to identify the student.' });
    const student = candidates[0];
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/sections/students/:id/transfer — transfer a student to another section
router.patch('/students/:id/transfer', authorizeRole('admin'), blockAdminRosterManagement, async (req, res) => {
  try {
    const { target_section_id } = req.body;
    if (!target_section_id) return res.status(400).json({ message: 'target_section_id is required' });
    const { data: student } = await supabase.from('students').select('id, section_id').eq('id', req.params.id).single();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!(await canAccessSection(student.section_id, req.user)) || !(await canAccessSection(target_section_id, req.user))) {
      return res.status(403).json({ message: 'Both sections must belong to you and your department.' });
    }
    const sourceSection = await getRow('sections', student.section_id);
    if (!sourceSection?.school_year || !sourceSection.semester) return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    if (!(await assertActiveTerm(res, { schoolYear: sourceSection.school_year, semester: sourceSection.semester }))) return;
    const { data: targetSection } = await supabase.from('sections').select('id, school_year, semester').eq('id', target_section_id).single();
    if (!targetSection) return res.status(404).json({ message: 'Target section not found' });
    const { data: activeTerm } = await supabase.from('academic_terms').select('*').eq('is_active', true).maybeSingle();
    if (!activeTerm || activeTerm.school_year !== targetSection.school_year || activeTerm.semester !== targetSection.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { data, error } = await supabase
      .from('students')
      .update({ section_id: target_section_id })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return sendServerError(res, error);
    res.json(data);
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
    if (role === 'admin') return res.status(403).json({ message: 'Section lists are managed by teachers through their class-list imports.' });
    let query = supabase.from('sections').select('*, courses(abbreviation)').order('name', { ascending: true });
    if (role === 'admin') query = query.eq('created_by', id);
    if (role === 'teacher') {
      const { data: assignments, error } = await supabase.from('teacher_assignments').select('section_id').eq('teacher_id', id);
      if (error) return sendServerError(res, error);
      if (!assignments?.length) return res.json([]);
      query = query.in('id', [...new Set(assignments.map(row => row.section_id))]);
    }
    if (year) query = query.eq('year_level', year);
    if (course_id) query = query.eq('course_id', course_id);
    if (school_year) query = query.eq('school_year', school_year);
    if (semester) query = query.eq('semester', semester);
    const { data, error } = await query;
    if (error) return sendServerError(res, error);
    res.json(await filterAccessible(data, canAccessSection, req.user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections — create a section
router.post('/', authorizeRole('admin'), blockAdminRosterManagement, async (req, res) => {
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
    if (!(await assertActiveTerm(res, { schoolYear: school_year, semester }))) return;
    if (!course_id || !(await canAccessCourse(course_id, req.user))) {
      return res.status(403).json({ message: 'A course in your department is required.' });
    }
    let resolvedName = name;
    let legacyName = name;
    if (course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('abbreviation')
        .eq('id', course_id)
        .single();
      if (course?.abbreviation) {
        const yearNum = year_level.replace('th', '').replace('nd', '').replace('rd', '').replace('st', '');
        resolvedName = `${course.abbreviation}-${yearNum}${name}`;
        // Older rows used "BSCS 1-A" spacing; keep it in the duplicate check
        // so the same section cannot be created twice during the rename.
        legacyName = `${course.abbreviation} ${yearNum}-${name}`;
      }
    }
    let dupQuery = supabase
      .from('sections')
      .select('id')
      .in('name', [resolvedName, legacyName])
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
    if (error) return sendServerError(res, error);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sections/:id — delete a section (cascades to students)
router.delete('/:id', authorizeRole('admin'), blockAdminRosterManagement, async (req, res) => {
  try {
    if (!(await canAccessSection(req.params.id, req.user))) return res.status(403).json({ message: 'Access denied.' });
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
    if (error) return sendServerError(res, error);
    res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/sections/:sectionId/students
router.get('/:sectionId/students', async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.status(403).json({ message: 'Student rosters are managed by teachers through My Students.' });
    if (!(await canAccessSection(req.params.sectionId, req.user))) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('section_id', req.params.sectionId)
      .order('student_name', { ascending: true });
    if (error) return sendServerError(res, error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections/:sectionId/students — add a student to a teacher's section
router.post('/:sectionId/students', authorizeRole('teacher'), async (req, res) => {
  const { student_id, first_name, last_name, mi, gender, course, year_level } = req.body;
  if (!student_id || !first_name || !last_name) {
    return res.status(400).json({ message: 'Student ID, first name, and last name are required' });
  }
  if (typeof student_id !== 'string' || !/^\d{2}-\d{4}-\d{3}$/.test(student_id.trim())) {
    return res.status(400).json({ message: 'Student ID must use ##-####-### format (e.g. 26-1234-001).' });
  }
  if (typeof first_name !== 'string' || typeof last_name !== 'string' || !first_name.trim() || !last_name.trim()) {
    return res.status(400).json({ message: 'First name and last name are required.' });
  }
  const normalizedId = student_id.trim();
  const normalizedFirstName = first_name.trim();
  const normalizedLastName = last_name.trim();
  const normalizedMi = typeof mi === 'string' ? mi.trim().replace(/[.\s]+$/g, '').toUpperCase() : '';
  const normalizedGender = typeof gender === 'string' ? gender.trim() : '';
  const normalizedCourse = typeof course === 'string' ? course.trim() : '';
  const normalizedYearLevel = typeof year_level === 'string' ? year_level.trim() : '';
  if (!['Male', 'Female'].includes(normalizedGender)) {
    return res.status(400).json({ message: 'Select a valid gender.' });
  }
  if (!['BSIT', 'BSCS'].includes(normalizedCourse) || !['1st', '2nd', '3rd', '4th'].includes(normalizedYearLevel)) {
    return res.status(400).json({ message: 'Select a valid course and year level.' });
  }
  const student_name = [normalizedLastName, `${normalizedFirstName}${normalizedMi ? ` ${normalizedMi}.` : ''}`].join(', ');
  try {
    if (!(await canAccessSection(req.params.sectionId, req.user))) return res.status(403).json({ message: 'Access denied.' });
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('school_year, semester, year_level, courses(abbreviation)')
      .eq('id', req.params.sectionId)
      .single();
    if (sectionError) return sendServerError(res, sectionError);
    if (!section) return res.status(403).json({ message: 'Unable to verify section access.' });
    if (section.courses?.abbreviation !== normalizedCourse || section.year_level !== normalizedYearLevel) {
      return res.status(400).json({ message: 'Course and Year Level must match the selected section.' });
    }
    const { data: activeTerm, error: activeTermError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (activeTermError) return sendServerError(res, activeTermError);
    if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', normalizedId)
      .eq('section_id', req.params.sectionId)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'Student ID already exists in this section.' });
    }
    const { data, error } = await supabase
      .from('students')
      .insert([{
        student_id: normalizedId,
        student_name,
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        mi: normalizedMi || null,
        gender: normalizedGender,
        section_id: req.params.sectionId,
      }])
      .select()
      .single();
    if (error) return sendServerError(res, error);
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sections/:sectionId/students/bulk — delete selected students or the full class list
router.delete('/:sectionId/students/bulk', authorizeRole('teacher'), async (req, res) => {
  const { student_ids, delete_section } = req.body || {};
  if (!Array.isArray(student_ids) || (student_ids.length === 0 && delete_section !== true) || student_ids.length > 500
    || student_ids.some((id) => typeof id !== 'string' || !id.trim())) {
    return res.status(400).json({ message: 'Select between 1 and 500 valid student records to delete.' });
  }
  const studentIds = [...new Set(student_ids.map((id) => id.trim()))];
  try {
    if (!(await canAccessSection(req.params.sectionId, req.user))) return res.status(403).json({ message: 'Access denied.' });

    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('school_year, semester')
      .eq('id', req.params.sectionId)
      .single();
    if (sectionError) return sendServerError(res, sectionError);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    const { data: activeTerm, error: activeTermError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (activeTermError) return sendServerError(res, activeTermError);
    if (!activeTerm || activeTerm.school_year !== section.school_year || activeTerm.semester !== section.semester) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }

    let selectedStudents = [];
    if (studentIds.length > 0) {
      const { data, error: lookupError } = await supabase
        .from('students')
        .select('id')
        .eq('section_id', req.params.sectionId)
        .in('id', studentIds);
      if (lookupError) return sendServerError(res, lookupError);
      selectedStudents = data || [];
    }
    if ((selectedStudents || []).length !== studentIds.length) {
      return res.status(400).json({ message: 'One or more selected students do not belong to this section.' });
    }

    if (delete_section === true) {
      const { data: roster, error: rosterError } = await supabase
        .from('students')
        .select('id')
        .eq('section_id', req.params.sectionId);
      if (rosterError) return sendServerError(res, rosterError);
      const currentRosterIds = new Set((roster || []).map((student) => String(student.id)));
      if (currentRosterIds.size !== studentIds.length || studentIds.some((id) => !currentRosterIds.has(id))) {
        return res.status(409).json({ message: 'The section roster changed. Refresh the class list and select every student again before deleting the section.' });
      }

      const { data: deletedSection, error: sectionDeleteError } = await supabase
        .from('sections')
        .delete()
        .eq('id', req.params.sectionId)
        .select('id')
        .maybeSingle();
      if (sectionDeleteError) return sendServerError(res, sectionDeleteError);
      if (!deletedSection) return res.status(404).json({ message: 'Section not found.' });
      return res.json({ deleted: studentIds.length, section_deleted: true });
    }

    const { data: deletedStudents, error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('section_id', req.params.sectionId)
      .in('id', studentIds)
      .select('id');
    if (deleteError) return sendServerError(res, deleteError);
    res.json({ deleted: deletedStudents?.length || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/sections/students/:id — delete a single student
router.delete('/students/:id', authorizeRole('admin'), blockAdminRosterManagement, async (req, res) => {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('id, section_id')
      .eq('id', req.params.id)
      .single();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!(await canAccessSection(student.section_id, req.user))) return res.status(403).json({ message: 'Access denied.' });
    const { data: section } = await supabase
      .from('sections')
      .select('school_year, semester')
      .eq('id', student.section_id)
      .single();
    if (!section) return res.status(403).json({ message: 'Unable to verify section access.' });
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
    if (error) return sendServerError(res, error);
    res.json({ message: 'Student removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/sections/:sectionId/students/bulk — bulk add students (import)
router.post('/:sectionId/students/bulk', authorizeRole('admin'), blockAdminRosterManagement, async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Students array is required' });
  }
  try {
    if (!(await canAccessSection(req.params.sectionId, req.user))) return res.status(403).json({ message: 'Access denied.' });
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
      if (typeof student_id !== 'string' || student_id.length !== 11 || !/^\d{2}-\d{4}-\d{3}$/.test(student_id)) {
        skipped.push({ student_id, reason: 'Student ID must use ##-####-### format (e.g. 26-1234-001).' });
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
