-- Remove 3rd Semester from the system
-- Run this in your Supabase SQL Editor

-- 1. Migrate existing 3rd Semester rows to Summer
UPDATE public.sections SET semester = 'Summer' WHERE semester = '3rd Semester';
UPDATE public.academic_terms SET semester = 'Summer' WHERE semester = '3rd Semester';
UPDATE public.subjects SET semester = 'Summer' WHERE semester = '3rd Semester';
UPDATE public.teacher_assignments SET semester = 'Summer' WHERE semester = '3rd Semester';

-- 2. Drop old CHECK constraints
ALTER TABLE public.sections DROP CONSTRAINT IF EXISTS sections_semester_check;
ALTER TABLE public.academic_terms DROP CONSTRAINT IF EXISTS academic_terms_semester_check;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_semester_check;
ALTER TABLE public.teacher_assignments DROP CONSTRAINT IF EXISTS teacher_assignments_semester_check;

-- 3. Recreate without 3rd Semester
ALTER TABLE public.sections ADD CONSTRAINT sections_semester_check CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));
ALTER TABLE public.academic_terms ADD CONSTRAINT academic_terms_semester_check CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));
ALTER TABLE public.subjects ADD CONSTRAINT subjects_semester_check CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));
ALTER TABLE public.teacher_assignments ADD CONSTRAINT teacher_assignments_semester_check CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));
