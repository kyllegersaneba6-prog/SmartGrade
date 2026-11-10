# Feature Details

## Backend Availability

- `BackendAvailability` wraps `App` in `main.jsx`, covering Login, every role page, redirects, and unknown URLs.
- Startup waits for `GET /api/health` before mounting routes. While that first check is pending, the UI shows **Connecting to Service** rather than a false outage.
- Failed/unreachable/invalid health response shows **Service Unavailable** and exactly: **The service could not be started. We're unable to process your request at this time.**
- Checks use the configured API base, no bearer/archive headers, a 5 s timeout, and 5 s polling; window focus, the browser's online event, and **Try Again** also trigger a check. In-flight checks are deduplicated.
- API network/5xx failures request a health check rather than directly declaring a global outage. Aborted requests do not. Login's raw fetch shares this detection.
- On a later outage, already-mounted routes are hidden/inert, not unmounted. Recovery reveals them without changing the URL, clearing sessions, reloading forms, or automatically replaying writes. Existing page-level retry/autosave behavior is unchanged.
- Health proves API-process reachability only; database/AI readiness is not checked. Bad credentials, forbidden actions, and database errors do not show the global screen while process health remains valid.

## Role Permissions

| Action | Superadmin | Admin | Teacher |
|---|---|---|---|
| Departments / courses CRUD | ✅ | — | — |
| Create admins | ✅ | — | — |
| Create teachers | — | ✅ | — |
| Academic terms (create/end) | ✅ | — | — |
| Sections, subjects, and assignments via PDF import | — | — | ✅ |
| Student roster import | — | — | ✅ |
| Grading components / activities / scores | — | — | ✅ |
| Attendance writes | — | — | ✅ |
| AI student summary | — | — | ✅ |
| Backup / restore | ✅ | — | — |
| Read audit log | All | Own department | Empty |

