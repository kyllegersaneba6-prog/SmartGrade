const loadSuperAdminTermSnapshot = async (supabase, req) => {
  const schoolYear = req.query.school_year;
  const semester = req.query.semester;
  if (schoolYear === undefined && semester === undefined) return { requested: false };
  if (typeof schoolYear !== 'string' || typeof semester !== 'string' || !schoolYear.trim() || !semester.trim()) {
    return { requested: true, status: 400, message: 'Both school_year and semester are required to view an archive.' };
  }
  if (req.user?.role !== 'superadmin') {
    return { requested: true, status: 403, message: 'Only superadmins can view Super Admin archives.' };
  }

  const { data: term, error: termError } = await supabase
    .from('academic_terms')
    .select('id, school_year, semester, is_closed')
    .eq('school_year', schoolYear)
    .eq('semester', semester)
    .maybeSingle();
  if (termError) return { requested: true, error: termError };
  if (!term) return { requested: true, status: 404, message: 'Academic term not found.' };
  if (!term.is_closed) return { requested: true, status: 400, message: 'Only closed semesters are available in the archive.' };

  const { data: archived, error: snapshotError } = await supabase
    .from('superadmin_term_snapshots')
    .select('snapshot, snapshot_source, captured_at')
    .eq('term_id', term.id)
    .maybeSingle();
  if (snapshotError) return { requested: true, error: snapshotError };
  if (!archived) return { requested: true, status: 404, message: 'No Super Admin snapshot is available for this semester.' };

  return { requested: true, term, ...archived };
};

module.exports = { loadSuperAdminTermSnapshot };
