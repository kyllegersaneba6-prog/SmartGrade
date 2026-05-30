-- SmartGrade Attendance Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_assignment_id UUID NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_assignment_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_assignment_date ON public.attendance (teacher_assignment_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance (student_id);

GRANT ALL ON public.attendance TO service_role;
