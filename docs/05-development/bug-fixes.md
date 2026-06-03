# Bug Fixes

| Date | Bug | Fix |
|---|---|---|
| 2026-06-02 | Admin dashboard shows superadmin activity entries | Backend `GET /api/activity` now queries `staff_users` for usernames in the admin's department, explicitly excludes superadmin usernames, and filters `activity_log` by the remaining list. Frontend labels own actions with "You..." prefix. |
| 2026-06-02 | ClassRecord.jsx parse error — stray `>` on line 877 | Removed orphaned `>` and duplicated JSX fragment |
| 2026-06-02 | ClassRecord, GradeSummary, BehavioralAnalytics stuck in infinite loading after removing assignment fetch | Removed stale `loading` state that was never set to `false` (assignment loading now handled by TeacherContext) |
| 2026-06-03 | Frontend calls `DELETE /api/sections/students/:id` but backend had no matching route | Added missing DELETE route in `backend/routes/sections.js` that deletes the student plus cascade removes component_scores and attendance records |
| 2026-06-03 | Department-wide subjects (course_id=null) not showing in teacher assignment dropdown | `AdminTeachers.jsx:200`: added `|| !s.course_id` to filter. `subjects.js:22`: changed `.eq('semester',...)` to `.or()` to include null-semester subjects |
| 2026-06-03 | Superadmin counted as admin in Department User Overview | `GlobalAnalytics.jsx:71`: removed `|| u.system_role === 'superadmin'` from admin counting condition so superadmin is no longer tallied as a department admin |
| 2026-06-03 | Sidebar nav item text wraps on long names like "Departments & Courses" | Added `whitespace-nowrap` to nav link className in all three sidebars (`SuperAdminSidebar.jsx`, `AdminSidebar.jsx`, `Sidebar.jsx`) |
