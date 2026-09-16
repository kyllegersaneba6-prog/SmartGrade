# Database Schema

**Database:** PostgreSQL via Supabase

**Schema:** `public`

All tables use `UUID` primary keys with `gen_random_uuid()` defaults and `TIMESTAMPTZ` for timestamps.

## Entity Relationship Overview

```
departments ──< courses
courses ──< sections (via course_id)
courses ──< subjects (via course_id)
sections ──< students
staff_users (self-referencing created_by FK)
staff_users ──< teacher_assignments (via teacher_id)
sections ──< teacher_assignments (via section_id)
subjects ──< teacher_assignments (via subject_id)
teacher_assignments ──< grading_components
grading_components ──< component_activities
component_activities ──< component_scores (via activity_id)
students ──< component_scores (via student_id)
teacher_assignments ──< attendance (via teacher_assignment_id)
students ──< attendance (via student_id)
```

## Key Table Changes

### students
- Added `first_name`, `last_name`, `mi`, `gender` columns for structured student details (2026-06-03)
- `student_name` is now a computed field (`"Last, First M."`) for backward compatibility
- Gender displayed in the student table UI

### subjects
- Removed `school_year` dependency (subjects persist across academic terms)
- `semester` column now accepts NULL (representing "All Semesters") via relaxed CHECK constraint (2026-06-03)
