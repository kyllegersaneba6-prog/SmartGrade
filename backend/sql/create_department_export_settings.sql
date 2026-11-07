CREATE TABLE IF NOT EXISTS public.department_export_settings (
  department_id UUID PRIMARY KEY REFERENCES public.departments(id) ON DELETE CASCADE,
  program_head_bsit TEXT NOT NULL DEFAULT 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  program_head_bscs TEXT NOT NULL DEFAULT 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  dean_cict TEXT NOT NULL DEFAULT 'MAE B. LODANA, Ph.D.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT department_export_settings_bsit_name_length
    CHECK (char_length(btrim(program_head_bsit)) BETWEEN 1 AND 160),
  CONSTRAINT department_export_settings_bscs_name_length
    CHECK (char_length(btrim(program_head_bscs)) BETWEEN 1 AND 160),
  CONSTRAINT department_export_settings_dean_name_length
    CHECK (char_length(btrim(dean_cict)) BETWEEN 1 AND 160)
);

ALTER TABLE public.department_export_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.department_export_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.department_export_settings TO service_role;
