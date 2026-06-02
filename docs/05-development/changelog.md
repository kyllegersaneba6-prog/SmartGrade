# Changelog

## 2026-06-03

### Dark Theme Extended to Sidebar & Header
- Updated CSS custom properties in `index.css`: sidebar bg from `#2f3640` to `#0f172a` (slate-900), hover to `#1e293b` (slate-800), active to `#020617` (slate-950).
- Applies to all three sidebars (Teacher, Admin, SuperAdmin) and all headers via existing `bg-sidebar` / `bg-sidebar-hover` / `border-sidebar-hover` classes.

## 2026-06-03

### Login Page Redesign — Dark Mode 2-Column Layout
- Complete visual overhaul: dark slate-900 background, gold accents, 2-column layout.
- Left column (42%): Login form in a dark slate-800/80 card with backdrop blur, centered vertically.
- Right column (58%, hidden below lg breakpoint): Gradient background (slate-800 → slate-900 → indigo-950) with abstract geometric decorations — gradient circles, grid dot overlay, diagonal SVG accent lines.
- Hero content: branding logo, tagline, 4 feature items (Grade Computation, Attendance, Class Management, Performance Reports) with Lucide icons on gold-tinted backgrounds.
- Copyright moved from separate footer bar to hero column bottom.
- Abstract geometrics replace hero.png illustration (user preference).

## 2026-06-03

### Subjects Persist Across Terms
- Removed `school_year` dependency from subjects — subjects are no longer filtered or tagged by school year.
- Added semester selector when creating subjects: admin picks `1st Semester`, `2nd Semester`, `Summer`, or `All Semesters` (NULL).
- Added semester filter dropdown in Manage Subjects page — "All Semesters" by default, can narrow by specific semester.
- Backend `GET /api/subjects` no longer accepts `school_year` query param; `semester` is optional.
- Backend `POST /api/subjects` accepts `semester` from request body instead of auto-tagging from active term.
- AdminTeachers assignment modal now fetches all subjects (no `school_year` filter).
- Archive mode no longer affects subject visibility.

## 2026-06-03

### Import Students from Excel
- Added "Import" button (blue) next to "Add Student" in Manage Sections that accepts `.xlsx`/`.xls` files.
- Parses Excel client-side using `xlsx` library; validates headers exactly match `Student ID, First Name, Last Name, MI, Gender`.
- Shows preview of all rows before importing.
- Backend `POST /api/sections/:sectionId/students/bulk` accepts a `students` array, skips duplicates, and returns `{ added, skipped }` summary.
- Reports skipped students with reason (duplicate ID, missing fields).

### Student Details — Structured Input Format
- Added `first_name`, `last_name`, `mi`, and `gender` columns to the `students` table (see `backend/sql/alter_students_add_details.sql`).
- Changed "Add Student" modal in AdminSections from a single `Student Name` field to individual fields: First Name, Last Name, M.I., Gender.
- `student_name` is now auto-computed as `Last, First M.` on the backend for backward compatibility.
- Updated backend `POST /api/sections/:sectionId/students` to accept `first_name`, `last_name`, `mi`, `gender` in addition to `student_id`.

## 2026-06-02

### Grade Point Conversion Updated to grade-point.md Spec
- `GRADE_RANGES` in `GradeSummary.jsx` updated to match `grade-point.md`: 1.00 = 98–100%, 1.25 = 95–97%, ..., 3.00 = 75–76%.
- `gradeToPoint()` now returns `{ gp, desc }` object with classification description.
- Remarks column shows classification (Excellent, Very Good, Satisfactory, Fair, Failed) instead of generic "Passed"/"Failed".
- Grade point legend at the bottom of the page converted from inline flex spans to a proper table with Grade/Equivalent/Description columns.

### Admin Recent Activity — Visibility Scoping
- Backend `GET /api/activity` completely reworked: superadmin sees all; admin sees only users in their department (superadmin usernames explicitly excluded via staff_users query).
- Frontend `AdminDashboard.jsx` labels own actions with "You created..." / "You deleted..." prefix.

### One Admin Per Department
- `POST /api/users` — rejects creating a second admin in a department that already has one.
- `PATCH /api/users/:id` — rejects changing an admin's department to one with an existing admin, and rejects promoting a user to admin when their department already has an admin.
- Backend now selects `department` in the target user query for the PATCH route.

## 2026-06-02

