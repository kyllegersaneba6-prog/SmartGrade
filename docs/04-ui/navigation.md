# Navigation Structure

## App Shell

All layouts share:
- **Sidebar** — Collapsible on mobile, role-specific navigation links
- **Header** — Title, active term badge, "Reload" button
- **Outlet** — Renders the active page

## Superadmin Sidebar

- Dashboard (`/superadmin`)
- Departments (`/superadmin/departments`)
- Admin Management (`/superadmin/users`)
- Settings (`/superadmin/settings`)
- Security (`/superadmin/security`)

## Admin Sidebar

- Dashboard (`/admin`)
- Sections (`/admin/sections`)
- Subjects (`/admin/subjects`)
- Teachers (`/admin/teachers`)
- Settings (`/admin/settings`)

## Teacher Sidebar

- Dashboard (`/teacher/dashboard`)
- Attendance (`/teacher/attendance`)
- Class Record (`/teacher/class-record`)
- Grade Summary (`/teacher/grade-summary`)
- Analytics (`/teacher/analytics`)
- Settings (`/teacher/settings`) — gear icon

## Routing Architecture

Defined in `frontend/src/App.jsx`:

```
/login                          → Login
/superadmin/*                   → SuperAdminLayout
  /superadmin                   → GlobalAnalytics
  /superadmin/security          → SecurityAudit
  /superadmin/users             → SuperAdminUsers
  /superadmin/users/create      → CreateSuperAdminUser
  /superadmin/departments       → ManageDepartments
/admin/*                        → AdminLayout
  /admin                        → AdminDashboard
  /admin/teachers               → AdminTeachers
  /admin/teachers/create        → CreateAdminTeacher
  /admin/sections               → AdminSections
  /admin/subjects               → AdminSubjects
  /admin/settings               → AdminSettings
/teacher/*                      → TeacherLayout (wraps TeacherLayoutInner in TeacherProvider)
  /teacher/dashboard            → Dashboard
  /teacher/attendance           → Attendance
  /teacher/class-record         → ClassRecord
  /teacher/analytics            → BehavioralAnalytics
  /teacher/grade-summary        → GradeSummary
  /teacher/settings             → TeacherSettings
```

All routes are wrapped with `ProtectedRoute` which checks JWT token and role.
