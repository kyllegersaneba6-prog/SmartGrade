import api from './api';

export const DEFAULT_EXPORT_SETTINGS = Object.freeze({
  program_head_bsit: 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  program_head_bscs: 'ARIEL T. SUMAGAYSAY, MSCS, MAEd',
  dean_cict: 'MAE B. LODANA, Ph.D.',
});

export const fetchExportSettings = async () => {
  const response = await api('/api/export-settings');
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Could not load export signatory settings.');
  }
  return { ...DEFAULT_EXPORT_SETTINGS, ...(await response.json()) };
};

export const getExportSignatories = (assignment, settings = DEFAULT_EXPORT_SETTINGS) => {
  const courseAbbreviation = String(assignment?.sections?.courses?.abbreviation || '').toUpperCase();
  const program = courseAbbreviation.includes('BSCS') ? 'BSCS' : 'BSIT';
  const programHeadName = settings[program === 'BSCS' ? 'program_head_bscs' : 'program_head_bsit'];

  return {
    programHeadName: String(programHeadName || '').trim(),
    programHeadRole: `Program Head, ${program}`,
    deanName: String(settings.dean_cict || '').trim(),
    deanRole: 'Dean, CICT',
  };
};
