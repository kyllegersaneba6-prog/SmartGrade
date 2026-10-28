-- Allow attendance to be used as either one grading component or one
-- subcomponent for the same teacher assignment and grading term.
ALTER TABLE public.grading_components
  ADD COLUMN IF NOT EXISTS is_attendance BOOLEAN NOT NULL DEFAULT false;

UPDATE public.grading_components
SET is_attendance = false
WHERE is_attendance IS NULL;

ALTER TABLE public.grading_components
  ALTER COLUMN is_attendance SET DEFAULT false,
  ALTER COLUMN is_attendance SET NOT NULL;

ALTER TABLE public.component_activities
  ADD COLUMN IF NOT EXISTS is_attendance BOOLEAN NOT NULL DEFAULT false;

UPDATE public.component_activities
SET is_attendance = false
WHERE is_attendance IS NULL;

ALTER TABLE public.component_activities
  ALTER COLUMN is_attendance SET DEFAULT false,
  ALTER COLUMN is_attendance SET NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_single_main_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_attendance IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Serialize attendance placement changes for this assignment.
  PERFORM 1
  FROM public.teacher_assignments
  WHERE id = NEW.teacher_assignment_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.grading_components gc
    WHERE gc.teacher_assignment_id = NEW.teacher_assignment_id
      AND gc.term = NEW.term
      AND gc.is_attendance IS TRUE
      AND gc.id <> NEW.id
  ) OR EXISTS (
    SELECT 1
    FROM public.component_activities ca
    JOIN public.grading_components gc ON gc.id = ca.component_id
    WHERE gc.teacher_assignment_id = NEW.teacher_assignment_id
      AND gc.term = NEW.term
      AND ca.is_attendance IS TRUE
  ) THEN
    RAISE EXCEPTION 'Attendance can only be used once per assignment and term, either as a main component or a subcomponent.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_attendance_subcomponent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_assignment_id UUID;
  parent_term TEXT;
BEGIN
  IF NEW.is_attendance IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT gc.teacher_assignment_id, gc.term
  INTO parent_assignment_id, parent_term
  FROM public.grading_components gc
  WHERE gc.id = NEW.component_id;

  IF parent_assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Use the same lock as main attendance inserts to prevent concurrent duplicates.
  PERFORM 1
  FROM public.teacher_assignments
  WHERE id = parent_assignment_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.grading_components gc
    WHERE gc.teacher_assignment_id = parent_assignment_id
      AND gc.term = parent_term
      AND gc.is_attendance IS TRUE
  ) OR EXISTS (
    SELECT 1
    FROM public.component_activities ca
    JOIN public.grading_components gc ON gc.id = ca.component_id
    WHERE gc.teacher_assignment_id = parent_assignment_id
      AND gc.term = parent_term
      AND ca.is_attendance IS TRUE
      AND ca.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Attendance can only be used once per assignment and term, either as a main component or a subcomponent.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_main_attendance ON public.grading_components;
CREATE TRIGGER trg_single_main_attendance
  BEFORE INSERT OR UPDATE OF teacher_assignment_id, term, is_attendance
  ON public.grading_components
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_main_attendance();

DROP TRIGGER IF EXISTS trg_single_attendance_subcomponent ON public.component_activities;
CREATE TRIGGER trg_single_attendance_subcomponent
  BEFORE INSERT OR UPDATE OF component_id, is_attendance
  ON public.component_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_attendance_subcomponent();
