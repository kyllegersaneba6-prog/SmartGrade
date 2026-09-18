-- Add student detail columns (first_name, last_name, mi, gender)
-- This allows students to be added with structured name fields

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mi TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT;
