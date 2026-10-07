-- Staff ID number for admins/teachers (shared staff_users table).
-- TEXT preserves leading zeros; NULL keeps existing rows untouched.
ALTER TABLE public.staff_users ADD COLUMN IF NOT EXISTS staff_id TEXT;

-- Raw 9-digit format (NULL allowed for legacy rows without an ID yet).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_users_staff_id_format') THEN
    ALTER TABLE public.staff_users
      ADD CONSTRAINT staff_users_staff_id_format CHECK (staff_id IS NULL OR staff_id ~ '^[0-9]{9}$');
  END IF;
END $$;

-- Global uniqueness across admins and teachers (NULLs never conflict in Postgres).
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_users_staff_id ON public.staff_users (staff_id);
