-- SmartGrade Database Schema
-- Run this in your Supabase SQL Editor
-- opencode -s ses_18afc202fffen3Qt6YBJmaj0xj --Rency
-- opencode -s ses_185088859ffePdj6pfZwQm0xJe --Rency

-- 1. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, department_id)
);

-- 4. Staff Users table (all roles: superadmin, admin, teacher)
CREATE TABLE IF NOT EXISTS public.staff_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  department TEXT,
  course_id UUID REFERENCES public.courses(id),
  system_role TEXT NOT NULL CHECK (system_role IN ('superadmin', 'admin', 'teacher')),
  password TEXT NOT NULL,
  created_by UUID REFERENCES public.staff_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Index for fast login lookups
CREATE INDEX IF NOT EXISTS idx_staff_users_username ON public.staff_users (username);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON public.staff_users (system_role);

-- 6. Sections table
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course_id UUID REFERENCES public.courses(id),
  year_level TEXT NOT NULL CHECK (year_level IN ('1st', '2nd', '3rd', '4th')),
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  semester TEXT NOT NULL DEFAULT '1st Semester' CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer')),
  created_by UUID REFERENCES public.staff_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, name, school_year)
);

-- 7. Students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_sections_year ON public.sections (year_level);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students (section_id);

-- 8. Academic Terms table (tracks active/closed terms)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer')),
  is_active BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_year, semester)
);

-- 9. Subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  year_level TEXT NOT NULL CHECK (year_level IN ('1st', '2nd', '3rd', '4th')),
  school_year TEXT,
  semester TEXT CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer')),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.staff_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_year ON public.subjects (year_level);

-- Add code column if upgrading existing schema
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS code TEXT;

-- Add school_year and semester columns if upgrading existing schema
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_year TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS semester TEXT CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));

-- Add course_id column if upgrading existing schema
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add semester column if upgrading existing schema
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT '1st Semester' CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer'));

-- Add academic_terms table if upgrading existing schema (ignore if already exists)
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer')),
  is_active BOOLEAN DEFAULT false,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_year, semester)
);

-- 10. Teacher Assignments table
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  semester TEXT NOT NULL DEFAULT '1st Semester' CHECK (semester IN ('1st Semester', '2nd Semester', 'Summer')),
  created_by UUID REFERENCES public.staff_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, section_id, subject_id, school_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.teacher_assignments (teacher_id);

-- 11. Grading Components table
CREATE TABLE IF NOT EXISTS public.grading_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_assignment_id UUID NOT NULL REFERENCES public.teacher_assignments(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  name TEXT NOT NULL,
  weight DECIMAL NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_assignment_id, term, name)
);

-- 12. Component Activities
CREATE TABLE IF NOT EXISTS public.component_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.grading_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score DECIMAL NOT NULL DEFAULT 100,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Component Scores
CREATE TABLE IF NOT EXISTS public.component_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.component_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, student_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. Default Department
INSERT INTO public.departments (name) VALUES ('College of Information and Communication Technology (CICT)')
ON CONFLICT (name) DO NOTHING;

-- 2. Default Courses (BSIT, BSCS, BSIS)
WITH dept AS (SELECT id FROM public.departments WHERE name = 'College of Information and Communication Technology (CICT)' LIMIT 1)
INSERT INTO public.courses (name, abbreviation, department_id)
SELECT 'Bachelor of Science in Information Technology', 'BSIT', dept.id FROM dept
UNION ALL
SELECT 'Bachelor of Science in Computer Science', 'BSCS', dept.id FROM dept
UNION ALL
SELECT 'Bachelor of Science in Information Systems', 'BSIS', dept.id FROM dept
ON CONFLICT (name, department_id) DO NOTHING;

-- 3. Create Superadmin Account
-- Username: admin / Password: admin123 (bcrypt hash)
INSERT INTO public.staff_users (first_name, last_name, full_name, username, department, system_role, password)
VALUES (
  'System',
  'Administrator',
  'System Administrator',
  'admin',
  'College of Information and Communication Technology (CICT)',
  'superadmin',
  '$2b$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmKNy5GgY7iJjhCVfZ2m' -- admin123
)
ON CONFLICT (username) DO NOTHING;

-- 4. Seed current academic term as active (only if no terms exist yet)
DO $$
DECLARE
  term_count INT;
  sy TEXT;
  sem TEXT;
  m INT;
BEGIN
  SELECT COUNT(*) INTO term_count FROM public.academic_terms;
  IF term_count > 0 THEN RETURN; END IF;

  m := EXTRACT(MONTH FROM NOW());
  IF m >= 8 THEN
    sy := EXTRACT(YEAR FROM NOW()) || '-' || (EXTRACT(YEAR FROM NOW()) + 1)::TEXT;
    sem := '1st Semester';
  ELSIF m >= 6 THEN
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := 'Summer';
  ELSE
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := '2nd Semester';
  END IF;

  INSERT INTO public.academic_terms (school_year, semester, is_active)
  VALUES (sy, sem, true);
END $$;

-- 5. Sample Subjects per Year Level (only if no subjects exist yet)
DO $$
DECLARE
  admin_id UUID;
  subj_count INT;
  sy TEXT;
  sem TEXT;
  m INT;
BEGIN
  SELECT COUNT(*) INTO subj_count FROM public.subjects;
  IF subj_count > 0 THEN RETURN; END IF;

  SELECT id INTO admin_id FROM public.staff_users WHERE username = 'admin' LIMIT 1;

  m := EXTRACT(MONTH FROM NOW());
  IF m >= 8 THEN
    sy := EXTRACT(YEAR FROM NOW()) || '-' || (EXTRACT(YEAR FROM NOW()) + 1)::TEXT;
    sem := '1st Semester';
  ELSIF m >= 6 THEN
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := 'Summer';
  ELSE
    sy := (EXTRACT(YEAR FROM NOW()) - 1) || '-' || EXTRACT(YEAR FROM NOW())::TEXT;
    sem := '2nd Semester';
  END IF;

  INSERT INTO public.subjects (name, code, year_level, school_year, semester, created_by) VALUES
    ('Introduction to Computing', 'COMP1001', '1st', sy, sem, admin_id),
    ('Computer Programming 1', 'COMP1002', '1st', sy, sem, admin_id),
    ('Mathematics in the Modern World', 'MATH1001', '1st', sy, sem, admin_id),
    ('Purposive Communication', 'COMM1001', '1st', sy, sem, admin_id),
    ('Data Structures and Algorithms', 'COMP2001', '2nd', sy, sem, admin_id),
    ('Object-Oriented Programming', 'COMP2002', '2nd', sy, sem, admin_id),
    ('Database Management Systems', 'DBAS2001', '2nd', sy, sem, admin_id),
    ('Discrete Mathematics', 'MATH2001', '2nd', sy, sem, admin_id),
    ('Software Engineering', 'SOFT3001', '3rd', sy, sem, admin_id),
    ('Information Management', 'INFO3001', '3rd', sy, sem, admin_id),
    ('Networking and Communication', 'NETW3001', '3rd', sy, sem, admin_id),
    ('Human-Computer Interaction', 'HCIS3001', '3rd', sy, sem, admin_id),
    ('Capstone Project 1', 'CAPS4001', '4th', sy, sem, admin_id),
    ('Professional Ethics', 'ETHC4001', '4th', sy, sem, admin_id),
    ('Practicum / Internship', 'PRAC4001', '4th', sy, sem, admin_id);
END $$;
