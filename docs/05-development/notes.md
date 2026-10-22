# Notes

Miscellaneous technical notes, known gaps, and follow-ups.

## Known Gaps / Risks

| Area | Issue | Impact |
|---|---|---|
| API activity log | `POST /api/activity` accepts any authenticated caller and trusts `user_name` + `department` from the body | Audit rows can be spoofed by any logged-in user |
| Component scores | `POST /api/component-scores/bulk` verifies ownership only for `scores[0]` | A teacher could write scores for an assignment they do not own by mixing rows |
| Read endpoints | `GET /api/attendance`, `/attendance/dates`, `/component-activities`, `/sections/:id/students` have no ownership check | Any authenticated user can read other sections' data by UUID |
| CORS | `app.use(cors())` allows every origin | Fine for local demo; lock down before deployment |
| Error handling | No 404 and no error middleware in `index.js` | Unmatched routes and thrown errors return Express HTML, not JSON |
| Error bodies | Mixed `{ message }` and `{ error }`; `{ error }` often leaks raw DB text | Inconsistent client handling; information disclosure |
| Notifications | Broadcast form only logs to the console | Feature appears to work but sends nothing |
| Bulk import page | `/admin/bulk-students` is unlinked and its header title falls back to "Settings" | Discoverability bug |
| Create-account routes | `/admin/teachers/create` and `/superadmin/users/create` render an uncloseable full-screen modal | User cannot cancel when navigated directly |
| 404 route | No catch-all in `App.jsx` | Blank page on unknown URLs |
| API host | Hardcoded `http://localhost:5000` in every page | Deployment requires code edits |
| Term lock | Not applied to section create, subject create/delete, user create, department/course writes | Structural changes can be made while browsing archives |
| DB constraints | No DB-level one-admin-per-department, weight sum, score range, or single-active-term guarantee | Application bugs or manual SQL can corrupt data |
| Legacy table | `admin_users` is queried by login but undefined in `sql/` | Login fallback shape is unverifiable |
| Attendance uniqueness | `alter_attendance_unique.sql` (5 cols) conflicts with `alter_attendance_term.sql` (6 cols) | Upsert can fail with "no unique constraint matching" depending on applied order |

## Architecture Notes

- **Grade computation lives in the frontend.** `frontend/src/utils/gradeCalculations.js` is the single source of truth; the backend has no grade endpoint.
- **Archive mode lives in the frontend.** `TeacherContext` / `AdminContext` hold `viewTerm`; the backend only supplies `GET /api/terms`.
- **Department scoping is manual.** `staff_users.department` is a text snapshot; no generic middleware exists. Ownership is usually `created_by = req.user.id`.
- **Teacher-only writes.** Grading, scores, and attendance mutations are `authorizeRole('teacher')`; admins and superadmins get 403.
- **Admin-only structure.** Sections, students, subjects, and assignments are `authorizeRole('admin')`; superadmin gets 403.
- **Excel/PDF is client-side.** No spreadsheet libraries exist in the backend.
- **Backups run in-process.** `restoreInProgress` is a module-level flag, so it protects one server process only.

## Local Environment

- Backend: `http://localhost:5000` (binds `0.0.0.0`).
- Frontend: `http://localhost:5173`.
- AI gateway default: `http://localhost:20128/v1` (OmniRoute).
- OpenCode V2 project instructions: `.opencode/opencode.json` loads `docs/AGENTS.md`.
- Seed superadmin: `admin` / `admin123`.

## Where to Put Things

If a note does not fit an existing file, add it here first, then promote it to the correct folder once it stabilizes.
