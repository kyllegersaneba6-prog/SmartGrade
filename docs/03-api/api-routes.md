# API Routes

Base URL: `http://localhost:5000`. All responses are JSON, including unmatched routes and unhandled errors.

## Authentication & Authorization

- Header: `Authorization: Bearer <jwt>`.
- Every router calls `router.use(authenticateToken)` **except** `/api/auth` (login is public); `GET /` and `GET /api/health` are also public application routes.
- Missing token → **401** `{ "message": "Access denied. No token provided." }`
- Invalid/expired token → **401** `{ "message": "Invalid or expired token. Please log in again." }`
- Wrong role → **403** `{ "message": "Access denied. Insufficient permissions." }`
- Convention: **401** means *not authenticated* (client clears the session and returns to login); **403** means *authenticated but not allowed* (client keeps the session and shows the message).
- JWT payload: `{ id, username, role, department, session }` plus `iat`/`exp`, `expiresIn: '1d'`; HS256 only. `session` is a keyed digest, not a password/hash. Authorization uses freshly loaded account fields, not token role/department snapshots.
- Deleted accounts, changed security fingerprints, or legacy JWTs without a fingerprint return **401**. Missing/nonexistent admin/teacher department returns **403**. Account/department verification failures return **503** without authenticating or clearing an existing frontend session.
- Role strings: `superadmin`, `admin`, `teacher`.
- Closed/past term mutation → **403** `{ "message": "This term is closed. No modifications allowed." }`
- Archive guard: while an archived term is selected, the frontend sends `X-View-Term-School-Year` and `X-View-Term-Semester`. Any `POST`/`PUT`/`PATCH`/`DELETE` whose headers do not match the active term gets **403** from the global `rejectArchivedWrites` middleware, covering tables with no term column (`staff_users`, `departments`, `courses`).
- `PUT /api/export-settings` is exempt from the archive guard because its department-wide signatories are not term data.
- Ownership checks on reads and writes (teacher owns assignment; admin created the row **and** relationships match their department) return **403**. Shared helpers live in `backend/middleware/access.js`. Student lookup hides inaccessible records as 404.
- Unknown route → **404** `{ "message": "Route not found" }`.
- Malformed JSON body → **400** `{ "message": "Invalid JSON body." }`.
- Unhandled server/database error → **500** `{ "message": "Server error" }`; details are logged server-side only.
- Error responses use one shape: `{ message }`. Backup validation is the exception, returning `{ ok: false, errors: [...] }`.

## Process Health

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | Public | `200 { "status": "ok", "service": "smartgrade-api" }`; `Cache-Control: no-store`; registered before archive/auth routers; no database/account/AI lookup |

Used by the global availability screen. Invalid JSON, another service's response, non-2xx, timeout, or connection failure count as unavailable. A running API can still report database-specific errors on other routes; process health is not a database-readiness guarantee.

## Auth

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | `{ username, password }` → `{ token, user }`; logs success/failure. Returns **503** with an offline message when Supabase is unreachable |

Login lookup order: exact `staff_users.username` → legacy `USR-` + unique canonical UUID prefix (minimum four characters), also in `staff_users`. Ambiguous prefixes do not select the first account. Aliases share account-level failed-login limits in addition to username/IP limits. A dropped connection returns **503** instead of `401` "Invalid username".

## Users

All routes authenticate; mutations additionally use `authorizeRole('superadmin', 'admin')` and target-account checks.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/users` | Any auth | Superadmin: all. Admin: teachers they created in their department. Teacher: self. Responses never include `password` |
| POST | `/api/users` | Superadmin → admin only; Admin → teacher only | Requires 9-digit `staff_id`; username auto-generated; enforces one-admin-per-department; response never includes `password` |
| PATCH | `/api/users/:id` | Superadmin (admins); Admin (owned teachers in own department) | Allowlisted profile fields; no role/direct username/creator/ID edits; course/department references checked |
| DELETE | `/api/users/:id` | Superadmin (admins); Admin (owned teachers in own department) | Nulls `created_by` references, then deletes; old sessions fail verification |

PATCH accepts `full_name`, `first_name`, `last_name`, `staff_id`, `course_id`, `password`; superadmin may additionally send `department` for admin accounts. Unsupported/protected fields return 403. POST accepts those provisioning fields plus `system_role`, with only superadmin→admin and admin→teacher creation permitted.

## Departments

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/departments` | Any auth | List with `abbr` |
| POST | `/api/departments` | Superadmin | Uppercases `abbr`; logs audit |
| PATCH | `/api/departments/:id` | Superadmin | Rename/abbr; cascades name to `staff_users.department` |
| DELETE | `/api/departments/:id` | Superadmin | Blocked if courses exist; sets users' department to `NULL` |

