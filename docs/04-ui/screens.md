# UI Screens

## Login (`/login`)

Dark mode 2-column layout. Left column: login form card (logo, username/password fields, "Remember Me", forgot password link, show/hide password toggle, Sign In button). Right column (hidden below 1024px): hero section with abstract geometric decorations (gradient circles, grid overlay, diagonal SVG lines), brand header, tagline, feature list with icons, and compact copyright footer. Role-based redirect after login.

## Superadmin Pages

| Route | Screen | Description |
|---|---|---|
| `/superadmin` | GlobalAnalytics | Metric cards (accounts, faculty, admins, logs), department overview table, system activity feed, broadcast notification form |
| `/superadmin/security` | SecurityAudit | Security audit logs table |
| `/superadmin/users` | SuperAdminUsers | Admin list with CRUD, pagination, Excel export |
| `/superadmin/users/create` | CreateSuperAdminUser | Create new admin form |
| `/superadmin/departments` | ManageDepartments | Department CRUD + nested course CRUD |
| `/superadmin/settings` | SuperAdminSettings | Create academic term, end active term |

## Admin Pages

| Route | Screen | Description |
|---|---|---|
| `/admin` | AdminDashboard | Welcome banner, active term, stat cards, teacher overview, recent activity (role-scoped — admin sees department-only, own actions prefixed with "You...") — consumes `AdminContext` for `currentTerm` and `isArchiveMode` |
| `/admin/teachers` | AdminTeachers | Teacher list with CRUD, assignment management (additive — never overwrites), "Assigned Course" column filtered to `currentTerm` only, View modal filters assignments to `currentTerm` with Active/Historical badges referencing `activeTerm`, pagination, Excel export — Assign button disabled in archive mode with tooltip; consumes `AdminContext` |
| `/admin/teachers/create` | CreateAdminTeacher | Create teacher form |
| `/admin/sections` | AdminSections | Year-level tabs, course filter, section/student CRUD (structured: Student ID, First Name, Last Name, MI, Gender), Gender column in table, import students from Excel with duplicate detection/preview, seed, archiving |
| `/admin/subjects` | AdminSubjects | Semester filter dropdown, course filter, semester selector in add modal, subjects persist across school years, add/delete subjects, view assignments — add/delete buttons disabled in archive mode; consumes `AdminContext` |
| `/admin/settings` | AdminSettings | Active term display (read-only), no term management |

## Teacher Pages

| Route                    | Screen              | Description                                                                                                                  |
| ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/teacher/dashboard`     | Dashboard           | Welcome banner, displays current term, AssignmentSelector (no archive entry), assigned classes by year level                           |
| `/teacher/attendance`    | Attendance          | Attendance matrix with date columns, student rows, 0/1/2 inputs, auto-save, read-only when term closed                       |
| `/teacher/class-record`  | ClassRecord         | Full class record with term tabs, component cards, score entry table, computations, Excel export, read-only when term closed |
| `/teacher/analytics`     | BehavioralAnalytics | Student performance charts, trends, detail panel                                                                             |
| `/teacher/grade-summary` | GradeSummary        | Per-term grade table, grade-point conversion with classification remarks (Excellent, Very Good, etc.), final average, grade point scale legend table, Excel export |
| `/teacher/settings`      | TeacherSettings     | Active term display, term history list, archive mode entry/exit with confirmation modal                                      |

All teacher pages include:
- **Floating Assignment Selector** — dropdown at the top for switching subjects/sections, lists filtered assignments from `TeacherContext` — no term-selection, confirmation modal, or archive entry/exit features.
- **Amber archive badge** when viewing a past term, plus "Exit Archive" capability.
- **Amber archive banner** in TeacherLayout showing "Viewing: {term} — Read Only" with Exit Archive button.
- **Read-only mode** for closed terms — inputs disabled, add/delete buttons hidden, amber banner displayed.
