# API Routes

Base URL: `http://localhost:5000`. All responses are JSON, including unmatched routes and unhandled errors.

## Authentication & Authorization

- Header: `Authorization: Bearer <jwt>`.
- Every router calls `router.use(authenticateToken)` **except** `/api/auth` (login is public) and `GET /`.
- Missing token → **401** `{ "message": "Access denied. No token provided." }`
- Invalid/expired token → **401** `{ "message": "Invalid or expired token. Please log in again." }`
- Wrong role → **403** `{ "message": "Access denied. Insufficient permissions." }`
- Convention: **401** means *not authenticated* (client clears the session and returns to login); **403** means *authenticated but not allowed* (client keeps the session and shows the message).
- JWT payload: `{ id, username, role, department }`, `expiresIn: '1d'`.
- Role strings: `superadmin`, `admin`, `teacher`.
- Closed/past term mutation → **403** `{ "message": "This term is closed. No modifications allowed." }`
- Archive guard: while an archived term is selected, the frontend sends `X-View-Term-School-Year` and `X-View-Term-Semester`. Any `POST`/`PUT`/`PATCH`/`DELETE` whose headers do not match the active term gets **403** from the global `rejectArchivedWrites` middleware, covering tables with no term column (`staff_users`, `departments`, `courses`).
- Ownership checks on reads and writes (teacher owns assignment/section; admin created the row) return **403**. The shared read helpers live in `backend/middleware/access.js`.
- Unknown route → **404** `{ "message": "Route not found" }`.
- Malformed JSON body → **400** `{ "message": "Invalid JSON body." }`.
- Unhandled server/database error → **500** `{ "message": "Server error" }`; details are logged server-side only.
- Error responses use one shape: `{ message }`. Backup validation is the exception, returning `{ ok: false, errors: [...] }`.

## Auth

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | `{ username, password }` → `{ token, user }`; logs success/failure. Returns **503** with an offline message when Supabase is unreachable |

Login lookup order: `staff_users` → legacy `admin_users` → `USR-` + UUID-prefix match. A dropped connection returns **503** instead of the `401` "Invalid username" response.

## Users

Router guarded by `authenticateToken` only; per-route role logic is inline.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/users` | Any auth | Superadmin: all. Admin: teachers in own department. Teacher: self. Responses never include `password` |
| POST | `/api/users` | Superadmin → admin only; Admin → teacher only | Requires 9-digit `staff_id`; username auto-generated; enforces one-admin-per-department; response never includes `password` |
| PATCH | `/api/users/:id` | Superadmin (admins); Admin (teachers they created) | Partial update; re-derives username; re-checks one-admin-per-department; response never includes `password` |
| DELETE | `/api/users/:id` | Superadmin (admins); Admin (teachers they created) | Nulls `created_by` references, then deletes |

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
| GET | `/api/courses` | Any auth | Optional `?department_id=` |
| POST | `/api/courses` | Superadmin | Uppercases abbreviation |
| PATCH | `/api/courses/:id` | Superadmin | Rename/abbr |
| DELETE | `/api/courses/:id` | Superadmin | Blocked while users/sections reference it |

## Sections

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/sections/seed/preview` | Any auth | Preview auto-generated names for `course_id` + `year_level` |
| GET | `/api/sections` | Any auth | Admin scoped to `created_by`; filters `year`, `course_id`, `school_year`, `semester` |
| POST | `/api/sections` | Admin | `name` is the section letter; server builds `"<abbr> <year>-<letter>"`; term-locked (`school_year` + `semester`) |
| DELETE | `/api/sections/:id` | Admin | Owner-only; term-locked; cascades students |
| GET | `/api/sections/:sectionId/students` | Any auth | Roster; superadmin: all; admin: sections they created; teacher: sections they teach |
| POST | `/api/sections/:sectionId/students` | Admin | One student; term-locked |
| DELETE | `/api/sections/students/:id` | Admin | Term-locked |
| POST | `/api/sections/:sectionId/students/bulk` | Admin | `{ students: [...] }` → `{ added, skipped[] }`; term-locked |

There is **no** `POST /api/sections/seed` route (only the preview).

## Subjects

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/subjects` | Any auth | Admin scoped to `created_by`; filters `year`, `semester`, `course_id` (matches course or NULL) |
| POST | `/api/subjects` | Admin | Requires `name`, `year_level`, `semester`; duplicate name-per-course check; term-locked |
| DELETE | `/api/subjects/:id` | Admin | Owner-only; term-locked against the subject's semester |

## Teacher Assignments

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/assignments` | Any auth | Superadmin: all; Teacher: own; Admin: `created_by` (`?teacher_id=`, `?subject_id=` allowed) |
| POST | `/api/assignments` | Admin | Term-locked; rejects an existing section+subject+term assignment |
| DELETE | `/api/assignments/:id` | Admin | Owner-only; term-locked |

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
| POST | `/api/grading-components/copy-from-prelims` | Teacher | Target term must be empty; activities not copied |
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
| POST | `/api/component-scores/bulk` | Teacher | `{ scores: [{ activity_id, student_id, score }] }`; verifies every row's assignment + term before writing; term-locked |

## Attendance

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/attendance` | Any auth | `?teacher_assignment_id=&date=&term=`; superadmin: all; admin: own assignments; teacher: own |
| GET | `/api/attendance/dates` | Any auth | Distinct date columns; same assignment scoping as `GET /api/attendance` |
| GET | `/api/attendance/computed-scores` | Any auth | `{ max_total, scores }`; same assignment scoping; `max_total = distinct(date\|session\|type) × 2` |
| POST | `/api/attendance/bulk` | Teacher | `{ teacher_assignment_id, date, records[], session, type, term }`; term-locked |
| DELETE | `/api/attendance/date` | Teacher | Filters sent in the **body**, not the URL; term-locked |

## Activity Log

Router guarded by `authenticateToken` only; no role checks.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/activity` | Any auth | Superadmin: all; Admin: department usernames (superadmins excluded); Teacher: empty |
| POST | `/api/activity` | Any auth | `{ action, details? }`; `user_name`/`department` are derived from the JWT and any body values are ignored |

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
