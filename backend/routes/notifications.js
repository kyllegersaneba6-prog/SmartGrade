const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendServerError } = require('../middleware/errors');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_VISIBLE_NOTIFICATIONS = 50;

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const [recipientResult, unreadResult] = await Promise.all([
      supabase
        .from('broadcast_notification_recipients')
        .select('notification_id, recipient_role, sent_at, read_at, notification:broadcast_notifications(id, title, content, urgency, created_at)')
        .eq('user_id', req.user.id)
        .is('dismissed_at', null)
        .order('sent_at', { ascending: false })
        .limit(MAX_VISIBLE_NOTIFICATIONS),
      supabase
        .from('broadcast_notification_recipients')
        .select('notification_id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .is('read_at', null)
        .is('dismissed_at', null),
    ]);

    if (recipientResult.error) return sendServerError(res, recipientResult.error);
    if (unreadResult.error) return sendServerError(res, unreadResult.error);

    const items = (recipientResult.data || []).filter((row) => row.notification).map((row) => ({
      id: row.notification_id,
      title: row.notification.title,
      content: row.notification.content,
      urgency: row.notification.urgency,
      createdAt: row.sent_at || row.notification.created_at,
      readAt: row.read_at,
    }));

    res.set('Cache-Control', 'no-store').json({ items, unreadCount: unreadResult.count || 0 });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.post('/read-all', async (req, res) => {
  try {
    const { error } = await supabase
      .from('broadcast_notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .is('read_at', null)
      .is('dismissed_at', null);
    if (error) return sendServerError(res, error);
    res.json({ ok: true });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.delete('/', async (req, res) => {
  const dismissedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('broadcast_notification_recipients')
      .update({ dismissed_at: dismissedAt, read_at: dismissedAt })
      .eq('user_id', req.user.id)
      .is('dismissed_at', null);
    if (error) return sendServerError(res, error);
    res.json({ ok: true });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.post('/', authorizeRole('superadmin'), async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  const urgency = req.body?.urgency;
  const rawAudience = Array.isArray(req.body?.audience) ? req.body.audience : [];
  const audience = [...new Set(rawAudience)];

  if (title.length < 1 || title.length > 160) {
    return res.status(400).json({ message: 'Title must contain 1 to 160 characters.' });
  }
  if (content.length < 1 || content.length > 2000) {
    return res.status(400).json({ message: 'Message must contain 1 to 2000 characters.' });
  }
  if (!['Not Urgent', 'Urgent'].includes(urgency)) {
    return res.status(400).json({ message: 'Select a valid urgency level.' });
  }
  if (audience.length === 0 || audience.some((role) => !['admin', 'teacher'].includes(role))) {
    return res.status(400).json({ message: 'Select at least one valid audience.' });
  }

  try {
    const { data, error } = await supabase.rpc('create_broadcast_notification', {
      p_title: title,
      p_content: content,
      p_urgency: urgency,
      p_audience: audience,
      p_created_by: req.user.id,
    });
    if (error?.code === '22023') return res.status(400).json({ message: error.message });
    if (error?.code === '42501') return res.status(403).json({ message: 'Only a superadmin can send broadcast notifications.' });
    if (error) return sendServerError(res, error);

    // Keep the audit entry useful without copying the broadcast message into logs.
    try {
      const { error: auditError } = await supabase.from('activity_log').insert({
        user_name: req.user.username || req.user.id,
        action: 'Notification Broadcasted',
        details: `Notification "${title}" was sent to ${data.recipient_count} users.`,
        department: req.user.department || null,
      });
      if (auditError) console.error('Notification audit insert failed:', auditError.message);
    } catch (auditError) {
      console.error('Notification audit insert failed:', auditError.message);
    }

    res.status(201).json({ ok: true, notification: data });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.post('/:id/read', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID.' });

  try {
    const { error } = await supabase
      .from('broadcast_notification_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('notification_id', req.params.id)
      .eq('user_id', req.user.id)
      .is('read_at', null)
      .is('dismissed_at', null);
    if (error) return sendServerError(res, error);
    res.json({ ok: true });
  } catch (error) {
    return sendServerError(res, error);
  }
});

router.delete('/:id', async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID.' });

  const dismissedAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('broadcast_notification_recipients')
      .update({ dismissed_at: dismissedAt, read_at: dismissedAt })
      .eq('notification_id', req.params.id)
      .eq('user_id', req.user.id)
      .is('dismissed_at', null);
    if (error) return sendServerError(res, error);
    res.json({ ok: true });
  } catch (error) {
    return sendServerError(res, error);
  }
});

module.exports = router;
