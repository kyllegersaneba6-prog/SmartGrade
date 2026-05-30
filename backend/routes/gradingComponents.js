const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/grading-components — list components for an assignment + term
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

    const { data: components, error: compError } = await supabase
      .from('grading_components')
      .select('*')
      .eq('teacher_assignment_id', assignment_id)
      .eq('term', term)
      .order('sort_order', { ascending: true });
    if (compError) return res.status(500).json({ error: compError.message });

    if (components && components.length > 0) {
      const compIds = components.map(c => c.id);
      const { data: activities, error: actError } = await supabase
        .from('component_activities')
        .select('*')
        .in('component_id', compIds)
        .order('sort_order', { ascending: true });
      if (actError) return res.status(500).json({ error: actError.message });

      const actMap = {};
      (activities || []).forEach(a => {
        if (!actMap[a.component_id]) actMap[a.component_id] = [];
        actMap[a.component_id].push(a);
      });

      const result = components.map(c => ({
        ...c,
        activities: actMap[c.id] || []
      }));
      return res.json(result);
    }

    res.json([]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/grading-components — create a component
router.post('/', authorizeRole('teacher'), async (req, res) => {
  const { teacher_assignment_id, term, name, weight, is_attendance } = req.body;
  if (!teacher_assignment_id || !term || !name || weight === undefined) {
    return res.status(400).json({ message: 'teacher_assignment_id, term, name, and weight are required' });
  }
  try {
    const { data: assign } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('id', teacher_assignment_id)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (!assign) return res.status(403).json({ message: 'Access denied.' });

    const { data: maxOrder } = await supabase
      .from('grading_components')
      .select('sort_order')
      .eq('teacher_assignment_id', teacher_assignment_id)
      .eq('term', term)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxOrder?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('grading_components')
      .insert([{ teacher_assignment_id, term, name, weight, sort_order, is_attendance: is_attendance || false }])
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'A component with this name already exists for this term.' });
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/grading-components/:id — update a component
router.put('/:id', authorizeRole('teacher'), async (req, res) => {
  const { name, weight } = req.body;
  try {
    const { data: comp } = await supabase
      .from('grading_components')
      .select('id, teacher_assignment_id')
      .eq('id', req.params.id)
      .single();
    if (!comp) return res.status(404).json({ message: 'Component not found' });

    const { data: assign } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('id', comp.teacher_assignment_id)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (!assign) return res.status(403).json({ message: 'Access denied.' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (weight !== undefined) updates.weight = weight;

    const { data, error } = await supabase
      .from('grading_components')
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

// POST /api/grading-components/copy-from-prelims — copy components + activities from PRELIMS to another term
router.post('/copy-from-prelims', authorizeRole('teacher'), async (req, res) => {
  const { teacher_assignment_id, target_term } = req.body;
  if (!teacher_assignment_id || !target_term) {
    return res.status(400).json({ message: 'teacher_assignment_id and target_term are required' });
  }
  if (target_term === 'PRELIMS') {
    return res.status(400).json({ message: 'Cannot copy from PRELIMS to PRELIMS' });
  }
  try {
    const { data: assign } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('id', teacher_assignment_id)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (!assign) return res.status(403).json({ message: 'Access denied.' });

    // Fetch PRELIMS components with activities
    const { data: prelimComps } = await supabase
      .from('grading_components')
      .select('*')
      .eq('teacher_assignment_id', teacher_assignment_id)
      .eq('term', 'PRELIMS')
      .order('sort_order', { ascending: true });

    if (!prelimComps || prelimComps.length === 0) {
      return res.status(400).json({ message: 'No PRELIMS components to copy.' });
    }

    // Check target term has no components yet
    const { data: existingComps } = await supabase
      .from('grading_components')
      .select('id')
      .eq('teacher_assignment_id', teacher_assignment_id)
      .eq('term', target_term)
      .limit(1);

    if (existingComps && existingComps.length > 0) {
      return res.status(400).json({ message: `Target term ${target_term} already has components.` });
    }

    // Insert new components (activities not copied — teacher adds them per term)
    const newCompsData = prelimComps.map(c => ({
      teacher_assignment_id,
      term: target_term,
      name: c.name,
      weight: c.weight,
      sort_order: c.sort_order,
      is_attendance: c.is_attendance || false,
    }));

    const { data: insertedComps, error: insertError } = await supabase
      .from('grading_components')
      .insert(newCompsData)
      .select();

    if (insertError) {
      if (insertError.code === '23505') return res.status(400).json({ message: 'A component with this name already exists for this term.' });
      return res.status(500).json({ error: insertError.message });
    }

    const result = insertedComps.map(c => ({ ...c, activities: [] }));
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/grading-components/:id — delete a component (cascades activities + scores)
router.delete('/:id', authorizeRole('teacher'), async (req, res) => {
  try {
    const { data: comp } = await supabase
      .from('grading_components')
      .select('id, teacher_assignment_id')
      .eq('id', req.params.id)
      .single();
    if (!comp) return res.status(404).json({ message: 'Component not found' });

    const { data: assign } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('id', comp.teacher_assignment_id)
      .eq('teacher_id', req.user.id)
      .maybeSingle();
    if (!assign) return res.status(403).json({ message: 'Access denied.' });

    const { error } = await supabase.from('grading_components').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Component deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
