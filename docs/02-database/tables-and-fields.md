# Tables and Fields

Constraint legend: PK primary key · FK foreign key · UQ unique · NN not null

## departments

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, `gen_random_uuid()` |
| name | TEXT | NN, UQ |
| abbr | TEXT | Nullable, uppercase, e.g. `CICT` |
| created_at | TIMESTAMPTZ | Default `now()` |

## courses

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | NN |
| abbreviation | TEXT | NN, e.g. `BSIT` |
| department_id | UUID | NN, FK → `departments(id)` ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(name, department_id)`

## department_export_settings

| Column | Type | Notes |
|---|---|---|
| department_id | UUID | PK, FK → `departments(id)` ON DELETE CASCADE |
| program_head_bsit | TEXT | NN, BSIT export signatory; default is the legacy export name |
| program_head_bscs | TEXT | NN, BSCS export signatory; default is the legacy export name |
| dean_cict | TEXT | NN, CICT dean export signatory; default is the legacy export name |
| updated_at | TIMESTAMPTZ | NN, default `now()` |

Names are limited to 1–160 characters. RLS is enabled with no user-facing policies; the backend `service_role` has SELECT/INSERT/UPDATE only.

## staff_users

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| first_name | TEXT | Nullable |
| last_name | TEXT | Nullable |
| full_name | TEXT | NN |
| username | TEXT | UQ, nullable; `lastname.NNNN@sg` |
| department | TEXT | Nullable; name snapshot, **no FK** |
| course_id | UUID | FK → `courses(id)` |
| system_role | TEXT | NN, CHECK `('superadmin','admin','teacher')` |
| staff_id | TEXT | CHECK `NULL OR ^[0-9]{9}$` |
| password | TEXT | NN, bcrypt hash |
| created_by | UUID | FK → `staff_users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | |

**Indexes:** `idx_staff_users_username`, `idx_staff_users_role`, unique `idx_staff_users_staff_id`, unique partial `idx_staff_users_one_admin_per_department` on `lower(trim(department))` where `system_role = 'admin'`

**API security:** Admin/teacher accounts require an existing department name; an optional course must belong to it. `system_role`, direct `username`, `id`, and `created_by` edits are not accepted by the account API. Current security fields are used for session-fingerprint verification; there is no added session column.

## sections

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | NN; server builds `"<course abbr> <year>-<letter>"`, e.g. `BSIT 1-A` |
| course_id | UUID | FK → `courses(id)`; nullable |
| year_level | TEXT | NN, CHECK `('1st','2nd','3rd','4th')` |
| school_year | TEXT | NN, default `2025-2026` |
| semester | TEXT | NN, default `1st Semester`, CHECK `('1st Semester','2nd Semester','Summer')` |
| created_by | UUID | FK → `staff_users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(course_id, name, school_year, semester)` · **Index:** `idx_sections_year(year_level)`

## students

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| student_id | TEXT | NN, e.g. `26-01234` |
| student_name | TEXT | NN, computed `"Last, First M."` |
| first_name | TEXT | Nullable |
| last_name | TEXT | Nullable |
| mi | TEXT | Nullable, middle initial |
| gender | TEXT | Nullable, no CHECK (UI offers Male/Female) |
| section_id | UUID | NN, FK → `sections(id)` ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(section_id, student_id)` · **Index:** `idx_students_section(section_id)`

**API relationship rule:** A score/attendance student's `section_id` must equal its assignment's `section_id`. This is an Express batch-validation rule, not a new database constraint. Student lookup scopes repeated institutional IDs to accessible enrollments and prefers the active term.

## academic_terms

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| school_year | TEXT | NN |
| semester | TEXT | NN, CHECK `('1st Semester','2nd Semester','Summer')` |
| is_active | BOOLEAN | Default `false` |
| is_closed | BOOLEAN | Default `false` |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(school_year, semester)` · unique partial `idx_academic_terms_one_active` on `((is_active)) WHERE is_active = true`

## subjects

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | TEXT | NN |
| code | TEXT | Nullable, e.g. `COMP1001` |
| year_level | TEXT | NN, CHECK `('1st','2nd','3rd','4th')` |
| school_year | TEXT | Nullable; retained but unused for filtering |
| semester | TEXT | Nullable; CHECK semester values or NULL ("All Semesters"). `POST` requires a real value |
| course_id | UUID | FK → `courses(id)` ON DELETE SET NULL; NULL = department-wide |
| created_by | UUID | FK → `staff_users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | |

**Index:** `idx_subjects_year(year_level)` · No UQ; duplicates blocked in app code

## teacher_assignments

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| teacher_id | UUID | NN, FK → `staff_users(id)` ON DELETE CASCADE |
| section_id | UUID | NN, FK → `sections(id)` ON DELETE CASCADE |
| subject_id | UUID | NN, FK → `subjects(id)` ON DELETE CASCADE |
| school_year | TEXT | NN, default `2025-2026` |
| semester | TEXT | NN, default `1st Semester`, CHECK semester values |
| created_by | UUID | FK → `staff_users(id)` ON DELETE SET NULL |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(teacher_id, section_id, subject_id, school_year, semester)` · **Index:** `idx_assignments_teacher(teacher_id)`

