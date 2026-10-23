const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { CATEGORIES, dependencyClosure, tablesForCategories, MAX_FILE_BYTES, FORMAT_VERSION } = require('../services/backupFormat');
const {
  getCategoryCounts, buildBackup, fullValidate, buildPreview,
  applyMerge, applyReplace, applyFull, audit,
} = require('../services/backupService');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

router.use(authenticateToken);
router.use(authorizeRole('superadmin'));

// Simple in-process restore lock (prevents concurrent restores on one instance).
let restoreInProgress = false;

// GET /api/backup/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await getCategoryCounts(supabase);
    res.json({ formatVersion: FORMAT_VERSION, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load backup categories.' });
  }
});

// POST /api/backup/export  { categories:[], password? }
router.post('/export', async (req, res) => {
  try {
    const { categories, password } = req.body || {};
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: 'Select at least one data category.' });
    }
    const unknown = categories.filter((c) => !CATEGORIES.find((x) => x.id === c));
    if (unknown.length) return res.status(400).json({ message: `Unknown categories: ${unknown.join(', ')}` });
    // Guard oversized request early.
    const rawLen = Number(req.headers['content-length'] || 0);
    if (rawLen > MAX_FILE_BYTES) return res.status(413).json({ message: 'Request too large.' });

    const file = await buildBackup(supabase, categories, password || null);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, (m) => (m === 'T' ? '_' : ''));
    const filename = `backup_${stamp}.backup.sg`;
    await audit(supabase, req, 'Backup Exported', `A system backup with ID "${file.manifest.backupId}" was exported. It covers ${file.manifest.totalRecords} records across ${categories.join(', ')}. Encryption is ${password ? 'enabled' : 'disabled'}.`);
    res.json({ filename, file, summary: file.manifest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Export failed.' });
  }
});

function sizeGuard(req, res, next) {
  const rawLen = Number(req.headers['content-length'] || 0);
  if (rawLen > MAX_FILE_BYTES) return res.status(413).json({ message: 'Backup file exceeds 50MB limit.' });
  next();
}

// POST /api/backup/validate { file, password? }
router.post('/validate', sizeGuard, async (req, res) => {
  try {
    const { file, password } = req.body || {};
    if (!file) return res.status(400).json({ message: 'No backup file provided.' });
    const result = fullValidate(file, password);
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    res.json({
      ok: true, manifest: file.manifest, integrity: 'verified',
      tables: file.manifest.tables.map((t) => ({ name: t, count: result.data[t]?.length ?? 0 })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Validation failed.' });
  }
});

// POST /api/backup/preview { file, password?, mode }
router.post('/preview', sizeGuard, async (req, res) => {
  try {
    const { file, password, mode } = req.body || {};
    if (!file) return res.status(400).json({ message: 'No backup file provided.' });
    const m = ['merge', 'replace', 'full'].includes(mode) ? mode : 'merge';
    const result = fullValidate(file, password);
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    const preview = await buildPreview(supabase, file, result.data, m);
    res.json({ ok: true, manifest: file.manifest, preview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Preview failed.' });
  }
});

// POST /api/backup/restore { file, password?, mode, confirm }
router.post('/restore', sizeGuard, async (req, res) => {
  if (restoreInProgress) return res.status(409).json({ message: 'A restore is already in progress.' });
  try {
    const { file, password, mode, confirm } = req.body || {};
    if (!file) return res.status(400).json({ message: 'No backup file provided.' });
    const m = ['merge', 'replace', 'full'].includes(mode) ? mode : 'merge';
    const expected = m === 'full' ? 'FULL RESTORE' : 'CONFIRM';
    if (confirm !== expected) return res.status(400).json({ message: `Type ${expected} to confirm.` });
    const result = fullValidate(file, password);
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });
    if (m === 'full' && file.manifest.selectedCategories.length + (file.manifest.autoIncluded?.length || 0) < CATEGORIES.length - 1) {
      return res.status(400).json({ message: 'Full restore requires a complete backup.' });
    }

    restoreInProgress = true;
    const tables = file.manifest.tables;
    let outcome;
    if (m === 'merge') outcome = await applyMerge(supabase, req, result.data, tables);
    else if (m === 'replace') outcome = await applyReplace(supabase, req, result.data, tables);
    else outcome = await applyFull(supabase, req, result.data);

    await audit(supabase, req, 'Backup Restored', `A system backup with ID "${file.manifest.backupId}" was restored in "${m}" mode. Affected tables: ${tables.join(', ')}.`);
    res.json({ ok: true, mode: m, outcome, manifest: file.manifest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Restore failed.' });
  } finally {
    restoreInProgress = false;
  }
});

module.exports = router;
