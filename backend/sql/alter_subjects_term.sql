ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_year TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester TEXT CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));

-- Backfill existing rows with current term
DO $$
DECLARE
  sy TEXT;
  sem TEXT;
  m INT;
BEGIN
  m := EXTRACT(MONTH FROM NOW());
  IF m >= 8 THEN
    sy := EXTRACT(YEAR FROM NOW()) || '-' || (EXTRACT(YEAR FROM NOW()) + 1)::TEXT;
    sem := '1st Semester';
  ELSIF m >= 6 THEN
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := 'Summer';
  ELSE
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := '2nd Semester';
  END IF;

  UPDATE public.subjects
  SET school_year = COALESCE(school_year, sy),
      semester = COALESCE(semester, sem)
  WHERE school_year IS NULL OR semester IS NULL;
END $$;
