-- SmartGrade DB-level constraints
--
-- Canonical, idempotent migration. Run after schema.sql,
-- create_grading_tables.sql, create_attendance_table.sql, and
-- migrate_attendance_final.sql.
--
-- This file does NOT change existing data. If existing rows violate a rule,
-- it aborts with a message describing what must be fixed first.

-- ---------------------------------------------------------------------------
-- 1. Pre-flight checks
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  bad text;
  n int;
BEGIN
  -- Only one active academic term.
  SELECT count(*) INTO n FROM public.academic_terms WHERE is_active = true;
  IF n > 1 THEN
    SELECT string_agg(format('%s %s', school_year, semester), ', ')
      INTO bad
    FROM public.academic_terms
    WHERE is_active = true;
    RAISE EXCEPTION 'Multiple active terms exist (%). Set all but one to is_active = false before running this migration.', bad;
  END IF;

  -- One admin per department (case/trim-insensitive).
  SELECT string_agg(format('%s (%s)', dept, cnt), ', ')
    INTO bad
  FROM (
    SELECT lower(trim(department)) AS dept, count(*) AS cnt
    FROM public.staff_users
    WHERE system_role = 'admin'
      AND department IS NOT NULL
      AND trim(department) <> ''
    GROUP BY 1
    HAVING count(*) > 1
  ) d;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Multiple admins exist in the same department (%). Reassign or delete the extra admins before running this migration.', bad;
  END IF;

  -- Component weights are within 0..100 and total at most 100 per term.
  SELECT string_agg(format('assignment %s / term %s = %s', teacher_assignment_id, term, total), '; ')
    INTO bad
  FROM (
    SELECT teacher_assignment_id, term, sum(weight) AS total
    FROM public.grading_components
    GROUP BY teacher_assignment_id, term
    HAVING sum(weight) > 100
  ) w;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'Component weight totals exceed 100 (%). Adjust weights before running this migration.', bad;
  END IF;

  SELECT count(*) INTO n
  FROM public.grading_components
  WHERE weight < 0 OR weight > 100;
  IF n > 0 THEN
    RAISE EXCEPTION '% grading_components row(s) have weight outside 0..100. Fix them before running this migration.', n;
  END IF;

  -- Activity maxima must be positive.
  SELECT count(*) INTO n
  FROM public.component_activities
  WHERE max_score <= 0 OR max_score = 'NaN'::numeric;
  IF n > 0 THEN
    RAISE EXCEPTION '% component_activities row(s) have max_score <= 0 or NaN. Fix them before running this migration.', n;
  END IF;

  -- Every existing score must fit its activity.
  SELECT count(*) INTO n
  FROM public.component_scores cs
  JOIN public.component_activities ca ON ca.id = cs.activity_id
  WHERE cs.score IS NOT NULL
    AND (cs.score < 0 OR cs.score > ca.max_score);
  IF n > 0 THEN
    RAISE EXCEPTION '% component_scores row(s) are outside 0..max_score. Fix them before running this migration.', n;
  END IF;

  -- Attendance uses 0..2 in the current UI (0 Absent, 1 Late, 2 Present).
  SELECT count(*) INTO n
  FROM public.attendance
  WHERE score IS NOT NULL
    AND (score < 0 OR score > 2);
  IF n > 0 THEN
    RAISE EXCEPTION '% attendance row(s) have score outside 0..2. Fix them before running this migration.', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Unique partial indexes
-- ---------------------------------------------------------------------------

-- At most one active term. All indexed rows have is_active = true, so the
-- unique index allows exactly one such row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_terms_one_active
  ON public.academic_terms ((is_active))
  WHERE is_active = true;

-- At most one admin per department. Case/trim-insensitive so "CICT" and
-- " cict " cannot both hold an admin.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_one_admin_per_department
  ON public.staff_users (lower(trim(department)))
  WHERE system_role = 'admin'
    AND department IS NOT NULL
    AND trim(department) <> '';

-- ---------------------------------------------------------------------------
-- 3. CHECK constraints (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_score_range'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_score_range
      CHECK (score IS NULL OR (score >= 0 AND score <= 2));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grading_components_weight_range'
      AND conrelid = 'public.grading_components'::regclass
  ) THEN
    ALTER TABLE public.grading_components
      ADD CONSTRAINT grading_components_weight_range
      CHECK (weight >= 0 AND weight <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'component_activities_max_score_positive'
      AND conrelid = 'public.component_activities'::regclass
  ) THEN
    ALTER TABLE public.component_activities
      ADD CONSTRAINT component_activities_max_score_positive
      CHECK (max_score > 0 AND max_score <> 'NaN'::numeric);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'component_scores_score_nonnegative'
      AND conrelid = 'public.component_scores'::regclass
  ) THEN
    ALTER TABLE public.component_scores
      ADD CONSTRAINT component_scores_score_nonnegative
      CHECK (score IS NULL OR score >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Component score must fit its activity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_component_score_range()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  max_allowed numeric;
BEGIN
  IF NEW.score IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT max_score INTO max_allowed
  FROM public.component_activities
  WHERE id = NEW.activity_id;

  IF max_allowed IS NULL THEN
    RAISE EXCEPTION 'Activity % does not exist.', NEW.activity_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.score < 0 OR NEW.score > max_allowed THEN
    RAISE EXCEPTION 'Score % is outside 0..% for activity %.', NEW.score, max_allowed, NEW.activity_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_component_scores_range ON public.component_scores;
CREATE TRIGGER trg_component_scores_range
  BEFORE INSERT OR UPDATE OF score, activity_id ON public.component_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_component_score_range();

-- ---------------------------------------------------------------------------
-- 5. Do not lower max_score below existing scores
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_activity_max_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.component_scores
  WHERE activity_id = NEW.id
    AND score IS NOT NULL
    AND score > NEW.max_score;

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Cannot set max_score to %: % existing score(s) exceed it.', NEW.max_score, bad_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_component_activities_max_score ON public.component_activities;
CREATE TRIGGER trg_component_activities_max_score
  BEFORE UPDATE OF max_score ON public.component_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_activity_max_score();

-- ---------------------------------------------------------------------------
-- 6. Component weights total at most 100 per assignment + term
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_component_weight_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  total numeric;
BEGIN
  -- Serialize concurrent writes for the same assignment + term.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.teacher_assignment_id::text || '|' || NEW.term)::bigint);

  SELECT coalesce(sum(weight), 0) INTO total
  FROM public.grading_components
  WHERE teacher_assignment_id = NEW.teacher_assignment_id
    AND term = NEW.term;

  IF total > 100 THEN
    RAISE EXCEPTION 'Total component weight for assignment % / term % is %, exceeding 100.', NEW.teacher_assignment_id, NEW.term, total
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_grading_components_weight_total ON public.grading_components;
CREATE CONSTRAINT TRIGGER trg_grading_components_weight_total
  AFTER INSERT OR UPDATE OF weight, teacher_assignment_id, term ON public.grading_components
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_component_weight_total();
