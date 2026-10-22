# Navigation Structure

## App Shell

All three layouts share the same skeleton:

| Part | Detail |
|---|---|
| Sidebar | Fixed 272 px (`w-68`) on `lg+`, off-canvas with overlay + hamburger below `lg` |
| Header | `h-16`, navy gradient, page title, role-specific metadata |
| Banner | Amber archive bar (admin/teacher only), above the outlet |
| Outlet | `flex-1 p-4 md:p-6 lg:p-8 overflow-auto` |

Sidebar styling: gradient `to right, #0c1925 → #102132 → #142a3f`; active item `bg-[#0a316a] text-amber-400 border-l-4 border-gold`; footer shows avatar, full name, role badge (`bg-gold/20 text-amber-400`), and a logout icon with a confirmation modal.

## Superadmin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/superadmin` | `LayoutDashboard` |
| Departments & Courses | `/superadmin/departments` | `Building2` |
| Admin Management | `/superadmin/users` | `Users` |
| Security & Audit | `/superadmin/security` | `ShieldCheck` |
| Settings | `/superadmin/settings` | `Settings` |

Header: page title only. No department badge, term pill, or notification bell.

## Admin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/admin` | `LayoutDashboard` |
| Manage Sections | `/admin/sections` | `GraduationCap` |
| Manage Subjects | `/admin/subjects` | `BookOpen` |
| Teacher Management | `/admin/teachers` | `Users` |
| Settings | `/admin/settings` | `Settings` |

Header: page title, department badge (`Department (ABBR)`), term pill `{school_year} — {semester}` (archive-styled when browsing), `NotificationDropdown` (always empty).

## Teacher Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/teacher/dashboard` | `LayoutDashboard` |
| Attendance | `/teacher/attendance` | `CalendarCheck` |
| Class Record | `/teacher/class-record` | `FileSpreadsheet` |
| Analytics | `/teacher/analytics` | `BarChart3` |
| Grade Summary | `/teacher/grade-summary` | `Summary` |
| Settings | `/teacher/settings` | `Settings` |

Header: page title, department badge, term pill `{school_year} | {semester}`, `NotificationDropdown`.

## Routing Tree

Defined in `frontend/src/App.jsx`:

```
/login                            → Login
/                                 → redirect (token → role dashboard, else /login)

/superadmin                       → SuperAdminLayout → SuperAdminDashboard
/superadmin/security              → SecurityAudit
/superadmin/users                 → SuperAdminUsers
/superadmin/users/create          → CreateSuperAdminUser
/superadmin/departments           → ManageDepartments
/superadmin/settings              → SuperAdminSettings

/admin                            → AdminLayout → AdminDashboard
/admin/teachers                   → AdminTeachers
/admin/teachers/create            → CreateAdminTeacher
/admin/sections                   → AdminSections
/admin/subjects                   → AdminSubjects
/admin/bulk-students              → BulkStudentImport
/admin/settings                   → AdminSettings

/teacher                          → TeacherLayout → TeacherDashboard
/teacher/dashboard                → TeacherDashboard
/teacher/attendance               → Attendance
/teacher/class-record             → ClassRecord
/teacher/analytics                → BehavioralAnalytics
/teacher/grade-summary            → GradeSummary
/teacher/settings                 → TeacherSettings
```

## Route Guards

`ProtectedRoute` reads `localStorage.token` and `localStorage.user`:

- Missing either → `/login`.
- Role = `user.role || user.system_role`.
- Wrong role → the user's own dashboard (`/teacher`, `/admin`, `/superadmin`), unknown → `/login`.
- Invalid JSON → `/login`.

Root `/` uses `localStorage.token` presence before computing the redirect target.

**No catch-all route exists** — unmatched URLs render a blank outlet inside the layout.

## Header Title Mapping

| Path | Title |
|---|---|
| `/admin` | Dashboard |
| `/admin/teachers` | Teacher Management |
| `/admin/teachers/create` | Create New Teacher |
| `/admin/sections` | Manage Sections |
| `/admin/subjects` | Manage Subjects |
| `/admin/settings` (and anything unmatched, incl. `/admin/bulk-students`) | Settings |
| `/superadmin` | Dashboard |
| `/superadmin/security` | Security & Audit Logs |
| `/superadmin/users` | Admin Management |
| `/superadmin/users/create` | Create New Admin |
| `/superadmin/departments` | Departments & Courses |
| `/superadmin/settings` | Settings |
| `/teacher` or `/teacher/dashboard` | Dashboard |
| `/teacher/class-record` | Class Record |
| `/teacher/attendance` | Attendance |
| `/teacher/grade-summary` | Grade Summary |
| `/teacher/analytics` | Analytics |
| `/teacher/settings` | Settings |

## Archive Banner

Rendered by `AdminLayout` and `TeacherLayout` when `isArchiveMode`:

```
Viewing: {school_year} — {semester} — Read Only        [Exit Archive]
```

Amber (`bg-amber-600/90`), full width, above the page content. Exiting calls `setViewTerm(null)`, clearing the persisted local-storage key.

## Removed / Not Present

- Reload button in the header (removed).
- Term selection inside `FloatingAssignmentSelector`.
- "Remember me" / "Forgot password" on login.
- 404 page.
