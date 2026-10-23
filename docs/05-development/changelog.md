# Changelog

## 2026-10-23

### Database: canonical SQL recorded as baseline migrations

- The live project now lists `baseline_attendance_final` and `baseline_db_constraints` in its Supabase migration history alongside the four original entries and `enable_row_level_security`.
- Both baselines were applied by re-running the existing idempotent files (`migrate_attendance_final.sql`, `add_db_constraints.sql`) after pre-flight checks confirmed 1 active term, 0 duplicate admins, 0 duplicate attendance keys, and no score/weight violations.
- Fixed `migrate_attendance_final.sql` idempotency: Postgres truncates the 6-column unique constraint name to 63 characters (`..._session_type_t`), so the drop loop was matching and dropping the final constraint on every run. Both the full and truncated names are now protected.
- Verified after applying: 26 attendance rows unchanged, exactly one attendance unique constraint, all CHECK constraints and 3 triggers present, both partial unique indexes present.
- Docs updated: `00-overview/setup-guide.md`, `02-database/database-schema.md`, `05-development/notes.md`, `05-development/bug-fixes.md`.

### Security: term lock now covers every write path

- Added `backend/middleware/termLock.js` with `getActiveTerm`, `assertActiveTerm`, and `rejectArchivedWrites`; the shared message is `This term is closed. No modifications allowed.`
- `POST /api/sections` now rejects a `school_year`/`semester` that is not the active term (previously only `DELETE` checked).
- `POST /api/subjects` rejects a non-active `semester`, and `DELETE /api/subjects/:id` compares the subject's stored semester.
- Mounted `rejectArchivedWrites` globally in `backend/index.js` after `express.json`. When the client declares a viewed term via `X-View-Term-School-Year` / `X-View-Term-Semester`, any `POST`/`PUT`/`PATCH`/`DELETE` for a different term returns **403**. This covers `staff_users`, `departments`, and `courses`, which have no term column.
- `frontend/src/utils/api.js` now forwards the viewed term (`teacher_view_term` / `admin_view_term`) as those headers, and clears both keys on 401. Admin and teacher sidebar logout also clear the corresponding key, so a stale archive selection cannot block a later session.
- Verified live with an admin JWT: closed-term section POST → **403**; archive-header section POST → **403**; active-term section POST → **201** then DELETE → **200**; closed-semester subject POST → **403**; active subject POST → **201**, archive-header DELETE → **403**, normal DELETE → **200**; archive-header user PATCH → **403**; archive-header GET → **200**; active-header section POST → **201**.
- `npm run build` passes.
- Docs updated: `00-overview/project-summary.md`, `01-features/feature-list.md`, `01-features/feature-details.md`, `03-api/api-routes.md`, `03-api/request-response.md`, `05-development/notes.md`, `05-development/coding-rules.md`, `06-decisions/decisions.md`, `05-development/bug-fixes.md`.

### Security: Row Level Security enabled (deny-all) on every table

- Added `backend/sql/enable_row_level_security.sql` (idempotent) and applied it to the live project as migration `enable_row_level_security`.
- All 13 `public` tables now have `relrowsecurity = true`: `departments`, `courses`, `staff_users`, `sections`, `students`, `subjects`, `teacher_assignments`, `activity_log`, `academic_terms`, `grading_components`, `component_activities`, `component_scores`, `attendance`.
- No policies are defined, so `anon`/`authenticated` get no rows and no writes. `anon`/`authenticated` also have **no table grants** on these tables.
- Backend unaffected: `service_role` has `rolbypassrls = true`. Verified `GET /api/users`, `/api/terms`, `/api/attendance`, and `/api/grading-components` all return **200**.
- Verified direct PostgREST access with the legacy anon key and the publishable key → **401** `permission denied for table students`.
- Supabase security advisor now reports only INFO `RLS Enabled No Policy` (×13) plus the pre-existing WARN `function_search_path_mutable` (×3, not changed here).
- Docs updated: `00-overview/setup-guide.md`, `02-database/database-schema.md`, `05-development/coding-rules.md`, `05-development/notes.md`, `06-decisions/decisions.md`, `05-development/bug-fixes.md`.

### Fixed: 403 responses no longer log the user out

- `backend/middleware/auth.js`: a missing, expired, or tampered JWT now returns **401** `{ "message": "Invalid or expired token. Please log in again." }` instead of 403. `authorizeRole` permission denials stay **403**.
- `frontend/src/utils/api.js`: replaced `handle403` with `handle401`. Only a 401 clears `token`/`user` and redirects to `/login`; 403 responses are returned to the page so it can show the message (closed term, wrong role, cross-scope access).
- The Authorization header is now omitted entirely when no token exists instead of sending `Bearer null`.
- Verified live with the backend running: no token → **401**, bad token → **401**, valid superadmin token → **200**, superadmin calling teacher-only `POST /api/grading-components` → **403** with the session intact.
- Docs updated: `01-features/feature-details.md`, `03-api/api-routes.md`, `03-api/request-response.md`, `05-development/bug-fixes.md`.