## grading_components

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| teacher_assignment_id | UUID | NN, FK → `teacher_assignments(id)` ON DELETE CASCADE |
| term | TEXT | NN, no CHECK; values `PRELIMS`, `MIDTERMS`, `PRE-FINALS`, `FINALS` |
| name | TEXT | NN, e.g. `Quizzes`, `Exams`, `Attendance` |
| weight | DECIMAL | NN, percentage; CHECK `0..100`; total per assignment + term is capped at 100 (deferred trigger) |
| sort_order | INT | Default 0; drag-drop order |
| is_attendance | BOOLEAN | Default `false`; uses computed attendance instead of activities |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(teacher_assignment_id, term, name)` · CHECK `grading_components_weight_range` · trigger `trg_grading_components_weight_total`

## component_activities

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| component_id | UUID | NN, FK → `grading_components(id)` ON DELETE CASCADE |
| name | TEXT | NN |
| max_score | DECIMAL | NN, default 100, CHECK `> 0`; cannot be lowered below an existing score |
| sort_order | INT | Default 0 |
| created_at | TIMESTAMPTZ | |

**Constraints:** CHECK `component_activities_max_score_positive` · trigger `trg_component_activities_max_score`

## component_scores

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| activity_id | UUID | NN, FK → `component_activities(id)` ON DELETE CASCADE |
| student_id | UUID | NN, FK → `students(id)` ON DELETE CASCADE |
| score | DECIMAL | Nullable; CHECK `>= 0`; trigger enforces `<= component_activities.max_score` |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(activity_id, student_id)` — upsert target · CHECK `component_scores_score_nonnegative` · trigger `trg_component_scores_range`

## attendance

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| teacher_assignment_id | UUID | NN, FK → `teacher_assignments(id)` ON DELETE CASCADE |
| student_id | UUID | NN, FK → `students(id)` ON DELETE CASCADE |
| date | DATE | NN |
| score | DECIMAL | Default 0, CHECK `0..2`; 0 Absent, 1 Late, 2 Present |
| session | TEXT | Nullable, CHECK `('AM','PM')` |
| type | TEXT | Nullable, CHECK `('Lecture','Laboratory')` |
| term | TEXT | Nullable; term name |
| status | TEXT | Legacy, nullable (NOT NULL dropped in v2) |
| created_at | TIMESTAMPTZ | |

**Indexes:** `idx_attendance_assignment_date(teacher_assignment_id, date)`, `idx_attendance_student(student_id)`

**Unique constraint:** `UNIQUE(teacher_assignment_id, student_id, date, session, type, term)` — created by `create_attendance_table.sql` on a fresh database and guaranteed by `migrate_attendance_final.sql` on an existing one. NULL `session`/`type`/`term` values still make rows distinct in Postgres, so always send the term.

## activity_log

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_name | TEXT | NN |
| action | TEXT | NN, e.g. `User Created`, `Backup Exported`, `Failed Login`, `Teacher Class List Imported`, `Teacher Class Record Exported` |
| details | TEXT | Nullable, human-readable; teacher import/export details contain only class/term/format/count metadata |
| department | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

No FKs or indexes. Created at startup by `index.js` via an RPC if it does not exist.

## broadcast_notifications

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| title | TEXT | NN, 1–160 trimmed characters |
| content | TEXT | NN, 1–2000 trimmed characters |
| urgency | TEXT | NN, `Not Urgent` or `Urgent` |
| audience | TEXT[] | NN, non-empty subset of `admin` / `teacher` |
| created_by | UUID | Nullable FK → `staff_users(id)`, set NULL on account delete |
| created_at | TIMESTAMPTZ | NN, default `now()` |

## broadcast_notification_recipients

| Column | Type | Notes |
|---|---|---|
| notification_id | UUID | PK part, FK → `broadcast_notifications(id)` ON DELETE CASCADE |
| user_id | UUID | PK part, FK → `staff_users(id)` ON DELETE CASCADE |
| recipient_role | TEXT | NN, role snapshot (`admin` or `teacher`) |
| sent_at | TIMESTAMPTZ | NN, broadcast timestamp |
| read_at | TIMESTAMPTZ | Nullable; set when recipient opens the item |
| dismissed_at | TIMESTAMPTZ | Nullable; hides the item for this recipient only |

**Indexes:** creator FK; user + send time for each recipient's feed; partial user indexes for visible and unread notifications. Both tables have RLS enabled with no client-role grants; backend access uses `service_role`.
