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
npm ci --allow-remote=root
```

## Configuration

Copy `backend/.env.example` to `backend/.env` and set real values. Never commit this file. The frontend uses a separate, optional build-time variable below.

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
```

- Generate `JWT_SECRET` using at least 32 random bytes; keep the same value across backend instances. Changing it logs out everyone after the processes restart.
- `xlsx` is pinned to SheetJS's official `0.20.3` CDN tarball (the npm-registry release is outdated). `--allow-remote=root` permits only direct URL dependencies in `package.json` on npm versions with remote-package restrictions; the lockfile records integrity.
- For deployment, set `CORS_ORIGINS` to comma-separated frontend origins. Set `TRUST_PROXY` only when a trusted reverse proxy is present.

### Credential rotation after Phase 1

The local JWT secret was rotated and the local environment file preserved. Restart the backend and log in again. Removing a tracked file does **not** remove old Git history.

1. Rotate any previously committed Supabase service-role/secret key and AI gateway key in their provider dashboards; revoke the old credentials.
2. Update the ignored local environment and deployment secret stores, then restart every backend instance. Rotate the deployed `JWT_SECRET` too.
3. Verify login and AI access with new keys, and confirm revoked keys no longer work. No provider-side rotation or history rewrite was performed by Phase 1.

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
2. For attendance, run `backend/sql/create_attendance_table.sql` (fresh database only) and then `backend/sql/migrate_attendance_final.sql`. The latter is idempotent and also fixes any database that ran the older attendance migration files. Apply the remaining change files in `backend/sql/` for features added after the base schema, including `archive_activity_logs.sql` and then `archive_superadmin_term_snapshots.sql` before deploying semester archive views, `create_atomic_full_backup_restore.sql` before deploying the backend's full-restore RPC, and `create_broadcast_notifications.sql` before deploying the notification API. The audit archive, Super Admin snapshot, and broadcast migrations are applied on the current live database; run them in other environments before deploying the related APIs there. There is **no migration runner**; the live project's Supabase migration history records the canonical files as a baseline.
3. Confirm the final `attendance` unique constraint is the 6-column version `(teacher_assignment_id, student_id, date, session, type, term)`. `migrate_attendance_final.sql` guarantees this; the upsert in `routes/attendance.js` expects 6 columns. The old `alter_attendance_unique.sql` / `alter_attendance_term.sql` / `migrate_attendance_v2.sql` files are deprecated no-ops.
4. Run `backend/sql/add_db_constraints.sql`. It is idempotent, adds the single-active-term and one-admin-per-department indexes, score/weight CHECKs, and the score/weight triggers. If existing rows violate a rule it stops with a message listing what to fix; it never rewrites data.
5. Run `backend/sql/enable_row_level_security.sql`. It is idempotent and enables RLS (no policies, deny-all) on all public tables, including Super Admin term snapshots. The backend keeps working because the service-role key has `BYPASSRLS`; the anon/publishable key cannot read or write.

### Seed credentials

| Account | Username | Password |
|---|---|---|
| Superadmin | `admin` | `admin123` |

Admins and teachers are created in-app. New accounts default to password `smartgrade123` (teacher/admin creation forms).

## Running

```bash
# Terminal 1 — backend
cd backend
node index.js        # or npm run dev / npm start

# Terminal 2 — frontend
cd frontend
npm.cmd run dev      # Windows PowerShell; other shells can use: npm run dev
```

Some PowerShell/terminal hosts return to the prompt after printing `Server is running on port 5000`, even while the backend process remains active. Verify the server with `Invoke-RestMethod http://127.0.0.1:5000/api/health`; a response with `status: ok` means it is running. Check this before starting another backend instance.

- Backend: `http://localhost:5000` (binds `0.0.0.0`)
- Frontend: `http://localhost:5173`

## Common Errors

| Error | Fix |
|---|---|
| **Service Unavailable** on every page | In Windows PowerShell, run `cd backend` then `npm.cmd run start` (or `npm.cmd run dev`); other shells can use `npm run start` (or `npm run dev`). The UI checks again every 5 s or via **Try Again**. If it persists, check `VITE_API_BASE_URL`, backend port/CORS, and whether `GET /api/health` returns the SmartGrade health JSON. Restart the backend after upgrading to include this endpoint |
| Prompt returns after backend startup | Check `Invoke-RestMethod http://127.0.0.1:5000/api/health`. If it returns `status: ok`, the server is still running; if the connection is refused, start it from `backend` with `node index.js` and check the terminal for startup errors |
| `supabaseUrl is required` | `backend/.env` missing/empty, or variable named `SUPABASE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY` |
| `relation "public.departments" does not exist` | Run `schema.sql` first |
| `add_db_constraints.sql` aborts with "Multiple active terms", "Multiple admins", "weight totals exceed 100", or "score(s) outside" | Fix the rows named in the error, then re-run. The migration never rewrites data |
| Port already in use | Change `PORT` in `backend/.env` |
| CORS errors | Check the frontend origin against `CORS_ORIGINS`; defaults allow local/LAN development origins, not every origin |
| 401 after upgrading or editing an account | Log in again. Legacy tokens, deleted accounts, and changed password/username/role/department/course/creator fingerprints are rejected |
| 403 "A valid department is required" | Repair the admin/teacher's department to match an existing `departments.name`; requests fail closed instead of showing all records |
| 503 "Unable to verify your account" | Restore database connectivity/permissions and retry; this is not a bad-password response and does not clear an existing frontend session |
| 403 "Insufficient permissions" | Wrong role for the endpoint (e.g. admin calling a teacher-only grading write). The session stays active |
| `permission denied for table ...` when using the Supabase anon/publishable key | Expected: RLS is enabled with no policies. All data access must go through the Express backend (service-role key), not directly from the browser |
| AI summary always fails | `OMNIROUTE_API_KEY` unset or gateway down — check `GET /api/ai/status` |
| Frontend requests fail after deploying | Set `VITE_API_BASE_URL` in `frontend/.env` to the reachable backend origin, then rebuild. Without it, the frontend targets `http://<current-hostname>:5000` |
| `EALLOWREMOTE` during frontend install | Use `npm ci --allow-remote=root` for the approved official SheetJS tarball; do not replace it with registry `xlsx@0.18.5` |

The unavailable screen indicates that this browser cannot reach/validate the backend health endpoint; it cannot prove whether a terminal command was run. Network/CORS/configuration failures can produce the same screen. The health endpoint checks the API process only, not database or AI readiness; ordinary API 401/403/500/503 responses retain their existing page-level handling when health is reachable.
