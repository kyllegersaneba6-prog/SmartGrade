# Request / Response Examples

All authenticated calls need:

```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

Tokens are issued at login and expire after **1 day**.

Tokens also contain an opaque `session` fingerprint. Each request reloads the account; deleted accounts, changed security fields, and pre-Phase-1 tokens return 401. A database verification outage returns 503; an admin/teacher without an existing department gets 403. Never decode token claims as a substitute for backend authorization.

Status convention: **401** = no/expired/invalid session (the frontend `utils/api.js` clears the token and redirects to `/login`); **403** = valid session but the action is not allowed (closed term, wrong role, cross-scope). A 403 leaves the user signed in so the page can display the message.

## Export Signatory Settings

`GET /api/export-settings` is available to Admin and Teacher accounts and returns the settings for the authenticated user's department. If no settings row has been saved, the legacy signer names are returned as defaults.

```json
{
  "department_id": "<authenticated department UUID>",
  "program_head_bsit": "ARIEL T. SUMAGAYSAY, MSCS, MAEd",
  "program_head_bscs": "ARIEL T. SUMAGAYSAY, MSCS, MAEd",
  "dean_cict": "MAE B. LODANA, Ph.D."
}
```

`PUT /api/export-settings` is Admin-only. The department is taken from the authenticated account, not from the request body.

```json
{
  "program_head_bsit": "Name and credentials",
  "program_head_bscs": "Name and credentials",
  "dean_cict": "Name and credentials"
}
```

Each name must be 1–160 characters on one line. The saved values are used by Class Record and Grade Summary XLSX/PDF exports; the course abbreviation selects the BSIT or BSCS program-head setting. This department-wide update remains available while an archived term is selected.

## Public Process Health

```text
GET /api/health
No authentication or archive headers

200 OK
Cache-Control: no-store
{ "status": "ok", "service": "smartgrade-api" }
```

The UI validates both fields, with 5 s polling and a 5 s timeout. When this endpoint cannot be reached/validated, every route shows:

> **Service Unavailable**
>
> The service could not be started. We're unable to process your request at this time.

**Try Again** requests another health check; recovery restores the current UI/session without replaying the failed request. A database-route 503 alone does not trigger this screen if process health remains available.

## Archive Write Guard

While browsing an archived term, the client sends `X-View-Term-School-Year` and `X-View-Term-Semester` on every request. Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) whose headers differ from the active term return:

```json
403: { "message": "This term is closed. No modifications allowed." }
```

Reads are unaffected. Requests without the headers (normal, non-archive use) are unaffected. `PUT /api/export-settings` and `POST /api/auth/change-password` remain available because they change account/department-level settings, not term data.

## In-App Notifications

The notification router requires a valid JWT. Feed and read/dismiss operations use only the authenticated account's recipient rows. Feed and read/dismiss operations remain available in archive mode because notification state is account-level; posting a broadcast is blocked while viewing a closed term.

### Get the current user's feed

```text
GET /api/notifications

200 OK
Cache-Control: no-store
{
  "items": [
    {
      "id": "<notification UUID>",
      "title": "Class schedule update",
      "content": "Please review the updated schedule.",
      "urgency": "Not Urgent",
      "createdAt": "2026-11-08T10:30:00.000Z",
      "readAt": null
    }
  ],
  "unreadCount": 1
}
```

`items` contains at most the 50 newest notifications not dismissed by this user. `unreadCount` counts all of this user's non-dismissed unread notifications, including items outside that 50-item feed.

The feed remains available while browsing an archived term.

### Send a broadcast (superadmin only)

```text
POST /api/notifications
Body: {
  "title": "Class schedule update",
  "content": "Please review the updated schedule.",
  "urgency": "Not Urgent",
  "audience": ["admin", "teacher"]
}

