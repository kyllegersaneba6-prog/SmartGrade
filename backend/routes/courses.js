const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');
const { loadSuperAdminTermSnapshot } = require('../services/superAdminTermArchive');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authenticateToken);

// GET /api/courses — list courses, optionally filtered by department_id
router.get('/', async (req, res) => {
  try {
    const { department_id } = req.query;
    if (req.user.role === 'superadmin') {
      const archive = await loadSuperAdminTermSnapshot(supabase, req);
      if (archive.error) return sendServerError(res, archive.error);
      if (archive.requested && archive.status) return res.status(archive.status).json({ message: archive.message });
      if (archive.requested) {
        const courses = archive.snapshot.courses || [];
        return res.json(department_id ? courses.filter((course) => course.department_id === department_id) : courses);
      }
    }

    let query = supabase
      .from('courses')
      .select('*, departments(name)')
      .order('name', { ascending: true });
    if (req.user.role !== 'superadmin') {
      if (!req.user.department_id) return res.status(403).json({ message: 'A valid department is required.' });
      query = query.eq('department_id', req.user.department_id);
    }
    if (department_id) query = query.eq('department_id', department_id);
    const { data, error } = await query;
    if (error) return sendServerError(res, error);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