## Courses

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/courses` | Any auth | Optional `?department_id=` only narrows scope; admins/teachers always restricted to their current department |
| POST | `/api/courses` | Superadmin | Uppercases abbreviation |
| PATCH | `/api/courses/:id` | Superadmin | Rename/abbr |
| DELETE | `/api/courses/:id` | Superadmin | Blocked while users/sections reference it |

## Export Settings

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/export-settings` | Admin, Teacher | Returns signatories for the caller's own department, with defaults when none have been saved |
| PUT | `/api/export-settings` | Admin | Updates only the caller's department; requires BSIT program head, BSCS program head, and CICT dean names; records the confirmed save and changed names in the department activity log |

## Sections

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/sections/seed/preview` | Teacher/Superadmin | Preview auto-generated names for `course_id` + `year_level`; Admin receives 403 |
| GET | `/api/sections` | Teacher/Superadmin | Lists accessible sections; filters `year`, `course_id`, `school_year`, `semester`; Admin receives 403 |
| POST | `/api/sections` | Admin blocked | Legacy manual section creation returns 403; teacher imports class-list PDFs instead |
| DELETE | `/api/sections/:id` | Admin blocked | Legacy section deletion returns 403 |
| GET | `/api/sections/:sectionId/students` | Teacher/Superadmin | Roster for an accessible section; Admin receives 403 |
| GET | `/api/sections/find-student` | Teacher/Superadmin | `?student_id=`; accessible enrollment only; current term preferred; Admin receives 403 |
| PATCH | `/api/sections/students/:id/transfer` | Admin blocked | Legacy student transfer returns 403 |
| POST | `/api/sections/:sectionId/students` | Admin blocked | Legacy single-student entry returns 403 |
| DELETE | `/api/sections/students/:id` | Admin blocked | Legacy student deletion returns 403 |
| POST | `/api/sections/:sectionId/students/bulk` | Admin blocked | Legacy admin bulk import returns 403 |

There is **no** `POST /api/sections/seed` route (only the preview).

## Subjects

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/subjects` | Teacher/Superadmin | Teacher sees subjects on own assignments; filters `year`, `semester`, UUID `course_id`; Admin receives 403 |
| POST | `/api/subjects` | Admin blocked | Teacher PDF import creates or reuses the subject |
| DELETE | `/api/subjects/:id` | Admin blocked | Subject deletion is no longer available to Admin |

## Teacher Assignments

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/assignments` | Teacher/Superadmin | Teacher sees own assignments; Admin receives 403 |
| POST | `/api/assignments/import-class-list` | Teacher | `{ pdf_metadata, students[] }`; active term and department course checked; creates/reuses section, subject, assignment; validates section/course/year/term and student rows; duplicate IDs skipped |
| POST | `/api/assignments/:assignmentId/students/bulk` | Teacher | `{ pdf_metadata, students: [...] }`; assignment must belong to the teacher and be in the active term; PDF subject/section/course/year metadata is matched to the assignment; inserts are scoped to the assignment section; IDs use `##-####-###`; duplicate IDs are skipped |
| POST | `/api/assignments` | Admin blocked | Teacher PDF import creates assignments |
| DELETE | `/api/assignments/:id` | Admin blocked | Assignment deletion is no longer available to Admin |

