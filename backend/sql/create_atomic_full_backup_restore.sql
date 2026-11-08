-- Atomic full backup restore. Run once before deploying the backend change.
-- The function is deliberately service-role-only and uses a fixed table list.

CREATE OR REPLACE FUNCTION public.restore_full_backup_atomic(
  p_data JSONB,
  p_preserved_superadmin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_caller_role TEXT;
  v_caller_course_id UUID;
  v_caller_created_by UUID;
BEGIN
  IF p_data IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Full restore payload must be a JSON object.' USING ERRCODE = '22023';
  END IF;

  IF p_preserved_superadmin_id IS NULL THEN
    RAISE EXCEPTION 'A preserved superadmin account is required.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_data) AS payload_key(table_name)
    WHERE table_name NOT IN (
      'departments', 'department_export_settings', 'courses', 'staff_users',
      'academic_terms', 'sections', 'students', 'subjects', 'teacher_assignments',
      'grading_components', 'component_activities', 'component_scores', 'attendance'
    )
  ) THEN
    RAISE EXCEPTION 'Full restore payload contains an unsupported table.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_data->'departments') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'department_export_settings') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'courses') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'staff_users') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'academic_terms') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'sections') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'students') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'subjects') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'teacher_assignments') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'grading_components') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'component_activities') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'component_scores') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_data->'attendance') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Full restore requires every restorable table as an array.' USING ERRCODE = '22023';
  END IF;

  -- Serialize restores before taking account-row locks to avoid competing
  -- restores holding one another's preserved superadmin rows.
  PERFORM pg_advisory_xact_lock(1936028274, 1);

  SELECT system_role, course_id, created_by
    INTO v_caller_role, v_caller_course_id, v_caller_created_by
  FROM public.staff_users
  WHERE id = p_preserved_superadmin_id
  FOR UPDATE;

  IF NOT FOUND OR v_caller_role IS DISTINCT FROM 'superadmin' THEN
    RAISE EXCEPTION 'The preserved account must be an existing superadmin.' USING ERRCODE = '42501';
  END IF;

  -- Do not mutate the caller's account or leave its foreign keys dangling.
  IF v_caller_course_id IS NOT NULL OR v_caller_created_by IS NOT NULL THEN
    RAISE EXCEPTION 'Full restore is blocked because the current superadmin account has course/creator references.' USING ERRCODE = '23503';
  END IF;

  -- Any later error rolls back this entire function call, including every
  -- delete and insert below.

  -- Delete children before parents. Keep the audit log and caller account.
  DELETE FROM public.attendance;
  DELETE FROM public.component_scores;
  DELETE FROM public.component_activities;
  DELETE FROM public.grading_components;
  DELETE FROM public.teacher_assignments;
  DELETE FROM public.students;
  DELETE FROM public.sections;
  DELETE FROM public.subjects;
  DELETE FROM public.academic_terms;
  DELETE FROM public.staff_users WHERE id <> p_preserved_superadmin_id;
  DELETE FROM public.department_export_settings;
  DELETE FROM public.courses;
  DELETE FROM public.departments;

  -- Restore parents before children. Explicit columns keep the payload scoped
  -- to the supported backup format; department_export_settings uses its
  -- natural primary key (department_id), not an id column.
  INSERT INTO public.departments (id, name, abbr, created_at)
  SELECT r.id, r.name, r.abbr, r.created_at
  FROM jsonb_populate_recordset(NULL::public.departments, p_data->'departments') AS r;

  INSERT INTO public.department_export_settings
    (department_id, program_head_bsit, program_head_bscs, dean_cict, updated_at)
  SELECT r.department_id, r.program_head_bsit, r.program_head_bscs, r.dean_cict, r.updated_at
  FROM jsonb_populate_recordset(NULL::public.department_export_settings, p_data->'department_export_settings') AS r;

  INSERT INTO public.courses (id, name, abbreviation, department_id, created_at)
  SELECT r.id, r.name, r.abbreviation, r.department_id, r.created_at
  FROM jsonb_populate_recordset(NULL::public.courses, p_data->'courses') AS r;

  INSERT INTO public.staff_users
    (id, first_name, last_name, full_name, username, department, course_id,
     system_role, staff_id, password, created_by, created_at)
  SELECT r.id, r.first_name, r.last_name, r.full_name, r.username, r.department,
         r.course_id, r.system_role, r.staff_id, r.password, NULL, r.created_at
  FROM jsonb_populate_recordset(NULL::public.staff_users, p_data->'staff_users') AS r
  WHERE r.id <> p_preserved_superadmin_id;

  -- Restore self-referential creator links only after all account IDs exist;
  -- the FK is immediate and the backup row order is not guaranteed.
  UPDATE public.staff_users AS target
  SET created_by = restored.created_by
  FROM jsonb_populate_recordset(NULL::public.staff_users, p_data->'staff_users') AS restored
  WHERE target.id = restored.id
    AND target.id <> p_preserved_superadmin_id;

  INSERT INTO public.academic_terms (id, school_year, semester, is_active, is_closed, created_at)
  SELECT r.id, r.school_year, r.semester, r.is_active, r.is_closed, r.created_at
  FROM jsonb_populate_recordset(NULL::public.academic_terms, p_data->'academic_terms') AS r;

  INSERT INTO public.sections
    (id, name, course_id, year_level, school_year, semester, created_by, created_at)
  SELECT r.id, r.name, r.course_id, r.year_level, r.school_year, r.semester, r.created_by, r.created_at
  FROM jsonb_populate_recordset(NULL::public.sections, p_data->'sections') AS r;

  INSERT INTO public.students
    (id, student_id, student_name, first_name, last_name, mi, gender, section_id, created_at)
  SELECT r.id, r.student_id, r.student_name, r.first_name, r.last_name, r.mi, r.gender, r.section_id, r.created_at
  FROM jsonb_populate_recordset(NULL::public.students, p_data->'students') AS r;

  INSERT INTO public.subjects
    (id, name, code, year_level, school_year, semester, course_id, created_by, created_at)
  SELECT r.id, r.name, r.code, r.year_level, r.school_year, r.semester, r.course_id, r.created_by, r.created_at
  FROM jsonb_populate_recordset(NULL::public.subjects, p_data->'subjects') AS r;

  INSERT INTO public.teacher_assignments
    (id, teacher_id, section_id, subject_id, school_year, semester, created_by, created_at)
  SELECT r.id, r.teacher_id, r.section_id, r.subject_id, r.school_year, r.semester, r.created_by, r.created_at
  FROM jsonb_populate_recordset(NULL::public.teacher_assignments, p_data->'teacher_assignments') AS r;

  INSERT INTO public.grading_components
    (id, teacher_assignment_id, term, name, weight, sort_order, is_attendance, created_at)
  SELECT r.id, r.teacher_assignment_id, r.term, r.name, r.weight, r.sort_order, r.is_attendance, r.created_at
  FROM jsonb_populate_recordset(NULL::public.grading_components, p_data->'grading_components') AS r;

  INSERT INTO public.component_activities
    (id, component_id, name, max_score, sort_order, is_attendance, created_at)
  SELECT r.id, r.component_id, r.name, r.max_score, r.sort_order, r.is_attendance, r.created_at
  FROM jsonb_populate_recordset(NULL::public.component_activities, p_data->'component_activities') AS r;

  INSERT INTO public.component_scores (id, activity_id, student_id, score, created_at)
  SELECT r.id, r.activity_id, r.student_id, r.score, r.created_at
  FROM jsonb_populate_recordset(NULL::public.component_scores, p_data->'component_scores') AS r;

  INSERT INTO public.attendance
    (id, teacher_assignment_id, student_id, date, status, score, session, type, term, created_at)
  SELECT r.id, r.teacher_assignment_id, r.student_id, r.date, r.status, r.score,
         r.session, r.type, r.term, r.created_at
  FROM jsonb_populate_recordset(NULL::public.attendance, p_data->'attendance') AS r;

  RETURN jsonb_build_object(
    'status', 'restored',
    'restored_tables', to_jsonb(ARRAY[
      'departments', 'department_export_settings', 'courses', 'staff_users',
      'academic_terms', 'sections', 'students', 'subjects', 'teacher_assignments',
      'grading_components', 'component_activities', 'component_scores', 'attendance'
    ]::TEXT[]),
    'preserved_superadmin_id', p_preserved_superadmin_id,
    'activity_log', 'preserved'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.restore_full_backup_atomic(JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_full_backup_atomic(JSONB, UUID) TO service_role;