201 Created
{
  "ok": true,
  "notification": {
    "id": "<notification UUID>",
    "created_at": "2026-11-08T10:30:00.000Z",
    "recipient_count": 12
  }
}
```

`title` is 1–160 trimmed characters; `content` is 1–2000 trimmed characters; `urgency` is `Not Urgent` or `Urgent`; `audience` is a non-empty array containing `admin`, `teacher`, or both. Recipients are snapshotted from current accounts when sent. `400` indicates invalid fields or no users in the selected audience; `403` indicates a non-superadmin sender.

Broadcast creation is rejected by the archive write guard while the caller is viewing a closed semester.

### Mark a notification read

```text
POST /api/notifications/<notification UUID>/read
200: { "ok": true }
```

Only the caller's recipient row is updated. An unknown ID, a notification sent to another user, or an already dismissed item is a successful no-op, so the endpoint does not reveal another user's delivery state. A malformed UUID returns `400`.

### Dismiss a notification

```text
DELETE /api/notifications/<notification UUID>
200: { "ok": true }
```

Dismissal is per-user and removes that item from the caller's feed. Unknown IDs or IDs belonging to another user are successful no-ops; a malformed UUID returns `400`. All notification endpoints return the standard `401` for an invalid session. The API depends on `backend/sql/create_broadcast_notifications.sql`; without that migration, database requests fail with the generic `500 { "message": "Server error" }` response.

## Login

```
POST /api/auth/login
Body: { "username": "staff_username", "password": "<provided securely at runtime>" }

200:
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "username": "staff_username",
    "role": "teacher",
    "first_name": "Example",
    "last_name": "Teacher",
    "full_name": "Example Teacher",
    "department": "Example department",
    "course_id": null,
    "course_name": null,
    "system_role": "teacher"
  }
}
```

Failures:
- Unknown username → `401 { "message": "Invalid username " }` (trailing space is in the source)
- Wrong password → `401 { "message": "Invalid password. 4 attempts remaining." }` (example after the first failure with default limits and no prior attempts). Uses singular `1 attempt remaining`; at zero: `Invalid password. 0 attempts remaining. Please try again later.` The count is the smallest remaining username/account/IP budget after recording this attempt, never negative; it is not hardcoded to five. Subsequent blocked requests still return 429.
- Existing account without a valid department → `403 { "message": "A valid department is required. Contact your administrator." }`
- Account or alias rate limit → `429 { "message": "Too many login attempts. Please try again later." }` with `Retry-After`; different aliases cannot bypass the account bucket
- Supabase unreachable (no internet) → `503 { "message": "You are currently offline. Please check your Wi-Fi or ethernet connection and try again." }`

Login lookup errors caused by a dropped connection are detected explicitly, so an offline attempt never reports "Invalid username". Only an existing account's failed password attempt is written to the audit log.

## Change Password

All authenticated roles can change their own password. The endpoint requires the current password, checks the new password length (12–72 UTF-8 bytes), rejects reuse of the exact current password, and shares the account-level failed-password limit with login.

```text
POST /api/auth/change-password
Body: { "current_password": "<current password>", "new_password": "<new password>" }

200: { "message": "Password updated. Please sign in again." }
```

Incorrect current password returns 400; an account-level rate limit returns 429 with `Retry-After`. The UI clears the local session and redirects to login. The password hash is never returned; a changed security fingerprint rejects all existing tokens on subsequent API requests. The account-level operation remains available while viewing an archived term.

## List Managed Teachers (Admin)

`GET /api/users` returns an array. For Admin, each managed teacher also includes `teacher_class_count`, the number of unique teacher/section/subject assignments attributed to that admin for the active semester (or the selected archived semester when viewing an archive). Re-importing the same class does not increase this count.

```json
[
  {
    "id": "<teacher UUID>",
    "full_name": "John Santos",
    "username": "santos.4512@sg",
    "teacher_class_count": 3
  }
]
```

## Create Teacher (Admin)

Username is generated by the server — do **not** send it.

```
POST /api/users
Auth: admin
Body:
{
  "first_name": "John",
  "last_name": "Santos",
  "full_name": "John Santos",      // optional; derived from first/last
  "system_role": "teacher",
  "staff_id": "123451234",
  "password": "<set securely at runtime>"
}

