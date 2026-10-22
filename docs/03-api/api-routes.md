# API Routes

Base URL: `http://localhost:5000`. All responses are JSON except unmatched routes (Express default HTML).

## Authentication & Authorization

- Header: `Authorization: Bearer <jwt>`.
- Every router calls `router.use(authenticateToken)` **except** `/api/auth` (login is public) and `GET /`.
- Missing token → **401** `{ "message": "Access denied. No token provided." }`
- Invalid/expired token → **403** `{ "message": "Invalid or expired token." }`
- Wrong role → **403** `{ "message": "Access denied. Insufficient permissions." }`
- JWT payload: `{ id, username, role, department }`, `expiresIn: '1d'`.
- Role strings: `superadmin`, `admin`, `teacher`.
- Closed/past term mutation → **403** `{ "message": "This term is closed. No modifications allowed." }`
- Ownership checks (teacher owns assignment / admin created the row) also return **403**.
- Error bodies are inconsistent: some routes return `{ message }`, others `{ error }`.

## Auth

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | `{ username, password }` → `{ token, user }`; logs success/failure |

Login lookup order: `staff_users` → legacy `admin_users` → `USR-` + UUID-prefix match.

## Users

Router guarded by `authenticateToken` only; per-route role logic is inline.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/users` | Any auth | Superadmin: all. Admin: teachers in own department. Teacher: self. |
| POST | `/api/users` | Superadmin → admin only; Admin → teacher only | Requires 9-digit `staff_id`; username auto-generated; enforces one-admin-per-department |
| PATCH | `/api/users/:id` | Superadmin (admins); Admin (teachers they created) | Partial update; re-derives username; re-checks one-admin-per-department |
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
| POST | `/api/sections` | Admin | `name` is the section letter; server builds `"<abbr> <year>-<letter>"` |
| DELETE | `/api/sections/:id` | Admin | Owner-only; term-locked; cascades students |
| GET | `/api/sections/:sectionId/students` | Any auth | Roster (no ownership check) |
| POST | `/api/sections/:sectionId/students` | Admin | One student; term-locked |
| DELETE | `/api/sections/students/:id` | Admin | Term-locked |
| POST | `/api/sections/:sectionId/students/bulk` | Admin | `{ students: [...] }` → `{ added, skipped[] }`; term-locked |

There is **no** `POST /api/sections/seed` route (only the preview).

## Subjects

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/subjects` | Any auth | Admin scoped to `created_by`; filters `year`, `semester`, `course_id` (matches course or NULL) |
| POST | `/api/subjects` | Admin | Requires `name`, `year_level`, `semester`; duplicate name-per-course check |
| DELETE | `/api/subjects/:id` | Admin | Owner-only; **not** term-locked |

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
| GET | `/api/grading-components` | Any auth (teacher must own the assignment) | `?assignment_id=&term=`; nests activities |
| POST | `/api/grading-components` | Teacher | `{ teacher_assignment_id, term, name, weight, is_attendance? }`; term-locked |
| POST | `/api/grading-components/reorder` | Teacher | `{ teacher_assignment_id, term, ordered_ids[] }`; must match the term's full set |
| PUT | `/api/grading-components/:id` | Teacher | Update `name`/`weight`; term-locked |
| POST | `/api/grading-components/copy-from-prelims` | Teacher | Target term must be empty; activities not copied |
| DELETE | `/api/grading-components/:id` | Teacher | Cascades activities + scores; term-locked |

## Component Activities

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/component-activities` | Any auth | `?component_id=`; no ownership check |
| POST | `/api/component-activities` | Teacher | `{ component_id, name, max_score? }`; term-locked |
| PUT | `/api/component-activities/:id` | Teacher | `name`/`max_score`; term-locked |
| DELETE | `/api/component-activities/:id` | Teacher | Cascades scores; term-locked |

## Component Scores

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/component-scores` | Any auth (teacher must own the assignment) | `?assignment_id=&term=` |
| POST | `/api/component-scores/bulk` | Teacher | `{ scores: [{ activity_id, student_id, score }] }`; upsert; term-locked |

⚠ Ownership for the bulk upsert is verified only for `scores[0]`.

## Attendance

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/attendance` | Any auth | `?teacher_assignment_id=&date=&term=`; no ownership check |
| GET | `/api/attendance/dates` | Any auth | Distinct date columns; no ownership check |
| GET | `/api/attendance/computed-scores` | Any auth (ownership enforced) | `{ max_total, scores }`; `max_total = distinct(date\|session\|type) × 2` |
| POST | `/api/attendance/bulk` | Teacher | `{ teacher_assignment_id, date, records[], session, type, term }`; term-locked |
| DELETE | `/api/attendance/date` | Teacher | Filters sent in the **body**, not the URL; term-locked |

## Activity Log

Router guarded by `authenticateToken` only; no role checks.

| Method | Route | Allowed | Notes |
|---|---|---|---|
| GET | `/api/activity` | Any auth | Superadmin: all; Admin: department usernames (superadmins excluded); Teacher: empty |
| POST | `/api/activity` | Any auth | Inserts a client-supplied row (trusts `user_name`/`department`) |

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
