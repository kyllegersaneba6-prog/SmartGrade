-- Grading Components table
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

-- Component Activities (sub-activities within each component)
CREATE TABLE IF NOT EXISTS public.component_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.grading_components(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score DECIMAL NOT NULL DEFAULT 100,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student scores per activity
CREATE TABLE IF NOT EXISTS public.component_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.component_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, student_id)
);