201: { "id": "uuid", "full_name": "John Santos", "username": "santos.4512@sg", ... }
```

`password` is write-only. `GET`, `POST`, and `PATCH /api/users` select an explicit
public column list and strip the field before responding, so a bcrypt hash is
never sent to the browser. Required response columns: `id`, `first_name`,
`last_name`, `full_name`, `username`, `staff_id`, `department`, `course_id`,
`system_role`, `created_by`, `created_at` (list also embeds `courses(name)`).

`department` is inherited from the calling admin. Superadmin must supply `department` when creating an admin.
400 cases: duplicate full name, invalid staff ID, missing fields, admin already exists in the department.

An explicit foreign department is rejected with 403; a course outside the inherited department is rejected with 400. An admin cannot create another admin/superadmin, regardless of body fields.

## Update an Account

```json
PATCH /api/users/<owned-teacher-id>
{ "first_name": "John", "last_name": "Santos" }
```

- Admin: owned teachers in the same department only. Superadmin: admin accounts only.
- Allowed: names, `course_id`, optional nonblank `password`. Superadmin may also change `department` to an existing department.
- Staff ID is immutable after account creation. Sending `staff_id`, `system_role`, `username`, `created_by`, `id`, or another unsupported field returns **403**, even alongside valid fields. No partial profile update occurs.
- Passwords/hashes are not returned. Changing a fingerprinted field makes the account's previous tokens fail on their next request.

## Create Section

`name` is only the section letter — the server prefixes the course abbreviation and year number.

```
POST /api/sections
Auth: admin
Body:
{
  "name": "A",
  "year_level": "1st",
  "course_id": "uuid",
  "school_year": "2025-2026",
  "semester": "1st Semester"
}

201: { "id": "uuid", "name": "BSIT-1A", "year_level": "1st", ... }
```

Duplicate → `400 { "message": "A section with this name already exists in this course." }`
Missing/foreign course → 403; new sections require a course in the admin's department.

## Create Teacher Assignment

```
POST /api/assignments
Auth: admin
Body:
{
  "teacher_id": "uuid",
  "section_id": "uuid",
  "subject_id": "uuid",
  "school_year": "2025-2026",
  "semester": "1st Semester"
}

201: { "id": "uuid", ... }
```

Term must be the active term, otherwise `403`. The section+subject+term combination must be unassigned.
The teacher, section, and subject must be owned and department-compatible. Incompatible course/year/semester relationships return 400; foreign ownership returns 403. Subject `course_id = null` means department-wide; a legacy NULL semester permits any semester.

## Batch Student Membership

Both `POST /api/component-scores/bulk` and `POST /api/attendance/bulk` resolve **every** student's UUID to its current section before writing:

```json
403: { "message": "Every student must belong to the assignment section." }
```

One foreign, nonexistent, or different-section student rejects the entire batch; no valid prefix of the batch is saved. Being the teacher for two assignments does not make their rosters interchangeable.

## Student Lookup and Transfer

- `GET /api/sections/find-student?student_id=...`: only accessible enrollments are returned, preferring the active term. Missing/foreign student → 404; multiple remaining accessible enrollments → 409.
- `PATCH /api/sections/students/<student-uuid>/transfer` with `{ "target_section_id": "uuid" }`: checks source and destination ownership/department and verifies **both** are active-term sections. No archive headers are needed for these checks.

## Create Grading Component

```
POST /api/grading-components
Auth: teacher
Body:
{
  "teacher_assignment_id": "uuid",
  "term": "PRELIMS",
  "name": "Quizzes",
  "weight": 40,
  "is_attendance": false
}

201: { "id": "uuid", "sort_order": 0, ... }
```

## Create Activity

```
POST /api/component-activities
Auth: teacher
Body: { "component_id": "uuid", "name": "Quiz 1", "max_score": 20 }

