-- Logical archive for audit logs. Rows remain available and are associated
-- with the term that closed them.
BEGIN;

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS archived_school_year TEXT,
  ADD COLUMN IF NOT EXISTS archived_semester TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_activity_log_current_created
  ON public.activity_log (created_at DESC, id DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_archive_term_created
  ON public.activity_log (archived_school_year, archived_semester, created_at DESC, id DESC)
  WHERE archived_at IS NOT NULL;

-- Shared insert locks make a semester close include all log inserts that
-- started before the close, while later inserts remain in the new term.
CREATE OR REPLACE FUNCTION public.lock_activity_log_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock_shared(20261104, 1);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_log_insert_lock ON public.activity_log;
CREATE TRIGGER trg_activity_log_insert_lock
  BEFORE INSERT ON public.activity_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.lock_activity_log_insert();

-- Existing closed terms use the next term's creation time as the boundary.
WITH term_boundaries AS (
  SELECT school_year, semester, is_closed, created_at AS starts_at,
         LEAD(created_at) OVER (ORDER BY created_at, id) AS next_term_at
  FROM public.academic_terms
)
UPDATE public.activity_log AS log
SET archived_school_year = term.school_year,
    archived_semester = term.semester,
    archived_at = term.next_term_at
FROM term_boundaries AS term
WHERE term.is_closed = true
  AND term.next_term_at IS NOT NULL
  AND log.archived_at IS NULL
  AND log.created_at >= term.starts_at
  AND log.created_at < term.next_term_at;

-- Term closure, log archival, and next-term creation happen atomically.
CREATE OR REPLACE FUNCTION public.end_semester_and_archive_logs(
  expected_active_id UUID,
  next_school_year TEXT,
  next_semester TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  active_row public.academic_terms%ROWTYPE;
  next_row public.academic_terms%ROWTYPE;
  archived_count BIGINT;
BEGIN
  IF next_school_year IS NULL OR btrim(next_school_year) = ''
     OR next_semester IS NULL
     OR next_semester NOT IN ('1st Semester', '2nd Semester', 'Summer') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid next academic term.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(20261104, 1);
  SELECT * INTO active_row
  FROM public.academic_terms
  WHERE is_active = true
  FOR UPDATE;

  IF NOT FOUND OR active_row.id IS DISTINCT FROM expected_active_id THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'The active term changed. Refresh and try again.';
  END IF;

  IF (active_row.school_year = next_school_year AND active_row.semester = next_semester)
     OR EXISTS (
       SELECT 1 FROM public.academic_terms
       WHERE school_year = next_school_year
         AND semester = next_semester
         AND is_closed = true
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a new semester, not the current or a closed semester.';
  END IF;

  UPDATE public.activity_log
  SET archived_school_year = active_row.school_year,
      archived_semester = active_row.semester,
      archived_at = pg_catalog.clock_timestamp()
  WHERE archived_at IS NULL;
  GET DIAGNOSTICS archived_count = ROW_COUNT;

  UPDATE public.academic_terms
  SET is_active = false, is_closed = true
  WHERE id = active_row.id
  RETURNING * INTO active_row;

  INSERT INTO public.academic_terms (school_year, semester, is_active, is_closed)
  VALUES (next_school_year, next_semester, true, false)
  ON CONFLICT (school_year, semester)
  DO UPDATE SET is_active = true, is_closed = false
  RETURNING * INTO next_row;

  RETURN pg_catalog.jsonb_build_object(
    'closed', pg_catalog.to_jsonb(active_row),
    'next', pg_catalog.to_jsonb(next_row),
    'archived_logs', archived_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lock_activity_log_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.end_semester_and_archive_logs(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_activity_log_insert() TO service_role;
GRANT EXECUTE ON FUNCTION public.end_semester_and_archive_logs(UUID, TEXT, TEXT) TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

COMMIT;