### Security: user APIs no longer return password hashes

- `backend/routes/users.js`: `GET /api/users` now selects an explicit `USER_PUBLIC_COLUMNS` list instead of `select('*')`, dropping the bcrypt `password` field.
- `POST /api/users` and `PATCH /api/users/:id` now select the same public list and pass the row through `omitPassword` before responding.
- `GET /api/users` keeps the `courses(name)` embed; all other fields used by the admin/superadmin UIs are unchanged.
- Verified live: minted a superadmin JWT, called `GET /api/users` → `200`, 3 rows, no `"password"` key, expected keys plus `courses`.
- Docs updated: `03-api/api-routes.md`, `03-api/request-response.md`, `05-development/bug-fixes.md`.

## 2026-10-22

### Added: DB-level constraints

- Added `backend/sql/add_db_constraints.sql` as the canonical, idempotent constraint migration.
- Pre-flight checks abort with a list if existing rows already violate a rule; the migration never rewrites grades, weights, or terms.
- Added `idx_academic_terms_one_active` (at most one active term) and `idx_staff_users_one_admin_per_department` (case/trim-insensitive, one admin per department).
- Added CHECKs: attendance `score 0..2`, component `weight 0..100`, activity `max_score > 0`, component score `>= 0`.
- Added triggers: component score `<= activity.max_score`, `max_score` cannot drop below existing scores, and a deferred trigger caps component weight totals at 100 per assignment + term.
- Backend routes now validate first and return **400**: attendance score range, bulk score against `max_score`, component weight/total, activity `max_score`, plus friendly 23505 mappings for duplicate admin/active term.
- SQL was syntax-reviewed only; run it in the Supabase SQL editor to apply it to the live database.

### Fixed: Attendance unique-constraint conflict

- Added `backend/sql/migrate_attendance_final.sql` as the canonical, idempotent attendance migration. It adds `score`/`session`/`type`/`term`, relaxes the legacy `status` column, preserves the `AM/PM` and `Lecture/Laboratory` checks, drops every older 3-column and 5-column unique constraint regardless of its name, and ensures the final 6-column constraint exists.
- Updated `backend/sql/create_attendance_table.sql` to create the final v2 shape directly (including the 6-column unique constraint) on a fresh database.
- Deprecated `alter_attendance_unique.sql`, `alter_attendance_session_type.sql`, `alter_attendance_term.sql`, and `migrate_attendance_v2.sql` — each is now a notice-only file pointing at the canonical migration, so applying them in any order can no longer reintroduce the 5-column constraint.
- No backend route change was needed: `POST /api/attendance/bulk` already targets `ON CONFLICT (teacher_assignment_id, student_id, date, session, type, term)`.
- SQL was syntax-reviewed only; run `migrate_attendance_final.sql` in the Supabase SQL editor to apply it to the live database.

### Fixed: JSON 404 + centralized backend error handling

- Added a catch-all in `backend/index.js`: unknown routes now return **404** `{ "message": "Route not found" }` instead of Express HTML.
- Added a 4-argument error middleware: malformed JSON → **400** `{ "message": "Invalid JSON body." }`, oversized body → **413** `{ "message": "Request body too large." }`, anything else → **500** `{ "message": "Server error" }` with details logged server-side.
- Added `backend/middleware/errors.js` with `sendServerError(res, err)`.
- Replaced all **49** `{ error: ...message }` database responses across 12 route files with `sendServerError`, so raw Supabase/Postgres text is never returned to the client.
- `POST /api/backup/export`, `POST /api/backup/restore`, and unexpected AI failures no longer echo `err.message`; AI 400 validation messages are preserved.
- `node --check` passes for `backend/index.js`, `backend/middleware/errors.js`, and every file in `backend/routes/`.

### Security: activity log identity is derived from the JWT

- `POST /api/activity` no longer reads `user_name` or `department` from the request body. Both values now come from the verified JWT (`req.user.username` / `req.user.department`), so an authenticated caller cannot forge another user's audit entry.
- The route now only requires `action`; `details` is optional and stored as `null` when omitted.
- Insert errors log server-side and return `{ "message": "Server error" }` instead of leaking raw database text.
- `node --check` passes for `backend/routes/activity.js`.

### Security: bulk score upsert validates every row

