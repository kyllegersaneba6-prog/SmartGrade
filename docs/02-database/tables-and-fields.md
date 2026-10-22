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

**Indexes:** `idx_staff_users_username`, `idx_staff_users_role`, unique `idx_staff_users_staff_id`

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

**Constraints:** `UNIQUE(course_id, name, school_year)` · **Index:** `idx_sections_year(year_level)`

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

## academic_terms

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| school_year | TEXT | NN |
| semester | TEXT | NN, CHECK `('1st Semester','2nd Semester','Summer')` |
| is_active | BOOLEAN | Default `false` |
| is_closed | BOOLEAN | Default `false` |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(school_year, semester)` — no DB guarantee of a single active row

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
| weight | DECIMAL | NN, percentage; sum = 100 enforced only in UI |
| sort_order | INT | Default 0; drag-drop order |
| is_attendance | BOOLEAN | Default `false`; uses computed attendance instead of activities |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(teacher_assignment_id, term, name)`

## component_activities

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| component_id | UUID | NN, FK → `grading_components(id)` ON DELETE CASCADE |
| name | TEXT | NN |
| max_score | DECIMAL | NN, default 100 |
| sort_order | INT | Default 0 |
| created_at | TIMESTAMPTZ | |

## component_scores

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| activity_id | UUID | NN, FK → `component_activities(id)` ON DELETE CASCADE |
| student_id | UUID | NN, FK → `students(id)` ON DELETE CASCADE |
| score | DECIMAL | Nullable; no 0..max_score CHECK |
| created_at | TIMESTAMPTZ | |

**Constraints:** `UNIQUE(activity_id, student_id)` — upsert target

## attendance

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| teacher_assignment_id | UUID | NN, FK → `teacher_assignments(id)` ON DELETE CASCADE |
| student_id | UUID | NN, FK → `students(id)` ON DELETE CASCADE |
| date | DATE | NN |
| score | DECIMAL | Default 0; 0 Absent, 1 Late, 2 Present |
| session | TEXT | Nullable, CHECK `('AM','PM')` |
| type | TEXT | Nullable, CHECK `('Lecture','Laboratory')` |
| term | TEXT | Nullable; term name |
| status | TEXT | Legacy, nullable (NOT NULL dropped in v2) |
| created_at | TIMESTAMPTZ | |

**Indexes:** `idx_attendance_assignment_date(teacher_assignment_id, date)`, `idx_attendance_student(student_id)`

**Unique constraint (⚠ verify live):** intended `(teacher_assignment_id, student_id, date, session, type, term)`. `alter_attendance_unique.sql` re-adds a 5-column variant without `term`, so the deployed constraint depends on file order.

## activity_log

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| user_name | TEXT | NN |
| action | TEXT | NN, e.g. `User Created`, `Backup Exported`, `Failed Login` |
| details | TEXT | Nullable, human-readable |
| department | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Default `now()` |

No FKs or indexes. Created at startup by `index.js` via an RPC if it does not exist.

## Legacy / undefined

| Table | Status |
|---|---|
| `admin_users` | Queried by `routes/auth.js` as a superadmin fallback; **no SQL definition in this repo** |
