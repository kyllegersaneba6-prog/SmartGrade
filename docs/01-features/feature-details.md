# Feature Details

## Role-Based Access Control

Three roles with scoped permissions:

- **Superadmin** — Full system access: manage admins, departments, courses, create/end academic terms, view audit logs, broadcast notifications.
- **Admin** — Department-level access: manage teachers, sections, subjects, assignments within their department.
- **Teacher** — Instructional access: assigned classes only, attendance, class record, analytics, grade summary.

## Academic Terms

- Superadmin exclusively creates and ends academic terms via SuperAdminSettings.
- No date-based auto-detection of school year or semester.
- `GET /api/terms/active` returns 404 if no active term — all roles gracefully handle this.
- When a term is ended (closed), teachers can view but NOT edit attendance, components, activities, or scores.

## Attendance

- Teachers add date columns with session (AM/PM) and type (Lecture/Laboratory).
- Score per student per date: `0` (Absent), `1` (Late), `2` (Present).
- Auto-calculated total per term (max = 2 × number of dates).
- Auto-save with 2-second debounce; offline fallback in localStorage.
- When the term is closed, all inputs are disabled and an amber banner appears.

## Class Record / Grading

- Each term (PRELIMS, MIDTERMS, PRE-FINALS, FINALS) has grading components.
- Components have a name and percentage weight (must sum to 100%).
- Each component can have multiple sub-activities with max scores.
- Scores entered per student per activity.
- Formula: `equiv = (total / max_total) * 50 + 50`
- Final grade = sum of weighted component equivalents.
- Components can be copied from PRELIMS to other terms.
- When the term is closed, all inputs are disabled, add/delete buttons hidden, and an amber banner appears.

## Grade Summary

- Aggregates grades across all 4 terms.
- Converts to grade-point scale using `GRADE_RANGES` lookup table:

  | Grade | Equivalent | Description |
  |---|---|---|
  | 1.00 | 98–100% | Excellent |
  | 1.25 | 95–97% | Very Good |
  | 1.50 | 92–94% | Very Good |
  | 1.75 | 89–91% | Very Good |
  | 2.00 | 86–88% | Satisfactory |
  | 2.25 | 83–85% | Satisfactory |
  | 2.50 | 80–82% | Satisfactory |
  | 2.75 | 77–79% | Fair |
  | 3.00 | 75–76% | Fair |
  | 5.00 | below 75% | Failed |

- `gradeToPoint(s)` returns `{ gp, desc }` — remarks column shows the classification (Excellent, Very Good, etc.) instead of "Passed"/"Failed".
- Final average computed; grade point legend rendered as a table at the bottom of the page.
- Styled Excel export with merged headers, color coding, and classification-based remarks styling.

## Global Assignment Selector

- A floating dropdown button rendered at the top of Attendance, Class Record, Analytics, and Grade Summary pages.
- Shows the currently selected subject code, section name, and school year/semester badge.
- Lists filtered assignments from `TeacherContext` grouped by academic term (`school_year | semester`) with section headers.
- Selecting an assignment switches the active view — no archive entry/exit logic.
- Dropdown shows "(Active)" label on the current term's group.
- Selection is stored in React Context + localStorage (`teacher_selected_assignment`), persisting across page navigation and browser refreshes.
- Eliminated redundant per-page assignment fetching — assignments are fetched once in `TeacherContext`.
- Archive mode can only be entered from the Teacher Settings page (`/teacher/settings`).

## Read-Only Closed Term

- Backend middleware (`checkTermClosed` family) guards all mutation endpoints for grading components, activities, scores, and attendance.
- Frontend disables all editing controls (inputs, add/delete buttons) and shows an amber banner: "This term is closed. Viewing only."
- `isReadOnly` is derived by comparing the assignment's `school_year`/`semester` against the active term.

## Archive Mode Browsing

- Teachers can view assignments and student records from past academic terms in read-only mode.
- Archive mode can only be entered from the Teacher Settings page (`/teacher/settings`).
- Clicking a past term row in Teacher Settings shows a confirmation modal explaining read-only restrictions with Cancel and View Archive buttons.
- When in archive mode:
  - An amber "ARCHIVE" badge appears next to the term display.
  - The FloatingAssignmentSelector lists only assignments for the selected archive term (filtered by `TeacherContext`).
  - The Dashboard shows the archive term with an "Exit Archive" button.
  - All data pages (Attendance, Class Record, Grade Summary, Analytics) show data for the selected archive term.
  - **TeacherLayout** shows a persistent amber banner at the top: "Viewing: {school_year} — {semester} — Read Only" with an Exit Archive button.
- `GET /api/terms` returns all academic terms for populating the term history list in TeacherSettings.
- `viewTerm` is stored in localStorage (`teacher_view_term`) and restored on page refresh.
- The FloatingAssignmentSelector no longer contains any term-selection features, confirmation modals, or archive entry/exit controls.