- `POST /api/component-scores/bulk` now resolves every distinct activity → component → assignment **before** writing. If any row points at another teacher's assignment, the whole batch returns `403 { "message": "Access denied." }` and nothing is saved.
- Term lock is now checked for every distinct assignment in the batch, not just `scores[0]`. A mixed-term payload is rejected with `403 "This term is closed..."`.
- Empty `scores` returns `[]`; rows missing `activity_id` or `student_id` return `400`.
- Removed the now-unused `checkTermClosedByScore` helper.
- `node --check` passes for `backend/routes/componentScores.js`.

### Security: read endpoints scoped to the caller

- Added `backend/middleware/access.js` with `canAccessAssignment`, `canAccessComponent`, and `canAccessSection`. Helpers fail closed and apply one policy: superadmin sees all, admin is limited to rows they created, teacher to their own assignments.
- Enforced the helpers on `GET /api/attendance`, `GET /api/attendance/dates`, `GET /api/attendance/computed-scores`, `GET /api/grading-components`, `GET /api/component-activities`, `GET /api/component-scores`, and `GET /api/sections/:sectionId/students`.
- Cross-scope requests now return `403 { "message": "Access denied." }` instead of leaking another section's data.
- Teacher-only writes are unchanged; `POST /api/attendance/bulk`, `DELETE /api/attendance/date`, and the score/activity mutations still use inline ownership checks.
- `node --check` passes on all changed backend files.

### Fixed: Login offline handling

- `backend/routes/auth.js`: detects Supabase connectivity failures (fetch/network/`ENOTFOUND`/`ECONNREFUSED`/timeout) and returns **503** with an offline message instead of falling through to `401 "Invalid username"`.
- `frontend/src/pages/Login.jsx`: blocks submission when `navigator.onLine` is false and shows **"You are currently offline. Please check your Wi-Fi or ethernet connection and try again."** Network failures while offline show the same message.
- A local backend that is down while the device is online still shows the existing "Cannot connect to the server..." message.

### Changed: Teacher pages — term tabs moved beside the assignment/term dropdown

- Attendance, Class Record, and Behavioral Analytics: the `PRELIMS / MIDTERMS / PRE-FINALS / FINALS` tab strip moved out of the title card's right-side action group. It now sits in the same row as the assignment/term dropdown, above the title card.
- Grade Summary has no term tab strip because it displays all terms at once, so only its assignment/term dropdown row applies (unchanged).
- Export buttons remain on the right side of the title card; Attendance's Add Date control also stays there.

### Changed: Analytics table header — merged TOTAL group

- In the Behavioral Analytics table, the upper header row now shows a single centered **TOTAL** header spanning the FINAL, SUB%, ATT%, and PERFORMANCE columns instead of repeating each label. The header uses `bg-amber-400` with `text-[#0c1925]` and an amber bottom border (no dark line).
- The lower header row keeps the sortable FINAL / SUB% / ATT% / PERFORMANCE labels, so sorting is unchanged. These labels now use the same `bg-gray-100/50` + `text-sidebar` styling as the per-component EQUIV / Performance / Sub% row.

### Changed: Behavioral Analytics student modal — cleaner layout, larger text

- Rebuilt the detail modal as a fixed-height panel: static header (student name, ID, final-grade badge) plus a separately scrolling body, wider (`max-w-4xl`) and taller (`85vh`).
- Replaced the cramped inline `W_TOTAL / EQUIV / Sub` metrics with four labeled tiles: **Weighted Total**, **Equivalent**, **Performance**, **Submitted**.
- Removed all 10px labels. Stat values, component names, activity rows, and the AI summary now use `text-sm` / `text-base` / `text-2xl`.
- KPI grid is 2 columns on small screens and 4 on `sm+`; activity names are wider and progress bars slightly taller.
- No data or behavior changes. `npm run build` passes.

### Chore: OpenCode V2 project config + SQL comment cleanup

Development tooling only — no application code changed.

- Added `.opencode/opencode.json` with `"instructions": ["docs/AGENTS.md"]` so the docs-system rules load automatically in OpenCode V2. V2 only auto-discovers `AGENTS.md` at the project root/ancestors, and this file lives under `docs/`.
- Removed two stale `opencode -s ses_...` session comments from the header of `backend/sql/schema.sql`. No SQL statements were changed.
- Audit result: no `CLAUDE.md`, no V1 plugins, and no OpenCode server API/client imports existed in the project, so no other V2 migration was required.

### Docs: full code-vs-docs audit and correction

Documentation only — no source files were changed.

