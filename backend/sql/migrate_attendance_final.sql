-- SmartGrade attendance - canonical, idempotent migration.
--
-- Run this after create_attendance_table.sql (fresh database) or directly on an
-- existing database. Safe to run more than once. It supersedes:
--   alter_attendance_unique.sql
--   alter_attendance_session_type.sql
--   alter_attendance_term.sql
--   migrate_attendance_v2.sql
--
-- Final upsert target required by routes/attendance.js:
--   ON CONFLICT (teacher_assignment_id, student_id, date, session, type, term)

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS score DECIMAL DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS term TEXT;

-- `status` is a legacy column. Keep it for old rows but make it optional.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'attendance'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.attendance ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.attendance ALTER COLUMN status SET DEFAULT NULL;
  END IF;
END $$;

-- Keep the value domains the application expects.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_session_check'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_session_check CHECK (session IN ('AM', 'PM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_type_check'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_type_check CHECK (type IN ('Lecture', 'Laboratory'));
  END IF;
END $$;

-- Drop every legacy unique rule (3-column and 5-column variants), regardless
-- of the name Postgres assigned, except the final 6-column constraint.
-- Postgres truncates identifiers to 63 characters, so the final constraint is
-- stored as `attendance_teacher_assignment_id_student_id_date_session_type_t`.
-- Both spellings are protected so a re-run never drops and recreates it.
DO $$
DECLARE
  legacy_names text[];
  legacy_name text;
BEGIN
  SELECT array_agg(con.conname)
  INTO legacy_names
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'attendance'
    AND con.contype = 'u'
    AND con.conname NOT IN (
      'attendance_teacher_assignment_id_student_id_date_session_type_term_key',
      'attendance_teacher_assignment_id_student_id_date_session_type_t'
    );

  IF legacy_names IS NOT NULL THEN
    FOREACH legacy_name IN ARRAY legacy_names LOOP
      EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT %I', legacy_name);
    END LOOP;
  END IF;
END $$;

-- Add the final constraint if it is missing. Both the full name and the
-- 63-character truncated form are checked; the drop loop protects both.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname IN (
        'attendance_teacher_assignment_id_student_id_date_session_type_term_key',
        'attendance_teacher_assignment_id_student_id_date_session_type_t'
      )
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_teacher_assignment_id_student_id_date_session_type_term_key
      UNIQUE (teacher_assignment_id, student_id, date, session, type, term);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_assignment_date ON public.attendance (teacher_assignment_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);
