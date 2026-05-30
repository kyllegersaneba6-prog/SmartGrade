const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

async function verifyOwnership(componentId, userId) {
  const { data: comp } = await supabase
    .from('grading_components')
    .select('id, teacher_assignment_id')
    .eq('id', componentId)
    .single();
  if (!comp) return null;
  const { data: assign } = await supabase
    .from('teacher_assignments')
    .select('id')
    .eq('id', comp.teacher_assignment_id)
    .eq('teacher_id', userId)
    .maybeSingle();
  if (!assign) return null;
  return comp;
}

// GET /api/component-activities — list activities for a component
router.get('/', async (req, res) => {
  try {
    const { component_id } = req.query;
    if (!component_id) return res.status(400).json({ message: 'component_id is required' });
    const { data, error } = await supabase
      .from('component_activities')
      .select('*')
      .eq('component_id', component_id)
      .order('sort_order', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/component-activities — create an activity
router.post('/', authorizeRole('teacher'), async (req, res) => {
  const { component_id, name, max_score } = req.body;
  if (!component_id || !name) {
    return res.status(400).json({ message: 'component_id and name are required' });
  }
  try {
    const comp = await verifyOwnership(component_id, req.user.id);
    if (!comp) return res.status(403).json({ message: 'Access denied.' });

    const { data: maxOrder } = await supabase
      .from('component_activities')
      .select('sort_order')
      .eq('component_id', component_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxOrder?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('component_activities')
      .insert([{ component_id, name, max_score: max_score || 100, sort_order }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/component-activities/:id — update an activity
router.put('/:id', authorizeRole('teacher'), async (req, res) => {
  const { name, max_score } = req.body;
  try {
    const { data: act } = await supabase
      .from('component_activities')
      .select('id, component_id')
      .eq('id', req.params.id)
      .single();
    if (!act) return res.status(404).json({ message: 'Activity not found' });

    const comp = await verifyOwnership(act.component_id, req.user.id);
    if (!comp) return res.status(403).json({ message: 'Access denied.' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (max_score !== undefined) updates.max_score = max_score;

    const { data, error } = await supabase
      .from('component_activities')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/component-activities/:id — delete an activity (cascades scores)
router.delete('/:id', authorizeRole('teacher'), async (req, res) => {
  try {
    const { data: act } = await supabase
      .from('component_activities')
      .select('id, component_id')
      .eq('id', req.params.id)
      .single();
    if (!act) return res.status(404).json({ message: 'Activity not found' });

    const comp = await verifyOwnership(act.component_id, req.user.id);
    if (!comp) return res.status(403).json({ message: 'Access denied.' });

    const { error } = await supabase.from('component_activities').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
