const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
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
    if (error) return sendServerError(res, error);
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
    if (error) {
      const dbMessage = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
      if (error.code === '23505') {
        if (/one_active/i.test(dbMessage)) {
          return res.status(400).json({ message: 'An active term already exists. End it first.' });
        }
        return res.status(400).json({ message: 'A term with this school year and semester already exists.' });
      }
      return sendServerError(res, error);
    }
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/terms/end — end the active term, open the specified next term
router.post('/end', authorizeRole('superadmin'), async (req, res) => {
  try {
    const { next_school_year: nextSy, next_semester: nextSem, superadmin_password: password } = req.body || {};
    if (!nextSy || !nextSem) {
      return res.status(400).json({ message: 'Next school year and semester are required.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Enter your superadmin password to end the semester.' });
    }

    const { data: account, error: accountError } = await supabase
      .from('staff_users')
      .select('password, system_role')
      .eq('id', req.user.id)
      .maybeSingle();
    if (accountError) return sendServerError(res, accountError);
    if (!account || account.system_role !== 'superadmin' || typeof account.password !== 'string') {
      return res.status(403).json({ message: 'Could not verify the superadmin account.' });
    }

    const passwordMatches = await bcrypt.compare(password, account.password);
    if (!passwordMatches) {
      return res.status(403).json({ message: 'The superadmin password is incorrect.' });
    }

    const { data: active, error: fetchError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (fetchError) return sendServerError(res, fetchError);
    if (!active) return res.status(400).json({ message: 'No active term found.' });

    const { error: closeError } = await supabase
      .from('academic_terms')
      .update({ is_active: false, is_closed: true })
      .eq('id', active.id);
    if (closeError) return sendServerError(res, closeError);

    const { data: nextRow, error: upsertError } = await supabase
      .from('academic_terms')
      .upsert(
        { school_year: nextSy, semester: nextSem, is_active: true, is_closed: false },
        { onConflict: 'school_year,semester', ignoreDuplicates: false }
      )
      .select()
      .single();
    if (upsertError) {
      const dbMessage = `${upsertError.message || ''} ${upsertError.details || ''} ${upsertError.hint || ''}`;
      if (upsertError.code === '23505' && /one_active/i.test(dbMessage)) {
        return res.status(400).json({ message: 'Another term is already active. Refresh and try again.' });
      }
      return sendServerError(res, upsertError);
    }

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
    if (error) return sendServerError(res, error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