201: { "id": "uuid", "name": "Quiz 1", "max_score": 20, "sort_order": 0 }
```

## Constraint / validation errors

The DB constraints in `add_db_constraints.sql` are a backstop. Routes validate first and return **400** with `{ "message": "..." }`:

| Request | Condition | Example message |
|---|---|---|
| `POST /api/attendance/bulk` | any `score` outside `0..2` | `Attendance score must be between 0 and 2.` |
| `POST /api/component-scores/bulk` | `score` outside `0..activity.max_score` | `Score for Quiz 1 must be between 0 and 20.` |
| `POST/PUT /api/grading-components` | `weight` outside `0..100` or term total over 100 | `Total weight for this term cannot exceed 100%. Current total: 90%.` |
| `POST/PUT /api/component-activities` | `max_score <= 0` or below an existing score | `Cannot set max score to 10: 2 existing score(s) exceed it.` |
| `POST/PATCH /api/users` | second admin in the same department | `An admin already exists in this department.` |
| `POST /api/terms/create` | an active term already exists | `An active term already exists. End it first.` |

## Reorder Components

```
POST /api/grading-components/reorder
Auth: teacher
Body: {
  "teacher_assignment_id": "uuid",
  "term": "PRELIMS",
  "ordered_ids": ["uuid-a", "uuid-b", "uuid-c"]
}
```

`ordered_ids` must contain exactly the components for that assignment + term.

## Bulk Save Scores

```
POST /api/component-scores/bulk
Auth: teacher
Body:
{
  "scores": [
    { "activity_id": "uuid", "student_id": "uuid", "score": 85 }
  ]
}
```

Upserts on `(activity_id, student_id)`. Every distinct activity is resolved through component → assignment before anything is written; if any row belongs to another teacher or a closed term, the whole batch is rejected with `403` and nothing is saved.

## Bulk Save Attendance

```
POST /api/attendance/bulk
Auth: teacher
Body:
{
  "teacher_assignment_id": "uuid",
  "date": "2025-09-01",
  "session": "AM",
  "type": "Lecture",
  "term": "PRELIMS",
  "records": [
    { "student_id": "uuid", "score": 2 },
    { "student_id": "uuid", "score": 0 }
  ]
}

200: [
  { "id": "uuid", "teacher_assignment_id": "uuid", "student_id": "uuid", "date": "2025-09-01", "score": 2, "session": "AM", "type": "Lecture", "term": "PRELIMS" }
]
```

The current handler does not require `session`, `type`, or `term` even though they are part of the unique upsert key; omitting them writes NULL values and may permit duplicate logical rows.

## Delete Attendance Column

Parameters go in the body (unusual for DELETE):

```
DELETE /api/attendance/date
Auth: teacher
Body: {
  "teacher_assignment_id": "uuid",
  "date": "2025-09-01",
  "session": "AM",
  "type": "Lecture",
  "term": "PRELIMS"
}
```

Legacy single-student entry `POST /api/sections/:sectionId/students` returns 403 for admins.

## Legacy Admin Roster Routes

`POST /api/sections/:sectionId/students/bulk`, single-student entry, student deletion, and manual section management return **403** for admins. Teacher class lists are imported from My Classes.

## Teacher PDF Roster Import

```
POST /api/assignments/import-class-list
Auth: teacher
Body: {
  "pdf_metadata": {
    "subject_code": "COSC1003",
    "descriptive_title": "Data Structure and Algorithms",
    "section": "BSIT 2H",
    "course": "B.S.I.T.",
    "year_level": "2",
    "school_year": "2026-2027",
    "semester": "1st Semester"
  },
  "students": [
    { "row_num": 1, "student_id": "25-3032-210", "first_name": "RAHDZ CESAR", "last_name": "ADLAON", "mi": "P", "gender": "Male", "course": "B.S.I.T.", "year_level": "2" }
  ]
}

