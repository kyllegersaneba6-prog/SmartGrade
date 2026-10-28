const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const { canAccessAssignment } = require('../middleware/access');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/component-scores — get all scores for an assignment + term
router.get('/', async (req, res) => {
  try {
    const { assignment_id, term } = req.query;

    if (!assignment_id || !term) {
      return res.status(400).json({ message: 'assignment_id and term are required' });
    }

    if (!(await canAccessAssignment(assignment_id, req.user))) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Get all activity IDs for this assignment + term
    const { data: components } = await supabase
      .from('grading_components')
      .select('id')
      .eq('teacher_assignment_id', assignment_id)
      .eq('term', term);

    if (!components || components.length === 0) return res.json([]);

    const componentIds = components.map(c => c.id);

    const { data: activities } = await supabase
      .from('component_activities')
      .select('id')
      .in('component_id', componentIds);

    if (!activities || activities.length === 0) return res.json([]);

    const activityIds = activities.map(a => a.id);

    const { data, error } = await supabase
      .from('component_scores')
      .select('*')
      .in('activity_id', activityIds);

    if (error) return sendServerError(res, error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/component-scores/bulk — upsert scores in batch
router.post('/bulk', authorizeRole('teacher'), async (req, res) => {
  const { scores } = req.body;
  if (!scores || !Array.isArray(scores)) {
    return res.status(400).json({ message: 'scores array is required' });
  }
  if (scores.length === 0) return res.json([]);
  if (scores.some(s => !s.activity_id || !s.student_id)) {
    return res.status(400).json({ message: 'Every score requires activity_id and student_id' });
  }

  try {
    // Resolve every row before writing anything: activity -> component ->
    // assignment. The whole batch is rejected if any row is outside the
    // caller's scope, so a mixed payload cannot slip through.
    const activityIds = [...new Set(scores.map(s => s.activity_id))];

    const { data: activities, error: actError } = await supabase
      .from('component_activities')
      .select('id, component_id, name, max_score, is_attendance')
      .in('id', activityIds);
    if (actError) {
      console.error('Bulk score activity lookup failed:', actError.message);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!activities || activities.length !== activityIds.length) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (activities.some(activity => activity.is_attendance)) {
      return res.status(400).json({ message: 'Attendance scores are computed from attendance records and cannot be entered manually.' });
    }

    const activityById = new Map(activities.map(a => [a.id, a]));

    const componentIds = [...new Set(activities.map(a => a.component_id))];

    const { data: components, error: compError } = await supabase
      .from('grading_components')
      .select('id, teacher_assignment_id')
      .in('id', componentIds);
    if (compError) {
      console.error('Bulk score component lookup failed:', compError.message);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!components || components.length !== componentIds.length) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const assignmentIds = [...new Set(components.map(c => c.teacher_assignment_id))];

    const { data: assignments, error: assignError } = await supabase
      .from('teacher_assignments')
      .select('id, school_year, semester')
      .in('id', assignmentIds)
      .eq('teacher_id', req.user.id);
    if (assignError) {
      console.error('Bulk score assignment lookup failed:', assignError.message);
      return res.status(500).json({ message: 'Server error' });
    }
    if (!assignments || assignments.length !== assignmentIds.length) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { data: activeTerm, error: termError } = await supabase
      .from('academic_terms')
      .select('school_year, semester')
      .eq('is_active', true)
      .maybeSingle();
    if (termError) {
      console.error('Bulk score term lookup failed:', termError.message);
      return res.status(500).json({ message: 'Server error' });
    }
    if (
      !activeTerm ||
      assignments.some(a => a.school_year !== activeTerm.school_year || a.semester !== activeTerm.semester)
    ) {
      return res.status(403).json({ message: 'This term is closed. No modifications allowed.' });
    }

    // Range validation runs only after every row is confirmed to be in scope,
    // so an out-of-scope activity id cannot leak its name or max_score.
    const invalidScore = scores.find((s) => {
      if (s.score === null || s.score === undefined) return false;
      const activity = activityById.get(s.activity_id);
      const score = Number(s.score);
      return !activity || !Number.isFinite(score) || score < 0 || score > Number(activity.max_score);
    });
    if (invalidScore) {
      const activity = activityById.get(invalidScore.activity_id);
      return res.status(400).json({
        message: `Score for ${activity?.name || 'activity'} must be between 0 and ${activity?.max_score ?? 'its maximum'}.`,
      });
    }

    const { data, error } = await supabase
      .from('component_scores')
      .upsert(
        scores.map(s => ({
          activity_id: s.activity_id,
          student_id: s.student_id,
          score: s.score === null || s.score === undefined ? null : Number(s.score)
        })),
        { onConflict: 'activity_id,student_id', ignoreDuplicates: false }
      )
      .select();

    if (error) {
      console.error('Bulk score upsert failed:', error.message);
      if (error.code === '23514') {
        return res.status(400).json({ message: 'Score must be between 0 and the activity maximum.' });
      }
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
