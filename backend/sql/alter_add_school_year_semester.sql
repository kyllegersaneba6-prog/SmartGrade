-- Add school_year and semester to teacher_assignments
ALTER TABLE public.teacher_assignments 
  ADD COLUMN IF NOT EXISTS school_year TEXT NOT NULL DEFAULT '2025-2026';
ALTER TABLE public.teacher_assignments 
  ADD COLUMN IF NOT EXISTS semester TEXT NOT NULL DEFAULT '1st Semester';
ALTER TABLE public.teacher_assignments 
  ADD CONSTRAINT teacher_assignments_semester_check 
  CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));

-- Drop old unique constraint, add new one including school_year + semester
ALTER TABLE public.teacher_assignments 
  DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_section_id_subject_id_key;

-- Remove duplicate rows before adding new constraint (keep first occurrence)
DELETE FROM public.teacher_assignments a USING (
  SELECT MIN(id) as id, teacher_id, section_id, subject_id, school_year, semester
  FROM public.teacher_assignments
  GROUP BY teacher_id, section_id, subject_id, school_year, semester
  HAVING COUNT(*) > 1
) b WHERE a.teacher_id = b.teacher_id AND a.section_id = b.section_id 
  AND a.subject_id = b.subject_id AND a.school_year = b.school_year 
  AND a.semester = b.semester AND a.id <> b.id;

ALTER TABLE public.teacher_assignments 
  ADD UNIQUE(teacher_id, section_id, subject_id, school_year, semester);

-- Add school_year to sections for filtering
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS school_year TEXT NOT NULL DEFAULT '2025-2026';
