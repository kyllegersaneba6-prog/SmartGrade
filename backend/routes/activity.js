const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { role, department, username } = req.user;
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (role === 'superadmin') {
      const { school_year: archiveSchoolYear, semester: archiveSemester } = req.query;
      if (archiveSchoolYear !== undefined || archiveSemester !== undefined) {
        if (typeof archiveSchoolYear !== 'string' || typeof archiveSemester !== 'string'
          || !archiveSchoolYear.trim() || !archiveSemester.trim()) {
          return res.status(400).json({ message: 'Both school_year and semester are required to view an audit archive.' });
        }

        const { data: archiveTerm, error: archiveTermError } = await supabase
          .from('academic_terms')
          .select('is_closed')
          .eq('school_year', archiveSchoolYear)
          .eq('semester', archiveSemester)
          .maybeSingle();
        if (archiveTermError) return sendServerError(res, archiveTermError);
        if (!archiveTerm) return res.status(404).json({ message: 'Academic term not found.' });
        if (!archiveTerm.is_closed) return res.status(400).json({ message: 'Only closed semesters are available in the audit archive.' });

        query = query
          .eq('archived_school_year', archiveSchoolYear)
          .eq('archived_semester', archiveSemester)
          .not('archived_at', 'is', null);
      } else {
        query = query.is('archived_at', null);
      }
    } else if (role === 'admin') {
      if (!req.user.department_id) return res.status(403).json({ message: 'A valid department is required.' });
      query = query.eq('department', department);
      // Get superadmin usernames to exclude
      const { data: superAdmins } = await supabase
        .from('staff_users')
        .select('username')
        .eq('system_role', 'superadmin');
      const superAdminNames = new Set(superAdmins?.map(u => u.username).filter(Boolean) || []);

      if (department) {
        const { data: deptUsers } = await supabase
          .from('staff_users')
          .select('username')
          .eq('department', department);
        let usernames = deptUsers?.map(u => u.username).filter(Boolean) || [];
        // Exclude superadmin usernames from the department list
        usernames = usernames.filter(u => !superAdminNames.has(u));
        if (usernames.length > 0) {
          query = query.in('user_name', usernames);
        } else {
          query = query.eq('user_name', username);
        }
      } else {
        query = query.eq('user_name', username);
      }

      // Like the Super Admin dashboard, show only this term's activity by
      // default. Archived term headers are attached by the shared API client
      // when an Admin browses a past semester.
      const archiveSchoolYear = req.get('X-View-Term-School-Year');
      const archiveSemester = req.get('X-View-Term-Semester');
      if (archiveSchoolYear || archiveSemester) {
        if (!archiveSchoolYear?.trim() || !archiveSemester?.trim()) {
          return res.status(400).json({ message: 'Both school year and semester are required to view an activity archive.' });
        }

        const { data: archiveTerm, error: archiveTermError } = await supabase
          .from('academic_terms')
          .select('is_closed')
          .eq('school_year', archiveSchoolYear)
          .eq('semester', archiveSemester)
          .maybeSingle();
        if (archiveTermError) return sendServerError(res, archiveTermError);
        if (!archiveTerm) return res.status(404).json({ message: 'Academic term not found.' });
        if (!archiveTerm.is_closed) return res.status(400).json({ message: 'Only closed semesters are available in the activity archive.' });

        query = query
          .eq('archived_school_year', archiveSchoolYear)
          .eq('archived_semester', archiveSemester)
          .not('archived_at', 'is', null);
      } else {
        query = query.is('archived_at', null);
      }
    } else {
      // teachers see nothing (future)
      query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await query;

    if (error) {
      return sendServerError(res, error);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/teacher-export', authorizeRole('teacher'), async (req, res) => {
  const { assignment_id: assignmentId, report_type: reportType, format, term, student_count: studentCount } = req.body || {};
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const reportTerms = {
    'Class Record': ['PRELIMS', 'MIDTERMS', 'PRE-FINALS', 'FINALS'],
    'Grade Summary': ['SEMESTER'],
  };

  if (typeof assignmentId !== 'string' || !uuidPattern.test(assignmentId)) {
    return res.status(400).json({ message: 'A valid assignment_id is required.' });
  }
  if (!Object.hasOwn(reportTerms, reportType) || !reportTerms[reportType].includes(term)) {
    return res.status(400).json({ message: 'A valid report_type and term are required.' });
  }
  if (!['xlsx', 'pdf'].includes(format)) {
    return res.status(400).json({ message: 'format must be xlsx or pdf.' });
  }
  if (!Number.isSafeInteger(studentCount) || studentCount < 0) {
    return res.status(400).json({ message: 'student_count must be a non-negative integer.' });
  }

  try {
    const { data: assignment, error: assignmentError } = await supabase
      .from('teacher_assignments')
      .select('id, teacher_id, section_id, school_year, semester, sections(name), subjects(code)')
      .eq('id', assignmentId)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (assignmentError) return sendServerError(res, assignmentError);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    const { count: rosterCount, error: rosterError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', assignment.section_id);
    if (rosterError) return sendServerError(res, rosterError);
    if (studentCount > (rosterCount || 0)) {
      return res.status(400).json({ message: 'student_count cannot exceed the assigned class roster.' });
    }

    const reportTerm = term === 'SEMESTER' ? 'Semester Summary' : term;
    const details = `Exported ${reportType} (${format.toUpperCase()}) for section "${assignment.sections?.name || 'Unknown'}" / ${assignment.subjects?.code || 'Unknown'}, ${reportTerm}, ${assignment.school_year} ${assignment.semester}; ${studentCount} students.`;
    const { error } = await supabase.from('activity_log').insert([{
      user_name: req.user.username || 'System',
      action: `Teacher ${reportType} Exported`,
      details,
      department: req.user.department || null,
    }]);
    if (error) return sendServerError(res, error);

    return res.status(201).json({ logged: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  // Identity is taken from the verified JWT, never from the request body.
  // Any user_name/department sent by the client is ignored so an
  // authenticated caller cannot forge another user's audit entry.
  const { action, details } = req.body;

  if (!action) {
    return res.status(400).json({ message: 'action is required' });
  }

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .insert([{
        user_name: req.user.username || 'System',
        action,
        details: details || null,
        department: req.user.department || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Activity insert failed:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
