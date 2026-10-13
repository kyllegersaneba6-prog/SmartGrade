const crypto = require('crypto');

// Official SmartGrade backup constants. Single source of truth for format v1.0.
const APP_ID = 'smartgrade';
const MAGIC = 'SGBK';
const FORMAT_VERSION = '1.0';
const SCHEMA_COMPAT = '2026-10-12';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB upload cap

// Dependency-ordered tables (parents first). Used for export + restore ordering.
const TABLE_ORDER = [
  'departments',
  'courses',
  'staff_users',
  'academic_terms',
  'sections',
  'students',
  'subjects',
  'teacher_assignments',
  'grading_components',
  'component_activities',
  'component_scores',
  'attendance',
  'activity_log',
];

// Allowlisted columns per table. Unknown fields in uploads are rejected.
const TABLE_COLUMNS = {
  departments: ['id', 'name', 'abbr', 'created_at'],
  courses: ['id', 'name', 'abbreviation', 'department_id', 'created_at'],
  staff_users: ['id', 'first_name', 'last_name', 'full_name', 'username', 'department', 'course_id', 'system_role', 'staff_id', 'password', 'created_by', 'created_at'],
  academic_terms: ['id', 'school_year', 'semester', 'is_active', 'is_closed', 'created_at'],
  sections: ['id', 'name', 'course_id', 'year_level', 'school_year', 'semester', 'created_by', 'created_at'],
  students: ['id', 'student_id', 'student_name', 'first_name', 'last_name', 'mi', 'gender', 'section_id', 'created_at'],
  subjects: ['id', 'name', 'code', 'year_level', 'school_year', 'semester', 'course_id', 'created_by', 'created_at'],
  teacher_assignments: ['id', 'teacher_id', 'section_id', 'subject_id', 'school_year', 'semester', 'created_by', 'created_at'],
  grading_components: ['id', 'teacher_assignment_id', 'term', 'name', 'weight', 'sort_order', 'is_attendance', 'created_at'],
  component_activities: ['id', 'component_id', 'name', 'max_score', 'sort_order', 'created_at'],
  component_scores: ['id', 'activity_id', 'student_id', 'score', 'created_at'],
  attendance: ['id', 'teacher_assignment_id', 'student_id', 'date', 'status', 'score', 'session', 'type', 'term', 'created_at'],
  activity_log: ['id', 'user_name', 'action', 'details', 'department', 'created_at'],
};

const CATEGORIES = [
  { id: 'organization', label: 'Organization', description: 'Departments and courses/programs.', tables: ['departments', 'courses'], requires: [] },
  { id: 'accounts', label: 'Accounts', description: 'Staff accounts incl. admins and teachers (password hashes preserved, never logged).', tables: ['staff_users'], requires: ['organization'], sensitive: true },
  { id: 'terms', label: 'Academic Terms', description: 'School years, semesters, active/closed flags.', tables: ['academic_terms'], requires: [] },
  { id: 'classes', label: 'Classes & Students', description: 'Sections and enrolled students.', tables: ['sections', 'students'], requires: ['organization', 'terms'], sensitive: true },
  { id: 'teaching', label: 'Subjects & Assignments', description: 'Subjects and teacher-section-subject links.', tables: ['subjects', 'teacher_assignments'], requires: ['organization', 'accounts', 'classes', 'terms'] },
  { id: 'grading', label: 'Grades', description: 'Grading components, activities and scores.', tables: ['grading_components', 'component_activities', 'component_scores'], requires: ['teaching', 'classes'] },
  { id: 'attendance', label: 'Attendance', description: 'Daily attendance records and scores.', tables: ['attendance'], requires: ['teaching', 'classes'] },
  { id: 'audit', label: 'Audit Log', description: 'Activity history. Export only; never auto-deleted on merge.', tables: ['activity_log'], requires: [] },
];

function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

// Transitive dependency closure over category ids.
function dependencyClosure(selectedIds) {
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    const cat = categoryById(id);
    if (!cat) return;
    for (const dep of cat.requires) visit(dep);
    seen.add(id);
  };
  for (const id of selectedIds) visit(id);
  return [...seen];
}

function tablesForCategories(categoryIds) {
  const tables = [];
  for (const id of categoryIds) {
    const cat = categoryById(id);
    if (!cat) continue;
    for (const t of cat.tables) if (!tables.includes(t)) tables.push(t);
  }
  return TABLE_ORDER.filter((t) => tables.includes(t));
}

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function stableStringify(value) {
  return JSON.stringify(value);
}

module.exports = {
  APP_ID, MAGIC, FORMAT_VERSION, SCHEMA_COMPAT, MAX_FILE_BYTES,
  TABLE_ORDER, TABLE_COLUMNS, CATEGORIES,
  categoryById, dependencyClosure, tablesForCategories,
  sha256Hex, stableStringify,
};
