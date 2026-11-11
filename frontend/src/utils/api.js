import { API_BASE } from './apiBase';
import { checkBackendAvailability } from './backendAvailability';

// Preserve the existing import path for pages such as Login.
export { API_BASE } from './apiBase';

// Pages call api('/api/...'); absolute URLs still pass through unchanged.
const resolveUrl = (url) => (url.startsWith('/') ? `${API_BASE}${url}` : url);

const getToken = () => localStorage.getItem('token');

// The term currently being viewed, if the user has switched to an archived
// term. The backend rejects writes made while an archived term is selected.
const getViewTerm = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const role = user?.role || user?.system_role;
    const key = role === 'teacher'
      ? 'teacher_view_term'
      : role === 'admin'
        ? 'admin_view_term'
        : role === 'superadmin'
          ? 'superadmin_view_term'
          : null;
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  } catch {
    return null;
  }
};

// 401 = not authenticated (missing, expired, or tampered token) — end the
// session and return to login.
const handle401 = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('admin_view_term');
  localStorage.removeItem('teacher_view_term');
  localStorage.removeItem('superadmin_view_term');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const api = async (url, options = {}) => {
  const token = getToken();
  const viewTerm = getViewTerm();
  let res;
  try {
    res = await fetch(resolveUrl(url), {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(viewTerm?.school_year ? { 'X-View-Term-School-Year': viewTerm.school_year } : {}),
        ...(viewTerm?.semester ? { 'X-View-Term-Semester': viewTerm.semester } : {}),
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error?.name !== 'AbortError') void checkBackendAvailability();
    throw error;
  }
  if (res.status >= 500) void checkBackendAvailability();

  // 403 = authenticated but not allowed (closed term, role restriction,
  // cross-scope access). Keep the session; the caller shows the message.
  if (res.status === 401) handle401();

  return res;
};

export default api;
