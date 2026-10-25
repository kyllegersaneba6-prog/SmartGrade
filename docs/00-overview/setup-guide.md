# Setup Guide

## Prerequisites

- Node.js v20+
- npm
- A Supabase project (PostgreSQL) with the service-role key

## Installation

```bash
# From the repo root: C:\Users\kylle\Documents\FINAL_DEFENSE\SmartGrade

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Configuration

Only the backend reads environment variables. Create `backend/.env`:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
```

Optional AI settings (required only for the AI summary feature):

| Variable | Default | Purpose |
|---|---|---|
| `OMNIROUTE_BASE_URL` | `http://localhost:20128/v1` | OpenAI-compatible gateway base URL |
| `OMNIROUTE_API_KEY` | — | Gateway key; AI calls fail without it |
| `AI_MODEL` | `smartgrade pro 3.1` | Model/combo name |
| `AI_COMBO_NAME` | — | Fallback used when `AI_MODEL` is unset |
| `AI_TIMEOUT_MS` | `30000` | Request timeout → HTTP 504 |
| `AI_TEMPERATURE` | `0.2` | Sampling temperature |
| `AI_MAX_TOKENS` | `1500` | Max response tokens |

The frontend reads one optional variable at build time. It defaults to the backend on the current hostname, so no config is needed locally.

Create `frontend/.env` (or copy `frontend/.env.example`) when the API lives elsewhere:

```env
VITE_API_BASE_URL=http://192.168.1.10:5000
```

Pages call `api('/api/...')`; `frontend/src/utils/api.js` prefixes `API_BASE` (`VITE_API_BASE_URL` or `http://<current-hostname>:5000`). `Login.jsx` uses the same constant.

## Database Setup

1. Run `backend/sql/schema.sql` in the Supabase SQL editor (tables + seed data).
2. For attendance, run `backend/sql/create_attendance_table.sql` (fresh database only) and then `backend/sql/migrate_attendance_final.sql`. The latter is idempotent and also fixes any database that ran the older attendance migration files. Apply the remaining change files in `backend/sql/` for features added after the base schema. There is **no migration runner**; the live project's Supabase migration history records the canonical files (`enable_row_level_security`, `baseline_attendance_final`, `baseline_db_constraints`) as a baseline.
3. Confirm the final `attendance` unique constraint is the 6-column version `(teacher_assignment_id, student_id, date, session, type, term)`. `migrate_attendance_final.sql` guarantees this; the upsert in `routes/attendance.js` expects 6 columns. The old `alter_attendance_unique.sql` / `alter_attendance_term.sql` / `migrate_attendance_v2.sql` files are deprecated no-ops.
4. Run `backend/sql/add_db_constraints.sql`. It is idempotent, adds the single-active-term and one-admin-per-department indexes, score/weight CHECKs, and the score/weight triggers. If existing rows violate a rule it stops with a message listing what to fix; it never rewrites data.
5. Run `backend/sql/enable_row_level_security.sql`. It is idempotent and enables RLS (no policies, deny-all) on all 13 tables. The backend keeps working because the service-role key has `BYPASSRLS`; the anon/publishable key cannot read or write.

### Seed credentials

| Account | Username | Password |
|---|---|---|
| Superadmin | `admin` | `admin123` |

Admins and teachers are created in-app. New accounts default to password `smartgrade123` (teacher/admin creation forms).

## Running

```bash
# Terminal 1 — backend
cd backend
npm run dev      # nodemon; or: npm start

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Backend: `http://localhost:5000` (binds `0.0.0.0`)
- Frontend: `http://localhost:5173`

## Common Errors

| Error | Fix |
|---|---|
| `supabaseUrl is required` | `backend/.env` missing/empty, or variable named `SUPABASE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY` |
| `relation "public.departments" does not exist` | Run `schema.sql` first |
| `add_db_constraints.sql` aborts with "Multiple active terms", "Multiple admins", "weight totals exceed 100", or "score(s) outside" | Fix the rows named in the error, then re-run. The migration never rewrites data |
| Port already in use | Change `PORT` in `backend/.env` |
| CORS errors | CORS is wide open (`app.use(cors())`); the usual cause is calling the wrong host/port |
| 403 on every request | Expired/invalid JWT now returns **401**, and `utils/api.js` clears the session and redirects to `/login`. Log in again; tokens last 1 day |
| 403 "Insufficient permissions" | Wrong role for the endpoint (e.g. admin calling a teacher-only grading write). The session stays active |
| `permission denied for table ...` when using the Supabase anon/publishable key | Expected: RLS is enabled with no policies. All data access must go through the Express backend (service-role key), not directly from the browser |
| AI summary always fails | `OMNIROUTE_API_KEY` unset or gateway down — check `GET /api/ai/status` |
| Frontend requests fail after deploying | Set `VITE_API_BASE_URL` in `frontend/.env` to the reachable backend origin, then rebuild. Without it, the frontend targets `http://<current-hostname>:5000` |
| Login works, all else 403 | Admin/teacher deleted or restored from backup while a stale token is still in `localStorage` |
