# Navigation Structure

## App Shell

All three layouts share the same skeleton:

| Part | Detail |
|---|---|
| Sidebar | Fixed 224 px on `lg+`, collapsible to 72 px; off-canvas with overlay + hamburger below `lg` |
| Header | `h-16`, white with a light border and shadow, page title, role-specific metadata |
| Banner | Amber archive bar (admin/teacher only), above the outlet |
| Outlet | `min-h-0 flex-1 overflow-auto` with an inner `p-4 md:p-6 lg:p-8` content wrapper |

Sidebar styling: gradient `to right, #0c1925 → #102132 → #142a3f`; active item `bg-[#24384b] text-amber-300 border-l-[3px] border-gold`; hovering a nav item zooms its icon and label (`group-hover:scale-110`, 200 ms); footer shows avatar, full name, role badge, and a logout icon with a confirmation modal.

## Superadmin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/superadmin` | `LayoutDashboard` |
| Departments & Courses | `/superadmin/departments` | `Building2` |
| Admin Management | `/superadmin/users` | `Users` |
| Security & Audit | `/superadmin/security` | `ShieldCheck` |
| Settings | `/superadmin/settings` | `Settings` |

Header: page title and a System Administration badge, in the shared white-header style.

## Admin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/admin` | `LayoutDashboard` |
| Manage Sections | `/admin/sections` | `GraduationCap` |
| Manage Subjects | `/admin/subjects` | `BookOpen` |
| Teacher Management | `/admin/teachers` | `Users` |
| Settings | `/admin/settings` | `Settings` |

Header: page title, department badge (`Department (ABBR)`), term pill `{school_year} · {semester}`, and `NotificationDropdown` (always empty). Uses the shared white-header style.

## Teacher Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/teacher/dashboard` | `LayoutDashboard` |
| Attendance | `/teacher/attendance` | `CalendarCheck` |
| Class Record | `/teacher/class-record` | `FileSpreadsheet` |
| Analytics | `/teacher/analytics` | `BarChart3` |
| Grade Summary | `/teacher/grade-summary` | `Summary` |
| Settings | `/teacher/settings` | `Settings` |

Header: page title, department badge, term pill `{school_year} · {semester}`, `NotificationDropdown`.

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

Unmatched URLs are handled by the top-level `*` route and render `NotFound` without a layout (see Unknown Routes below).

## Header Title Mapping

| Path | Title |
|---|---|
| `/admin` | Dashboard |
| `/admin/teachers` | Teacher Management |
| `/admin/teachers/create` | Create New Teacher |
| `/admin/sections` | Manage Sections |
| `/admin/subjects` | Manage Subjects |
| `/admin/bulk-students` | Bulk Student Import |
| `/admin/settings` (and anything unmatched) | Settings |
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

## Unknown Routes

`App.jsx` ends with `<Route path="*" element={<NotFound />} />`. The 404 page renders without a layout, so unknown URLs (including unknown child paths) are handled even when a token is present.

## Removed / Not Present

- Reload button in the header (removed).
- Term selection inside `FloatingAssignmentSelector`.
- "Remember me" / "Forgot password" on login.
