const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Read-access helpers. These mirror the scoping already used by
// GET /api/assignments and GET /api/sections:
//   superadmin -> everything
//   admin      -> rows they created (their department)
//   teacher    -> their own assignments
// Every helper fails closed: an unknown id or a database error returns false.

const canAccessAssignment = async (assignmentId, user) => {
  if (!assignmentId || !user) return false;
  if (user.role === 'superadmin') return true;
  if (!['admin', 'teacher'].includes(user.role)) return false;

  let query = supabase
    .from('teacher_assignments')
    .select('id')
    .eq('id', assignmentId);

  if (user.role === 'teacher') query = query.eq('teacher_id', user.id);
  else query = query.eq('created_by', user.id);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Assignment access check failed:', error.message);
    return false;
  }
  return !!data;
};

const canAccessComponent = async (componentId, user) => {
  if (!componentId || !user) return false;

  const { data, error } = await supabase
    .from('grading_components')
    .select('teacher_assignment_id')
    .eq('id', componentId)
    .maybeSingle();

  if (error) {
    console.error('Component access check failed:', error.message);
    return false;
  }
  if (!data) return false;

  return canAccessAssignment(data.teacher_assignment_id, user);
};

const canAccessSection = async (sectionId, user) => {
  if (!sectionId || !user) return false;
  if (user.role === 'superadmin') return true;
  if (!['admin', 'teacher'].includes(user.role)) return false;

  const table = user.role === 'admin' ? 'sections' : 'teacher_assignments';
  let query = supabase.from(table).select('id');

  if (user.role === 'admin') {
    query = query.eq('id', sectionId).eq('created_by', user.id);
  } else {
    query = query.eq('section_id', sectionId).eq('teacher_id', user.id);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) {
    console.error('Section access check failed:', error.message);
    return false;
  }
  return !!data;
};

module.exports = { canAccessAssignment, canAccessComponent, canAccessSection };
