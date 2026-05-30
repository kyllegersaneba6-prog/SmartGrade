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

const getCurrentSemester = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 8) return '1st Semester';
  if (month >= 6) return 'Summer';
  return '2nd Semester';
};

const yearLevels = ['1st', '2nd', '3rd', '4th'];
const sectionsByYear = {
  '1st': ['Section A', 'Section B', 'Section C'],
  '2nd': ['Section D', 'Section E', 'Section F'],
  '3rd': ['Section G', 'Section H', 'Section I'],
  '4th': ['Section J', 'Section K', 'Section L'],
};

const allStudentNames = [
  'Juan Santos', 'Maria Reyes', 'Jose Cruz', 'Ana Bautista', 'Pedro Garcia',
  'Luisa Mendoza', 'Carlos Aquino', 'Elena Dela Cruz', 'Miguel Martinez', 'Sofia Lopez',
  'Antonio Villanueva', 'Isabel Gonzales', 'Manuel Fernandez', 'Carmen Torres', 'Ramon Rivera',
  'Teresa Gomez', 'Jorge Diaz', 'Rosa Ramos', 'Eduardo Flores', 'Luz Castillo',
  'Andres Gonzaga', 'Clara Mercado', 'Benigno Aquino', 'Luzviminda Navarro', 'Diego Salvador',
  'Patricia Castro', 'Fernando Alcantara', 'Gloria Macapagal', 'Ricardo Bautista', 'Angela Palma',
  'Gregorio Valdez', 'Lourdes Santiago', 'Emilio Jacinto', 'Natividad Cruz', 'Felipe Aguirre',
  'Leonor Rivera', 'Oscar Delgado', 'Milagros Enriquez', 'Rolando Mendoza', 'Concepcion Vega',
  'Alberto Morales', 'Guadalupe Paredes', 'Crisostomo Ibarra', 'Paulina Gomez', 'Efren Reyes',
  'Salvadora Tirona', 'Maximino Hernandez', 'Visitacion Ramos', 'Rodolfo Soriano', 'Esperanza Luna',
  'Narciso Francisco', 'Aurora Alonzo', 'Tomas Marcelo', 'Rosario Cabrera', 'Hernando Cruz',
  'Fe Manalo', 'Leonardo Adriano', 'Perlita Sandoval', 'Isidro Villanueva', 'Cristina Baquiran',
];

// Static routes MUST come before parameterized routes

// POST /api/sections/seed — seed sample data
router.post('/seed', authorizeRole('admin'), async (req, res) => {
  try {
    const { error: delError } = await supabase
      .from('sections')
      .delete()
      .eq('created_by', req.user.id);
    if (delError) {
      return res.status(400).json({
        message: 'Database setup needed. Run the schema.sql in your Supabase SQL editor to create the sections and students tables.'
      });
    }

    const sectionInserts = [];
    yearLevels.forEach((year) => {
      (sectionsByYear[year] || []).forEach((name) => {
        sectionInserts.push({ name, year_level: year, created_by: req.user.id });
      });
    });

    const { data: sections, error: secError } = await supabase
      .from('sections')
      .insert(sectionInserts)
      .select();

    if (secError) return res.status(500).json({ error: secError.message });

    const studentInserts = [];
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const offset = (si * 5) % (allStudentNames.length - 19);
      for (let i = 0; i < 20; i++) {
        const studentNum = String(i + 1).padStart(2, '0');
        const yearPrefix = { '1st': '2026', '2nd': '2025', '3rd': '2024', '4th': '2023' }[section.year_level];
        studentInserts.push({
          student_id: `${yearPrefix}-${studentNum}${String(Math.floor(Math.random() * 900) + 100)}`,
          student_name: allStudentNames[offset + i],
          section_id: section.id
        });
      }
    }

    const { error: stuError } = await supabase.from('students').insert(studentInserts);
    if (stuError) return res.status(500).json({ error: stuError.message });

    res.status(201).json({
      message: `Seeded ${sections.length} sections with ${studentInserts.length} students`
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/sections/students/:studentId — delete a student (BEFORE param routes)
router.delete('/students/:studentId', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: student } = await supabase
      .from('students')
      .select('section_id')
      .eq('id', req.params.studentId)
      .single();
    if (student) {
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
    }
    const { error } = await supabase.from('students').delete().eq('id', req.params.studentId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Student deleted' });
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
  if (!yearLevels.includes(year_level)) {
    return res.status(400).json({ message: 'Invalid year level' });
  }
  try {
    const { data: activeTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    const checkSy = school_year || getCurrentSchoolYear();
    const checkSem = semester || getCurrentSemester();
    if (!activeTerm || activeTerm.school_year !== checkSy || activeTerm.semester !== checkSem) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }

    // If course_id provided, auto-format name as "ABBREV YEAR-LETTER"
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
    const { data: existing } = await supabase
      .from('sections')
      .select('id')
      .eq('name', resolvedName)
      .eq('course_id', course_id || null)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'A section with this name already exists in this course.' });
    }

    const { data, error } = await supabase
      .from('sections')
      .insert([{ name: resolvedName, year_level, course_id: course_id || null, school_year: school_year || getCurrentSchoolYear(), semester: semester || getCurrentSemester(), created_by: req.user.id }])
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
  const { student_id, student_name } = req.body;
  if (!student_id || !student_name) {
    return res.status(400).json({ message: 'Student ID and name are required' });
  }
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
      .insert([{ student_id, student_name, section_id: req.params.sectionId }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
