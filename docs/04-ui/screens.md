# UI Screens

## Login (`/login`)

Public. Two-column split:

- **Left (form):** logo, "SmartGrade", "Academic Management System", username (`User` icon), password (`Lock` icon + show/hide), amber **Sign In**, "Institutional Access Only".
- **Right (hero, `lg+` only):** blurred `STI_Background.png` with brand lockup and the four feature blocks (Grade Computation & Analytics, Attendance Tracking, Class & Teacher Management, Performance Reports) placed directly on the photo (no card/panel behind them); feature icons carry a thin black outline (`.stroke-icon`), "© 2026 SmartGrade Educational Systems."
- Network failures show "Cannot connect to the server. Please check your connection and try again."
- Redirect: teacher → `/teacher/dashboard`, admin → `/admin`, superadmin → `/superadmin`.

## Not Found (`*`)

Standalone dark page (no app shell) rendered for any unmatched URL, including unknown child routes such as `/admin/typo`.

- Logo, search-off icon, large `404`, "Page not found", and the attempted path (pathname + query).
- Primary button ("Go to dashboard" / "Go to login") chooses the destination from the stored role; secondary "Go back" returns through history and falls back to the primary destination.

## Superadmin Pages

| Route | Component | Description |
|---|---|---|
| `/superadmin` | `SuperAdminDashboard` | Four metrics (Total Accounts, Faculty Members, Admin Accounts, Audit logs), Department User Overview table, recent activity feed, Broadcast Notification form (not wired) |
| `/superadmin/security` | `SecurityAudit` | Critical alerts / total events, filterable audit trail (All, Created, Updated, Deleted, Failed Logins, Successful Logins), sticky column header, 50 logs per page, animated 500ms scroll back to the audit section top on page changes, 10 s auto-refresh |
| `/superadmin/users` | `SuperAdminUsers` | Admin accounts table, add/edit/delete (typed `Confirm`), "No Active Term" gate before creating |
| `/superadmin/users/create` | `CreateSuperAdminUser` | Full-screen create-admin form: staff ID, names, department (departments with an admin are disabled), read-only username |
| `/superadmin/departments` | `ManageDepartments` | Department accordions with nested course CRUD, abbreviation editing, typed-confirm deletes |
| `/superadmin/settings` | `SuperAdminSettings` | Term lifecycle (Create Term, End Semester) + `BackupRestore` panel |

`CreateSuperAdminUser` is also used as a modal from `/superadmin/users`; when opened as a direct route, Cancel and Done navigate back to `/superadmin/users`.

## Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Welcome header, Total Teachers / Courses / Activity metrics, Teacher Overview with subject counts, Recent Activities feed |
| `/admin/teachers` | `AdminTeachers` | Teacher table (ID, Name, Username, Assigned Course, Actions); Add Teacher, row menu (Assign, View Assigned, Edit, Delete); assignment modals with Active/Historical grouping |
| `/admin/teachers/create` | `CreateAdminTeacher` | Full-screen create-teacher form with auto-generated username preview |
| `/admin/sections` | `AdminSections` | Course + year filters; sections panel (add/delete, labels shown as `BSCS-1A`); roster panel (Add Student, Add Multiple, Import, pagination); Excel import preview |
| `/admin/subjects` | `AdminSubjects` | Course + semester filters; four year-level columns; add multiple subjects; assigned-subjects modal; delete |
| `/admin/bulk-students` | `BulkStudentImport` | Excel-template builder (`firstname`, `lastname`, `middle initial`, `student id`, `gender`); downloads blank or filled `.xlsx`; shared admin shell shows its route title |
| `/admin/settings` | `AdminSettings` | Active term card, term history, archive entry/exit with confirmation modal |

Admin pages use the shared white page heading and bordered card/table styling from the Teacher and Superadmin interfaces. Existing page actions, filters, forms, archive controls, and data behavior are unchanged.

Notes:
- `/admin/bulk-students` is not linked from the sidebar.
- `CreateAdminTeacher` is also used as a modal from `/admin/teachers`; when opened as a direct route, Cancel and Done navigate back to `/admin/teachers`.

## Teacher Pages

| Route | Component | Description |
|---|---|---|
| `/teacher`, `/teacher/dashboard` | `TeacherDashboard` | Welcome header, assigned subjects in four year-level columns (1st–4th Year, each with a count and an empty state), archive chip + Exit Archive when browsing |
| `/teacher/attendance` | `Attendance` | Term tabs, Add Date (date + AM/PM + LEC/LAB), attendance matrix, 0/1/2 entry, autosave, delete column (no export button) |
| `/teacher/class-record` | `ClassRecord` | Term tabs, component builder (presets, weights, attendance component, activities, drag reorder; **Copy from PRELIMS** only in MIDTERMS/PRE-FINALS/FINALS while that term has no components; empty table shows a message only, no Add Component button), wide score matrix with TOTAL / EQUIV / W_TOTAL / final grade, Excel + PDF export (heading layer `z-40` keeps both dropdown items clickable) |
| `/teacher/analytics` | `BehavioralAnalytics` | Four KPI cards, sortable student table (per-component EQUIV, performance, submission %, final grade, attendance, trend), student modal with AI summary (no Excel/PDF export button) |
| `/teacher/grade-summary` | `GradeSummary` | Per-term grade + G.P., semestral grade/G.P./remarks, grade-point legend, Excel + PDF export |
| `/teacher/settings` | `TeacherSettings` | Active term card, term history, archive confirmation modal, Exit Archive |

Shared teacher-page elements:
- **Floating Assignment Selector** — assignment switching only; no term selection or archive entry.
- **Term tabs** — PRELIMS / MIDTERMS / PRE-FINALS / FINALS.
- **Read-only state** for closed terms: inputs disabled, mutate buttons hidden, banner "This term is closed. Viewing only."
- **Amber archive banner** from `TeacherLayout` when a past term is being viewed.
- **Pinned grade-grid header** — Grade Summary uses the `.table-scroll` wrapper (`max-height: min(480px, 60vh)`, scrolls both axes) with a sticky `<thead>`. Attendance and Class Record use page scrolling vertically and horizontal scrolling for wide tables. Attendance pins its three header rows with opaque frozen student columns. In Class Record, fixed `<colgroup>` widths keep the frozen student columns aligned with the "STUDENT INFORMATION" header, which layers above component headers; the heading, controls, alerts, and pagination stay anchored while the wide grid moves horizontally. Analytics has no inner vertical table scroll.

## Screen States

| State | Where |
|---|---|
| Skeleton loading (header/metrics/table/list/grid) | Dashboards, sections, settings, users |
| Empty state with icon at 30% opacity | Tables, feeds, assigned-classes grids |
| Typed confirmation (`Confirm` / `CONFIRM` / `FULL RESTORE`) | Deletes, end semester, restore |
| Amber clamp warning (3 s) | Attendance and Class Record score/weight inputs |
| Success banner | Create-account pages, broadcast form (local only) |
| No active term | Settings pages, teacher dashboard, Add Admin gate |
