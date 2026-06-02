-- Add score column to attendance table for numeric attendance tracking
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS score DECIMAL DEFAULT 0;
