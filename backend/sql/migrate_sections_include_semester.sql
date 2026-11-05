-- Allow the same course section to have a separate roster in each term.
-- Existing section and student rows are kept as-is.
ALTER TABLE public.sections
  DROP CONSTRAINT IF EXISTS sections_course_id_name_school_year_key;

ALTER TABLE public.sections
  DROP CONSTRAINT IF EXISTS sections_course_id_name_school_year_semester_key;

ALTER TABLE public.sections
  ADD CONSTRAINT sections_course_id_name_school_year_semester_key
  UNIQUE (course_id, name, school_year, semester);
