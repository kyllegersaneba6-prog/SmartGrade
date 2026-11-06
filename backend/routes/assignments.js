const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const { canAccessAssignment, canAccessSection, canAccessCourse, canManageSubject, canManageTeacher, filterAccessible, getRow } = require('../middleware/access');
const { assertActiveTerm } = require('../middleware/termLock');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

const semesters = ['1st Semester', '2nd Semester',  'Summer'];
const blockAdminAssignmentManagement = (req, res, next) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ message: 'Teachers manage class assignments through the My Students PDF import.' });
  }
  return next();
};

const normalizeClassValue = (value) => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const courseAbbreviationFromValue = (value) => {
  const parenthetical = String(value ?? '').match(/\(([A-Za-z0-9.]{2,12})\)\s*$/);
  if (parenthetical) return normalizeClassValue(parenthetical[1]).toUpperCase();
  const compact = normalizeClassValue(value).toUpperCase();
  if (compact.length <= 12) return compact || 'COURSE';
  const words = String(value ?? '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toUpperCase().match(/[A-Z0-9]+/g) || [];
  const initials = words.filter((word) => !['OF', 'IN', 'AND', 'THE', 'FOR'].includes(word))
    .map((word) => word[0]).join('');
  return (initials || compact.slice(0, 12)).slice(0, 12);
};

const yearLevelFromValue = (value) => {
  const number = Number((String(value ?? '').match(/[1-4]/) || [])[0]);
  return ({ 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' })[number] || '';
};

const yearLevelFromSectionValue = (sectionValue, course) => {
  const sectionKey = normalizeClassValue(sectionValue);
  const prefixes = [course?.abbreviation, course?.name]
    .map(normalizeClassValue)
    .filter((value) => value && sectionKey.startsWith(value))
    .sort((a, b) => b.length - a.length);
  if (!prefixes.length) return '';
  const suffix = sectionKey.slice(prefixes[0].length);
  const number = suffix.match(/^([1-4])(?:st|nd|rd|th)?[a-z]{1,3}$/i)?.[1];
  return number ? yearLevelFromValue(number) : '';
};

const courseCodeFromSectionValue = (sectionValue) => {
  const match = normalizeClassValue(sectionValue).match(/^(.+?)([1-4])(?:st|nd|rd|th)?[a-z]{1,3}$/i);
  return match?.[1]?.toUpperCase() || '';
};

const getSectionName = (sectionValue, course, yearLevel) => {
  const compactSection = normalizeClassValue(sectionValue);
  const courseNames = [course.abbreviation, course.name]
    .map(normalizeClassValue).filter(Boolean).sort((a, b) => b.length - a.length);
  const prefix = courseNames.find((value) => compactSection.startsWith(value));
  const suffixWithYear = prefix ? compactSection.slice(prefix.length) : compactSection;
  const yearNumber = digitsOnly(yearLevel);
  const match = suffixWithYear.match(new RegExp(`^${yearNumber}([a-z]{1,3})$`));
  if (!match) return null;
  return `${course.abbreviation.trim().toUpperCase()}-${yearNumber}${match[1].toUpperCase()}`;
};

const digitsOnly = (value) => (String(value ?? '').match(/\d+/) || [''])[0];

// GET /api/assignments — teachers see their own assignments; admins may view
// the class summaries for a teacher account they manage.
router.get('/', async (req, res) => {
  try {
    const { role, id } = req.user;
    const { teacher_id, subject_id, school_year, semester } = req.query;
    if (role === 'admin' && (typeof teacher_id !== 'string' || !teacher_id.trim())) {
      return res.status(403).json({ message: 'A teacher account is required to view class summaries.' });
    }
    let query = supabase.from('teacher_assignments');
    if (role === 'admin') {
      query = query.select('id, teacher_id, section_id, school_year, semester, sections(name, year_level, courses(abbreviation))');
    } else {
      query = query.select('*, sections(name, year_level, courses(abbreviation)), subjects(name, code), teacher:teacher_id(full_name)');
    }

    if (role === 'admin') query = query.eq('teacher_id', teacher_id.trim()).eq('created_by', id);
    if (role === 'teacher') query = query.eq('teacher_id', id);

    if (subject_id && role !== 'admin') query = query.eq('subject_id', subject_id);
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

// POST /api/assignments/import-class-list — teacher provisions a class from its official PDF.
router.post('/import-class-list', authorizeRole('teacher'), async (req, res) => {
  const { students, pdf_metadata: metadata } = req.body || {};
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Select at least one student row to import.' });
  }
  if (students.length > 500) {
    return res.status(400).json({ message: 'A maximum of 500 students can be imported at once.' });
  }
  if (!metadata || typeof metadata !== 'object') {
    return res.status(400).json({ message: 'Class details from the PDF are required.' });
  }

  const subjectCode = typeof metadata.subject_code === 'string' ? metadata.subject_code.trim() : '';
  const subjectName = typeof metadata.descriptive_title === 'string' ? metadata.descriptive_title.trim() : '';
  const sectionValue = typeof metadata.section === 'string' ? metadata.section.trim() : '';
  const pdfCourse = typeof metadata.course === 'string' ? metadata.course.trim() : '';
  let yearLevel = yearLevelFromValue(metadata.year_level);
  const schoolYear = typeof metadata.school_year === 'string' ? metadata.school_year.trim() : '';
  const semester = typeof metadata.semester === 'string' ? metadata.semester.trim() : '';
  if (!subjectCode || !subjectName || !sectionValue || !pdfCourse || !normalizeClassValue(pdfCourse) || !yearLevel || !schoolYear || !semesters.includes(semester)) {
    return res.status(400).json({ message: 'The PDF must include a subject, section, course, year level, semester, and school year.' });
  }
  if (subjectCode.length > 40 || subjectName.length > 200 || sectionValue.length > 120 || pdfCourse.length > 120 || schoolYear.length > 20) {
    return res.status(400).json({ message: 'One or more class details exceed the allowed length.' });
  }

  const skipped = [];
  const seenIds = new Set();
  const candidates = [];
  students.forEach((student, index) => {
    const sourceRow = Number.isInteger(student?.row_num) && student.row_num > 0 ? student.row_num : index + 1;
    const studentId = typeof student?.student_id === 'string' ? student.student_id.trim() : '';
    const firstName = typeof student?.first_name === 'string' ? student.first_name.trim() : '';
    const lastName = typeof student?.last_name === 'string' ? student.last_name.trim() : '';
    const mi = typeof student?.mi === 'string' ? student.mi.trim().toUpperCase().replace(/[.\s]+$/g, '') : '';
    const rawGender = typeof student?.gender === 'string' ? student.gender.trim().toLowerCase() : '';
    const gender = rawGender === 'm' || rawGender === 'male' ? 'Male'
      : rawGender === 'f' || rawGender === 'female' ? 'Female' : '';

    if (!/^\d{2}-\d{4}-\d{3}$/.test(studentId)) {
      skipped.push({ student_id: studentId, row: sourceRow, reason: 'Student ID must use ##-####-### format.' });
      return;
    }
    if (!firstName || !lastName || !gender) {
      skipped.push({ student_id: studentId, row: sourceRow, reason: 'First name, last name, and a valid gender are required.' });
      return;
    }
    if (firstName.length > 120 || lastName.length > 120 || mi.length > 20) {
      skipped.push({ student_id: studentId, row: sourceRow, reason: 'A name field exceeds the allowed length.' });
      return;
    }
    if (seenIds.has(studentId)) {
      skipped.push({ student_id: studentId, row: sourceRow, reason: 'Duplicate ID in the uploaded PDF.' });
      return;
    }
    seenIds.add(studentId);
    candidates.push({
      row: sourceRow,
      student_id: studentId,
      student_name: [lastName, `${firstName}${mi ? ` ${mi}.` : ''}`].join(', '),
      first_name: firstName,
      last_name: lastName,
      mi: mi || null,
      gender,
    });
  });
  if (!candidates.length) {
    return res.status(400).json({ message: 'No valid student rows were selected.', skipped });
  }

  const created = { course: null, section: null, subject: null, assignment: null };
  const cleanupCreatedRows = async () => {
    if (created.assignment) await supabase.from('teacher_assignments').delete().eq('id', created.assignment);
    if (created.subject) await supabase.from('subjects').delete().eq('id', created.subject);
    if (created.section) await supabase.from('sections').delete().eq('id', created.section);
    if (created.course) await supabase.from('courses').delete().eq('id', created.course);
  };
  const reject = async (status, message, extra = {}) => {
    await cleanupCreatedRows();
    return res.status(status).json({ message, ...extra });
  };

  try {
    if (!(await assertActiveTerm(res, { schoolYear, semester }))) return;

    const teacher = await getRow('staff_users', req.user.id, 'id, system_role, department, created_by');
    if (!teacher || teacher.system_role !== 'teacher' || !req.user.department_id) {
      return res.status(403).json({ message: 'A valid teacher account and department are required.' });
    }
    const { data: courses, error: coursesError } = await supabase.from('courses')
      .select('id, name, abbreviation, department_id')
      .eq('department_id', req.user.department_id);
    if (coursesError) return sendServerError(res, coursesError);
    const sectionCourseCode = courseCodeFromSectionValue(sectionValue);
    const pdfCourseKey = normalizeClassValue(pdfCourse);
    const courseAbbreviation = sectionCourseCode && sectionCourseCode.length <= 12
      ? sectionCourseCode
      : courseAbbreviationFromValue(pdfCourse);
    const sectionKey = normalizeClassValue(sectionValue);
    const sectionPrefixCourse = (courses || [])
      .filter((course) => [course.abbreviation, course.name].some((value) => {
        const courseKey = normalizeClassValue(value);
        return courseKey && sectionKey.startsWith(courseKey);
      }))
      .sort((a, b) => Math.max(normalizeClassValue(b.abbreviation).length, normalizeClassValue(b.name).length)
        - Math.max(normalizeClassValue(a.abbreviation).length, normalizeClassValue(a.name).length))[0];
    const exactSectionCourse = sectionCourseCode && (courses || []).find((course) => (
      normalizeClassValue(course.abbreviation) === normalizeClassValue(sectionCourseCode)
      || normalizeClassValue(course.name) === normalizeClassValue(sectionCourseCode)
    ));
    let matchingCourse = sectionPrefixCourse || exactSectionCourse || (!sectionCourseCode && (courses || []).find((course) => (
      normalizeClassValue(course.abbreviation) === pdfCourseKey
      || normalizeClassValue(course.name) === pdfCourseKey
      || normalizeClassValue(course.abbreviation) === normalizeClassValue(courseAbbreviation)
      || normalizeClassValue(course.name) === normalizeClassValue(courseAbbreviation)
    )));
    if (!matchingCourse) {
      const { data, error } = await supabase.from('courses')
        .insert([{ name: courseAbbreviation, abbreviation: courseAbbreviation, department_id: req.user.department_id }])
        .select('id, name, abbreviation, department_id')
        .single();
      if (error?.code === '23505') {
        const { data: refreshedCourses, error: refreshError } = await supabase.from('courses')
          .select('id, name, abbreviation, department_id')
          .eq('department_id', req.user.department_id);
        if (refreshError) return sendServerError(res, refreshError);
        matchingCourse = (refreshedCourses || []).find((course) => (
          normalizeClassValue(course.abbreviation) === normalizeClassValue(courseAbbreviation)
          || normalizeClassValue(course.name) === normalizeClassValue(courseAbbreviation)
        ));
      } else if (error) {
        return sendServerError(res, error);
      } else {
        matchingCourse = data;
        created.course = data.id;
      }
    }
    if (!matchingCourse || !(await canAccessCourse(matchingCourse.id, req.user))) {
      return reject(403, 'The course from this PDF could not be matched to your department.');
    }

    yearLevel = yearLevelFromSectionValue(sectionValue, matchingCourse) || yearLevel;

    const sectionName = getSectionName(sectionValue, matchingCourse, yearLevel);
    if (!sectionName) {
      return reject(400, 'The PDF section must include a section letter and match its course and year level.');
    }
    const ownerId = teacher.created_by || teacher.id;
    const { data: sectionRows, error: sectionLookupError } = await supabase.from('sections')
      .select('id, name, course_id, year_level, school_year, semester, created_by')
      .eq('course_id', matchingCourse.id)
      .eq('school_year', schoolYear);
    if (sectionLookupError) return reject(500, 'Could not check the class section.');
    let section = (sectionRows || []).find((row) => row.semester === semester
      && normalizeClassValue(row.name) === normalizeClassValue(sectionName));
    if (section && section.year_level !== yearLevel) {
      return reject(409, 'A section with this name already exists with a different year level.');
    }
    if (!section) {
      const { data, error } = await supabase.from('sections').insert([{
        name: sectionName,
        course_id: matchingCourse.id,
        year_level: yearLevel,
        school_year: schoolYear,
        semester,
        created_by: ownerId,
      }]).select('id, name, course_id, year_level, school_year, semester, created_by').single();
      if (error) {
        if (error.code === '23505') {
          const { data: duplicate } = await supabase.from('sections').select('id, name, course_id, year_level, school_year, semester, created_by')
            .eq('course_id', matchingCourse.id).eq('name', sectionName).eq('school_year', schoolYear).eq('semester', semester).maybeSingle();
          if (duplicate) section = duplicate;
          else return reject(500, 'Could not create the class section.');
        } else return reject(500, 'Could not create the class section.');
      } else {
        section = data;
        created.section = data.id;
      }
    }

    const { data: subjectRows, error: subjectLookupError } = await supabase.from('subjects')
      .select('id, name, code, year_level, school_year, semester, course_id, created_by')
      .eq('course_id', matchingCourse.id)
      .eq('year_level', yearLevel);
    if (subjectLookupError) return reject(500, 'Could not check existing subjects.');
    let subject = (subjectRows || []).find((row) => normalizeClassValue(row.code) === normalizeClassValue(subjectCode)
      && (!row.school_year || row.school_year === schoolYear)
      && (!row.semester || row.semester === semester));
    if (subject && normalizeClassValue(subject.name) !== normalizeClassValue(subjectName)) {
      return reject(409, `Subject code ${subjectCode} already exists with a different descriptive title.`);
    }
    if (!subject) {
      const { data, error } = await supabase.from('subjects').insert([{
        name: subjectName,
        code: subjectCode,
        year_level: yearLevel,
        school_year: schoolYear,
        semester,
        course_id: matchingCourse.id,
        created_by: ownerId,
      }]).select('id, name, code, year_level, school_year, semester, course_id, created_by').single();
      if (error) return reject(500, 'Could not create the subject from the PDF.');
      subject = data;
      created.subject = data.id;
    }

    const { data: existingAssignments, error: assignmentLookupError } = await supabase.from('teacher_assignments')
      .select('id, teacher_id')
      .eq('section_id', section.id)
      .eq('subject_id', subject.id)
      .eq('school_year', schoolYear)
      .eq('semester', semester)
      .limit(2);
    if (assignmentLookupError) return reject(500, 'Could not check the teacher assignment.');
    if ((existingAssignments || []).some((row) => row.teacher_id !== req.user.id)) {
      return reject(409, 'This subject and section are already assigned to another teacher for this term.');
    }
    let assignment = (existingAssignments || []).find((row) => row.teacher_id === req.user.id);
    if (!assignment) {
      const { data, error } = await supabase.from('teacher_assignments').insert([{
        teacher_id: req.user.id,
        section_id: section.id,
        subject_id: subject.id,
        school_year: schoolYear,
        semester,
        created_by: ownerId,
      }]).select('id, teacher_id, section_id, subject_id, school_year, semester').single();
      if (error) {
        if (error.code === '23505') return reject(409, 'This class assignment already exists. Refresh your sections and try again.');
        return reject(500, 'Could not create the teacher assignment.');
      }
      assignment = data;
      created.assignment = data.id;
    }

    const studentRecords = candidates.map(({ row, ...record }) => ({ ...record, section_id: section.id }));
    const { data: added, error: studentError } = await supabase.from('students')
      .upsert(studentRecords, { onConflict: 'section_id,student_id', ignoreDuplicates: true })
      .select('*');
    if (studentError) return reject(500, 'The student roster could not be saved; changes from this import were rolled back.');

    const addedIds = new Set((added || []).map((student) => student.student_id));
    candidates.forEach((candidate) => {
      if (!addedIds.has(candidate.student_id)) {
        skipped.push({ student_id: candidate.student_id, row: candidate.row, reason: 'Student ID already exists in this section.' });
      }
    });
    return res.status(created.assignment ? 201 : 200).json({
      assignment,
      section,
      subject,
      added: added || [],
      skipped,
    });
  } catch (err) {
    console.error(err);
    await cleanupCreatedRows();
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assignments/:assignmentId/students/bulk — teacher imports a PDF roster
router.post('/:assignmentId/students/bulk', authorizeRole('teacher'), async (req, res) => {
  const { students, pdf_metadata } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Students array is required.' });
  }
  if (students.length > 500) {
    return res.status(400).json({ message: 'A maximum of 500 students can be imported at once.' });
  }
  if (!pdf_metadata || typeof pdf_metadata !== 'object') {
    return res.status(400).json({ message: 'Class details from the PDF are required.' });
  }

  try {
    if (!(await canAccessAssignment(req.params.assignmentId, req.user))) {
      return res.status(403).json({ message: 'You can only import students to your own assigned classes.' });
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('teacher_assignments')
      .select('id, teacher_id, section_id, school_year, semester, sections(id, name, year_level, school_year, semester, courses(abbreviation)), subjects(name, code)')
      .eq('id', req.params.assignmentId)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (assignmentError) return sendServerError(res, assignmentError);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    if (!(await assertActiveTerm(res, { schoolYear: assignment.school_year, semester: assignment.semester }))) return;
    const section = assignment.sections;
    if (!section || section.school_year !== assignment.school_year || section.semester !== assignment.semester) {
      return res.status(403).json({ message: 'The assigned section does not match this active term.' });
    }

    const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mismatches = [];
    const compare = (label, source, expected, normalizer = normalize) => {
      if (source == null || String(source).trim() === '' || !expected) return;
      if (normalizer(source) !== normalizer(expected)) mismatches.push(label);
    };
    compare('Subject Code', pdf_metadata.subject_code, assignment.subjects?.code);
    compare('Descriptive Title', pdf_metadata.descriptive_title, assignment.subjects?.name);
    compare('Section', pdf_metadata.section, section.name);
    compare('Course', pdf_metadata.course, section.courses?.abbreviation);
    compare('Year Level', pdf_metadata.year_level, section.year_level, (value) => (String(value).match(/\d+/) || [''])[0]);
    if (mismatches.length) {
      return res.status(400).json({
        message: `PDF details do not match the selected assignment: ${mismatches.join(', ')}.`,
        mismatches,
      });
    }

    const skipped = [];
    const seenIds = new Set();
    const candidates = [];
    students.forEach((student, index) => {
      const sourceRow = Number.isInteger(student?.row_num) && student.row_num > 0 ? student.row_num : index + 1;
      const studentId = typeof student?.student_id === 'string' ? student.student_id.trim() : '';
      const firstName = typeof student?.first_name === 'string' ? student.first_name.trim() : '';
      const lastName = typeof student?.last_name === 'string' ? student.last_name.trim() : '';
      const mi = typeof student?.mi === 'string' ? student.mi.trim().toUpperCase() : '';
      const rawGender = typeof student?.gender === 'string' ? student.gender.trim().toLowerCase() : '';
      const gender = rawGender === 'm' || rawGender === 'male' ? 'Male'
        : rawGender === 'f' || rawGender === 'female' ? 'Female' : '';

      if (!/^\d{2}-\d{4}-\d{3}$/.test(studentId)) {
        skipped.push({ student_id: studentId, row: sourceRow, reason: 'Student ID must use ##-####-### format.' });
        return;
      }
      if (!firstName || !lastName || !gender) {
        skipped.push({ student_id: studentId, row: sourceRow, reason: 'First name, last name, and a valid gender are required.' });
        return;
      }
      if (firstName.length > 120 || lastName.length > 120 || mi.length > 20) {
        skipped.push({ student_id: studentId, row: sourceRow, reason: 'A name field exceeds the allowed length.' });
        return;
      }
      if (seenIds.has(studentId)) {
        skipped.push({ student_id: studentId, row: sourceRow, reason: 'Duplicate ID in the uploaded PDF.' });
        return;
      }
      seenIds.add(studentId);
      candidates.push({
        student_id: studentId,
        student_name: [lastName, `${firstName}${mi ? ` ${mi}.` : ''}`].join(', '),
        first_name: firstName,
        last_name: lastName,
        mi: mi || null,
        gender,
        section_id: assignment.section_id,
      });
      candidates[candidates.length - 1].source_row = sourceRow;
    });

    if (candidates.length === 0) return res.json({ added: [], skipped });

    const sourceRows = new Map(candidates.map((candidate) => [candidate.student_id, candidate.source_row]));
    const records = candidates.map(({ source_row, ...record }) => record);
    const { data: added, error } = await supabase
      .from('students')
      .upsert(records, { onConflict: 'section_id,student_id', ignoreDuplicates: true })
      .select('*');
    if (error) return sendServerError(res, error);

    const addedIds = new Set((added || []).map((student) => student.student_id));
    candidates.forEach((candidate) => {
      if (!addedIds.has(candidate.student_id)) {
        skipped.push({ student_id: candidate.student_id, row: sourceRows.get(candidate.student_id), reason: 'Student ID already exists in this section.' });
      }
    });
    res.json({ added: added || [], skipped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assignments — create assignment
router.post('/', authorizeRole('admin'), blockAdminAssignmentManagement, async (req, res) => {
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
router.delete('/:id', authorizeRole('admin'), blockAdminAssignmentManagement, async (req, res) => {
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
