# Feature List

Status values: **Done** · **In Progress** · **Planned** · **Not Wired** (UI exists, backend does not)

## Access & Accounts

| Feature | Status | Notes |
|---|---|---|
| Login / JWT authentication | Done | 1-day tokens; bcrypt; fresh account/security fingerprint on every authenticated request |
| Role-based access control (Superadmin/Admin/Teacher) | Done | Shared read/write ownership and department checks; account roles/ownership cannot be patched |
| Stale-session rejection | Done | Deletes and changed security fields invalidate prior fingerprints; invalid department fails closed; DB verification outages return 503 |
| Bulk student relationship checks | Done | Entire score/attendance batch rejected before writing if any student is outside its assignment section |
| Login alias lockout | Done | Unique UUID-prefix aliases only; aliases share the account's failed-login bucket |
| Account provisioning with 9-digit staff ID | Done | `staff_id` validated `^[0-9]{9}$`, unique |
| Auto-generated username | Done | `lastname.<digits 3–7 of staff ID>@sg` |
| One admin per department | Done | Enforced in `POST`/`PATCH /api/users` and by unique partial index `idx_staff_users_one_admin_per_department` |
| Failed-login audit (deduped 60 s) | Done | Unknown usernames are not logged |

## Organization

| Feature | Status | Notes |
|---|---|---|
| Department management (CRUD) + abbreviation | Done | Superadmin only; rename cascades to `staff_users.department` |
| Course management (CRUD) + abbreviation | Done | Superadmin only; delete blocked while referenced |
| Teacher class-list import | In Progress | My Classes extracts subject, section, course, year, term, and student details; provisions/reuses the class and imports its roster. Live Supabase term-aware section constraint is applied; live roster import is not exercised |
| Admin teacher account management | Done | Admin can create, edit, and delete teacher accounts; section, subject, assignment, and student roster management is removed from admin UI/API |

## Terms & Read-Only

| Feature | Status | Notes |
|---|---|---|
| Academic term management (superadmin-only) | Done | Create + end; no auto-detection |
| Read-only locked term | Done | Backend 403 on mutations + disabled UI |
| Archive mode browsing (teacher) | Done | Entry only from `/teacher/settings` |
| Archive mode browsing (admin) | Done | Entry only from `/admin/settings` |
| Term-lock coverage | Done | Sections, subjects, assignments, grading, and attendance reject non-active terms; a global archive-header guard blocks every write while an archived term is viewed (including users/departments/courses) |

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
| Grade-point conversion + remarks | Done | 1.00–5.00 with the `grade-point.md` ranges; legend is numeric-only |
| Behavioral analytics | Done | Performance, submission rate, attendance, trend |
| AI student summary | Done | Read-only narrative; AI never computes grades |
| Excel export | Done | Class Record and Grade Summary exports use admin-configured BSIT/BSCS program-head and CICT dean signatories; successful teacher exports are audited with safe metadata. Class Record export stays disabled until component weights total 100% |
| PDF export | Done | Class Record and Grade Summary exports use admin-configured BSIT/BSCS program-head and CICT dean signatories; successful teacher exports are audited with safe metadata. Class Record export stays disabled until component weights total 100% |
| Export signatory settings | Done | Admin configures department-level BSIT program head, BSCS program head, and CICT dean names in Settings; confirmed saves are recorded in the activity log |
| Non-numeric marks (DRP / P / F) | In Progress | Modeled in `gradeCalculations.js` (`SPECIAL_MARKS` + string support in `gradeToPoint()`); no score-entry UI, hidden from the Grade Summary legend |

## Operations

| Feature | Status | Notes |
|---|---|---|
| Activity / audit logging | Done | Role-scoped reads; write identity derived from JWT; successful teacher imports and exports store safe class/term/format/count metadata only |
| Security audit page (superadmin) | Done | Search, Import/Export filters, Critical Alerts / Total Logged Events / Teacher Data Exports metrics; 10 s auto-refresh |
| Backup export | Done | `.backup.sg`, categories, optional encryption |
| Backup validate / preview | Done | Checksums, per-table counts, conflict preview |
| Backup restore (merge / replace / full) | In Progress | Merge/replace use typed confirmation and an in-process lock; full restore requires complete restorable tables and the atomic RPC migration before deployment |
| Configurable API base URL | Done | `VITE_API_BASE_URL` (default `http://<hostname>:5000`); pages pass relative `/api/...` paths |
| Global backend-availability screen | Done | All routes, including Login/404; anonymous health probe, 5 s polling/timeout, manual retry; mounted pages and session retained during later outages |
| Environment-file tracking cleanup | Done | Local file preserved, JWT secret rotated; sanitized `backend/.env.example` added |
| Previously committed provider credential rotation | In Progress | Supabase/AI key rotation and deployed-secret updates require operator access |
| 404 page + catch-all route | Done | `NotFound` page for any unknown URL; links to the role dashboard or login |
| Broadcast notification | In Progress | In-app, role-targeted broadcasts with unread/read/dismiss state; live DB migration is applied and verified, but backend/frontend deployment is still required |
| Student portal / self-service | Planned | |
| Multi-institution support | Planned | |
| Automated / scheduled backups | Planned | Manual backup only |