## Teacher Settings Page

- New page at `/teacher/settings` following the pattern of `AdminSettings.jsx`.
- Shows the active term with amber styling when not in archive mode.
- Lists all academic terms as clickable rows in a "Term History" section.
- Clicking a past term → confirmation modal → enters archive mode.
- Clicking the active term (when in archive mode) → exits archive mode.
- Shows an archive banner with current archive term info and Exit Archive button when in archive mode.
- Displays "No active term" empty state when there's no active term.
- Route registered in `App.jsx` under the `/teacher/*` layout.
- Sidebar includes a `Settings` nav item (gear icon) linking to `/teacher/settings`.

## TeacherLayout Inner Component Pattern

- Refactored to wrap `TeacherLayoutInner` inside `TeacherProvider`, matching the pattern used by `AdminLayout`.
- `TeacherLayoutInner` consumes `useTeacher()` directly for `isArchiveMode`, `currentTerm`, and `setViewTerm`.
- Archive mode amber banner rendered conditionally at the top of the layout (above `<Outlet />`).
- `getTitle()` includes the `/teacher/settings` route.

## Confirmation Modal Before Archive Entry (TeacherSettings)

- The confirmation modal is shown in TeacherSettings when clicking a past term row.
- The modal displays the target term and explains: "All pages will show data from this semester in read-only mode. You cannot add, edit, or delete any data while viewing a past term."
- Two buttons: Cancel (gray) and View Archive (amber, with Archive icon).
- The FloatingAssignmentSelector no longer shows this modal — archive entry is exclusively through TeacherSettings.

## TeacherContext Changes

- Added `currentTerm` computed property (`viewTerm || activeTerm`) to mirror `AdminContext` behavior.
- This is exposed from the context provider so layouts and pages can use it for display purposes without duplicating the logic.

## Admin Teacher Assignment

- Admins create teacher assignments via the "Assign" button on each teacher row. Each assignment is **additive** — old assignments and their grading/attendance data are never deleted or modified.
- The Assign modal always targets the **active academic term** (set by superadmin). Assignments can only be created for the active term. In archive mode, the Assign button is disabled with a tooltip.
- Admin pages use `AdminContext` (React Context + localStorage) to share `currentTerm` and `isArchiveMode` state, eliminating redundant per-page API fetches.
- The Assign modal shows the teacher's existing assignments grouped by term, so the admin can see what the teacher already has before adding more.
- The "Assigned Course" column in the teacher table shows only assignments from `currentTerm` (the active term normally, or the archive-viewed term in archive mode). When a teacher has no current-term assignments, the column renders `—`.
- The View modal fetches all the teacher's raw assignments from the API but **filters them to only show assignments from `currentTerm`**. This means:
  - In normal mode: only active-term assignments appear.
  - In archive mode: only the archive term's assignments appear.
  - The Active/Historical group badge always references the real `activeTerm` (from `AdminContext`) for correct green/red labeling — not the display `currentTerm`.
  - When no assignments exist for the current term, the modal shows "No subjects assigned yet."
- If a new semester starts and a teacher has no current-term assignments, the table column shows `—` and the View modal shows "No subjects assigned yet."
- The View modal shows a green `Active` badge for groups matching `activeTerm` and a gray `Historical` badge for all others. Delete buttons are only shown on active-term assignments; historical ones show a lock icon — deletion is blocked both in the UI (button hidden) and on the backend (403 response).
- Deleting an active-term assignment shows a data-loss warning: all grading components, scores, and attendance records for that assignment are permanently deleted.

## Subjects

- Subjects can be created without a course (`course_id = null`) to make them available across all courses in the department.
- The subject creation form includes an "All Courses (Department-wide)" option.
- `GET /api/subjects` includes `course_id = null` subjects when filtering by a specific course.
- In archive mode, the add and delete buttons are disabled — subject management is only available for the active term.

## Activity / Audit Logging

- All user creation, update, and deletion actions are logged to `activity_log` table via `backend/routes/users.js`.
- Each entry stores `user_name`, `action`, `details`, `department`, and `created_at`.
- Activity feed is role-scoped on `GET /api/activity`:
  - **Superadmin** — sees all entries across all departments.
  - **Admin** — sees entries from users in their own department only. Superadmin entries are explicitly excluded by querying `staff_users` for superadmin usernames and filtering them out from the department user list.
  - **Teacher** — receives an empty result (activity logging not yet implemented for teachers).
- Frontend (`AdminDashboard.jsx`) labels the current admin's own actions with "You created...", "You deleted..." (lowercased). Entries from other users show the raw details as stored.

## One Admin Per Department

- Enforced on both `POST /api/users` (creating an admin) and `PATCH /api/users/:id` (changing an admin's department or promoting a user to admin).
- Prevents a second admin from being created in or moved to a department that already has one.
- Frontend does not have a custom error UI — the 400 response message is shown as-is.
