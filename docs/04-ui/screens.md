# UI Screens

## Login (`/login`)

Public. Two-column split:

- **Left (form):** logo, "SmartGrade", "Academic Management System", username (`User` icon), password (`Lock` icon + show/hide), amber **Sign In**, "Institutional Access Only".
- **Right (hero, `lg+` only):** blurred `STI_Background.png`, brand lockup, four feature blocks (Grade Computation & Analytics, Attendance Tracking, Class & Teacher Management, Performance Reports), "© 2026 SmartGrade Educational Systems."
- Network failures show "Cannot connect to the server. Please check your connection and try again."
- Redirect: teacher → `/teacher/dashboard`, admin → `/admin`, superadmin → `/superadmin`.

## Superadmin Pages

| Route | Component | Description |
|---|---|---|
| `/superadmin` | `SuperAdminDashboard` | Four metrics (Total Accounts, Faculty Members, Admin Accounts, Audit logs), Department User Overview table, recent activity feed, Broadcast Notification form (not wired) |
| `/superadmin/security` | `SecurityAudit` | Critical alerts / total events, filterable audit trail (All, Created, Updated, Deleted, Failed Logins, Successful Logins), 10 per page, 10 s auto-refresh |
| `/superadmin/users` | `SuperAdminUsers` | Admin accounts table, add/edit/delete (typed `Confirm`), Excel export, "No Active Term" gate before creating |
| `/superadmin/users/create` | `CreateSuperAdminUser` | Full-screen create-admin form: staff ID, names, department (departments with an admin are disabled), read-only username |
| `/superadmin/departments` | `ManageDepartments` | Department accordions with nested course CRUD, abbreviation editing, typed-confirm deletes |
| `/superadmin/settings` | `SuperAdminSettings` | Term lifecycle (Create Term, End Semester) + `BackupRestore` panel |

## Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Welcome header, Total Teachers / Courses / Activity metrics, Teacher Overview with subject counts, Recent Activities feed |
| `/admin/teachers` | `AdminTeachers` | Teacher table (ID, Name, Username, Assigned Course, Actions); Add Teacher, Export, row menu (Assign, View Assigned, Edit, Delete); assignment modals with Active/Historical grouping |
| `/admin/teachers/create` | `CreateAdminTeacher` | Full-screen create-teacher form with auto-generated username preview |
| `/admin/sections` | `AdminSections` | Course + year filters; sections panel (add/delete); roster panel (Add Student, Add Multiple, Import, pagination); Excel import preview |
| `/admin/subjects` | `AdminSubjects` | Course + semester filters; four year-level columns; add multiple subjects; assigned-subjects modal; delete |
| `/admin/bulk-students` | `BulkStudentImport` | Excel-template builder (`firstname`, `lastname`, `middle initial`, `student id`, `gender`); downloads blank or filled `.xlsx` |
| `/admin/settings` | `AdminSettings` | Active term card, term history, archive entry/exit with confirmation modal |

Notes:
- `/admin/bulk-students` is not linked from the UI and the header title falls back to "Settings".
- Create-account pages reached by URL cannot be cancelled (their `onClose` prop is undefined).

## Teacher Pages

| Route | Component | Description |
|---|---|---|
| `/teacher`, `/teacher/dashboard` | `TeacherDashboard` | Welcome header, assigned classes grouped by year level, archive chip + Exit Archive when browsing |
| `/teacher/attendance` | `Attendance` | Term tabs, Add Date (date + AM/PM + LEC/LAB), attendance matrix, 0/1/2 entry, autosave, delete column, Excel export |
| `/teacher/class-record` | `ClassRecord` | Term tabs, component builder (presets, weights, attendance component, activities, drag reorder), wide score matrix with TOTAL / EQUIV / W_TOTAL / final grade, Excel + PDF export |
| `/teacher/analytics` | `BehavioralAnalytics` | Four KPI cards, sortable student table (per-component EQUIV, performance, submission %, final grade, attendance, trend), student modal with AI summary, Excel + PDF export |
| `/teacher/grade-summary` | `GradeSummary` | Per-term grade + G.P., semestral grade/G.P./remarks, grade-point legend, Excel + PDF export |
| `/teacher/settings` | `TeacherSettings` | Active term card, term history, archive confirmation modal, Exit Archive |

Shared teacher-page elements:
- **Floating Assignment Selector** — assignment switching only; no term selection or archive entry.
- **Term tabs** — PRELIMS / MIDTERMS / PRE-FINALS / FINALS.
- **Read-only state** for closed terms: inputs disabled, mutate buttons hidden, banner "This term is closed. Viewing only."
- **Amber archive banner** from `TeacherLayout` when a past term is being viewed.

## Screen States

| State | Where |
|---|---|
| Skeleton loading (header/metrics/table/list/grid) | Dashboards, sections, settings, users |
| Empty state with icon at 30% opacity | Tables, feeds, assigned-classes grids |
| Typed confirmation (`Confirm` / `CONFIRM` / `FULL RESTORE`) | Deletes, end semester, restore |
| Amber clamp warning (3 s) | Attendance and Class Record score/weight inputs |
| Success banner | Create-account pages, broadcast form (local only) |
| No active term | Settings pages, teacher dashboard, Add Admin gate |
