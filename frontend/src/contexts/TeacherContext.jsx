import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { TERMS } from '../utils/gradeCalculations';

const LS_KEY = 'teacher_selected_assignment';
const VIEW_TERM_KEY = 'teacher_view_term';
const GRADING_TERM_KEY = 'teacher_grading_term';

const TeacherContext = createContext(null);

const parseViewTerm = () => {
  try { return JSON.parse(localStorage.getItem(VIEW_TERM_KEY)); } catch { return null; }
};

const parseGradingTerm = () => {
  const saved = localStorage.getItem(GRADING_TERM_KEY);
  return TERMS.includes(saved) ? saved : 'PRELIMS';
};

export const TeacherProvider = ({ children }) => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignmentState] = useState(() => localStorage.getItem(LS_KEY) || '');
  const [loading, setLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [viewTerm, setViewTermState] = useState(parseViewTerm);
  const [gradingTerm, setGradingTermState] = useState(parseGradingTerm);

  useEffect(() => {
    api('/api/terms/active')
      .then(r => r.ok ? r.json() : null)
      .then(d => setActiveTerm(d))
      .catch(() => {});
    api('/api/terms')
      .then(r => r.ok ? r.json() : [])
      .then(d => setAllTerms(d))
      .catch(() => {});
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/api/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
        const saved = localStorage.getItem(LS_KEY);
        if (data.length > 0 && !saved) {
          setSelectedAssignmentState(data[0].id);
          localStorage.setItem(LS_KEY, data[0].id);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = viewTerm
    ? assignments.filter(a => a.school_year === viewTerm.school_year && a.semester === viewTerm.semester)
    : activeTerm
      ? assignments.filter(a => a.school_year === activeTerm.school_year && a.semester === activeTerm.semester)
      : assignments;

  const currentTerm = viewTerm || activeTerm;

  useEffect(() => {
    if (filteredAssignments.length > 0) {
      const exists = filteredAssignments.find(a => String(a.id) === String(selectedAssignment));
      if (!exists) {
        setSelectedAssignmentState(filteredAssignments[0].id);
        localStorage.setItem(LS_KEY, filteredAssignments[0].id);
      }
    }
  }, [filteredAssignments, selectedAssignment]);

  const setViewTerm = useCallback((term) => {
    setViewTermState(term);
    if (term) localStorage.setItem(VIEW_TERM_KEY, JSON.stringify(term));
    else localStorage.removeItem(VIEW_TERM_KEY);
  }, []);

  const setGradingTerm = useCallback((term) => {
    if (!TERMS.includes(term)) return;
    setGradingTermState(term);
    localStorage.setItem(GRADING_TERM_KEY, term);
  }, []);

  const setSelectedAssignment = useCallback((id) => {
    setSelectedAssignmentState(id);
    localStorage.setItem(LS_KEY, String(id));
  }, []);

  const currentAssignment = filteredAssignments.find((a) => String(a.id) === String(selectedAssignment)) || null;

  const isReadOnly = currentAssignment && (!activeTerm || activeTerm.school_year !== currentAssignment.school_year || activeTerm.semester !== currentAssignment.semester);

  const isArchiveMode = viewTerm !== null;

  return (
    <TeacherContext.Provider value={{
      assignments: filteredAssignments,
      loading,
      selectedAssignment,
      setSelectedAssignment,
      currentAssignment,
      activeTerm,
      allTerms,
      viewTerm,
      setViewTerm,
      gradingTerm,
      setGradingTerm,
      isArchiveMode,
      isReadOnly,
      currentTerm,
      refreshAssignments: fetchAssignments,
    }}>
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher must be used within a TeacherProvider');
  return ctx;
};


