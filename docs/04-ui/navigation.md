# Navigation Structure

## App Shell

`main.jsx` wraps the entire `App`/router in `BackendAvailability`. Routes do not mount until the first successful public health check. An unavailable backend shows the same status screen at every URL, without navigating away; later outages hide/inert the existing route tree and reveal it again on recovery.

All three layouts share the same skeleton:

| Part | Detail |
|---|---|
| Sidebar | Fixed 224 px on `lg+`, collapsible to 72 px; off-canvas with overlay + hamburger below `lg` |
| Header | `h-16`, white with a light border and shadow, page title, role-specific metadata |
| Banner | Amber archive bar (admin/teacher only), above the outlet |
| Outlet | `min-h-0 flex-1 overflow-auto` with an inner `p-4 md:p-6 lg:p-8` content wrapper |

Sidebar styling: solid `#0D1E2D` background; nav items use `rounded-lg` (0.5rem, normally 8px); active item `bg-[#24384b] text-amber-300 border-l-[3px] border-gold`; hovering a nav item zooms its icon and label (`group-hover:scale-110`, 200 ms); footer shows avatar, full name, role badge, and a logout icon with a confirmation modal.

## Superadmin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/superadmin` | `LayoutDashboard` |
| Dept & Courses | `/superadmin/departments` | `Building2` |
| Manage Admin | `/superadmin/admins` | `Users` |
| Audit Logs | `/superadmin/audit` | `ShieldCheck` |
| Settings | `/superadmin/settings` | `Settings` |

Header: page title, in the shared white-header style. Nav labels are `text-sm`.

## Admin Sidebar

| Label | Path | Icon |
|---|---|---|
| Dashboard | `/admin` | `LayoutDashboard` |
| Manage Teacher | `/admin/teachers` | `Users` |
| Settings | `/admin/settings` | `Settings` |

Header: page title, department and term badges (`rounded-md`, `bg-[#0c1925]`, `text-amber-300`), and `NotificationDropdown` with unread count, refresh-on-open/30-second polling, read-on-open, and per-user dismissal. Uses the shared white-header style. Nav labels are `text-sm`.

## Teacher Sidebar

| Label | Path | Icon |
|---|---|---|
| Overview | `/teacher/overview` | `LayoutDashboard` |
| Attendance | `/teacher/attendance` | `CalendarCheck` |
| Class Record | `/teacher/class-record` | `FileSpreadsheet` |
| My Class List | `/teacher/my-class-list` | `Users` |
| Analytics | `/teacher/analytics` | `BarChart3` |
| Grade Summary | `/teacher/grade-summary` | `Summary` |
| Settings | `/teacher/settings` | `Settings` |

Header: page title, department and term badges (`rounded-md`, `bg-[#0c1925]`, `text-amber-300`), and `NotificationDropdown` with unread count, refresh-on-open/30-second polling, read-on-open, and per-user dismissal. Nav labels are `text-sm`.

## Routing Tree

Defined in `frontend/src/App.jsx`:

```
/login                            → Login
/                                 → redirect (token → role dashboard, else /login)

/superadmin                       → SuperAdminLayout → SuperAdminDashboard
/superadmin/audit                 → Audit (audit.jsx)
/superadmin/admins                → SuperAdminUsers
/superadmin/admins/create         → CreateSuperAdminUser
/superadmin/departments           → ManageDepartments
/superadmin/settings              → SuperAdminSettings

/admin                            → AdminLayout → AdminDashboard
/admin/teachers                   → AdminTeachers
/admin/teachers/create            → CreateAdminTeacher
/admin/settings                   → AdminSettings

/teacher                          → TeacherLayout → TeacherOverview
/teacher/overview                 → TeacherOverview
/teacher/attendance               → Attendance
/teacher/class-record             → ClassRecord
/teacher/my-class-list            → MyClassList
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

These client guards are navigation conveniences, not authorization. Every API call rechecks the current database account and security fingerprint; a 401 clears the stored session and returns to Login. A 403 (wrong scope/missing department) or 503 (account verification unavailable) keeps the session. Phase 1 adds no routes or navigation items.

Unmatched URLs are handled by the top-level `*` route and render `NotFound` without a layout (see Unknown Routes below).

## Header Title Mapping

| Path | Title |
|---|---|
| `/admin` | Dashboard |
| `/admin/teachers` | Teacher Management |
| `/admin/teachers/create` | Create New Teacher |
| `/admin/settings` (and anything unmatched) | Settings |
| `/superadmin` | Dashboard |
| `/superadmin/audit` | Audit Logs |
| `/superadmin/admins` | Admin Management |
| `/superadmin/admins/create` | Create New Admin |
| `/superadmin/departments` | Departments & Courses |
| `/superadmin/settings` | Settings |
| `/teacher` or `/teacher/overview` | Overview |
| `/teacher/class-record` | Class Record |
| `/teacher/my-class-list` | My Class List |
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
