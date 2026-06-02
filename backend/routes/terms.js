const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/terms/active — get the active term (no auto-creation)
router.get('/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ message: 'No active term. Contact superadmin.' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/terms/create — create the initial active term (superadmin only)
router.post('/create', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { school_year, semester } = req.body;
    if (!school_year || !semester) {
      return res.status(400).json({ message: 'School year and semester are required.' });
    }

    const { data: existing } = await supabase
      .from('academic_terms')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({ message: 'An active term already exists. End it first.' });
    }

    const { data, error } = await supabase
      .from('academic_terms')
      .insert([{ school_year, semester, is_active: true, is_closed: false }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/terms/end — end the active term, open the specified next term
router.post('/end', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { data: active, error: fetchError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!active) return res.status(400).json({ message: 'No active term found.' });

    const nextSy = req.body.next_school_year;
    const nextSem = req.body.next_semester;
    if (!nextSy || !nextSem) {
      return res.status(400).json({ message: 'Next school year and semester are required.' });
    }

    const { error: closeError } = await supabase
      .from('academic_terms')
      .update({ is_active: false, is_closed: true })
      .eq('id', active.id);
    if (closeError) return res.status(500).json({ error: closeError.message });

    const { data: nextRow, error: upsertError } = await supabase
      .from('academic_terms')
      .upsert(
        { school_year: nextSy, semester: nextSem, is_active: true, is_closed: false },
        { onConflict: 'school_year,semester', ignoreDuplicates: false }
      )
      .select()
      .single();
    if (upsertError) return res.status(500).json({ error: upsertError.message });

    res.json({ closed: active, next: nextRow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/terms — list all terms for archive browsing
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .order('school_year', { ascending: false })
      .order('semester', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