- Rewrote `03-api/api-routes.md` with all **57 endpoints**, exact paths, and role guards. Added the previously undocumented `/api/ai` and `/api/backup` groups and `POST /api/grading-components/reorder`.
- Removed the nonexistent `POST /api/sections/seed` route; documented the real `GET /api/sections/seed/preview`.
- Corrected auth semantics: missing token → 401, invalid token → 403, JWT lifetime **1 day** (was "unspecified").
- Corrected error bodies: routes return `{ message }` or `{ error }`, not only `{ error }`.
- Corrected account provisioning: usernames are server-generated (`lastname.NNNN@sg`); `staff_id` is required and must be 9 digits.
- Corrected section creation: `name` is the section letter; the server builds `"<abbr> <year>-<letter>"`.
- Corrected attendance autosave from "2-second debounce" to **800 ms**, and documented the 30 s retry plus term-aware `localStorage` keys.
- Documented grade-summary weighting as `Σ(grade × weight) / Σ(weight)` — missing terms are renormalized, not treated as zero.
- Documented Excel/PDF export, AI student summary, and backup/restore, all of which were missing from the docs.
- Corrected stale UI names: `GlobalAnalytics` → `SuperAdminDashboard`; removed the header Reload button, "Remember Me", and "Forgot password".
- Added `/admin/bulk-students` to the routing tree and screen list.
- Corrected the design system: navy/gold palette and white page background (not `blue-600` / pearl `#F0EAD6`), Inter typography.
- Added database details: `departments.abbr`, `staff_users.staff_id`, indexes, the one-admin-per-department caveat, the attendance unique-constraint ambiguity, and the undefined legacy `admin_users` table.
- Added a known-gaps list in `05-development/notes.md` and new entries in `06-decisions/decisions.md`.
- Fixed `formula.md`: attendance columns are date+session+type (not always AM/PM pairs), the Step 7 example value, and marked DRP/P/F marks as not implemented.

## 2026-06-16

### Added: Pagination (15 per page) across all teacher data tables
- Created reusable `Pagination` component at `frontend/src/components/common/Pagination.jsx` with page number buttons, prev/next, ellipsis for large ranges, and "Showing X–Y of Z" label.
- **Attendance.jsx**: Students table now paginated at 15 rows per page. Search resets to page 1. Keyboard navigation (Arrow keys, Enter/Tab) operates within the paginated subset.
- **ClassRecord.jsx**: Students table paginated at 15 rows per page. Same search reset behavior and keyboard navigation.
- **BehavioralAnalytics.jsx**: Analytics table paginated at 15 rows per page. Search resets to page 1.
- **GradeSummary.jsx**: Grade summary table paginated at 15 rows per page. Search resets to page 1.

## 2026-06-04

### Removed: Sticky header attempts on ClassRecord — fully reverted to original table
- After multiple iterations (thead sticky → per-tr sticky → per-cell sticky → black borders), ClassRecord.jsx is fully restored to its original HEAD state. No overflow, sticky, or table-layout changes remain.
- All sticky-header related entries below are superseded by this revert.

### Added: Arrow key + Enter/Tab navigation in Attendance and Class Record tables
- **Attendance.jsx**: Arrow keys (Left/Right/Up/Down) and Enter/Tab/Shift+Tab now move focus between editable score cells. Uses `inputRefs` map and `handleKeyDown` callback. Search-filtered order is respected. Focused cell content auto-selects.
- **ClassRecord.jsx**: Same navigation for activity score inputs. Skips attendance columns (no per-activity inputs), TOTAL/EQUIV/W_TOTAL columns, and student info columns. Only navigates when `totalWeight === 100` and not read-only.
- Both: Stops at boundaries (first/last cell). Disabled inputs are skipped. Tab wraps to next row at column end.

### Fixed: Grade calculation functions extracted to shared utility (maintenance bug)
- Extracted `TERMS`, `TERM_PCTS`, `TERM_WEIGHTS`, `GRADE_RANGES`, `gradeToPoint`, `getComponentTotal`, `getComponentMaxTotal`, `getComponentEquiv`, `getComponentWeighted`, and `getFinalGrade` from `GradeSummary.jsx` into `frontend/src/utils/gradeCalculations.js`.
- Imported shared functions in `GradeSummary.jsx`, `ClassRecord.jsx`, and `BehavioralAnalytics.jsx`.
- Removed 5 duplicated function definitions from `ClassRecord.jsx` (lines 265-308) and `BehavioralAnalytics.jsx` (lines 72-105, 174-182).
- Any change to the transmutation formula or weight logic now needs only one edit instead of three copies.

### Fixed: Effect dependency uses `selectedAssignment` instead of `currentAssignment` (stale students bug)
- Changed `[selectedAssignment]` → `[currentAssignment]` in the student-fetching `useEffect` of `GradeSummary.jsx:94`, `ClassRecord.jsx:57`, and `BehavioralAnalytics.jsx:39`.
- Previously, on page refresh, `selectedAssignment` restores from localStorage immediately but `currentAssignment` starts as `null`. When assignments loaded, the effect didn't re-run because the dep (`selectedAssignment`) didn't change — students were never fetched.

