-- Enable Row Level Security on every public table.
--
-- Why: Supabase exposes the `public` schema through PostgREST to the `anon`
-- and `authenticated` roles. With RLS disabled, anyone holding the
-- publishable/anon key could read or modify every row.
--
-- Safety: the Express backend authenticates with the service-role key, and
-- `service_role` has BYPASSRLS, so API traffic is unaffected. No policies are
-- created here: with RLS enabled and no policy, anon/authenticated access is
-- denied (SELECT returns zero rows, writes fail).
--
-- Idempotent: safe to re-run.

alter table public.departments          enable row level security;
alter table public.courses              enable row level security;
alter table public.staff_users          enable row level security;
alter table public.sections             enable row level security;
alter table public.students             enable row level security;
alter table public.subjects             enable row level security;
alter table public.teacher_assignments  enable row level security;
alter table public.activity_log         enable row level security;
alter table public.academic_terms       enable row level security;
alter table public.grading_components   enable row level security;
alter table public.component_activities enable row level security;
alter table public.component_scores     enable row level security;
alter table public.attendance           enable row level security;
