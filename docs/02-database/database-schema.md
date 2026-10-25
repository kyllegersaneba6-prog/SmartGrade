# Database Schema

**Database:** PostgreSQL via Supabase
**Schema:** `public`
**Access:** backend only, using the service-role key (`BYPASSRLS`). RLS is enabled on every table with **no policies**, so `anon`/`authenticated` access is denied; the two roles also have no table grants.

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
| `create_attendance_table.sql` | Attendance table (final v2 shape) |
| `migrate_attendance_final.sql` | Canonical attendance migration: columns + 6-column unique constraint; idempotent |
| `add_db_constraints.sql` | Canonical DB constraints: single active term, one admin/department, score/weight ranges + triggers; idempotent |
| `migrate_attendance_v2.sql` | Deprecated: use `migrate_attendance_final.sql` |
| `alter_attendance_*.sql` | Legacy incremental attendance changes. `unique`, `session_type`, and `term` are **deprecated** — use `migrate_attendance_final.sql` |
| `alter_departments_add_abbr.sql` | `departments.abbr` |
| `alter_staff_users_add_staff_id.sql` | `staff_users.staff_id` + format CHECK + unique index |
| `alter_students_add_details.sql` | `students.first_name/last_name/mi/gender` |
| `alter_add_school_year_semester.sql` | `school_year` / `semester` on sections + assignments |
| `alter_subjects_*.sql` | Subject `course_id`, term persistence, semester NULL allowance |
| `alter_remove_3rd_semester.sql` | Drops the 3rd-semester option |
| `alter_activity_department.sql` | `activity_log.department` |
| `reset_data.sql` | Destructive: clears assignments, students, sections, subjects, terms, non-superadmin staff |

There is **no migration runner and no applied-order manifest**. Apply files manually in the order they were introduced. The live project's Supabase migration history records the original tables, `enable_row_level_security`, and the two canonical baselines `baseline_attendance_final` / `baseline_db_constraints` (created by re-running the idempotent files). For attendance, run `migrate_attendance_final.sql` last; the older attendance unique/term/v2 files are deprecated no-ops kept for compatibility. Finish with `add_db_constraints.sql`; it is idempotent and aborts (without changing data) if existing rows violate a rule.

## Data-Integrity Notes

### Denormalized department
`staff_users.department` is plain `TEXT`, not a FK. Renaming a department manually updates `staff_users`; deleting one sets users' department to `NULL` ("Unassigned"). Section/subject/assignment ownership uses `created_by`, not department.

### One admin per department
Enforced in `POST /api/users` and `PATCH /api/users/:id`, and by the partial unique index `idx_staff_users_one_admin_per_department` on `lower(trim(department))` where `system_role = 'admin'`. Direct SQL and restores can no longer create a second admin in the same department (NULL/blank departments are exempt).

### Single active term
`academic_terms` keeps `UNIQUE(school_year, semester)`, and the partial unique index `idx_academic_terms_one_active` on `((is_active)) WHERE is_active = true` guarantees at most one active row. `routes/terms.js` still drives the normal create/end flow.

### Score and weight ranges
`add_db_constraints.sql` adds:
- `attendance_score_range` — `attendance.score` is `0..2` (0 Absent, 1 Late, 2 Present)
- `grading_components_weight_range` — `weight` is `0..100`
- `component_activities_max_score_positive` — `max_score > 0`
- `component_scores_score_nonnegative` — `score >= 0`
- `trg_component_scores_range` — every score is `<= component_activities.max_score`
- `trg_component_activities_max_score` — `max_score` cannot be lowered below an existing score
- `trg_grading_components_weight_total` — deferred trigger; component weights total at most 100 per assignment + term

### Attendance unique constraint
The final shape is `UNIQUE(teacher_assignment_id, student_id, date, session, type, term)` — required by the upsert's `onConflict`. `migrate_attendance_final.sql` is the canonical, idempotent migration: it adds the missing columns and drops every older 3-column/5-column unique constraint (whatever its name) before ensuring the 6-column constraint exists. Postgres truncates the long constraint identifier to `attendance_teacher_assignment_id_student_id_date_session_type_t`; the migration protects both the full and truncated spellings so a re-run never drops and recreates it. The old `alter_attendance_unique.sql`, `alter_attendance_session_type.sql`, `alter_attendance_term.sql`, and `migrate_attendance_v2.sql` files are deprecated. Note that NULL `session`/`type`/`term` values make rows distinct in Postgres.

### Legacy `admin_users`
`routes/auth.js` falls back to an `admin_users` table for legacy superadmin logins, but no SQL file in this repo defines it. Its shape cannot be verified from source.

### Remaining no DB-level checks
- Component weights must total exactly 100 before scores are entered — this stays a UI/workflow rule; the DB only caps the total at 100.
- `students.gender` values

### Row Level Security
`enable_row_level_security.sql` turns on RLS for all 13 `public` tables. No policies are defined, which is a deliberate deny-all: `anon` and `authenticated` cannot read or write through PostgREST, and they currently have no table grants either. The Express backend is unaffected because it connects with `service_role`, whose `rolbypassrls` is true. Supabase's `RLS Enabled No Policy` advisory (INFO) is expected. Any future direct-from-browser Supabase client would need policies and grants added first.

### Indexes beyond primary keys

| Table | Index |
|---|---|
| `staff_users` | `idx_staff_users_username`, `idx_staff_users_role`, unique `idx_staff_users_staff_id`, unique partial `idx_staff_users_one_admin_per_department` |
| `academic_terms` | unique partial `idx_academic_terms_one_active` |
| `sections` | `idx_sections_year(year_level)` |
| `students` | `idx_students_section(section_id)` |
| `subjects` | `idx_subjects_year(year_level)` |
| `teacher_assignments` | `idx_assignments_teacher(teacher_id)` |
| `attendance` | `idx_attendance_assignment_date`, `idx_attendance_student` |
| `activity_log` | none |
