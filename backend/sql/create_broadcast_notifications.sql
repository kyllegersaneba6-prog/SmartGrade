-- In-app notifications broadcast by superadmins to current admin/teacher accounts.
-- Apply this migration before deploying the notification API.

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'Not Urgent',
  audience TEXT[] NOT NULL,
  created_by UUID REFERENCES public.staff_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_notifications_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  CONSTRAINT broadcast_notifications_content_length
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  CONSTRAINT broadcast_notifications_urgency_check
    CHECK (urgency IN ('Not Urgent', 'Urgent')),
  CONSTRAINT broadcast_notifications_audience_check
    CHECK (cardinality(audience) > 0 AND audience <@ ARRAY['admin', 'teacher']::TEXT[])
);

CREATE TABLE IF NOT EXISTS public.broadcast_notification_recipients (
  notification_id UUID NOT NULL REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  recipient_role TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  PRIMARY KEY (notification_id, user_id),
  CONSTRAINT broadcast_notification_recipients_role_check
    CHECK (recipient_role IN ('admin', 'teacher'))
);

CREATE INDEX IF NOT EXISTS broadcast_notifications_created_by_idx
  ON public.broadcast_notifications (created_by);

CREATE INDEX IF NOT EXISTS broadcast_notification_recipients_user_sent_idx
  ON public.broadcast_notification_recipients (user_id, sent_at DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS broadcast_notification_recipients_user_unread_idx
  ON public.broadcast_notification_recipients (user_id)
  WHERE read_at IS NULL AND dismissed_at IS NULL;

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_notification_recipients ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.broadcast_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.broadcast_notification_recipients FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.broadcast_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.broadcast_notification_recipients TO service_role;

CREATE OR REPLACE FUNCTION public.create_broadcast_notification(
  p_title TEXT,
  p_content TEXT,
  p_urgency TEXT,
  p_audience TEXT[],
  p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_sender_role TEXT;
  v_notification_id UUID;
  v_created_at TIMESTAMPTZ;
  v_recipient_count INTEGER;
BEGIN
  IF char_length(btrim(coalesce(p_title, ''))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'Title must contain 1 to 160 characters.' USING ERRCODE = '22023';
  END IF;

  IF char_length(btrim(coalesce(p_content, ''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Message must contain 1 to 2000 characters.' USING ERRCODE = '22023';
  END IF;

  IF p_urgency IS DISTINCT FROM 'Not Urgent' AND p_urgency IS DISTINCT FROM 'Urgent' THEN
    RAISE EXCEPTION 'Invalid notification urgency.' USING ERRCODE = '22023';
  END IF;

  IF p_audience IS NULL
    OR cardinality(p_audience) NOT BETWEEN 1 AND 2
    OR EXISTS (
      SELECT 1
      FROM unnest(p_audience) AS selected_roles(role_name)
      WHERE role_name NOT IN ('admin', 'teacher')
    )
    OR cardinality(p_audience) <> (
      SELECT count(DISTINCT role_name)::INTEGER
      FROM unnest(p_audience) AS selected_roles(role_name)
    ) THEN
    RAISE EXCEPTION 'Select one or more valid recipient roles.' USING ERRCODE = '22023';
  END IF;

  SELECT system_role
    INTO v_sender_role
  FROM public.staff_users
  WHERE id = p_created_by;

  IF v_sender_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'Only a superadmin can send broadcast notifications.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.broadcast_notifications (title, content, urgency, audience, created_by)
  VALUES (btrim(p_title), btrim(p_content), p_urgency, p_audience, p_created_by)
  RETURNING id, created_at INTO v_notification_id, v_created_at;

  INSERT INTO public.broadcast_notification_recipients
    (notification_id, user_id, recipient_role, sent_at)
  SELECT v_notification_id, users.id, users.system_role, v_created_at
  FROM public.staff_users AS users
  WHERE users.system_role = ANY(p_audience);

  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;
  IF v_recipient_count = 0 THEN
    RAISE EXCEPTION 'There are no users in the selected audience.' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'id', v_notification_id,
    'created_at', v_created_at,
    'recipient_count', v_recipient_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_broadcast_notification(TEXT, TEXT, TEXT, TEXT[], UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_broadcast_notification(TEXT, TEXT, TEXT, TEXT[], UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
