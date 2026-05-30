const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/component-scores — get all scores for an assignment + term
router.get('/', async (req, res) => {
  try {
    const { assignment_id, term } = req.query;
    const { role, id } = req.user;

    if (!assignment_id || !term) {
      return res.status(400).json({ message: 'assignment_id and term are required' });
    }

    if (role === 'teacher') {
      const { data: assign } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('id', assignment_id)
        .eq('teacher_id', id)
        .maybeSingle();
      if (!assign) return res.status(403).json({ message: 'Access denied.' });
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

    if (error) return res.status(500).json({ error: error.message });
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

  try {
    // Verify ownership of the first activity's component
    if (scores.length > 0) {
      const { data: act } = await supabase
        .from('component_activities')
        .select('component_id')
        .eq('id', scores[0].activity_id)
        .single();
      if (act) {
        const { data: comp } = await supabase
          .from('grading_components')
          .select('teacher_assignment_id')
          .eq('id', act.component_id)
          .single();
        if (comp) {
          const { data: assign } = await supabase
            .from('teacher_assignments')
            .select('id')
            .eq('id', comp.teacher_assignment_id)
            .eq('teacher_id', req.user.id)
            .maybeSingle();
          if (!assign) return res.status(403).json({ message: 'Access denied.' });
        }
      }
    }

    const { data, error } = await supabase
      .from('component_scores')
      .upsert(
        scores.map(s => ({
          activity_id: s.activity_id,
          student_id: s.student_id,
          score: s.score
        })),
        { onConflict: 'activity_id,student_id', ignoreDuplicates: false }
      )
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
