-- Add session (AM/PM) and type (Lecture/Laboratory) columns, then update UNIQUE constraint
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS session TEXT CHECK (session IN ('AM', 'PM'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('Lecture', 'Laboratory'));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_teacher_assignment_id_student_id_date_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_teacher_assignment_id_student_id_date_session_type_key UNIQUE (teacher_assignment_id, student_id, date, session, type);
