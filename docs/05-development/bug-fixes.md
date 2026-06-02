# Bug Fixes

| Date | Bug | Fix |
|---|---|---|
| 2026-06-02 | Admin dashboard shows superadmin activity entries | Backend `GET /api/activity` now queries `staff_users` for usernames in the admin's department, explicitly excludes superadmin usernames, and filters `activity_log` by the remaining list. Frontend labels own actions with "You..." prefix. |
| 2026-06-02 | ClassRecord.jsx parse error — stray `>` on line 877 | Removed orphaned `>` and duplicated JSX fragment |
| 2026-06-02 | ClassRecord, GradeSummary, BehavioralAnalytics stuck in infinite loading after removing assignment fetch | Removed stale `loading` state that was never set to `false` (assignment loading now handled by TeacherContext) |
