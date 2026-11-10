import api from './api';

export const recordTeacherExport = async ({ assignmentId, reportType, format, term, studentCount }) => {
  try {
    const response = await api('/api/activity/teacher-export', {
      method: 'POST',
      body: JSON.stringify({
        assignment_id: assignmentId,
        report_type: reportType,
        format,
        term,
        student_count: studentCount,
      }),
    });
    if (!response.ok) {
      console.warn('The export completed, but its audit event could not be recorded.');
    }
  } catch (error) {
    console.warn('The export completed, but its audit event could not be recorded.', error);
  }
};