### FloatingAssignmentSelector — Removed All Term-Selection / Archive Features
- Removed Browse Archives button, term picker dropdown, and confirmation modal from FloatingAssignmentSelector.
- Selector now only lists filtered assignments from `TeacherContext` and lets the user pick one — no archive entry/exit logic.
- Archive mode can only be entered from TeacherSettings (`/teacher/settings`).
- Confirmation modal for archive entry is now exclusive to TeacherSettings.
- Dashboard term picker updated — archive entry removed; current term displayed only.

## 2026-06-02

### Teacher Settings Page — Archive Mode Management
- Created `TeacherSettings.jsx` (new page at `/teacher/settings`) patterned after `AdminSettings.jsx`.
- Shows active term with amber styling when not in archive mode.
- Lists all academic terms as clickable rows in "Term History" section.
- Clicking a past term → confirmation modal → enters archive mode.
- Clicking the active term (when in archive mode) → exits archive mode.
- Shows archive banner with current archive term info and "Exit Archive" button when in archive mode.
- Added route `<Route path="settings" element={<TeacherSettings />} />` in `App.jsx`.
- Added `Settings` nav item (gear icon, "Settings", path `/teacher/settings`) to teacher `Sidebar.jsx`.
- Added `case '/teacher/settings'` to `getTitle()` in `TeacherLayout.jsx`.

### TeacherLayout — Inner Component Refactor
- Refactored `TeacherLayout` into inner component pattern (`TeacherProvider` → `TeacherLayoutInner`) matching `AdminLayout` convention.
- `TeacherLayoutInner` consumes `useTeacher()` directly for `isArchiveMode`, `currentTerm`, and `setViewTerm`.
- Added archive mode amber banner rendered conditionally: "Viewing: {school_year} — {semester} — Read Only" with "Exit Archive" button.

### FloatingAssignmentSelector — Confirmation Modal Before Archive Entry
- Both the assignment dropdown and the term picker now show a confirmation modal before calling `setViewTerm`.
- Modal explains read-only restrictions with Cancel (gray) and View Archive (amber) buttons.
- Prevents accidental archive mode entry — user must explicitly confirm.

### TeacherContext — Added currentTerm
- Added `currentTerm` computed property (`viewTerm || activeTerm`) exposed from the context provider, mirroring `AdminContext` for consistency.

### AdminTeachers — Term-Relevant Assignment Filtering (Table Column + View Modal)

- **AdminTeachers.jsx**: The "Assigned Course" column now only shows assignments for `currentTerm` (active term normally, archive term when browsing archives). `teacherCourses` is computed via `useMemo` filtering `allAssignments` by `currentTerm.school_year` and `currentTerm.semester`.
- **openViewModal**: Fetches all assignments from the API but filters them client-side to only include those matching `currentTerm`. When no current-term assignments exist, the modal shows "No subjects assigned yet."
- **Active/Historical badge**: The View modal's group header badge always compares against `activeTerm` (the real active term from `AdminContext`), not `currentTerm`, so the green "Active" label is always correct regardless of archive mode.
- **Edge case — new semester**: When a new term starts and a teacher has no current-term assignments, the table column renders `—` and the View modal shows the empty state.

### AdminContext — Shared Term/Archive State for Admin Pages

- Created `AdminContext` (`frontend/src/contexts/AdminContext.jsx`) that fetches `activeTerm` and `allTerms` once, shares `currentTerm`, `isArchiveMode`, `viewTerm`, `setViewTerm`, and `loading` across all admin pages.
- **AdminDashboard.jsx** — removed local `activeTerm` state and its fetch from `/api/terms/active`. Now consumes `useAdmin()` for `currentTerm` and `isArchiveMode`.
- **AdminTeachers.jsx** — removed local `activeTerm` fetch (was in its own useEffect). Now uses `useAdmin()` for `currentTerm` and `isArchiveMode`. Assign button disabled in archive mode with tooltip. All references to `activeTerm` replaced with `currentTerm`.
- **AdminSubjects.jsx** — removed local `activeTerm` fetch, `showArchives` toggle, and archive schoolYear/semester dropdowns. Now uses `useAdmin()` for `currentTerm` and `isArchiveMode`. Add/delete buttons disabled in archive mode.
- **AdminSections.jsx** — updated to consume `useAdmin()` for `currentTerm` and `isArchiveMode` (was already migrated earlier).
- **AdminLayout.jsx** — updated to use `AdminProvider` wrapper and consume context for header display.
- **AdminSettings.jsx** — updated to consume `useAdmin()` for term/archive state.
- Admin view term persists to localStorage under key `admin_view_term`.

