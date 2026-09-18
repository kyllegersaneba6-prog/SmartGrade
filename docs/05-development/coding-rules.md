# Coding Rules

## General

- No TypeScript — plain JavaScript throughout.
- No tests — do not add test files.
- No centralized API client — hardcoded `http://localhost:5000` in every page component.
- No external state management library — use React built-in hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`, `createContext`).
- Shared state lives in `frontend/src/contexts/` as React Context providers.
- Teacher assignment/term state is shared globally via `TeacherContext` (fetched once, consumed via `useTeacher()`).
- Admin term/archive state is shared globally via `AdminContext` (fetched once, consumed via `useAdmin()`). `currentTerm` equals `viewTerm` in archive mode, otherwise `activeTerm`.
- `AdminTeachers.jsx` stores raw API assignment data in `allAssignments` and computes `teacherCourses` via `useMemo` filtering by `currentTerm`. The View modal also filters fetched assignments by `currentTerm`. The Active/Historical badge in the View modal always uses `activeTerm` for correct labeling.
- Assignment selection persists to localStorage under key `teacher_selected_assignment`.
- Archive view term for teachers persists to localStorage under key `teacher_view_term`.
- Archive view term for admins persists to localStorage under key `admin_view_term`.
- Data refresh pattern: `window.dispatchEvent(new CustomEvent('app:reload'))`. Context-level data (assignments) also refreshes via `refreshAssignments()` exposed from context.
- `TeacherContext` exposes `viewTerm`, `setViewTerm`, `allTerms`, `isArchiveMode`, `filteredAssignments`, and `currentTerm` (`viewTerm || activeTerm`) for archive-mode browsing. `currentTerm` mirrors `AdminContext` so layouts and pages can consume it identically.
- Grade point conversion uses a `GRADE_RANGES` lookup array in `GradeSummary.jsx`. `gradeToPoint(s)` returns `{ gp, desc }` — the desc field provides the classification (Excellent, Very Good, Satisfactory, Fair, Failed) for the remarks column.

## Backend (Express.js)

- CommonJS modules (`require`, `module.exports`).
- Routes in `backend/routes/`, each file exports an Express router.
- Auth middleware in `backend/middleware/auth.js`.
- Supabase client imported from `@supabase/supabase-js`.
- All queries are raw Supabase JS queries (`.select()`, `.insert()`, etc.).

## Frontend (React + Vite)

- JSX with `.jsx` extension.
- Tailwind CSS for all styling.
- Components in `frontend/src/components/`, pages in `frontend/src/pages/`.
- Layouts in `frontend/src/layouts/`.
- React Router v7 for routing.
- File naming: PascalCase for components, camelCase for utilities.

## Database

- All schema changes go in `backend/sql/` as numbered migration files.
- Tables use UUID primary keys.
- Timestamps are `TIMESTAMPTZ`.
