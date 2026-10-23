const DEFAULT_API_BASE = `http://${window.location.hostname}:5000`;

// Deployments that serve the API elsewhere set VITE_API_BASE_URL
// (see frontend/.env.example). The default matches the local/LAN setup.
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

// Pages call api('/api/...'); absolute URLs still pass through unchanged.
const resolveUrl = (url) => (url.startsWith('/') ? `${API_BASE}${url}` : url);

const getToken = () => localStorage.getItem('token');

// The term currently being viewed, if the user has switched to an archived
// term. The backend rejects writes made while an archived term is selected.
const getViewTerm = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const key = user?.role === 'teacher'
      ? 'teacher_view_term'
      : user?.role === 'admin'
        ? 'admin_view_term'
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
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

const api = async (url, options = {}) => {
  const token = getToken();
  const viewTerm = getViewTerm();
  const res = await fetch(resolveUrl(url), {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(viewTerm?.school_year ? { 'X-View-Term-School-Year': viewTerm.school_year } : {}),
      ...(viewTerm?.semester ? { 'X-View-Term-Semester': viewTerm.semester } : {}),
      'Content-Type': 'application/json',
    },
  });

  // 403 = authenticated but not allowed (closed term, role restriction,
  // cross-scope access). Keep the session; the caller shows the message.
  if (res.status === 401) handle401();

  return res;
};

export default api;
