# Coding Rules

## General

- No TypeScript — plain JavaScript throughout.
- No tests — do not add test files.
- No state management library — React hooks only (`useState`, `useEffect`, `useCallback`, `useMemo`, `useContext`, `createContext`).
- No centralized API client library. `frontend/src/utils/api.js` is a thin fetch wrapper that resolves relative `/api/...` paths against `API_BASE` (`VITE_API_BASE_URL`, default `http://<current-hostname>:5000`), adds the bearer token, forwards the viewed term as `X-View-Term-School-Year` / `X-View-Term-Semester`, and logs out only on 401. A 403 keeps the session and is shown by the page. Pass relative paths; do not hardcode `localhost:5000`.
- Shared state lives in `frontend/src/contexts/` as React Context providers.
- Teacher assignment/term state: `TeacherContext` (`useTeacher()`).
- Admin term/archive state: `AdminContext` (`useAdmin()`).
- `currentTerm` means `viewTerm || activeTerm` in both contexts.
- Assignment selection persists in `localStorage.teacher_selected_assignment`.
- Archive term persists in `localStorage.teacher_view_term` / `localStorage.admin_view_term`; both are cleared on logout and on a 401.
- Attendance pending writes persist in `localStorage.pending_attendance_<assignmentId>_<term>`.
- Data refresh pattern: `window.dispatchEvent(new CustomEvent('app:reload'))`.
- Grade math lives in `frontend/src/utils/gradeCalculations.js` (`TERMS`, `TERM_WEIGHTS`, `GRADE_RANGES`, `gradeToPoint`, `getComponentTotal/MaxTotal/Equiv/Weighted`, `getFinalGrade`). Do not duplicate it in pages.

## Backend (Express.js)

- CommonJS (`require`, `module.exports`).
- One router per file in `backend/routes/`, mounted in `backend/index.js` under `/api/<name>`.
- Auth middleware in `backend/middleware/auth.js`: `authenticateToken` + `authorizeRole(...)`. Read scoping helpers live in `backend/middleware/access.js` (`canAccessAssignment`, `canAccessComponent`, `canAccessSection`). Term locks live in `backend/middleware/termLock.js` (`assertActiveTerm`, `rejectArchivedWrites`).
- Role strings are exactly `superadmin`, `admin`, `teacher`.
- Every router calls `router.use(authenticateToken)` except `/api/auth` (login is public).
- Use the shared term lock for new mutating routes: `await assertActiveTerm(res, { schoolYear, semester })` and return early when it yields `false`. The global `rejectArchivedWrites` middleware already covers every write made from an archived-term view.
- All queries use raw Supabase JS (`.select()`, `.insert()`, `.update()`, `.upsert()`, `.delete()`), not SQL strings.
- The Supabase client uses the **service-role key**, which has `BYPASSRLS`. RLS is enabled on all tables with no policies, so the backend is the only supported data path. Authorization must be enforced in route code; never expose the service-role key to the browser.
- Error responses use one shape: `{ message }`. Log the underlying DB/provider error server-side and return a generic message; never send `err.message` to the client.
- Mutating endpoints that touch a term must verify the row's `school_year`/`semester` matches the active term and return 403 otherwise.
- Ownership rule: teachers must own the `teacher_assignment` (or teach the section); admins must be the `created_by` of the row; superadmin bypasses. Read helpers enforce this and fail closed.
- Bulk writes must validate **every** row before the first write (activity → component → assignment). Never treat `scores[0]` as representative; reject the whole batch on any out-of-scope row.
- Never trust identity fields (`user_name`, `department`, `role`, `created_by`) from the request body. Derive them from `req.user` or a DB lookup keyed by `req.user.id`.

## AI (`/api/ai`)

- AI output is advisory only. It must never write grades or be used as a source of truth.
- Sanitize input with the allowlist in `services/aiService.js` before sending.
- Request strict JSON (`response_format: json_object`) and validate with `services/aiValidator.js`.
- Invalid output → 502; timeout → 504. Never return raw provider text.
- Keep the provider abstracted behind `omniRouteProvider.js` so the gateway can be swapped.

## Backup (`/api/backup`)

- Router is superadmin-only
- Format constants live only in `services/backupFormat.js` (`SGBK`, version 1.0, table order, column allowlists).
- Every table export is checksummed; validation must re-verify checksums and counts.
- Encryption is AES-256-GCM with scrypt; passwords are at least 8 characters.
- Destructive modes require a typed confirmation phrase and must never delete the caller's own superadmin row or the `activity_log`.
- `TABLE_COLUMNS` is an allowlist: new columns must be added there or they will silently not be backed up.

## Frontend (React + Vite)

- JSX with `.jsx`.
- Tailwind CSS for all styling; shared tokens in `src/index.css`.
- Components in `src/components/` (`admin/`, `superadmin/`, `teacher/`, `common/`), pages in `src/pages/`, layouts in `src/layouts/`.
- React Router v7; every protected route is wrapped by `ProtectedRoute allowedRoles={[...]}`.
- File naming: PascalCase for components, camelCase for utilities.
- Shared UI primitives: `Pagination`, `Skeleton`, `CustomDropdown`, `NotificationDropdown`, `FloatingAssignmentSelector`, `ExportButtons`.
- Tables paginate at 15 rows for teacher data pages; search resets to page 1.
- Respect `isReadOnly` / `isArchiveMode`: disable or hide mutate controls, not both inconsistently.

## Database

- Schema changes go in `backend/sql/` as `create_*.sql`, `alter_*.sql`, `migrate_*.sql`, or `add_*.sql` files. They are **not numbered** and there is no runner — naming and apply order are manual.
- Tables use UUID primary keys and `TIMESTAMPTZ` timestamps.
- Enforce business rules in route code even when a DB constraint exists; the DB is the backstop, routes return the user-facing 400.
- Keep RLS enabled on every `public` table. New tables must run `alter table ... enable row level security;` (see `enable_row_level_security.sql`). Do not add browser-side Supabase clients unless policies and grants are designed first.
