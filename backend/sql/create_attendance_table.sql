-- SmartGrade Attendance Table (v2 final shape)
-- Run this in your Supabase SQL Editor on a fresh database, then run
-- migrate_attendance_final.sql. For an existing database, run only
-- migrate_attendance_final.sql.

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_assignment_id UUID NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score DECIMAL DEFAULT 0,
  session TEXT CHECK (session IN ('AM', 'PM')),
  type TEXT CHECK (type IN ('Lecture', 'Laboratory')),
  term TEXT,
  status TEXT, -- legacy, nullable
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT attendance_teacher_assignment_id_student_id_date_session_type_term_key
    UNIQUE (teacher_assignment_id, student_id, date, session, type, term)
);

CREATE INDEX IF NOT EXISTS idx_attendance_assignment_date ON public.attendance (teacher_assignment_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);

GRANT ALL ON public.attendance TO service_role;
