# Notes

Miscellaneous technical notes, known gaps, and follow-ups.

## Known Gaps / Risks

| Area | Issue | Impact |
|---|---|---|
| CORS | `app.use(cors())` allows every origin | Fine for local demo; lock down before deployment |
| Notifications | Broadcast form only logs to the console | Feature appears to work but sends nothing |
| Bulk import page | `/admin/bulk-students` is unlinked and its header title falls back to "Settings" | Discoverability bug |
| Legacy table | `admin_users` is queried by login but undefined in `sql/` | Login fallback shape is unverifiable |

## Architecture Notes

- **Grade computation lives in the frontend.** `frontend/src/utils/gradeCalculations.js` is the single source of truth; the backend has no grade endpoint.
- **API base is configurable.** `frontend/src/utils/api.js` exports `API_BASE`: `import.meta.env.VITE_API_BASE_URL` if set at build time, otherwise `http://<current-hostname>:5000`. Pages and contexts pass relative `/api/...` paths; `Login.jsx` reuses `API_BASE` for its raw login fetch. `frontend/.env.example` documents the variable.
- **Archive mode state lives in the frontend, enforcement is shared.** `TeacherContext` / `AdminContext` hold `viewTerm` and persist it in `localStorage`; `frontend/src/utils/api.js` forwards the viewed term as `X-View-Term-School-Year` / `X-View-Term-Semester`. `backend/middleware/termLock.js` rejects writes to any other term (`rejectArchivedWrites`) and exposes `assertActiveTerm` for entity-level checks.
- **Department scoping is manual.** `staff_users.department` is a text snapshot; no generic middleware exists. Read access uses `backend/middleware/access.js`: superadmin sees all, admin is scoped to `created_by`, teacher to their own `teacher_id` / assignments. Writes still use inline ownership checks.
- **Teacher-only writes.** Grading, scores, and attendance mutations are `authorizeRole('teacher')`; admins and superadmins get 403.
- **DB constraints are a backstop.** `sql/add_db_constraints.sql` enforces the single active term, one admin per department, score/weight ranges, and the weight total at the database. Routes still validate first so the client receives a 400; the migration aborts on pre-existing violations instead of rewriting data.
- **Migration state is partially tracked.** The live project's `supabase_migrations.schema_migrations` has the four original entries plus `enable_row_level_security`, `baseline_attendance_final`, and `baseline_db_constraints`. The two baselines were recorded by re-running the idempotent SQL; there is still no runner and no manifest for the remaining `backend/sql/` change files.
- **Admin-only structure.** Sections, students, subjects, and assignments are `authorizeRole('admin')`; superadmin gets 403.
- **Excel/PDF is client-side.** No spreadsheet libraries exist in the backend.
- **Backups run in-process.** `restoreInProgress` is a module-level flag, so it protects one server process only.
- **RLS is deny-all.** `sql/enable_row_level_security.sql` enables RLS on all 13 `public` tables with no policies. `anon` and `authenticated` also have no table grants, so the publishable/anon key gets `401 permission denied` from PostgREST (verified live). The backend is unaffected because `service_role` has `BYPASSRLS`. The Supabase `RLS Enabled No Policy` advisory is informational and expected. Trigger functions still have mutable `search_path` (advisor WARN) — candidate for a follow-up hardening pass.

## Local Environment

- Backend: `http://localhost:5000` (binds `0.0.0.0`).
- Frontend: `http://localhost:5173`.
- AI gateway default: `http://localhost:20128/v1` (OmniRoute).
- OpenCode V2 project instructions: `.opencode/opencode.json` loads `docs/AGENTS.md`.
- Seed superadmin: `admin` / `admin123`.

## Where to Put Things

If a note does not fit an existing file, add it here first, then promote it to the correct folder once it stabilizes.