### Fixed: Score input silently clamps without user feedback
- **ClassRecord.jsx**: Added `clampWarnings` state tracking. `handleScoreChange` now detects when `raw !== clamped` value and stores a 3-second warning. Score input cells show an amber border + small dot indicator when clamped. Weight inputs turn amber text when clamped.
- **Attendance.jsx**: Same pattern — `handleScoreChange` detects clamping to [0,2] range, shows amber border + dot indicator for 3 seconds.
- Both files: warnings auto-clear via `setTimeout` after 3 seconds. No toast library was needed.

## 2026-06-03

### Fixed: Add Subjects modal — missing state declarations and dropdown options
- Added missing `courses` and `selectedCourseId` state declarations in `AdminSubjects.jsx` (were used but never declared).
- Added "All Courses" option to the course filter select.

### Fixed: Attendance pending-save data corruption and flush bugs
- **Term key**: localStorage keys now encode the term (`pending_attendance_<id>_<term>`) so PRELIMS data can't be flushed to MIDTERMS.
- **Flush deps**: Added `selectedTerm` to the flush `useEffect` dependency array so it actually re-runs on term changes.
- **Auto-save zeroing**: `scheduleAutoSave` now skips columns not present in the map (`if (!map[key]) continue`) instead of defaulting to `score: 0`.
- **Periodic retry**: Added a 30s `setInterval` that re-flushes any remaining pending items in case the initial flush or auto-save failed.
- **beforeunload**: Updated to use the term-aware localStorage key.

### Fixed: Add Subjects dropdowns — added placeholder options and validation
- Added `disabled` placeholder options (`-- Select Course --`, `-- Select Year Level --`, `-- Select Semester --`) to all three dropdowns in the Add Subjects modal.
- Changed default states to empty strings so user must actively choose.
- Disabled Add button when year or semester aren't selected.

### Fixed: Semester is now required when creating subjects
- **Frontend** (`AdminSubjects.jsx:33`): Changed `addSemester` default from `''` to `'1st Semester'` and removed the `|| null` fallback in the POST body.
- **Backend** (`subjects.js:43-45`): Added validation requiring semester to be one of `1st Semester`, `2nd Semester`, or `Summer` — rejects null/empty.
- **Backend** (`subjects.js:22`): Changed GET filter from `or(semester.eq.X,semester.is.null)` to `eq('semester', semester)` so null-semester subjects no longer appear in filtered views.

### Fixed: Sticky behavior in Manage Sections page
- Changed inner wrapper from `min-h-screen` to `h-screen` in `AdminLayout.jsx:26` so flex container has a fixed height.
- Added `overflow-auto` back to `<main>` in `AdminLayout.jsx:63` — makes it the scroll container so `position: sticky` works within it.
- Changed `<main>` from `p-4 md:p-6 lg:p-8` to `overflow-auto px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8` (no top padding) so sticky headers sit flush against the fixed header.
- Added `pt-4 md:pt-6 lg:pt-8` to page wrappers in AdminDashboard, AdminTeachers, AdminSubjects, UserRoles, SecurityAudit, GlobalAnalytics to restore top spacing.
- Added `sticky top-0 z-10` to the Manage Sections header card in `AdminSections.jsx:318`.
- Changed sections panel to `position: sticky; top: 100px; align-self: start` in `AdminSections.jsx:361` so it sticks below the header card.

### Added: Duplicate section+subject validation in teacher assignment
- **Backend** (`backend/routes/assignments.js:60-70`): Added pre-insert check that prevents assigning any teacher to a section+subject combination that already has a teacher assigned (regardless of which teacher). Returns a clear error message showing the existing teacher's name.
- The frontend already displays backend error messages in the assign modal via `assignError`, so no frontend changes were needed for the error display.

## 2026-06-03

### Removed Uptime Health card from Security & Audit
- Removed the hardcoded "UPTIME HEALTH" (99.9%) metric card from `SecurityAudit.jsx`.
- Changed grid from `lg:grid-cols-4` to `lg:grid-cols-3` for the remaining 3 metrics.

### Changed Grade Summary to 20/20/20/40 weighted average
- Changed final grade computation from simple arithmetic mean to weighted average (PRELIMS 20%, MIDTERMS 20%, PRE-FINALS 20%, FINALS 40%).
- Added `TERM_WEIGHTS` constant in `GradeSummary.jsx`.
- Added percentage labels to term headers and Excel export.
- Updated `formula.md` Step 6 and full example to reflect weighted computation.

### Fixed: Sidebar nav item text wrapping on long names
- Added `whitespace-nowrap` to nav link className in `SuperAdminSidebar.jsx`, `AdminSidebar.jsx`, and `teacher/Sidebar.jsx` to prevent "Departments & Courses" and other long names from line-breaking.

## 2026-06-03

