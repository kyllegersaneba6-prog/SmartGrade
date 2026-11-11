import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const VIEW_TERM_KEY = 'superadmin_view_term';
const SuperAdminContext = createContext(null);

const parseSavedTerm = () => {
  try { return JSON.parse(localStorage.getItem(VIEW_TERM_KEY)); } catch { return null; }
};

const getTermFromParams = (params) => {
  const school_year = params.get('school_year');
  const semester = params.get('semester');
  return school_year && semester ? { school_year, semester } : null;
};

export const SuperAdminProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [viewTerm, setViewTermState] = useState(() => getTermFromParams(searchParams) || parseSavedTerm());
  const [termsLoaded, setTermsLoaded] = useState(false);

  const loadTerms = useCallback(async () => {
    try {
      const [activeRes, allRes] = await Promise.all([
        api('/api/terms/active'),
        api('/api/terms'),
      ]);
      const active = activeRes.ok ? await activeRes.json() : null;
      const terms = allRes.ok ? await allRes.json() : [];
      setActiveTerm(active);
      setAllTerms(terms);
    } catch {
      // Keep the current view if term data cannot be reached temporarily.
    } finally {
      setTermsLoaded(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => { if (alive) await loadTerms(); };
    load();
    const handler = () => loadTerms();
    window.addEventListener('app:reload', handler);
    return () => { alive = false; window.removeEventListener('app:reload', handler); };
  }, [loadTerms]);

  const queryTerm = getTermFromParams(searchParams);
  useEffect(() => {
    if (!queryTerm) return;
    setViewTermState(queryTerm);
    localStorage.setItem(VIEW_TERM_KEY, JSON.stringify(queryTerm));
  }, [queryTerm?.school_year, queryTerm?.semester]);

  useEffect(() => {
    if (!termsLoaded || !viewTerm || allTerms.length === 0) return;
    const match = allTerms.find((term) => (
      term.school_year === viewTerm.school_year && term.semester === viewTerm.semester && term.is_closed
    ));
    if (!match) {
      setViewTermState(null);
      localStorage.removeItem(VIEW_TERM_KEY);
      setSearchParams({}, { replace: true });
    } else if (match.id !== viewTerm.id) {
      setViewTermState(match);
      localStorage.setItem(VIEW_TERM_KEY, JSON.stringify(match));
    }
  }, [allTerms, searchParams, setSearchParams, termsLoaded, viewTerm]);

  const setViewTerm = useCallback((term) => {
    if (!term?.school_year || !term?.semester || !term.is_closed) return;
    const nextTerm = { id: term.id, school_year: term.school_year, semester: term.semester, is_closed: true };
    setViewTermState(nextTerm);
    localStorage.setItem(VIEW_TERM_KEY, JSON.stringify(nextTerm));
    setSearchParams({ school_year: term.school_year, semester: term.semester });
  }, [setSearchParams]);

  const clearArchive = useCallback(() => {
    setViewTermState(null);
    localStorage.removeItem(VIEW_TERM_KEY);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const isArchiveMode = Boolean(viewTerm?.school_year && viewTerm?.semester);
  const currentTerm = isArchiveMode ? viewTerm : activeTerm;
  const archiveApiUrl = useCallback((path) => {
    if (!isArchiveMode) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}school_year=${encodeURIComponent(viewTerm.school_year)}&semester=${encodeURIComponent(viewTerm.semester)}`;
  }, [isArchiveMode, viewTerm?.school_year, viewTerm?.semester]);
  const archiveRoute = useCallback((path) => archiveApiUrl(path), [archiveApiUrl]);

  const value = useMemo(() => ({
    activeTerm,
    allTerms,
    viewTerm,
    currentTerm,
    isArchiveMode,
    termsLoaded,
    setViewTerm,
    clearArchive,
    archiveApiUrl,
    archiveRoute,
  }), [activeTerm, allTerms, archiveApiUrl, archiveRoute, clearArchive, currentTerm, isArchiveMode, setViewTerm, termsLoaded, viewTerm]);

  return <SuperAdminContext.Provider value={value}>{children}</SuperAdminContext.Provider>;
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
  return context;
};
