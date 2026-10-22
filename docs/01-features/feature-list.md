# Feature List

Status values: **Done** · **In Progress** · **Planned** · **Not Wired** (UI exists, backend does not)

## Access & Accounts

| Feature | Status | Notes |
|---|---|---|
| Login / JWT authentication | Done | 1-day tokens; bcrypt |
| Role-based access control (Superadmin/Admin/Teacher) | Done | `authorizeRole` + inline checks |
| Account provisioning with 9-digit staff ID | Done | `staff_id` validated `^[0-9]{9}$`, unique |
| Auto-generated username | Done | `lastname.<digits 3–7 of staff ID>@sg` |
| One admin per department | Done | Enforced in `POST`/`PATCH /api/users`, no DB constraint |
| Failed-login audit (deduped 60 s) | Done | Unknown usernames are not logged |

## Organization

| Feature | Status | Notes |
|---|---|---|
| Department management (CRUD) + abbreviation | Done | Superadmin only; rename cascades to `staff_users.department` |
| Course management (CRUD) + abbreviation | Done | Superadmin only; delete blocked while referenced |
| Section management (auto-named) | Done | Admin only; `"<abbr> <year>-<letter>"`; duplicate check |
| Section name preview | Done | `GET /api/sections/seed/preview` |
| Subject management (persist across terms) | Done | Semester-scoped; `course_id = null` = department-wide |
| Teacher assignment to sections/subjects | Done | Admin only; additive; one teacher per section+subject+term |

## Terms & Read-Only

| Feature | Status | Notes |
|---|---|---|
| Academic term management (superadmin-only) | Done | Create + end; no auto-detection |
| Read-only locked term | Done | Backend 403 on mutations + disabled UI |
| Archive mode browsing (teacher) | Done | Entry only from `/teacher/settings` |
| Archive mode browsing (admin) | Done | Entry only from `/admin/settings` |
| Term-lock coverage | In Progress | Not applied to section create, subject create/delete, user create, department/course writes |

## Attendance & Grading

| Feature | Status | Notes |
|---|---|---|
| Attendance date columns (date + AM/PM + LEC/LAB) | Done | One column per date+session+type |
| 0/1/2 attendance scoring | Done | 0 Absent, 1 Late, 2 Present |
| Attendance autosave | Done | 800 ms debounce; `localStorage` fallback; 30 s retry |
| Attendance computed totals | Done | `max_total = distinct columns × 2` |
| Grading components with weighted percentages | Done | Must sum to 100% in UI; not validated by backend |
| Sub-activities with max scores | Done | Default `max_score` 100 |
| Score entry with keyboard navigation | Done | Arrow keys + Enter/Tab; clamp warnings |
| Component drag-drop reorder | Done | `POST /api/grading-components/reorder` |
| Copy components from PRELIMS | Done | Activities are not copied |
| Automatic grade computation | Done | `frontend/src/utils/gradeCalculations.js` |
| Grade summary across 4 terms | Done | 20/20/20/40, renormalized when terms are missing |
| Grade-point conversion + remarks | Done | 1.00–5.00, Excellent → Failed |
| Behavioral analytics | Done | Performance, submission rate, attendance, trend |
| AI student summary | Done | Read-only narrative; AI never computes grades |
| Excel export | Done | Class record, summary, attendance, analytics, admin/teacher lists |
| PDF export | Done | Class record, summary, analytics |
| Non-numeric marks (DRP / P / F) | Planned | Documented in `formula.md`, not implemented |

## Operations

| Feature | Status | Notes |
|---|---|---|
| Activity / audit logging | Done | Role-scoped reads |
| Security audit page (superadmin) | Done | Filterable, 10 s auto-refresh |
| Backup export | Done | `.backup.sg`, categories, optional encryption |
| Backup validate / preview | Done | Checksums, per-table counts, conflict preview |
| Backup restore (merge / replace / full) | Done | Typed `CONFIRM` / `FULL RESTORE`; restore lock |
| Student Excel template builder | In Progress | `/admin/bulk-students` exists but is not linked from Manage Sections; header title falls back to "Settings" |
| Broadcast notification | Not Wired | Forms + success banner only; no API call |
| Student portal / self-service | Planned | |
| Multi-institution support | Planned | |
| Automated / scheduled backups | Planned | Manual backup only |