### Fixed: Superadmin counted as admin in Department User Overview
- `GlobalAnalytics.jsx:71`: removed `superadmin` from the admin counting condition so the superadmin user is no longer tallied as a department admin.
- Previously, if a department had 1 assigned admin and the superadmin also belonged to that department (default seed data), the overview showed 2 admins instead of 1.

## 2026-06-03

### Removed Reload Button from All Headers
- Removed the `RotateCw` reload button from `SuperAdminLayout.jsx`, `AdminLayout.jsx`, and `teacher/Header.jsx`.
- Removed associated `handleReload` logic and `refreshing` state from all three files.

### Main Content Background Changed to Pearl
- Changed `--color-bg-light` in `index.css` from `#fbf9f4` to `#F0EAD6` (pearl).
- All page backgrounds using `bg-bg-light` now render as pearl.

## 2026-06-03

### Dark Theme Extended to Sidebar & Header
- Updated CSS custom properties in `index.css`: sidebar bg from `#2f3640` to `#0f172a` (slate-900), hover to `#1e293b` (slate-800), active to `#020617` (slate-950).
- Applies to all three sidebars (Teacher, Admin, SuperAdmin) and all headers via existing `bg-sidebar` / `bg-sidebar-hover` / `border-sidebar-hover` classes.

## 2026-06-03

### Login Page Redesign — Dark Mode 2-Column Layout
- Complete visual overhaul: dark slate-900 background, gold accents, 2-column layout.
- Left column (42%): Login form in a dark slate-800/80 card with backdrop blur, centered vertically.
- Right column (58%, hidden below lg breakpoint): Gradient background (slate-800 → slate-900 → indigo-950) with abstract geometric decorations — gradient circles, grid dot overlay, diagonal SVG accent lines.
- Hero content: branding logo, tagline, 4 feature items (Grade Computation, Attendance, Class Management, Performance Reports) with Lucide icons on gold-tinted backgrounds.
- Copyright moved from separate footer bar to hero column bottom.
- Abstract geometrics replace hero.png illustration (user preference).

## 2026-06-03

### Fixed: Department-wide subjects hidden in teacher assignment dropdown
- **Frontend** (`AdminTeachers.jsx:199-200`): Client-side filter now includes subjects/sections with `course_id = null` (department-wide) when a specific course is selected.
- **Backend** (`subjects.js:22`): Semester filter now uses `.or()` to include subjects with `semester = null` ("All Semesters") alongside the selected semester.

### Subjects Persist Across Terms
- Removed `school_year` dependency from subjects — subjects are no longer filtered or tagged by school year.
- Added semester selector when creating subjects: admin picks `1st Semester`, `2nd Semester`, `Summer`, or `All Semesters` (NULL).
- Added semester filter dropdown in Manage Subjects page — "All Semesters" by default, can narrow by specific semester.
- Backend `GET /api/subjects` no longer accepts `school_year` query param; `semester` is optional.
- Backend `POST /api/subjects` accepts `semester` from request body instead of auto-tagging from active term.
- AdminTeachers assignment modal now fetches all subjects (no `school_year` filter).
- Archive mode no longer affects subject visibility.

## 2026-06-03

### Import Students from Excel
- Added "Import" button (blue) next to "Add Student" in Manage Sections that accepts `.xlsx`/`.xls` files.
- Parses Excel client-side using `xlsx` library; validates headers exactly match `Student ID, First Name, Last Name, MI, Gender`.
- Shows preview of all rows before importing.
- Backend `POST /api/sections/:sectionId/students/bulk` accepts a `students` array, skips duplicates, and returns `{ added, skipped }` summary.
- Reports skipped students with reason (duplicate ID, missing fields).

### Student Details — Structured Input Format
- Added `first_name`, `last_name`, `mi`, and `gender` columns to the `students` table (see `backend/sql/alter_students_add_details.sql`).
- Changed "Add Student" modal in AdminSections from a single `Student Name` field to individual fields: First Name, Last Name, M.I., Gender.
- `student_name` is now auto-computed as `Last, First M.` on the backend for backward compatibility.
- Updated backend `POST /api/sections/:sectionId/students` to accept `first_name`, `last_name`, `mi`, `gender` in addition to `student_id`.

## 2026-06-02

### Grade Point Conversion Updated to grade-point.md Spec
- `GRADE_RANGES` in `GradeSummary.jsx` updated to match `grade-point.md`: 1.00 = 98–100%, 1.25 = 95–97%, ..., 3.00 = 75–76%.
- `gradeToPoint()` now returns `{ gp, desc }` object with classification description.
- Remarks column shows classification (Excellent, Very Good, Satisfactory, Fair, Failed) instead of generic "Passed"/"Failed".
- Grade point legend at the bottom of the page converted from inline flex spans to a proper table with Grade/Equivalent/Description columns.

