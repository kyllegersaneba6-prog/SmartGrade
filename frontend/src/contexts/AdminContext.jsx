import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const ADMIN_VIEW_TERM_KEY = 'admin_view_term';

const AdminContext = createContext(null);

const parseViewTerm = () => {
  try { return JSON.parse(localStorage.getItem(ADMIN_VIEW_TERM_KEY)); } catch { return null; }
};

export const AdminProvider = ({ children }) => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [viewTerm, setViewTermState] = useState(parseViewTerm);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('http://localhost:5000/api/terms/active').then(r => r.ok ? r.json() : null),
      api('http://localhost:5000/api/terms').then(r => r.ok ? r.json() : []),
    ]).then(([active, all]) => {
      setActiveTerm(active);
      setAllTerms(all);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const setViewTerm = useCallback((term) => {
    setViewTermState(term);
    if (term) localStorage.setItem(ADMIN_VIEW_TERM_KEY, JSON.stringify(term));
    else localStorage.removeItem(ADMIN_VIEW_TERM_KEY);
  }, []);

  const isArchiveMode = viewTerm !== null;
  const currentTerm = viewTerm || activeTerm;

  return (
    <AdminContext.Provider value={{
      activeTerm,
      allTerms,
      viewTerm,
      setViewTerm,
      isArchiveMode,
      currentTerm,
      loading,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider');
  return ctx;
};
