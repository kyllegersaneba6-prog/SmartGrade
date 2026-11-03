# Notes

Miscellaneous technical notes, known gaps, and follow-ups.

## Known Gaps / Risks

| Area | Issue | Impact |
|---|---|---|
| CORS | Local/LAN allowlist exists; deployments must set `CORS_ORIGINS` | Verify allowed origins rather than relying on development defaults |
| Notifications | Broadcast form only logs to the console | Feature appears to work but sends nothing |
| Bulk import page | `/admin/bulk-students` is not linked from the sidebar; its header now correctly says "Bulk Student Import" when opened directly | Discoverability bug |
| Credential exposure | Removing `backend/.env` from tracking does not erase Git history | Supabase/AI provider keys and deployment secrets still require operator rotation |
| Historical ownership | Creator-based ownership is retained, now with department checks | Replacing/deleting an admin can orphan access; repair/migration belongs to the history-preservation phase |

## Architecture Notes

- **Grade computation lives in the frontend.** `frontend/src/utils/gradeCalculations.js` is the single source of truth; the backend has no grade endpoint.
- **API base is configurable.** `frontend/src/utils/api.js` exports `API_BASE`: `import.meta.env.VITE_API_BASE_URL` if set at build time, otherwise `http://<current-hostname>:5000`. Pages and contexts pass relative `/api/...` paths; `Login.jsx` reuses `API_BASE` for its raw login fetch. `frontend/.env.example` documents the variable.
- **Archive mode state lives in the frontend, enforcement is shared.** `TeacherContext` / `AdminContext` hold `viewTerm` and persist it in `localStorage`; `frontend/src/utils/api.js` forwards the viewed term as `X-View-Term-School-Year` / `X-View-Term-Semester`. `backend/middleware/termLock.js` rejects writes to any other term (`rejectArchivedWrites`) and exposes `assertActiveTerm` for entity-level checks.
- **Department scoping is enforced by the backend.** `staff_users.department` remains text, but auth resolves it on every admin/teacher request. Shared read/write helpers check creator ownership and course/creator department relationships. Teachers are limited to their own assignments/rosters/subjects; query filters never override ownership.
- **Teacher-only writes.** Grading, scores, and attendance mutations are `authorizeRole('teacher')`; admins and superadmins get 403.
- **DB constraints are a backstop.** `sql/add_db_constraints.sql` enforces the single active term, one admin per department, score/weight ranges, and the weight total at the database. Routes still validate first so the client receives a 400; the migration aborts on pre-existing violations instead of rewriting data.
- **Migration state is partially tracked.** The live project's `supabase_migrations.schema_migrations` has the four original entries plus `enable_row_level_security`, `baseline_attendance_final`, and `baseline_db_constraints`. The two baselines were recorded by re-running the idempotent SQL; there is still no runner and no manifest for the remaining `backend/sql/` change files.
- **Admin-only structure.** Sections, students, subjects, and assignments are `authorizeRole('admin')`; superadmin gets 403.
- **Excel/PDF is client-side.** No spreadsheet libraries exist in the backend.
- **Backups run in-process.** `restoreInProgress` is a module-level flag, so it protects one server process only.
- **RLS is deny-all.** `sql/enable_row_level_security.sql` enables RLS on all 13 `public` tables with no policies. `anon` and `authenticated` also have no table grants, so the publishable/anon key gets `401 permission denied` from PostgREST (verified live). The backend is unaffected because `service_role` has `BYPASSRLS`. The Supabase `RLS Enabled No Policy` advisory is informational and expected. Trigger functions still have mutable `search_path` (advisor WARN) — candidate for a follow-up hardening pass.

## Local Environment

- Backend availability: `main.jsx` gates all routes through `BackendAvailability`; `GET /api/health` probes the process, not the database. A later outage hides mounted pages without deleting UI state or credentials. Recovery only reveals the UI; existing page retry/autosave behavior is unchanged.

- Backend: `http://localhost:5000` (binds `0.0.0.0`).
- Frontend: `http://localhost:5173`.
- AI gateway default: `http://localhost:20128/v1` (OmniRoute).
- OpenCode V2 project instructions: `.opencode/opencode.json` loads `docs/AGENTS.md`.
- Seed superadmin: `admin` / `admin123`.

## Phase 1 Verification — 2026-11-02

- **89 isolated HTTP cases passed**, using real Express/JWT/bcrypt with a mocked Supabase data layer: role/field restrictions, scoped reads, missing/deleted/changed accounts, alias lockouts, both transfer sides, closed terms without archive headers, mixed score/attendance batches (including 1,005 students), token tampering/expiry/algorithm checks, query failures, and valid requests.
- Export smoke checks passed: `.xlsx`, legacy `.xls`/BIFF8 and CSV round trips; actual 55-student Class Record Excel generation (styles/merges/logos); Class Record, account-table, and empty-table PDF generation with upgraded libraries. The PDF smoke fixture emitted a table-width warning; visual layout/browser walkthrough remains a later check.
- No permanent test files were added, following the current project rule. Temporary harnesses were run outside the repo; these do not constitute a maintained regression suite.
- Production audits: **0 vulnerabilities** in both apps. Full audits still report development-only minimatch chains (frontend ESLint family; backend nodemon); avoid forced major-version overrides without compatibility work.
- All **32 backend JavaScript files** passed syntax checks; the frontend production build passed in memory. Frontend lint remains at the pre-existing **104 errors / 4 warnings** (zero fatal errors); bundle/browser-polyfill warnings are not part of the authorization fixes.
- Local `.env` remains on disk but is removed from the Git index; sanitized example added and local JWT secret rotated. No provider keys were rotated, Git history rewritten, or remote schema/data changed.
- Fingerprints are state-based, not a durable revocation ledger: restoring identical security fields can make an unexpired token match again. Rotate `JWT_SECRET` after a security-sensitive restore; durable session versions/revocation are follow-up work.
- All seven documentation folders were reviewed; existing unrelated UI changes were preserved.

## Backend Availability Verification — 2026-11-03

**26 isolated checks passed**, including public liveness, an isolated HTTP server stop/restart, timeout/deduplication/StrictMode cleanup, exact outage copy, all-route wrapping, retained form markup, and unchanged API auth/archive behavior. New monitor/boundary/helper files pass targeted lint; frontend build and backend entry syntax checks passed. No credentials or remote database were accessed. Temporary checks live outside the repository, not in a maintained suite.

## Where to Put Things

If a note does not fit an existing file, add it here first, then promote it to the correct folder once it stabilizes.
