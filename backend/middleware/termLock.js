const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CLOSED_MESSAGE = 'This term is closed. No modifications allowed.';

const getActiveTerm = async () => {
  const { data, error } = await supabase
    .from('academic_terms')
    .select('school_year, semester')
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};

const isActiveTerm = (term, schoolYear, semester) => {
  if (!term) return false;
  if (schoolYear && term.school_year !== schoolYear) return false;
  if (semester && term.semester !== semester) return false;
  return true;
};

// Rejects the request with 403 when the given term is not the active one.
// A missing school_year/semester only checks that some term is active.
const assertActiveTerm = async (res, { schoolYear, semester } = {}) => {
  const activeTerm = await getActiveTerm();
  if (!isActiveTerm(activeTerm, schoolYear, semester)) {
    res.status(403).json({ message: CLOSED_MESSAGE });
    return false;
  }
  return true;
};

// Global guard for writes made while browsing an archived term. The client
// sends the term it is viewing; writes are only allowed when that term is the
// active one. Requests without the headers (and all reads) pass through.
const rejectArchivedWrites = async (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const schoolYear = req.get('X-View-Term-School-Year');
  const semester = req.get('X-View-Term-Semester');
  if (!schoolYear && !semester) return next();
  try {
    const activeTerm = await getActiveTerm();
    if (!isActiveTerm(activeTerm, schoolYear, semester)) {
      return res.status(403).json({ message: CLOSED_MESSAGE });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { assertActiveTerm, rejectArchivedWrites, CLOSED_MESSAGE };
