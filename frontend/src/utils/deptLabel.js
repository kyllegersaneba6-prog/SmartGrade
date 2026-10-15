import { useEffect, useState } from 'react';
import api from './api';

// "College of …" + stored abbr → "College of … (CICT)".
// Mirrors the deptDisplay logic used in SuperAdminUsers: skips the suffix
// when the name already ends with it, falls back to the code in
// parentheses for older rows, and returns the plain name when no abbr exists.
export const formatDeptWithAbbr = (name, departments = []) => {
  if (!name) return name;
  const match = (departments || []).find(
    (d) => String(d.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
  );
  let abbr = match?.abbr && String(match.abbr).trim() ? String(match.abbr).trim() : '';
  if (!abbr) {
    const m = String(name).match(/\(([^)]+)\)\s*$/);
    if (m) abbr = m[1].trim();
  }
  if (!abbr) return name;
  const m = String(name).match(/\(([^)]+)\)\s*$/);
  if (m && m[1].trim().toLowerCase() === abbr.toLowerCase()) return name;
  return `${name} (${abbr})`;
};

// Logged-in user's department with abbreviation, e.g. "College of … (CICT)".
// Fetches the department list once; renders the plain name until it loads.
export const useDeptLabel = () => {
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    let alive = true;
    api('http://localhost:5000/api/departments')
      .then(async (res) => {
        if (res.ok && alive) setDepartments(await res.json());
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  let dept = '';
  try {
    dept = JSON.parse(localStorage.getItem('user') || '{}')?.department || '';
  } catch {
    dept = '';
  }
  return formatDeptWithAbbr(dept, departments);
};
