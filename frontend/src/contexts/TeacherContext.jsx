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
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [termsLoading, setTermsLoading] = useState(true);
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [viewTerm, setViewTermState] = useState(parseViewTerm);
  const [gradingTerm, setGradingTermState] = useState(parseGradingTerm);
  const loading = assignmentsLoading || termsLoading;

  useEffect(() => {
    let active = true;
    const loadTerms = async () => {
      try {
        const [activeResponse, termsResponse] = await Promise.all([
          api('/api/terms/active'),
          api('/api/terms'),
        ]);
        const [activeData, termsData] = await Promise.all([
          activeResponse.ok ? activeResponse.json() : null,
          termsResponse.ok ? termsResponse.json() : [],
        ]);
        if (active) {
          setActiveTerm(activeData);
          setAllTerms(termsData);
        }
      } catch {
        // Keep the empty term state when term data cannot be loaded.
      } finally {
        if (active) setTermsLoading(false);
      }
    };
    loadTerms();
    return () => { active = false; };
  }, []);

  const fetchAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const res = await api('/api/assignments');
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) { console.error(err); }
    finally { setAssignmentsLoading(false); }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredAssignments = viewTerm
    ? assignments.filter(a => a.school_year === viewTerm.school_year && a.semester === viewTerm.semester)
    : activeTerm
      ? assignments.filter(a => a.school_year === activeTerm.school_year && a.semester === activeTerm.semester)
      : [];

  const currentTerm = viewTerm || activeTerm;

  const matchingAssignment = filteredAssignments.find((assignment) => String(assignment.id) === String(selectedAssignment));
  const resolvedAssignmentId = matchingAssignment
    ? String(matchingAssignment.id)
    : String(filteredAssignments[0]?.id || '');

  useEffect(() => {
    if (loading) return;
    if (resolvedAssignmentId) {
      if (resolvedAssignmentId !== String(selectedAssignment)) setSelectedAssignmentState(resolvedAssignmentId);
      localStorage.setItem(LS_KEY, resolvedAssignmentId);
    } else {
      if (selectedAssignment) setSelectedAssignmentState('');
      localStorage.removeItem(LS_KEY);
    }
  }, [loading, resolvedAssignmentId, selectedAssignment]);

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

  const currentAssignment = filteredAssignments.find((assignment) => String(assignment.id) === resolvedAssignmentId) || null;

  const isReadOnly = currentAssignment && (!activeTerm || activeTerm.school_year !== currentAssignment.school_year || activeTerm.semester !== currentAssignment.semester);

  const isArchiveMode = viewTerm !== null;

  return (
    <TeacherContext.Provider value={{
      assignments: filteredAssignments,
      loading,
      selectedAssignment: resolvedAssignmentId,
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


