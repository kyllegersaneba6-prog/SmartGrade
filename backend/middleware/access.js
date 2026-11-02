const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Shared read/write checks. Missing relationships and query failures never grant access.
const accessCache = Symbol('accessCache');
const getRow = async (table, id, columns = '*', user) => {
  if (!id) return null;
  // Cache only within this request's fresh req.user, never across sessions.
  const cache = user && (user[accessCache] ||= new Map());
  const key = JSON.stringify([table, id, columns]);
  if (cache?.has(key)) return cache.get(key);
  const lookup = (async () => {
    const { data, error } = await supabase.from(table).select(columns).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  })();
  cache?.set(key, lookup);
  return lookup;
};

const canAccessCourse = async (courseId, user) => {
  if (!user) return false;
  const course = await getRow('courses', courseId, 'id, department_id', user);
  return !!course && (user.role === 'superadmin' ||
    (['admin', 'teacher'].includes(user.role) && !!user.department_id && course.department_id === user.department_id));
};

const resourceInDepartment = async (row, user) => {
  if (!row || !user?.department_id) return false;
  if (row.course_id) return canAccessCourse(row.course_id, user);
  // Legacy course-less resources are scoped through their existing creator.
  const creator = await getRow('staff_users', row.created_by, 'department, system_role', user);
  return creator?.system_role === 'admin' && creator.department === user.department;
};

const canManageTeacher = async (teacherId, user) => {
  const teacher = await getRow('staff_users', teacherId, 'system_role, created_by, department', user);
  return user?.role === 'admin' && !!user.department_id && teacher?.system_role === 'teacher'
    && teacher.created_by === user.id && teacher.department === user.department;
};

const canManageSubject = async (subjectId, user) => {
  const subject = await getRow('subjects', subjectId, '*', user);
  return user?.role === 'admin' && subject?.created_by === user.id && await resourceInDepartment(subject, user);
};

const canAccessAssignment = async (assignmentId, user) => {
  if (!assignmentId || !user) return false;
  const assignment = await getRow('teacher_assignments', assignmentId, '*', user);
  if (!assignment) return false;
  if (user.role === 'superadmin') return true;
  if (!['admin', 'teacher'].includes(user.role) || !user.department_id) return false;
  if (user.role === 'teacher' && assignment.teacher_id !== user.id) return false;
  if (user.role === 'admin' && (assignment.created_by !== user.id ||
      !(await canManageTeacher(assignment.teacher_id, user)))) return false;
  const [section, subject] = await Promise.all([
    getRow('sections', assignment.section_id, '*', user),
    getRow('subjects', assignment.subject_id, '*', user),
  ]);
  if (!(await resourceInDepartment(section, user)) || !(await resourceInDepartment(subject, user))) return false;
  return user.role !== 'admin' || (section.created_by === user.id && subject.created_by === user.id);
};

const canAccessComponent = async (componentId, user) => {
  if (!componentId || !user) return false;

  const data = await getRow('grading_components', componentId, 'teacher_assignment_id', user);
  if (!data) return false;

  return canAccessAssignment(data.teacher_assignment_id, user);
};

const canAccessSection = async (sectionId, user) => {
  if (!sectionId || !user) return false;
  const section = await getRow('sections', sectionId, '*', user);
  if (!section) return false;
  if (user.role === 'superadmin') return true;
  if (!['admin', 'teacher'].includes(user.role)) return false;
  if (!(await resourceInDepartment(section, user))) return false;
  if (user.role === 'admin') return section.created_by === user.id;
  const { data, error } = await supabase.from('teacher_assignments').select('id')
    .eq('section_id', sectionId).eq('teacher_id', user.id);
  if (error) throw error;
  return (await filterAccessible(data, canAccessAssignment, user)).length > 0;
};

const filterAccessible = async (rows, check, user) => {
  const accessible = [];
  for (let i = 0; i < (rows || []).length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const allowed = await Promise.all(batch.map(row => check(row.id, user)));
    accessible.push(...batch.filter((_, index) => allowed[index]));
  }
  return accessible;
};

// Validate every requested pair before any batch write. Chunking avoids row caps.
const studentsBelongToAssignments = async (pairs) => {
  if (!pairs.length || pairs.some(p => !p.student_id || !p.assignment_id)) return false;
  const assignments = new Map();
  for (const id of new Set(pairs.map(p => p.assignment_id))) {
    const row = await getRow('teacher_assignments', id, 'section_id');
    if (!row) return false;
    assignments.set(id, row.section_id);
  }
  const ids = [...new Set(pairs.map(p => p.student_id))];
  const students = new Map();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from('students').select('id, section_id').in('id', ids.slice(i, i + 200));
    if (error) throw error;
    for (const row of data || []) students.set(row.id, row.section_id);
  }
  return pairs.every(p => students.has(p.student_id) && students.get(p.student_id) === assignments.get(p.assignment_id));
};

module.exports = { canAccessAssignment, canAccessComponent, canAccessSection, canAccessCourse,
  canManageTeacher, canManageSubject, filterAccessible, studentsBelongToAssignments, getRow };
