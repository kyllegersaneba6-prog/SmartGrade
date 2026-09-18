ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS term TEXT;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_teacher_assignment_id_student_id_date_session_type_key;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_teacher_assignment_id_student_id_date_session_type_term_key UNIQUE (teacher_assignment_id, student_id, date, session, type, term);