### Documentation
- Created initial documentation structure under `/docs`.
- Documented project summary, setup guide, features, database schema, API routes, UI screens, navigation, and design system.

### Academic Term Control
- Moved "End Semester" from Admin to Superadmin — changed backend role guard, created SuperAdminSettings page with the feature, added route + sidebar link, removed from AdminSettings (read-only view only).
- Removed all auto semester/school year detection globally. Superadmin now controls terms exclusively via `/api/terms/create` and `/api/terms/end`. Added "Create Term" UI to SuperAdminSettings. All roles gracefully handle "no active term" state.

### Subjects
- Added "All Courses (Department-wide)" option when creating subjects. Subjects with `course_id = null` are available across all courses and show up when filtering by any specific course.

### Read-Only Closed Term
- Added `checkTermClosed` family of helpers to backend: `checkTermClosed` (gradingComponents), `checkTermClosedByComponent`/`checkTermClosedByActivity` (componentActivities), `checkTermClosedByScore` (componentScores), `checkTermClosedByAssignment` (attendance).
- Backend mutation endpoints (POST/PUT/DELETE) return 403 if the assignment's term doesn't match the active term.
- Frontend: `isReadOnly` computed in ClassRecord.jsx and Attendance.jsx by comparing assignment school_year/semester vs active term.
- Frontend: amber banner "This term is closed. Viewing only.", all inputs disabled, add/delete buttons hidden.

### Global Assignment Selector
- Created `TeacherContext` (React Context) that fetches assignments and active term once, shares them across all teacher pages.
- Created `FloatingAssignmentSelector` component — a clickable dropdown at the top of Attendance, ClassRecord, GradeSummary, and BehavioralAnalytics pages.
- Selection persists to localStorage (`teacher_selected_assignment`) — survives page refreshes.
- Refactored Attendance.jsx, ClassRecord.jsx, GradeSummary.jsx, BehavioralAnalytics.jsx to consume `useTeacher()` context instead of fetching assignments locally.
- Removed redundant per-page assignment dropdown UIs and `activeTerm` fetches.
- Cleaned up unused imports (`useRef`, `dropdownRef`, `dropdownOpen`) from child pages.

### Admin Assignment UX — Additive Reassignment & Data Protection

- **AdminTeachers.jsx View modal**: Grouped assignments by `school_year | semester` with green `(Active)` and gray `(Historical)` badges. Delete button hidden for closed-term assignments (lock icon shown instead). Matches the teacher's FloatingAssignmentSelector grouping pattern.
- **AdminTeachers.jsx Assign modal**: Added bold notice — *"This creates a new assignment. Existing assignments and their data remain unchanged."* Shows the teacher's existing assignments grouped by term below the form so the admin can see current workload before assigning.
- **AdminTeachers.jsx Remove Assignment modal**: Added data-loss warning — *"This permanently deletes all grading components, scores, and attendance records. This action cannot be undone."*
- **No backend changes**: The existing `DELETE /api/assignments/:id` already returns 403 for closed-term assignments. The unique constraint `(teacher_id, section_id, subject_id, school_year, semester)` naturally supports additive assignments.

### Archive Mode Browsing
- **TeacherContext.jsx**: Added `allTerms` (fetched from `GET /api/terms`), `viewTerm`/`setViewTerm` state, derived `filteredAssignments` and `isArchiveMode`. `viewTerm` persists to localStorage (`teacher_view_term`).
- **FloatingAssignmentSelector.jsx**: Grouped dropdown items by `school_year | semester` with section headers. Clicking a past-term assignment auto-switches to archive mode. Amber "ARCHIVE" badge on button. "Exit Archive Mode" footer button in dropdown.
- **Dashboard.jsx**: Refactored to consume `useTeacher()` context. Replaced its own `activeTerm` fetch + semester dropdown with a unified term picker dropdown showing all terms from `allTerms`. Active term marked with "(Active)" badge. Archive mode amber badge + "Exit Archive" button.
- **Data pages** (Attendance, ClassRecord, GradeSummary, BehavioralAnalytics): No changes needed — they already consume `useTeacher()` and automatically react to `viewTerm`-filtered assignments. All past-term data is shown in read-only mode.
- **No backend changes**: `GET /api/assignments` already returns all teacher assignments regardless of term; frontend filtering avoids extra API calls.
