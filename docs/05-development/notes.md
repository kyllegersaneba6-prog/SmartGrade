# Notes

Miscellaneous technical notes, known gaps, and follow-ups.

## Known Gaps / Risks

| Area | Issue | Impact |
|---|---|---|
| CORS | Local/LAN allowlist exists; deployments must set `CORS_ORIGINS` | Verify allowed origins rather than relying on development defaults |
| Notifications | Live DB migration is applied and its tables, RLS, and service-role-only RPC permissions are verified; current code is in the working tree | Deploy the backend and frontend changes before using notifications in the hosted app; no test broadcast has been sent |
| Credential exposure | Removing `backend/.env` from tracking does not erase Git history | Supabase/AI provider keys and deployment secrets still require operator rotation |
| Bootstrap account | SQL seed removed; interactive bootstrap refuses an existing superadmin | Existing deployments retain their current account; deploy the password-change flow and rotate it in Settings. Bootstrap is for initial setup only |
| Backup restore roles | Merge blocks role changes to existing accounts but can insert new accounts with payload-supplied roles; full restore imports account roles too | Do not restore untrusted files; enforce role policy in both restore modes |
| AI privacy | Application logs omit provider request/error bodies; student identifiers and assignment/term metadata are excluded from provider payloads | Review provider-side data retention settings; aggregate performance data is still sent for analysis |
| Password changes | New account/password-change values require 12–72 UTF-8 bytes; current password is verified and prior sessions are invalidated | Failed-password counters are process-local and shared with login; multi-instance deployments need shared rate-limit storage |
| Attendance uniqueness | API accepts missing session/type/term; NULL values do not conflict under the current six-column unique constraint | Require metadata and enforce it at the database boundary to prevent duplicate logical rows |
| Audit integrity | Generic activity writes accept caller-provided action/details without an allowlist or length cap | Restrict event types and bound payload sizes; caller identity is still server-derived |
| Login throttling | Login counters are process-local | Use shared storage/rate limiting when running multiple backend instances |
| Historical ownership | Creator-based ownership is retained, now with department checks | Replacing/deleting an admin can orphan access; repair/migration belongs to the history-preservation phase |

## Architecture Notes

- **Grade computation lives in the frontend.** `frontend/src/utils/gradeCalculations.js` is the single source of truth; the backend has no grade endpoint.
- **API base is configurable.** `frontend/src/utils/api.js` exports `API_BASE`: `import.meta.env.VITE_API_BASE_URL` if set at build time, otherwise `http://<current-hostname>:5000`. Pages and contexts pass relative `/api/...` paths; `Login.jsx` reuses `API_BASE` for its raw login fetch. `frontend/.env.example` documents the variable.
- **Archive mode state lives in the frontend, enforcement is shared.** `TeacherContext` / `AdminContext` hold `viewTerm` and persist it in `localStorage`; `frontend/src/utils/api.js` forwards the viewed term as `X-View-Term-School-Year` / `X-View-Term-Semester`. `backend/middleware/termLock.js` rejects writes to any other term (`rejectArchivedWrites`) and exposes `assertActiveTerm` for entity-level checks.
- **Department scoping is enforced by the backend.** `staff_users.department` remains text, but auth resolves it on every admin/teacher request. Shared read/write helpers check creator ownership and course/creator department relationships. Teachers are limited to their own assignments/rosters/subjects; query filters never override ownership.
- **Teacher-only writes.** Grading, scores, and attendance mutations are `authorizeRole('teacher')`; admins and superadmins get 403.
- **DB constraints are a backstop.** `sql/add_db_constraints.sql` enforces the single active term, one admin per department, score/weight ranges, and the weight total at the database. Routes still validate first so the client receives a 400; the migration aborts on pre-existing violations instead of rewriting data.
- **Migration state is partially tracked.** The live project's `supabase_migrations.schema_migrations` includes the baseline entries and `allow_section_per_semester`; there is still no runner or manifest for the remaining `backend/sql/` change files.
- **Teacher-managed class setup.** Admins provision teacher accounts. Admin class, section, subject, assignment, and roster routes return 403; teachers create/reuse class records by importing PDFs in My Classes.
- **Section term scope.** The live `sections` unique constraint is `(course_id, name, school_year, semester)` so a class can have a separate roster per semester. Existing rows were preserved.
- **Excel/PDF is client-side.** No spreadsheet libraries exist in the backend.
- **Backup restore locking.** Merge/replace use the in-process `restoreInProgress` flag. Full restore also takes a database advisory transaction lock and executes atomically through `restore_full_backup_atomic`; apply `sql/create_atomic_full_backup_restore.sql` before deploying that backend path.
- **RLS is deny-all.** `sql/enable_row_level_security.sql` enables RLS on 14 core `public` tables; auxiliary migrations cover export settings and notifications. The live project has 17 public tables with RLS and no policies. `anon` and `authenticated` also have no table grants, so the publishable/anon key gets `401 permission denied` from PostgREST (verified live). The backend is unaffected because `service_role` has `BYPASSRLS`. The Supabase `RLS Enabled No Policy` advisory is informational and expected. Trigger functions still have mutable `search_path` (advisor WARN).

## Local Environment

- Backend availability: `main.jsx` gates all routes through `BackendAvailability`; `GET /api/health` probes the process, not the database. A later outage hides mounted pages without deleting UI state or credentials. Recovery only reveals the UI; existing page retry/autosave behavior is unchanged.

- Backend: `http://localhost:5000` (binds `0.0.0.0`).
- Frontend: `http://localhost:5173`.
- AI gateway default: `http://localhost:20128/v1` (OmniRoute).
- OpenCode V2 project instructions: `.opencode/opencode.json` loads `docs/AGENTS.md`.
- `schema.sql` seeds no staff account. Use `npm run bootstrap:superadmin` for a fresh installation; existing deployments keep their existing account (see `00-overview/setup-guide.md`).

## System Review — 2026-11-12

- Read-only Supabase advisors: no health lints; security reports the expected RLS-enabled/no-policy state on 17 tables plus five trigger functions with mutable `search_path`; performance reports 11 unindexed foreign keys and one unused index.
- `npm run lint` currently fails with 68 errors and 5 warnings across the frontend. The production build succeeds, with browser-polyfill/externalized-module warnings and a main JavaScript chunk over 2 MB.
- All backend JavaScript files pass `node --check`. No maintained automated test suite is configured; no browser/E2E test was run for this review.
- Review covered authentication/authorization, account and roster flows, grading/attendance, audit logging, AI, backup/restore, SQL migrations/RLS, frontend build, and current docs. No code or database changes were made.

## High-Priority Security Remediation — 2026-11-12

- **Implemented:** fixed superadmin seed removal, interactive one-time superadmin bootstrap, password policy and self-service password change, account-form password defaults removed, and AI provider payload/logging minimization.
- Verification passed: all backend JavaScript syntax checks, isolated password-change API smoke test (current-password verification, archive-mode availability, hash update, stale-session rejection), provider-payload/error-body smoke test, password-policy boundaries, and frontend production build. The two new shared frontend files pass ESLint.
- The bootstrap command was not run against a database, and no live database or provider credentials were changed. Existing deployed accounts are not altered by the schema-file update; the existing superadmin must change its password after the new application version is deployed. Supabase/AI provider-key rotation and checking provider-side retention remain operator tasks.
- Full frontend lint still reports 68 errors and 5 warnings, matching the pre-existing system-review count; the reported violations are in existing files and were not addressed as part of this security scope.

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