## Academic Terms

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/terms/active` | Any auth | 404 when none active |
| GET | `/api/terms` | Any auth | All terms, ordered school year + semester desc |
| POST | `/api/terms/create` | Superadmin | 400 if a term is already active |
| POST | `/api/terms/end` | Superadmin | Closes active term, activates the chosen next term |

## Grading Components

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/grading-components` | Any auth | `?assignment_id=&term=`; superadmin: all; admin: own assignments; teacher: own; nests activities |
| POST | `/api/grading-components` | Teacher | `{ teacher_assignment_id, term, name, weight, is_attendance? }`; term-locked |
| POST | `/api/grading-components/reorder` | Teacher | `{ teacher_assignment_id, term, ordered_ids[] }`; must match the term's full set |
| PUT | `/api/grading-components/:id` | Teacher | Update `name`/`weight`; term-locked |
| POST | `/api/grading-components/copy-from-term` | Teacher | `{ teacher_assignment_id, source_term, target_term }`; source must be the immediately preceding term; target must be empty; activities not copied |
| DELETE | `/api/grading-components/:id` | Teacher | Cascades activities + scores; term-locked |

## Component Activities

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/component-activities` | Any auth | `?component_id=`; superadmin: all; admin: own assignments; teacher: own |
| POST | `/api/component-activities` | Teacher | `{ component_id, name, max_score? }`; term-locked |
| PUT | `/api/component-activities/:id` | Teacher | `name`/`max_score`; term-locked |
| DELETE | `/api/component-activities/:id` | Teacher | Cascades scores; term-locked |

## Component Scores

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/component-scores` | Any auth | `?assignment_id=&term=`; superadmin: all; admin: own assignments; teacher: own |
| POST | `/api/component-scores/bulk` | Teacher | `{ scores: [{ activity_id, student_id, score }] }`; every activity/assignment/student-section relationship and term checked before any write; mixed invalid batch rejected |

## Attendance

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/attendance` | Any auth | `?teacher_assignment_id=&date=&term=`; superadmin: all; admin: own assignments; teacher: own |
| GET | `/api/attendance/dates` | Any auth | Distinct date columns; same assignment scoping as `GET /api/attendance` |
| GET | `/api/attendance/computed-scores` | Any auth | `{ max_total, scores }`; same assignment scoping; `max_total = distinct(date\|session\|type) × 2` |
| POST | `/api/attendance/bulk` | Teacher | `{ teacher_assignment_id, date, records[], session, type, term }`; every student must be in the assignment section; whole invalid batch rejected; term-locked |
| DELETE | `/api/attendance/date` | Teacher | Filters sent in the **body**, not the URL; term-locked |

## Activity Log

Router guarded by `authenticateToken` only; no role checks.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/activity` | Any auth | Superadmin: all; Admin: current department AND its usernames (superadmins excluded); Teacher: empty |
| POST | `/api/activity` | Any auth | `{ action, details? }`; identity comes from the freshly verified account; body identity values ignored |

## AI

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/ai/status` | Teacher, Admin, Superadmin | Gateway + model + reachability; no secrets returned |
| POST | `/api/ai/summarize-student` | Teacher | Read-only narrative; 502 invalid output, 504 timeout |

## Backup & Restore

Router-level guard: `authenticateToken` + `authorizeRole('superadmin')` — every endpoint below is superadmin-only.

| Method | Route | Notes |
|---|---|---|
| GET | `/api/backup/categories` | Category list + per-table counts, `formatVersion` |
| POST | `/api/backup/export` | `{ categories[], password? }` → `{ filename, file, summary }`; 413 over 50 MB |
| POST | `/api/backup/validate` | `{ file, password? }`; magic, manifest, schema compat, checksums, counts |
| POST | `/api/backup/preview` | `{ file, password?, mode? }`; per-table insert-vs-existing counts |
| POST | `/api/backup/restore` | `{ file, password?, mode, confirm }`; `confirm` must be `CONFIRM` or `FULL RESTORE`; 409 if another restore is running |

## Not Implemented

| Expected | Reality |
|---|---|
| Grade computation endpoint | None — computed in the frontend |
| Grade-point conversion endpoint | None — `utils/gradeCalculations.js` |
| Notification/broadcast endpoint | None — UI only |
| `POST /api/sections/seed` | Removed/never existed; only `/seed/preview` |
| Excel generation endpoint | None — all Excel/PDF is client-side |
