DROP INDEX IF EXISTS public.idx_department_export_settings_updated_by;

ALTER TABLE public.department_export_settings
  DROP COLUMN IF EXISTS updated_by;
