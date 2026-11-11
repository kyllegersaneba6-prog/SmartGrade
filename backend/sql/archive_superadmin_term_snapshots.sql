-- Preserve the Super Admin's semester-scoped view of global records.
-- Snapshots deliberately omit password hashes and are served only by the
-- authenticated Express API through the service-role database client.
BEGIN;

CREATE TABLE IF NOT EXISTS public.superadmin_term_snapshots (
  term_id UUID PRIMARY KEY REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  snapshot_source TEXT NOT NULL CHECK (snapshot_source IN ('term_close', 'backfill_current_state')),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.superadmin_term_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.superadmin_term_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.superadmin_term_snapshots TO service_role;

CREATE OR REPLACE FUNCTION public.capture_superadmin_term_snapshot(
  target_term_id UUID,
  source_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  snapshot_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'staff_users', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'full_name', u.full_name,
          'username', u.username,
          'staff_id', u.staff_id,
          'department', u.department,
          'course_id', u.course_id,
          'system_role', u.system_role,
          'created_by', u.created_by,
          'created_at', u.created_at,
          'courses', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('name', c.name) END
        ) ORDER BY u.created_at DESC NULLS LAST, u.id
      )
      FROM public.staff_users AS u
      LEFT JOIN public.courses AS c ON c.id = u.course_id
      WHERE u.system_role IN ('superadmin', 'admin', 'teacher')
    ), '[]'::jsonb),
    'departments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', d.id, 'name', d.name, 'abbr', d.abbr, 'created_at', d.created_at)
        ORDER BY d.name
      )
      FROM public.departments AS d
    ), '[]'::jsonb),
    'courses', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'abbreviation', c.abbreviation,
          'department_id', c.department_id,
          'created_at', c.created_at,
          'departments', CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object('name', d.name) END
        ) ORDER BY c.name
      )
      FROM public.courses AS c
      LEFT JOIN public.departments AS d ON d.id = c.department_id
    ), '[]'::jsonb)
  ) INTO snapshot_data;

  INSERT INTO public.superadmin_term_snapshots (term_id, snapshot, snapshot_source, captured_at)
  VALUES (target_term_id, snapshot_data, source_name, pg_catalog.clock_timestamp())
  ON CONFLICT (term_id) DO UPDATE
  SET snapshot = EXCLUDED.snapshot,
      snapshot_source = EXCLUDED.snapshot_source,
      captured_at = EXCLUDED.captured_at;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_superadmin_term_snapshot(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_superadmin_term_snapshot(UUID, TEXT) TO service_role;

-- Existing closed terms cannot be reconstructed from the current tables, so
-- seed their first archive with the best currently available global records.
DO $$
DECLARE
  closed_term RECORD;
BEGIN
  FOR closed_term IN
    SELECT t.id
    FROM public.academic_terms AS t
    LEFT JOIN public.superadmin_term_snapshots AS s ON s.term_id = t.id
    WHERE t.is_closed = true AND s.term_id IS NULL
  LOOP
    PERFORM public.capture_superadmin_term_snapshot(closed_term.id, 'backfill_current_state');
  END LOOP;
END;
$$;

-- Semester close and global-data snapshot share the same transaction.
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

  PERFORM public.capture_superadmin_term_snapshot(active_row.id, 'term_close');

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

REVOKE ALL ON FUNCTION public.end_semester_and_archive_logs(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_semester_and_archive_logs(UUID, TEXT, TEXT) TO service_role;

COMMIT;
