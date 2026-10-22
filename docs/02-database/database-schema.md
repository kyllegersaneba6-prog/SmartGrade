# Database Schema

**Database:** PostgreSQL via Supabase
**Schema:** `public`
**Access:** backend only, using the service-role key (RLS is bypassed; no policies are defined)

All tables use `UUID PRIMARY KEY DEFAULT gen_random_uuid()` and `TIMESTAMPTZ DEFAULT now()` unless noted.

## Entity Relationship Overview

```
departments ──< courses
departments ─ ─ staff_users (denormalized TEXT snapshot, NOT a FK)
courses ──< sections
courses ──< subjects
sections ──< students
staff_users ──< staff_users (created_by, self-FK)
staff_users ──< teacher_assignments (teacher_id)
sections ──< teacher_assignments
subjects ──< teacher_assignments
teacher_assignments ──< grading_components
grading_components ──< component_activities
component_activities ──< component_scores
students ──< component_scores
teacher_assignments ──< attendance
students ──< attendance
academic_terms   (standalone; matching is by school_year + semester text)
activity_log     (standalone; no FKs)
```

## Tables

| Table | Purpose |
|---|---|
| `departments` | Academic departments (+ `abbr`) |
| `courses` | Programs inside a department (+ `abbreviation`) |
| `staff_users` | All accounts: superadmin, admin, teacher |
| `sections` | Class sections per course/year/school year/semester |
| `students` | Student roster per section |
| `subjects` | Subjects per year level, optionally course- or department-wide |
| `academic_terms` | School year + semester with `is_active` / `is_closed` |
| `teacher_assignments` | Teacher ↔ section ↔ subject per term |
| `grading_components` | Weighted grading categories per assignment + term |
| `component_activities` | Scored activities inside a component |
| `component_scores` | One score per activity per student |
| `attendance` | One mark per assignment/student/date/session/type/term |
| `activity_log` | Audit trail |

## SQL Files

| File | Purpose |
|---|---|
| `schema.sql` | Base tables, indexes, seed data (CICT department, courses, superadmin) |
| `create_grading_tables.sql` | Grading components / activities / scores |
| `create_attendance_table.sql` | Attendance table (v1) |
| `migrate_attendance_v2.sql` | Attendance v2: `session`, `type`, `term` |
| `alter_attendance_*.sql` | Incremental attendance changes (component link, score, session type, term, unique) |
| `alter_departments_add_abbr.sql` | `departments.abbr` |
| `alter_staff_users_add_staff_id.sql` | `staff_users.staff_id` + format CHECK + unique index |
| `alter_students_add_details.sql` | `students.first_name/last_name/mi/gender` |
| `alter_add_school_year_semester.sql` | `school_year` / `semester` on sections + assignments |
| `alter_subjects_*.sql` | Subject `course_id`, term persistence, semester NULL allowance |
| `alter_remove_3rd_semester.sql` | Drops the 3rd-semester option |
| `alter_activity_department.sql` | `activity_log.department` |
| `reset_data.sql` | Destructive: clears assignments, students, sections, subjects, terms, non-superadmin staff |

There is **no migration runner and no applied-order manifest**. Apply files manually in the order they were introduced.

## Data-Integrity Notes

### Denormalized department
`staff_users.department` is plain `TEXT`, not a FK. Renaming a department manually updates `staff_users`; deleting one sets users' department to `NULL` ("Unassigned"). Section/subject/assignment ownership uses `created_by`, not department.

### One admin per department
Enforced only in `POST /api/users` and `PATCH /api/users/:id`. There is no DB constraint, so direct SQL or a restore can create duplicates.

### Single active term
`academic_terms` has `UNIQUE(school_year, semester)` but no partial unique index on `is_active`. "Only one active term" is enforced by application logic in `routes/terms.js`.

### Attendance unique constraint
The intended shape is `UNIQUE(teacher_assignment_id, student_id, date, session, type, term)` — required by the upsert's `onConflict`. `alter_attendance_unique.sql` re-adds a 5-column version without `term`; whichever file is applied last wins. Verify in the live database. Also note that NULL `session`/`type`/`term` values make rows distinct in Postgres.

### Legacy `admin_users`
`routes/auth.js` falls back to an `admin_users` table for legacy superadmin logins, but no SQL file in this repo defines it. Its shape cannot be verified from source.

### No DB-level checks for
- Component weights summing to 100 (UI-only)
- `component_scores.score` within `0..max_score`
- `attendance.score` within `0..2`
- `students.gender` values

### Indexes beyond primary keys

| Table | Index |
|---|---|
| `staff_users` | `idx_staff_users_username`, `idx_staff_users_role`, unique `idx_staff_users_staff_id` |
| `sections` | `idx_sections_year(year_level)` |
| `students` | `idx_students_section(section_id)` |
| `subjects` | `idx_subjects_year(year_level)` |
| `teacher_assignments` | `idx_assignments_teacher(teacher_id)` |
| `attendance` | `idx_attendance_assignment_date`, `idx_attendance_student` |
| `activity_log` | none |