### Admin Recent Activity — Visibility Scoping
- Backend `GET /api/activity` completely reworked: superadmin sees all; admin sees only users in their department (superadmin usernames explicitly excluded via staff_users query).
- Frontend `AdminDashboard.jsx` labels own actions with "You created..." / "You deleted..." prefix.

### One Admin Per Department
- `POST /api/users` — rejects creating a second admin in a department that already has one.
- `PATCH /api/users/:id` — rejects changing an admin's department to one with an existing admin, and rejects promoting a user to admin when their department already has an admin.
- Backend now selects `department` in the target user query for the PATCH route.

## 2026-06-02

### FloatingAssignmentSelector — Removed All Term-Selection / Archive Features
- Removed Browse Archives button, term picker dropdown, and confirmation modal from FloatingAssignmentSelector.
- Selector now only lists filtered assignments from `TeacherContext` and lets the user pick one — no archive entry/exit logic.
- Archive mode can only be entered from TeacherSettings (`/teacher/settings`).
- Confirmation modal for archive entry is now exclusive to TeacherSettings.
- Dashboard term picker updated — archive entry removed; current term displayed only.

## 2026-06-02

### Teacher Settings Page — Archive Mode Management
- Created `TeacherSettings.jsx` (new page at `/teacher/settings`) patterned after `AdminSettings.jsx`.
- Shows active term with amber styling when not in archive mode.
- Lists all academic terms as clickable rows in "Term History" section.
- Clicking a past term → confirmation modal → enters archive mode.
- Clicking the active term (when in archive mode) → exits archive mode.
- Shows archive banner with current archive term info and "Exit Archive" button when in archive mode.
- Added route `<Route path="settings" element={<TeacherSettings />} />` in `App.jsx`.
- Added `Settings` nav item (gear icon, "Settings", path `/teacher/settings`) to teacher `Sidebar.jsx`.
- Added `case '/teacher/settings'` to `getTitle()` in `TeacherLayout.jsx`.

### TeacherLayout — Inner Component Refactor
- Refactored `TeacherLayout` into inner component pattern (`TeacherProvider` → `TeacherLayoutInner`) matching `AdminLayout` convention.
- `TeacherLayoutInner` consumes `useTeacher()` directly for `isArchiveMode`, `currentTerm`, and `setViewTerm`.
- Added archive mode amber banner rendered conditionally: "Viewing: {school_year} — {semester} — Read Only" with "Exit Archive" button.

### FloatingAssignmentSelector — Confirmation Modal Before Archive Entry
- Both the assignment dropdown and the term picker now show a confirmation modal before calling `setViewTerm`.
- Modal explains read-only restrictions with Cancel (gray) and View Archive (amber) buttons.
- Prevents accidental archive mode entry — user must explicitly confirm.

### TeacherContext — Added currentTerm
- Added `currentTerm` computed property (`viewTerm || activeTerm`) exposed from the context provider, mirroring `AdminContext` for consistency.

### AdminTeachers — Term-Relevant Assignment Filtering (Table Column + View Modal)

- **AdminTeachers.jsx**: The "Assigned Course" column now only shows assignments for `currentTerm` (active term normally, archive term when browsing archives). `teacherCourses` is computed via `useMemo` filtering `allAssignments` by `currentTerm.school_year` and `currentTerm.semester`.
- **openViewModal**: Fetches all assignments from the API but filters them client-side to only include those matching `currentTerm`. When no current-term assignments exist, the modal shows "No subjects assigned yet."
- **Active/Historical badge**: The View modal's group header badge always compares against `activeTerm` (the real active term from `AdminContext`), not `currentTerm`, so the green "Active" label is always correct regardless of archive mode.
- **Edge case — new semester**: When a new term starts and a teacher has no current-term assignments, the table column renders `—` and the View modal shows the empty state.

### AdminContext — Shared Term/Archive State for Admin Pages

- Created `AdminContext` (`frontend/src/contexts/AdminContext.jsx`) that fetches `activeTerm` and `allTerms` once, shares `currentTerm`, `isArchiveMode`, `viewTerm`, `setViewTerm`, and `loading` across all admin pages.
- **AdminDashboard.jsx** — removed local `activeTerm` state and its fetch from `/api/terms/active`. Now consumes `useAdmin()` for `currentTerm` and `isArchiveMode`.
- **AdminTeachers.jsx** — removed local `activeTerm` fetch (was in its own useEffect). Now uses `useAdmin()` for `currentTerm` and `isArchiveMode`. Assign button disabled in archive mode with tooltip. All references to `activeTerm` replaced with `currentTerm`.
- **AdminSubjects.jsx** — removed local `activeTerm` fetch, `showArchives` toggle, and archive schoolYear/semester dropdowns. Now uses `useAdmin()` for `currentTerm` and `isArchiveMode`. Add/delete buttons disabled in archive mode.
- **AdminSections.jsx** — updated to consume `useAdmin()` for `currentTerm` and `isArchiveMode` (was already migrated earlier).
- **AdminLayout.jsx** — updated to use `AdminProvider` wrapper and consume context for header display.
- **AdminSettings.jsx** — updated to consume `useAdmin()` for term/archive state.
- Admin view term persists to localStorage under key `admin_view_term`.

