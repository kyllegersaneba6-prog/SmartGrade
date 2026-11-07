const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_EXPORT_SETTINGS = Object.freeze({
  program_head_bsit: 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  program_head_bscs: 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  dean_cict: 'MAE B. LODANA, Ph.D.',
});
const SETTINGS_COLUMNS = 'department_id, program_head_bsit, program_head_bscs, dean_cict, updated_at';
const SETTING_FIELDS = ['program_head_bsit', 'program_head_bscs', 'dean_cict'];
const SETTING_LABELS = {
  program_head_bsit: 'Program Head, BSIT',
  program_head_bscs: 'Program Head, BSCS',
  dean_cict: 'Dean, CICT',
};

router.use(authenticateToken);

router.get('/', authorizeRole('admin', 'teacher'), async (req, res) => {
  if (!req.user.department_id) {
    return res.status(403).json({ message: 'A valid department is required to load export settings.' });
  }

  try {
    const { data, error } = await supabase
      .from('department_export_settings')
      .select(SETTINGS_COLUMNS)
      .eq('department_id', req.user.department_id)
      .maybeSingle();
    if (error) return sendServerError(res, error);
    return res.json({ department_id: req.user.department_id, ...DEFAULT_EXPORT_SETTINGS, ...data });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.put('/', authorizeRole('admin'), async (req, res) => {
  if (!req.user.department_id) {
    return res.status(403).json({ message: 'A valid department is required to update export settings.' });
  }

  const settings = {};
  for (const field of SETTING_FIELDS) {
    const value = req.body?.[field];
    if (typeof value !== 'string') {
      return res.status(400).json({ message: 'Enter a name for each export signatory.' });
    }
    const normalized = value.trim();
    if (!normalized || normalized.length > 160 || /[\r\n\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) {
      return res.status(400).json({ message: 'Signatory names must be 1–160 characters on a single line.' });
    }
    settings[field] = normalized;
  }

  try {
    const { data: previousSettingsRow, error: previousSettingsError } = await supabase
      .from('department_export_settings')
      .select(SETTING_FIELDS.join(', '))
      .eq('department_id', req.user.department_id)
      .maybeSingle();
    if (previousSettingsError) return sendServerError(res, previousSettingsError);

    const previousSettings = { ...DEFAULT_EXPORT_SETTINGS, ...previousSettingsRow };
    const changedFields = SETTING_FIELDS.filter((field) => previousSettings[field] !== settings[field]);

    const { data, error } = await supabase
      .from('department_export_settings')
      .upsert({
        department_id: req.user.department_id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'department_id' })
      .select(SETTINGS_COLUMNS)
      .single();
    if (error) return sendServerError(res, error);

    const changes = changedFields.length > 0
      ? changedFields.map((field) => `${SETTING_LABELS[field]} ("${previousSettings[field]}" → "${data[field]}")`)
      : ['no signatory names changed'];
    const { error: activityError } = await supabase
      .from('activity_log')
      .insert([{
        user_name: req.user.username || 'System',
        action: 'Export Signatories Updated',
        details: `Export signatories for ${req.user.department} were saved. Changes made: ${changes.join(', ')}.`,
        department: req.user.department || null,
      }]);
    if (activityError) {
      console.error('Export signatory activity log insert failed:', activityError.message);
      return res.status(500).json({ message: 'Export signatories were saved, but the activity log entry could not be created.' });
    }

    return res.json(data);
  } catch (error) {
    return sendServerError(res, error);
  }
});

module.exports = router;
