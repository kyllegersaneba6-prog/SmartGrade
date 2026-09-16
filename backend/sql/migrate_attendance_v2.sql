-- Run this in Supabase SQL Editor
-- Adds score column, session, type, drops NOT NULL on status, updates UNIQUE constraint

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS score DECIMAL DEFAULT 0;

ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS session TEXT CHECK (session IN ('AM', 'PM'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('Lecture', 'Laboratory'));

ALTER TABLE public.attendance ALTER COLUMN status DROP NOT NULL;
ALTER TABLE public.attendance ALTER COLUMN status SET DEFAULT NULL;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_teacher_assignment_id_student_id_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_teacher_assignment_id_student_id_date_session_type_key'
  ) THEN
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_teacher_assignment_id_student_id_date_session_type_key
      UNIQUE (teacher_assignment_id, student_id, date, session, type);
  END IF;
END;
$$;
