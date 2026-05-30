const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

async function verifyAssignmentOwnership(assignmentId, userId) {
  const { data } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('id', assignmentId)
    .eq('teacher_id', userId)
    .maybeSingle();
  return !!data;
}

// GET /api/attendance — fetch attendance for an assignment (optional date & term filter)
router.get('/', async (req, res) => {
  try {
    const { teacher_assignment_id, date, term } = req.query;
    if (!teacher_assignment_id) {
      return res.status(400).json({ message: 'teacher_assignment_id is required' });
    }
    let query = supabase
      .from('attendance')
      .select('*, students(student_id, student_name)')
      .eq('teacher_assignment_id', teacher_assignment_id);
    if (date) query = query.eq('date', date);
    if (term) query = query.eq('term', term);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/dates — list distinct dates with attendance for an assignment
router.get('/dates', async (req, res) => {
  try {
    const { teacher_assignment_id, term } = req.query;
    if (!teacher_assignment_id) {
      return res.status(400).json({ message: 'teacher_assignment_id is required' });
    }
    let query = supabase
      .from('attendance')
      .select('date')
      .eq('teacher_assignment_id', teacher_assignment_id)
      .order('date', { ascending: true });
    if (term) query = query.eq('term', term);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    const unique = [...new Set(data.map(r => r.date))];
    res.json(unique.map(d => ({ date: d })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/attendance/bulk — bulk upsert attendance records for a date
router.post('/bulk', authorizeRole('teacher'), async (req, res) => {
  try {
    const { teacher_assignment_id, date, records, session, type, term } = req.body;
    if (!teacher_assignment_id || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'teacher_assignment_id, date, and records[] are required' });
    }

    const owned = await verifyAssignmentOwnership(teacher_assignment_id, req.user.id);
    if (!owned) return res.status(403).json({ message: 'Access denied.' });

    const rows = records.map((r) => ({
      teacher_assignment_id,
      student_id: r.student_id,
      date,
      score: r.score ?? 0,
      session: session || null,
      type: type || null,
      term: term || null,
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'teacher_assignment_id,student_id,date,session,type,term', ignoreDuplicates: false })
      .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/attendance/computed-scores — per-student attendance totals for an assignment (optional term filter)
router.get('/computed-scores', async (req, res) => {
  try {
    const { teacher_assignment_id, term } = req.query;
    if (!teacher_assignment_id) {
      return res.status(400).json({ message: 'teacher_assignment_id is required' });
    }

    const owned = await verifyAssignmentOwnership(teacher_assignment_id, req.user.id);
    if (!owned) return res.status(403).json({ message: 'Access denied.' });

    let query = supabase
      .from('attendance')
      .select('student_id, score, date, session, type')
      .eq('teacher_assignment_id', teacher_assignment_id);
    if (term) query = query.eq('term', term);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const dateKeys = new Set();
    const scores = {};
    (data || []).forEach((r) => {
      dateKeys.add(`${r.date}|${r.session || ''}|${r.type || ''}`);
      if (!scores[r.student_id]) scores[r.student_id] = 0;
      scores[r.student_id] += r.score ?? 0;
    });

    const maxTotal = dateKeys.size * 2;
    res.json({ max_total: maxTotal, scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/attendance/date — delete all attendance records for an assignment+date+session+type+term
router.delete('/date', authorizeRole('teacher'), async (req, res) => {
  try {
    const { teacher_assignment_id, date, session, type, term } = req.body;
    if (!teacher_assignment_id || !date) {
      return res.status(400).json({ message: 'teacher_assignment_id and date are required' });
    }

    const owned = await verifyAssignmentOwnership(teacher_assignment_id, req.user.id);
    if (!owned) return res.status(403).json({ message: 'Access denied.' });

    let query = supabase
      .from('attendance')
      .delete()
      .eq('teacher_assignment_id', teacher_assignment_id)
      .eq('date', date);
    if (session) query = query.eq('session', session);
    if (type) query = query.eq('type', type);
    if (term) query = query.eq('term', term);
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Attendance records deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
