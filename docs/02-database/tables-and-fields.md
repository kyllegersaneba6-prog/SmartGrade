# Tables and Fields

## departments

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| name | TEXT UNIQUE | Department name |
| created_at | TIMESTAMPTZ | |

## courses

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| abbreviation | TEXT | e.g. BSIT, BSCS |
| department_id | UUID FK | → departments(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | UNIQUE(name, department_id) |

## staff_users

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| first_name | TEXT | |
| last_name | TEXT | |
| full_name | TEXT NOT NULL | |
| username | TEXT UNIQUE | Login username |
| department | TEXT | Denormalized |
| course_id | UUID FK | → courses(id) |
| system_role | TEXT | `superadmin`, `admin`, `teacher` |
| password | TEXT | bcrypt hash |
| created_by | UUID FK | → staff_users(id) |
| created_at | TIMESTAMPTZ | |

## sections

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | e.g. `BSIT 1-A` |
| course_id | UUID FK | → courses(id) |
| year_level | TEXT | `1st`, `2nd`, `3rd`, `4th` |
| school_year | TEXT | e.g. `2025-2026` |
| semester | TEXT | `1st Semester`, `2nd Semester`, `Summer` |
| created_by | UUID FK | → staff_users(id) |
| created_at | TIMESTAMPTZ | UNIQUE(course_id, name, school_year) |

## students

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| student_id | TEXT | e.g. `26-01234` |
| student_name | TEXT | Computed as `Last, First M.` |
| first_name | TEXT | |
| last_name | TEXT | |
| mi | TEXT | Middle initial (single character) |
| gender | TEXT | `Male` or `Female` |
| section_id | UUID FK | → sections(id) ON DELETE CASCADE |
| created_at | TIMESTAMPTZ | UNIQUE(section_id, student_id) |

## academic_terms

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| school_year | TEXT | |
| semester | TEXT | ENUM |
| is_active | BOOLEAN | |
| is_closed | BOOLEAN | |
| created_at | TIMESTAMPTZ | UNIQUE(school_year, semester) |

## subjects

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| code | TEXT | e.g. `COMP1001` |
| year_level | TEXT | ENUM |
| school_year | TEXT | Deprecated — no longer used for filtering |
| semester | TEXT | `1st Semester`, `2nd Semester`, `Summer`, or `NULL` (All Semesters) |
| course_id | UUID FK | → courses(id) ON DELETE SET NULL |
| created_by | UUID FK | → staff_users(id) |
| created_at | TIMESTAMPTZ | |

## teacher_assignments

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| teacher_id | UUID FK | → staff_users(id) ON DELETE CASCADE |
| section_id | UUID FK | → sections(id) ON DELETE CASCADE |
| subject_id | UUID FK | → subjects(id) ON DELETE CASCADE |
| school_year | TEXT | |
| semester | TEXT | ENUM |
| created_by | UUID FK | |
| created_at | TIMESTAMPTZ | UNIQUE(teacher_id, section_id, subject_id, school_year, semester) |

## grading_components

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| teacher_assignment_id | UUID FK | → teacher_assignments(id) ON DELETE CASCADE |
| term | TEXT | `PRELIMS`, `MIDTERMS`, `PRE-FINALS`, `FINALS` |
| name | TEXT | e.g. `Quizzes`, `Exams` |
| weight | DECIMAL | Percentage |
| sort_order | INT | |
| is_attendance | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | UNIQUE(teacher_assignment_id, term, name) |

## component_activities

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| component_id | UUID FK | → grading_components(id) ON DELETE CASCADE |
| name | TEXT | Activity name |
| max_score | DECIMAL | Default 100 |
| sort_order | INT | |
| created_at | TIMESTAMPTZ | |

## component_scores

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| activity_id | UUID FK | → component_activities(id) ON DELETE CASCADE |
| student_id | UUID FK | → students(id) ON DELETE CASCADE |
| score | DECIMAL | |
| created_at | TIMESTAMPTZ | UNIQUE(activity_id, student_id) |

## attendance

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| teacher_assignment_id | UUID FK | → teacher_assignments(id) ON DELETE CASCADE |
| student_id | UUID FK | → students(id) ON DELETE CASCADE |
| date | DATE | |
| score | DECIMAL | 0=Absent, 1=Late, 2=Present |
| session | TEXT | `AM` or `PM` |
| type | TEXT | `Lecture` or `Laboratory` |
| term | TEXT | |
| status | TEXT | Legacy, nullable |
| created_at | TIMESTAMPTZ | UNIQUE(teacher_assignment_id, student_id, date, session, type, term) |

## activity_log

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_name | TEXT | |
| action | TEXT | e.g. `User Created` |
| details | TEXT | |
| department | TEXT | |
| created_at | TIMESTAMPTZ | |
