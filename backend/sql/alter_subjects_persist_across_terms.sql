-- Make subjects persist across school years
-- Drop CHECK constraint on semester to allow NULL (All Semesters)
-- Drop school_year column filter dependency (column stays for existing data but no longer used)

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_semester_check;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_semester_check 
  CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer') OR semester IS NULL);