201: { "assignment": {...}, "section": {...}, "subject": {...}, "added": [...], "skipped": [...] }
```

The active term and a course belonging to the teacher's department are required. The server creates or reuses the section, subject, and assignment, then imports students into the shared section roster. IDs are validated; invalid rows and IDs already in the section are returned in `skipped`. After successful processing, the backend records the PDF format, class, subject code, school year, semester, and added/skipped counts in the audit log; student names, IDs, and grades are not included.

The legacy `POST /api/assignments/:assignmentId/students/bulk` remains available for teachers importing into an existing assignment. Successfully processed requests with at least one valid roster row also produce the same PII-free import audit metadata.

## Delete Student

Legacy student deletion `DELETE /api/sections/students/:id` returns 403 for admins.

## Scoped Read Access

Assignment-level and section-level reads are scoped to the caller:

- **superadmin** — every record
- **admin** — teacher accounts and own grading-related assignment data; section and roster lists are blocked
- **teacher** — only their own assignments (`teacher_id`) and sections they teach

```
GET /api/attendance?teacher_assignment_id=uuid
Auth: teacher (must own the assignment)

403: { "message": "Access denied." }
```

The same rule applies to `/api/attendance/dates`, `/api/attendance/computed-scores`, `/api/grading-components`, `/api/component-activities`, `/api/component-scores`, and `/api/sections/:sectionId/students`.

## Log Activity

`user_name` and `department` are **not accepted** from the client — they are read from the verified JWT.

```
POST /api/activity
Auth: any authenticated user
Body: {
  "action": "Course Created",
  "details": "The course \"BSIT\" (BSIT) was created."
}

201: {
  "id": "uuid",
  "user_name": "santos.4512@sg",
  "action": "Course Created",
  "details": "The course \"BSIT\" (BSIT) was created.",
  "department": "College of Information and Communication Technology (CICT)",
  "created_at": "2026-10-22T..."
}
```

Missing `action` → `400 { "message": "action is required" }`. Any `user_name`/`department` values in the body are ignored. `action` and `details` remain caller-controlled and have no allowlist or length limit, so this endpoint can produce misleading or oversized audit entries under the caller's own identity.

### Teacher Export Audit

```text
POST /api/activity/teacher-export
Auth: teacher
Body: {
  "assignment_id": "uuid",
  "report_type": "Class Record",
  "format": "xlsx",
  "term": "PRELIMS",
  "student_count": 32
}

201: { "logged": true }
```

`report_type` is `Class Record` or `Grade Summary`; formats are `xlsx` or `pdf`. Class Record terms are `PRELIMS`, `MIDTERMS`, `PRE-FINALS`, or `FINALS`; Grade Summary uses `SEMESTER`. The assignment must belong to the authenticated teacher, and the count must be a non-negative integer no larger than the assigned section roster. The backend derives the actor, section, subject code, school year, and semester from verified account/assignment data. Only those metadata and the count are logged—never student names, IDs, or grades. Export pages call this endpoint only after client-side file generation succeeds.

### Superadmin Audit Log Scope

```text
GET /api/activity
Auth: superadmin
```

Without query parameters, superadmin receives only current-semester audit rows (`archived_at IS NULL`). To browse a closed semester, pass both `school_year` and `semester`; the response includes only rows archived under that term. Open or unknown terms cannot be selected as archives. Other roles keep their existing activity-log scope.

## Superadmin Semester Archives

While browsing a closed semester, the Super Admin Dashboard, administrator list, and department/course read endpoints return data from that semester's saved snapshot. Pass both `school_year` and `semester` to `GET /api/users`, `GET /api/departments`, or `GET /api/courses`; the backend returns `404` if that closed term has no snapshot. Normal requests without those query parameters continue to return current records. These archive reads are restricted to superadmin accounts. Snapshots exclude password hashes.

## Attendance Computed Scores

```
GET /api/attendance/computed-scores?teacher_assignment_id=uuid&term=PRELIMS
Auth: any authenticated caller within the scoped read policy

200: {
  "max_total": 20,
  "scores": { "<student_id>": 19, "<student_id>": 17 }
}
```

## AI Student Summary

```
POST /api/ai/summarize-student
Auth: teacher
Body: {
  "student":    { "id": "uuid", "name": "Dela Cruz, Juan M." },
  "performance": { "final_grade": 88.5, "submission_rate": 0.92, "attendance_rate": 0.95 },
  "categories": [ { "name": "Quizzes", "performance": 91.67, "trend": "improving" } ],
  "meta":       { "assignment_id": "uuid", "term": "PRELIMS" }
}

