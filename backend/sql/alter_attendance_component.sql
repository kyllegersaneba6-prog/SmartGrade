ALTER TABLE public.grading_components ADD COLUMN IF NOT EXISTS is_attendance BOOLEAN DEFAULT false;
