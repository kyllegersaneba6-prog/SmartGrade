// Teacher export filenames.
// Format: CourseYearSection-Term-SubjectCode-PageName.extension
// e.g. BSIT1H-prelim-GEDC7246-classrecord.pdf
//
// Segments are read from the selected teacher assignment:
//   section -> currentAssignment.sections.name  ("BSIT 1H" -> "BSIT1H")
//   code    -> currentAssignment.subjects.code ("subjects(name, code)" join)
//   term    -> page's selected grading period (PRELIMS -> prelim, ...)
//   page    -> classrecord | attendance | analytics | gradesummary

export const TEACHER_TERM_TOKENS = {
  PRELIMS: 'prelim',
  MIDTERMS: 'midterm',
  'PRE-FINALS': 'pre-final',
  FINALS: 'final',
};

// Keep alphanumerics (and hyphens, common in subject codes); drop spaces
// and invalid filesystem characters. Case is preserved so course and
// subject codes stay readable (BSIT1H, GEDC7246).
export const filenameSegment = (value, fallback) => {
  const s = String(value ?? '')
    .replace(/[^A-Za-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
};

export const buildTeacherFilename = ({ section, code, term, page, ext }) =>
  `${filenameSegment(section, 'class')}-${term}-${filenameSegment(code, 'nocode')}-${page}.${ext}`;