200: {
  "report": {
    "summary": "string",
    "strengths": ["string"],
    "areas_of_attention": [
      { "area": "string", "observation": "string", "priority": "high|medium|low" }
    ],
    "suggested_actions": ["string"],
    "follow_up": ["string"],
    "overall_priority": "string"
  },
  "model": "smartgrade pro 3.1",
  "generated_at": "2026-10-22T..."
}
```

Errors: `502` invalid/unparseable model output, `504` timeout, `400` bad request.

## Backup Export

```
POST /api/backup/export
Auth: superadmin
Body: { "categories": ["organization", "accounts", "grading"], "password": "optional-min-8-chars" }

200: { "filename": "backup_20261022_101500.backup.sg", "file": { ... }, "summary": { ... } }
```

## Backup Preview

```
POST /api/backup/preview
Auth: superadmin
Body: { "file": { ... }, "password": "optional", "mode": "merge" }

200: {
  "mode": "merge",
  "tables": [ { "table": "students", "toInsert": 120, "existing": 118 } ],
  "warnings": ["..."]
}
```

## Backup Restore

```
POST /api/backup/restore
Auth: superadmin
Body: {
  "file": { ... },
  "password": "optional",
  "mode": "merge",          // merge | replace | full
  "confirm": "CONFIRM"      // "CONFIRM" for merge/replace, "FULL RESTORE" for full
}
```

Conflicting restore in progress → `409`.

Full restore is rejected before any database writes unless the manifest and payload contain every restorable table (the audit log is preserved, not restored). The complete replacement runs in one database transaction through `restore_full_backup_atomic`; any constraint or insert error rolls the transaction back. The SQL function migration `backend/sql/create_atomic_full_backup_restore.sql` must be applied before deploying this backend version.

## List All Academic Terms

```
GET /api/terms
Auth: any
200:
[
  { "id": "uuid", "school_year": "2025-2026", "semester": "1st Semester", "is_active": true,  "is_closed": false },
  { "id": "uuid", "school_year": "2024-2025", "semester": "2nd Semester", "is_active": false, "is_closed": true }
]
```

### End Semester and Archive Audit Logs

```text
POST /api/terms/end
Auth: superadmin
Body: {
  "next_school_year": "2026-2027",
  "next_semester": "2nd Semester",
  "superadmin_password": "<current password>"
}

200: {
  "closed": { "school_year": "2026-2027", "semester": "1st Semester", "is_closed": true },
  "next": { "school_year": "2026-2027", "semester": "2nd Semester", "is_active": true },
  "archived_logs": 123
}
```

Closing a semester snapshots Super Admin global records, archives unarchived audit rows, and opens the next term in a single database transaction. Apply `backend/sql/archive_activity_logs.sql` and `backend/sql/archive_superadmin_term_snapshots.sql` before deploying this route.

## Error Bodies

All error responses use a single shape:

```json
{ "message": "This term is closed. No modifications allowed." }
```

Server-side failures return a generic message and are logged with full details on the backend:

```json
{ "message": "Server error" }
```

Unknown routes return `{ "message": "Route not found" }`; malformed JSON returns `{ "message": "Invalid JSON body." }`.

The only exception is backup validation, which returns `{ "ok": false, "errors": [...] }` so the UI can list every problem in the uploaded file.

## Status Codes

| Code | Meaning |
|---|---|
| 200 / 201 | Success |
| 400 | Validation/business rule failure, malformed JSON, or backup validation errors |
| 401 | No token provided |
| 403 | Invalid token, wrong role, not an owner, closed term, or read/write outside the caller's scope (`{ "message": "Access denied." }`) |
| 404 | Unknown route, or a missing resource (e.g. no active term) |
| 409 | Restore already running |
| 413 | Backup file/request over 50 MB |
| 500 | Server/database error (details logged server-side only) |
| 502 / 504 | AI provider returned invalid output / timed out |