Notes:
- Admin gets **403** on legacy section, subject, and assignment management routes; teacher PDF import owns class setup.
- Admin/superadmin get **403** on every grading, score, and attendance write (teacher-only routes).
- `GET /api/users` is scoped per role, not role-gated.
- Admin reads/writes require both existing `created_by` ownership and matching department relationships. Teachers see only their assignments, sections, and subjects; course lists are department-scoped. Query filters can narrow scope, never replace it.
- **401 vs 403:** an expired/invalid token returns **401**, which makes `frontend/src/utils/api.js` clear the session and redirect to `/login`. A valid session that lacks permission (wrong role, closed term, another teacher's data) returns **403**, which keeps the user signed in and lets the page show the error. A 403 must never end the session.

### Session checks

- Every authenticated request verifies an HS256 JWT with expiry, reloads `staff_users`, and compares a keyed security fingerprint. Legacy tokens without the fingerprint require login again.
- Fingerprint inputs: ID, bcrypt hash, role, username, department, course, creator. Only the HMAC digest—not the password/hash—is in the token.
- Deleted/changed accounts return 401; missing/nonexistent admin/teacher department returns 403; account/department query failures return 503.
- `USR-` UUID-prefix login requires at least four canonical UUID characters and exactly one database match. All aliases share one account lockout bucket as well as existing username/IP limits.
- Wrong-password responses include remaining attempts from the tightest username/account/IP limit after recording the failure. The Login page displays this server-provided message directly. Successful login still clears username/account failures, while IP attempts expire via the existing sliding window; unknown-username/offline responses are unchanged.

## Account Provisioning

- Staff ID is exactly **9 digits**. The UI masks it as `00000-0000`; the server strips non-digits.
- Username is never typed by the user. It is derived as `lastname.<digits 3–7>@sg`, e.g. `"Santos"` + `123451234` → `santos.4512@sg`.
- Staff ID is fixed after account creation and is read-only in Admin and Teacher edit forms; `PATCH /api/users/:id` rejects attempts to change it.
- Username is re-derived when the last name changes on `PATCH /api/users/:id`; the staff ID remains unchanged.
- Teachers inherit their admin's department; superadmin picks an existing department for each admin. A supplied course must belong to that department.
- Editable account fields: names, course, and password; only superadmin may additionally change an admin's department. Staff ID, role, direct username, ID, and creator changes are rejected. Usernames remain server-derived.
- Default password in the creation forms is `smartgrade123`.
- Deleting a user first nulls `created_by` references in `staff_users`, `sections`, `subjects`, and `teacher_assignments`.

### Structural and roster relationships

- New sections require a course in the admin's department. Subject courses, when supplied, must also belong there; course-less department-wide subjects remain supported.
- New assignments require an owned teacher, section, and subject in the same department, compatible courses/year level/semester, and a section matching the requested active academic term. Legacy subjects with NULL semester apply across semesters.
- Student lookup returns only accessible enrollments, preferring the current academic term; ambiguous accessible matches return 409. Foreign matches are hidden as 404.
- Student add/import/delete require section access. Transfers require access to **both** sections and both must be in the active term, even without archive headers. Historical-enrollment preservation remains a later-phase task.
- The Transfer Student UI matches a complete nine-digit ID against the selected section's loaded roster, then loads course/year/term-filtered destinations once. A centered search indicator hides the student/destination panels until the request completes. Changing ID/year or closing the modal invalidates old responses; search loading and transfer submission use separate states.

## Academic Terms

- Superadmin exclusively creates and ends terms in `/superadmin/settings`.
- No date-based auto-detection of school year or semester.
- `GET /api/terms/active` returns **404** when no term is active; every role handles that gracefully.
- Ending a term sets `is_active = false`, `is_closed = true`, then upserts the chosen next term as active.
- Closed terms are read-only: mutations that touch that term return **403 "This term is closed. No modifications allowed."**
- Term locks use the shared `backend/middleware/termLock.js` (`assertActiveTerm`). `sections`, `subjects`, `assignments`, `grading-components`, `component-activities`, `component-scores`, and `attendance` reject writes for any non-active term. A global `rejectArchivedWrites` guard also blocks writes made while an archived term is selected (see Archive Mode).

## Archive Mode

- Entry point is **only** the Settings page (`/teacher/settings`, `/admin/settings`) — not the assignment selector.
- Clicking a past term shows a confirmation modal explaining read-only restrictions.
- Archive state lives in `TeacherContext` / `AdminContext` and persists:
  - teachers → `localStorage.teacher_view_term`
  - admins → `localStorage.admin_view_term`
- Layouts render an amber banner: `Viewing: {school_year} — {semester} — Read Only` with an **Exit Archive** button.
- Archive mode is enforced on both ends. The UI disables mutations, and `frontend/src/utils/api.js` attaches `X-View-Term-School-Year` / `X-View-Term-Semester` whenever a term is being viewed. The backend `rejectArchivedWrites` guard returns **403** when those headers do not match the active term, which also covers term-less tables (`staff_users`, `departments`, `courses`).
- Leaving archive mode removes the key; both sidebar logout and the 401 handler clear `teacher_view_term` / `admin_view_term` so a stale archive selection cannot block a later session.
- In archive mode, mutate buttons are disabled with the tooltip "Cannot modify while viewing archives".

## Attendance

- Columns are created per **date + session (AM/PM) + type (Lecture/Laboratory)**.
- Adding a date immediately persists blank attendance rows for the assignment's students, so the column remains visible after navigating away and back before scores are entered.
- Before a batch write, every student UUID must belong to the assignment's section; one invalid/foreign student rejects the whole batch without an upsert.
- Each cell is scored `0` Absent, `1` Late, `2` Present.
- Per-term total is the sum of marks; column max is `2 × number of columns`.
- Autosave: **800 ms** debounce, flushes through `POST /api/attendance/bulk`.
- Pending writes are cached in `localStorage` under `pending_attendance_<assignmentId>_<term>` (term-aware, so PRELIMS cannot flush into MIDTERMS).
- A 30 s interval retries anything left pending; `beforeunload` flushes too.
- Deleting a column sends the key in the **request body** of `DELETE /api/attendance/date`.
- Closed terms disable all inputs and show "This term is closed. Viewing only."

## Class Record / Grading

- Terms: `PRELIMS`, `MIDTERMS`, `PRE-FINALS`, `FINALS`.
- Components have a name, percentage weight, and optional `is_attendance` flag.
- The UI requires weights to total **100%** before score entry is considered valid; the backend caps each weight at `0..100` and the term total at 100, but does not require exactly 100 (so weights can be edited incrementally).
- Each component holds sub-activities with a `max_score` (default 100).
- Formula: `equiv = (total / max_total) × 50 + 50`; `weighted = equiv × weight / 100`; term grade = sum of weighted values.
- Blank or missing activity scores count as `0` toward Class Record totals while the editable score cell remains blank.
- Components can be reordered (drag-drop → `POST /api/grading-components/reorder`) and copied from PRELIMS (activities are **not** copied; target term must be empty).
- Component validation/API errors appear only inside the Add/Edit grading component modal; Class Record renders no page-level error banner under the assignment selector.
- Score saves are debounced **800 ms** and bulk-posted to `POST /api/component-scores/bulk`. The backend resolves every activity → component → assignment → section/student relationship, rejects the whole batch if any row is out of scope or the term is closed, and validates every score against the activity's `max_score`.
- Typing a value above `max_score` clamps it and shows an amber border + dot for 3 seconds.
- Keyboard navigation: arrows, Enter, Tab/Shift+Tab across score cells.
- Closed terms: inputs disabled, add/delete hidden, amber banner.

## Grade Summary

- Aggregates all four terms into a semester grade.
- Term weights: `PRELIMS 20%`, `MIDTERMS 20%`, `PRE-FINALS 20%`, `FINALS 40%`.
- `semestral = Σ(termGrade × weight) / Σ(weight)` — missing terms are renormalized by the sum of available weights, not treated as zero.
- Grade-point scale:

| Grade | Equivalent | Description |
|---|---|---|
| 1.00 | 98.00–100.00 | Excellent |
| 1.25 | 95.00–Below 98.00 | Very Good |
| 1.50 | 92.00–Below 95.00 | Very Good |
| 1.75 | 89.00–Below 92.00 | Very Good |
| 2.00 | 86.00–Below 89.00 | Satisfactory |
| 2.25 | 83.00–Below 86.00 | Satisfactory |
| 2.50 | 80.00–Below 83.00 | Satisfactory |
| 2.75 | 77.00–Below 80.00 | Fair |
| 3.00 | 75.00–Below 77.00 | Fair |
| 5.00 | Below 75.00 | Failed due to poor performance, absences, or withdrawal without notice |

- The on-screen legend shows the numeric scale only. The `DRP` / `P` / `F` special marks exist in `gradeCalculations.js` (`SPECIAL_MARKS`) and `gradeToPoint()` accepts them as strings, but they are hidden from the UI because the app accepts numeric grades only.
- `gradeToPoint()` returns `{ gp, desc }` (and `mark` for a special mark); the Remarks column shows the classification, not "Passed"/"Failed".
- Colour coding: grade ≥ 75 green, below red; G.P. ≤ 2.00 green, ≤ 3.00 amber, else red.
- Table scrolls horizontally; student columns stay frozen. Pagination uses the shared `TEACHER_TABLE_PAGE_SIZE`.
- PDF export appends a Grade Point Scale table.
- Full derivation: `docs/formula.md`.

## Behavioral Analytics

- One selected term at a time; four KPI cards: average final grade, average submission rate, average attendance rate, overall performance.
- Per student: per-component equivalence, submission %, final grade, attendance rate, overall performance, and a trend icon. Student detail shows blank or missing activity scores as `0 / max` (`0%`) and includes them in activity performance and the linear-regression trend data.
- Submission rate = activities with a non-zero score ÷ total activities (attendance uses score ÷ max).
- Trend = linear-regression slope across non-attendance activity percentages, including blank scores as zero, compared against `5% × mean`; below 2 activities → stable. The detail modal shows activity scores and the fitted regression line. Blank scores still count as not submitted for submission rate.
- Student detail modal exposes **Summarize Student** for the AI summary action.

## AI Student Summary

- Trigger: "Summarize Student" in the analytics student modal → `POST /api/ai/summarize-student`.
- Backend sanitizes the payload with an allowlist (`student{name,id}`, `performance`, `categories`, `meta{assignment_id,term}`) before sending.
- Gateway: OmniRoute (OpenAI-compatible). Request uses `response_format: json_object` and an `AbortController` timeout (`AI_TIMEOUT_MS`).
- Response is schema-validated (`aiValidator.js`): `summary`, `strengths[]`, `areas_of_attention[{area,observation,priority}]`, `suggested_actions[]`, `follow_up[]`, `overall_priority`.
- Invalid JSON or validation failure → **502**; timeout → **504**; both surface as "Unable to generate the AI summary right now."
- Read-only: no grade writes, no persistence. The AI is explicitly forbidden from calculating grades.
- Health check: `GET /api/ai/status` (all authenticated roles).
- Design notes: `TEACHER_ANALYTICS_AI.md` at the repo root.

## Subjects

- Teacher PDF import matches a subject by course, code, year level, school year, and semester, reusing a compatible existing subject when possible.
- The subject's course and term are checked against the signed-in teacher and active academic term.
- Admin subject-list/create/delete routes are blocked; teachers create or reuse subjects while importing their class lists.

## Students

- Structured fields: Student ID, First Name, Last Name, M.I., Gender.
- `student_name` is computed on the backend as `"Last, First M."` for compatibility with teacher pages.
- Uniqueness is per section: `UNIQUE(section_id, student_id)`.
- The roster table shows `#`, Student ID, Student Name, Gender, Action.
- Student records are section-wide and appear in each subject assigned to the same section.

### Teacher My Classes / PDF Import

- **My Class List** is available at `/teacher/my-class-list` and in the teacher sidebar.
- A section selector lists the teacher's existing section rosters. Import does not require an existing assignment.
- The browser reads text-based PDF class lists locally using PDF.js. It accepts the official class-list layout (up to 25 pages, 25 MB, and 500 student rows); scanned/image-only PDFs are not OCR-processed.
- The PDF's Subject Code, Descriptive Title, Section, Course, Year Level, Semester, and School Year are read from its header and roster. The term must match the active academic term. The section identifies the roster's course/year cohort; individual student rows may list different courses or year levels and are still imported into that section.
- On import, the backend creates or reuses the matching section, subject, and teacher assignment, then writes students to that section. Existing records are retained; a conflicting assignment owned by another teacher is rejected.
- The preview allows editing student fields, normalizes `M`/`F`, preserves the full M.I., and flags malformed IDs, missing names, invalid gender, duplicates in the PDF, and students already in the section. Student IDs must match `##-####-###`.
- Import is disabled for archived or inactive terms. The API verifies the signed-in teacher, department course, active term, roster metadata, and section ownership before writing; duplicate section IDs are ignored.
- Successful imports through both teacher roster-import endpoints add an audit entry with PDF format, section, subject code, school year, semester, and added/skipped counts only; student names, IDs, and grades are excluded.

## Admin class-management routes

- Admin no longer has section, subject, student roster, or teacher-assignment pages. Existing class records remain in the database.
- Admin retains teacher account creation, editing, and deletion. Teacher class setup and roster import happen in My Classes.
- The legacy admin Excel import page is no longer routed; new student lists are imported from the official PDF by teachers.

## Exports

All export files are generated client-side. After a file is generated successfully, Class Record and Grade Summary submit a teacher-only audit request scoped to the teacher's assignment.

Admin Settings → Exports stores the department's BSIT program head, BSCS program head, and CICT dean names. The Class Record and Grade Summary XLSX/PDF signature blocks use the saved values; the assignment's course abbreviation selects the matching program head. If no settings row exists, the existing signer names are used as defaults. Each confirmed admin save is recorded in the department's activity log, including the names changed (or that the settings were resaved without changes).

| Page | Formats |
|---|---|
| Class Record | `.xlsx`, `.pdf` |
| Grade Summary | `.xlsx`, `.pdf` (with grade-point legend) |

Export audit entries contain report type, file format, assignment-derived section/subject/term metadata, and exported student count; they do not contain student names, IDs, or grades.

Teacher and admin account tables (Admin → Teachers, Superadmin → Admin Management) no longer have export buttons.

Shared UI: `frontend/src/components/teacher/ExportButtons.jsx` (per-format spinner, disabled while busy).

**Class Record export gate:** Excel/PDF stay disabled until the selected term's grading-component weights total exactly 100% (rounded to 2dp). Until then the dropdown shows *"Export unlocks at 100% total weight."* Reason: `getFinalGrade()` only sums the weights that exist, so a partial weighting would export a deflated final grade. Score entry is locked by the same rule.

## Backup & Restore

- Superadmin-only (`/api/backup` is guarded at router level).
- Format: `.backup.sg`, magic `SGBK`, `formatVersion 1.0`, `schemaCompat 2026-10-12`, 50 MB cap.
- Export covers selectable categories with dependency closure: organization, accounts, terms, classes, teaching, grading, attendance, audit.
- The Organization category includes department export signatory settings.
- Each table is checksummed (SHA-256) and counted; the manifest records totals.
- Optional password encryption: AES-256-GCM with scrypt KDF; minimum 8-character password.
- Preview reports per-table insert-vs-existing counts for `merge`, `replace`, or `full`.
- After a backup file is attached, **Cancel** clears the file and resets restore validation, preview, confirmation, and completion state.
- Restore requires a typed confirmation: `CONFIRM` (merge/replace) or `FULL RESTORE`.
- Safety rules: an in-process lock rejects concurrent restores with **409**; merge blocks self-row edits and role escalation; replace never wipes `activity_log`; full restore rejects missing restorable tables before writing, replaces all restorable data in one database transaction, and preserves the caller's superadmin row and `activity_log`.
- Full restore calls the database function defined in `backend/sql/create_atomic_full_backup_restore.sql`. It is installed in the currently connected Supabase project; verify it separately in other target projects and ensure the backend RPC caller is deployed before attempting a restore.

## Audit Logging

- Entries store `user_name`, `action`, `details`, `department`, `created_at`.
- `GET /api/activity` scoping:
  - **Superadmin** — everything.
  - **Admin** — only usernames belonging to their department; superadmin usernames explicitly excluded.
  - **Teacher** — forced empty result.
- Logged events include logins (success/failure), user CRUD, department/course CRUD, backup export/restore, successful teacher roster imports, and Class Record/Grade Summary exports.
- `POST /api/activity` derives `user_name` and `department` from the verified JWT; any client-supplied values are ignored, so audit rows cannot be attributed to another user.
- The dedicated teacher export endpoint validates the assignment belongs to the caller and accepts only known report types, formats, terms, and a roster-bounded count; assignment metadata and actor identity are derived server-side.
- Import/export audit details contain only class, term, format (exports), and counts; they never contain student names, IDs, or grades.
- `audit.jsx` shows Critical Alerts, Total Logged Events, and Teacher Data Exports (with XLSX/PDF counts calculated independently of search/filter). It searches timestamp, user, role, action, and details; action filters include Import and Export. Search/filter reset pagination; the page shows 50 rows per page and auto-refreshes every 10 s while visible.

## Notifications

- Superadmins can send in-app notifications to selected Admin and Teacher roles, with title, message, and urgency.
- The backend snapshots eligible recipients at send time. Each recipient has independent read and dismissed state; dismissing hides the notification only for that recipient.
- Successful broadcasts add an activity-log entry with the notification title and recipient count; the message body is not copied into that audit entry.
- Admin and Teacher header bells show an unread count, expand a notification and mark it read, and allow per-recipient dismissal. The list refreshes when opened and every 30 seconds while the app is visible.
- Delivery is in-app only; no email, SMS, or browser push is sent.
- `backend/sql/create_broadcast_notifications.sql` is applied and read-only verified on the live database. Deploy the backend routes and frontend changes before production use; no test broadcast has been sent.
