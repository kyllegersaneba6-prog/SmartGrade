-- SmartGrade: Complete data reset
-- Deletes all user-created data while preserving schema, departments, courses, and the superadmin account.

-- 1. Delete teacher assignments (depends on staff_users, sections, subjects)
DELETE FROM public.teacher_assignments;

-- 2. Delete students (depends on sections)
DELETE FROM public.students;

-- 3. Delete sections (depends on courses, staff_users)
DELETE FROM public.sections;

-- 4. Delete subjects (depends on staff_users)
DELETE FROM public.subjects;

-- 5. Delete academic terms
DELETE FROM public.academic_terms;

-- 6. Delete all non-superadmin staff users (teachers and admins)
DELETE FROM public.staff_users WHERE system_role IN ('admin', 'teacher');
