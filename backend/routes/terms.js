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

const nextTerm = (sy, sem) => {
  const order = ['1st Semester', '2nd Semester', 'Summer'];
  const idx = order.indexOf(sem);
  if (idx < order.length - 1) return { school_year: sy, semester: order[idx + 1] };
  const parts = sy.split('-').map(Number);
  return { school_year: `${parts[0] + 1}-${parts[1] + 1}`, semester: '1st Semester' };
};

// GET /api/terms/active — get the active term (auto-create if none exists)
router.get('/active', async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) {
      const sy = getCurrentSchoolYear();
      const sem = getCurrentSemester();
      const { data: created, error: insertError } = await supabase
        .from('academic_terms')
        .insert([{ school_year: sy, semester: sem, is_active: true }])
        .select()
        .single();
      if (insertError) return res.status(500).json({ error: insertError.message });
      data = created;
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/terms/end — end the active term, open the specified next term
router.post('/end', authorizeRole('admin'), async (req, res) => {
  try {
    const { data: active, error: fetchError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    if (!active) return res.status(400).json({ message: 'No active term found.' });

    const nextSy = req.body.next_school_year || nextTerm(active.school_year, active.semester).school_year;
    const nextSem = req.body.next_semester || nextTerm(active.school_year, active.semester).semester;

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
