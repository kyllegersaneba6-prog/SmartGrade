# Feature Details

## Role Permissions

| Action | Superadmin | Admin | Teacher |
|---|---|---|---|
| Departments / courses CRUD | ✅ | — | — |
| Create admins | ✅ | — | — |
| Create teachers | — | ✅ | — |
| Academic terms (create/end) | ✅ | — | — |
| Sections + students CRUD | — | ✅ | — |
| Subjects CRUD | — | ✅ | — |
| Teacher assignments CRUD | — | ✅ | — |
| Grading components / activities / scores | — | — | ✅ |
| Attendance writes | — | — | ✅ |
| AI student summary | — | — | ✅ |
| Backup / restore | ✅ | — | — |
| Read audit log | All | Own department | Empty |

Notes:
- Superadmin gets **403** on section, subject, and assignment writes (admin-only routes).
- Admin/superadmin get **403** on every grading, score, and attendance write (teacher-only routes).
- `GET /api/users` is scoped per role, not role-gated.
- **401 vs 403:** an expired/invalid token returns **401**, which makes `frontend/src/utils/api.js` clear the session and redirect to `/login`. A valid session that lacks permission (wrong role, closed term, another teacher's data) returns **403**, which keeps the user signed in and lets the page show the error. A 403 must never end the session.

## Account Provisioning

- Staff ID is exactly **9 digits**. The UI masks it as `00000-0000`; the server strips non-digits.
- Username is never typed by the user. It is derived as `lastname.<digits 3–7>@sg`, e.g. `"Santos"` + `123451234` → `santos.4512@sg`.
- Username is re-derived when last name or staff ID changes on `PATCH /api/users/:id`.
- Admins inherit the creator's department; superadmin picks the department for each admin.
- Default password in the creation forms is `smartgrade123`.
- Deleting a user first nulls `created_by` references in `staff_users`, `sections`, `subjects`, and `teacher_assignments`.

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
- Components can be reordered (drag-drop → `POST /api/grading-components/reorder`) and copied from PRELIMS (activities are **not** copied; target term must be empty).
- Score saves are debounced **800 ms** and bulk-posted to `POST /api/component-scores/bulk`. The backend resolves every activity → component → assignment, rejects the whole batch if any row is out of scope or the term is closed, and validates every score against the activity's `max_score`.
- Typing a value above `max_score` clamps it and shows an amber border + dot for 3 seconds.
- Keyboard navigation: arrows, Enter, Tab/Shift+Tab across score cells.
- Closed terms: inputs disabled, add/delete hidden, amber banner.

## Grade Summary

- Aggregates all four terms into a semestral grade.
- Term weights: `PRELIMS 20%`, `MIDTERMS 20%`, `PRE-FINALS 20%`, `FINALS 40%`.
- `semestral = Σ(termGrade × weight) / Σ(weight)` — missing terms are renormalized by the sum of available weights, not treated as zero.
- Grade-point scale:

| Grade | Equivalent | Description |
|---|---|---|
| 1.00 | 98–100% | Excellent |
| 1.25 | 95–97% | Very Good |
| 1.50 | 92–94% | Very Good |
| 1.75 | 89–91% | Very Good |
| 2.00 | 86–88% | Satisfactory |
| 2.25 | 83–85% | Satisfactory |
| 2.50 | 80–82% | Satisfactory |
| 2.75 | 77–79% | Fair |
| 3.00 | 75–76% | Fair |
| 5.00 | below 75% | Failed |

- `gradeToPoint()` returns `{ gp, desc }`; the Remarks column shows the classification, not "Passed"/"Failed".
- Colour coding: grade ≥ 75 green, below red; G.P. ≤ 2.00 green, ≤ 3.00 amber, else red.
- PDF export appends a Grade Point Scale table.
- Full derivation: `docs/formula.md`.

## Behavioral Analytics

- One selected term at a time; four KPI cards: average final grade, average submission rate, average attendance rate, overall performance.
- Per student: per-component equivalence, submission %, final grade, attendance rate, overall performance, and a trend icon.
- Submission rate = activities with a non-zero score ÷ total activities (attendance uses score ÷ max).
- Trend = linear-regression slope across activity percentages, compared against `5% × mean`; below 2 activities → stable.
- Student detail modal exposes **Summarize with AI**.

## AI Student Summary

- Trigger: "Summarize with AI" in the analytics student modal → `POST /api/ai/summarize-student`.
- Backend sanitizes the payload with an allowlist (`student{name,id}`, `performance`, `categories`, `meta{assignment_id,term}`) before sending.
- Gateway: OmniRoute (OpenAI-compatible). Request uses `response_format: json_object` and an `AbortController` timeout (`AI_TIMEOUT_MS`).
- Response is schema-validated (`aiValidator.js`): `summary`, `strengths[]`, `areas_of_attention[{area,observation,priority}]`, `suggested_actions[]`, `follow_up[]`, `overall_priority`.
- Invalid JSON or validation failure → **502**; timeout → **504**; both surface as "Unable to generate the AI summary right now."
- Read-only: no grade writes, no persistence. The AI is explicitly forbidden from calculating grades.
- Health check: `GET /api/ai/status` (all authenticated roles).
- Design notes: `TEACHER_ANALYTICS_AI.md` at the repo root.

## Subjects

- Subjects can be created with `course_id = null` ("All Courses (Department-wide)").
- `GET /api/subjects` matches a specific `course_id` **or** NULL, so department-wide subjects appear everywhere.
- Subjects persist across school years; `school_year` is retained but no longer used for filtering.
- Semester is required on create (`1st Semester`, `2nd Semester`, `Summer`). The DB column allows NULL, but the route rejects it.
- Manage Subjects has a semester filter and a four-column year-level board.
- Create and delete are term-locked: `POST` compares the requested semester, `DELETE` compares the subject's semester, and both return **403** when it is not the active term. In archive mode, add/delete are also disabled in the UI.

## Students

- Structured fields: Student ID, First Name, Last Name, M.I., Gender.
- `student_name` is computed on the backend as `"Last, First M."` for compatibility with teacher pages.
- Uniqueness is per section: `UNIQUE(section_id, student_id)`.
- The roster table shows `#`, Student ID, Student Name, Gender, Action.

## Excel Import / Template

- **Import** in Manage Sections accepts `.xlsx`/`.xls`, parsed client-side with `xlsx`.
- Required headers, exactly: `Student ID`, `First Name`, `Last Name`, `MI`, `Gender`.
- Header mismatch shows expected vs found headers.
- Preview splits into *Students to Add* and *Skipped (Duplicate ID)*, then posts to `POST /api/sections/:sectionId/students/bulk`.
- Backend returns `{ added, skipped[] }`; skipped rows include a reason.
- `/admin/bulk-students` is a separate Excel-template builder (`firstname`, `lastname`, `middle initial`, `student id`, `gender`) that downloads a blank or completed `.xlsx`. It is not yet linked from the Sections page.

## Exports

All export work is client-side.

| Page | Formats |
|---|---|
| Class Record | `.xlsx`, `.pdf` |
| Grade Summary | `.xlsx`, `.pdf` (with grade-point legend) |

Teacher and admin account tables (Admin → Teachers, Superadmin → Admin Management) no longer have export buttons.

Shared UI: `frontend/src/components/teacher/ExportButtons.jsx` (per-format spinner, disabled while busy).

**Class Record export gate:** Excel/PDF stay disabled until the selected term's grading-component weights total exactly 100% (rounded to 2dp). Until then the dropdown shows *"Export unlocks at 100% total weight."* Reason: `getFinalGrade()` only sums the weights that exist, so a partial weighting would export a deflated final grade. Score entry is locked by the same rule.

## Backup & Restore

- Superadmin-only (`/api/backup` is guarded at router level).
- Format: `.backup.sg`, magic `SGBK`, `formatVersion 1.0`, `schemaCompat 2026-10-12`, 50 MB cap.
- Export covers selectable categories with dependency closure: organization, accounts, terms, classes, teaching, grading, attendance, audit.
- Each table is checksummed (SHA-256) and counted; the manifest records totals.
- Optional password encryption: AES-256-GCM with scrypt KDF; minimum 8-character password.
- Preview reports per-table insert-vs-existing counts for `merge`, `replace`, or `full`.
- Restore requires a typed confirmation: `CONFIRM` (merge/replace) or `FULL RESTORE`.
- Safety rules: an in-process lock rejects concurrent restores with **409**; merge blocks self-row edits and role escalation; replace never wipes `activity_log`; full restore always preserves the caller's own superadmin row.

## Audit Logging

- Entries store `user_name`, `action`, `details`, `department`, `created_at`.
- `GET /api/activity` scoping:
  - **Superadmin** — everything.
  - **Admin** — only usernames belonging to their department; superadmin usernames explicitly excluded.
  - **Teacher** — forced empty result.
- Logged events include logins (success/failure), user CRUD, department/course CRUD, and backup export/restore.
- `POST /api/activity` derives `user_name` and `department` from the verified JWT; any client-supplied values are ignored, so audit rows cannot be attributed to another user.
- `SecurityAudit.jsx` filters by action type, paginates 10 rows, and auto-refreshes every 10 s while the tab is visible.

## Notifications

- The superadmin dashboard has an audience/title/message/urgency form with a success banner.
- Nothing is sent: the handler only `console.log`s. No notification table, route, or delivery exists.
- `NotificationDropdown` in admin/teacher headers is always empty.