### Documentation
- Created initial documentation structure under `/docs`.
- Documented project summary, setup guide, features, database schema, API routes, UI screens, navigation, and design system.

### Academic Term Control
- Moved "End Semester" from Admin to Superadmin — changed backend role guard, created SuperAdminSettings page with the feature, added route + sidebar link, removed from AdminSettings (read-only view only).
- Removed all auto semester/school year detection globally. Superadmin now controls terms exclusively via `/api/terms/create` and `/api/terms/end`. Added "Create Term" UI to SuperAdminSettings. All roles gracefully handle "no active term" state.

### Subjects
- Added "All Courses (Department-wide)" option when creating subjects. Subjects with `course_id = null` are available across all courses and show up when filtering by any specific course.

### Read-Only Closed Term
- Added `checkTermClosed` family of helpers to backend: `checkTermClosed` (gradingComponents), `checkTermClosedByComponent`/`checkTermClosedByActivity` (componentActivities), `checkTermClosedByScore` (componentScores), `checkTermClosedByAssignment` (attendance).
- Backend mutation endpoints (POST/PUT/DELETE) return 403 if the assignment's term doesn't match the active term.
- Frontend: `isReadOnly` computed in ClassRecord.jsx and Attendance.jsx by comparing assignment school_year/semester vs active term.
- Frontend: amber banner "This term is closed. Viewing only.", all inputs disabled, add/delete buttons hidden.

### Global Assignment Selector
- Created `TeacherContext` (React Context) that fetches assignments and active term once, shares them across all teacher pages.
- Created `FloatingAssignmentSelector` component — a clickable dropdown at the top of Attendance, ClassRecord, GradeSummary, and BehavioralAnalytics pages.
- Selection persists to localStorage (`teacher_selected_assignment`) — survives page refreshes.
- Refactored Attendance.jsx, ClassRecord.jsx, GradeSummary.jsx, BehavioralAnalytics.jsx to consume `useTeacher()` context instead of fetching assignments locally.
- Removed redundant per-page assignment dropdown UIs and `activeTerm` fetches.
- Cleaned up unused imports (`useRef`, `dropdownRef`, `dropdownOpen`) from child pages.

### Admin Assignment UX — Additive Reassignment & Data Protection

- **AdminTeachers.jsx View modal**: Grouped assignments by `school_year | semester` with green `(Active)` and gray `(Historical)` badges. Delete button hidden for closed-term assignments (lock icon shown instead). Matches the teacher's FloatingAssignmentSelector grouping pattern.
- **AdminTeachers.jsx Assign modal**: Added bold notice — *"This creates a new assignment. Existing assignments and their data remain unchanged."* Shows the teacher's existing assignments grouped by term below the form so the admin can see current workload before assigning.
- **AdminTeachers.jsx Remove Assignment modal**: Added data-loss warning — *"This permanently deletes all grading components, scores, and attendance records. This action cannot be undone."*
- **No backend changes**: The existing `DELETE /api/assignments/:id` already returns 403 for closed-term assignments. The unique constraint `(teacher_id, section_id, subject_id, school_year, semester)` naturally supports additive assignments.

### Archive Mode Browsing
- **TeacherContext.jsx**: Added `allTerms` (fetched from `GET /api/terms`), `viewTerm`/`setViewTerm` state, derived `filteredAssignments` and `isArchiveMode`. `viewTerm` persists to localStorage (`teacher_view_term`).
- **FloatingAssignmentSelector.jsx**: Grouped dropdown items by `school_year | semester` with section headers. Clicking a past-term assignment auto-switches to archive mode. Amber "ARCHIVE" badge on button. "Exit Archive Mode" footer button in dropdown.
- **Dashboard.jsx**: Refactored to consume `useTeacher()` context. Replaced its own `activeTerm` fetch + semester dropdown with a unified term picker dropdown showing all terms from `allTerms`. Active term marked with "(Active)" badge. Archive mode amber badge + "Exit Archive" button.
- **Data pages** (Attendance, ClassRecord, GradeSummary, BehavioralAnalytics): No changes needed — they already consume `useTeacher()` and automatically react to `viewTerm`-filtered assignments. All past-term data is shown in read-only mode.
- **No backend changes**: `GET /api/assignments` already returns all teacher assignments regardless of term; frontend filtering avoids extra API calls.
