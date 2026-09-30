const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { generateStudentAnalysis } = require('../services/aiService');
const { checkHealth } = require('../services/omniRouteProvider');

const router = express.Router();
router.use(authenticateToken);

// GET /api/ai/status — health check (no secrets leaked)
router.get('/status', authorizeRole('teacher', 'admin', 'superadmin'), async (req, res) => {
  const h = await checkHealth();
  res.json({
    gateway: process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1',
    model: process.env.AI_MODEL || process.env.AI_COMBO_NAME || 'smartgrade pro 3.1',
    reachable: h.ok,
    status: h.status,
  });
});

// POST /api/ai/summarize-student — read-only analysis, no grade writes, no persistence (MVP)
router.post('/summarize-student', authorizeRole('teacher'), async (req, res) => {
  try {
    const result = await generateStudentAnalysis(req.body);
    res.json(result);
  } catch (e) {
    const status = e.status || 500;
    if (status === 502 || status === 504) {
      return res.status(status).json({ message: 'Unable to generate the AI summary right now. Please try again.'});
    }
    console.error('AI summarize error:', e.message);
    res.status(status === 400 ? 400 : 500).json({ message: e.message || 'Server error' });
  }
});

module.exports = router;
