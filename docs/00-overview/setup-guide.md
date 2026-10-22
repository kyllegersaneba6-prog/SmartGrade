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

The frontend has **no `.env`**. Every page calls `http://localhost:5000/api/...` directly; `Login.jsx` uses `http://${window.location.hostname}:5000`.

## Database Setup

1. Run `backend/sql/schema.sql` in the Supabase SQL editor (tables + seed data).
2. Apply the change files in `backend/sql/` for any feature added after the base schema. There is **no migration runner** and no manifest — order matters.
3. Confirm the final `attendance` unique constraint is the 6-column version `(teacher_assignment_id, student_id, date, session, type, term)`. `alter_attendance_unique.sql` and `alter_attendance_term.sql` disagree; the last one applied wins, and the upsert in `routes/attendance.js` expects 6 columns.

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
| Port already in use | Change `PORT` in `backend/.env` |
| CORS errors | CORS is wide open (`app.use(cors())`); the usual cause is calling the wrong host/port |
| 403 on every request | Expired/invalid JWT (403, not 401) — log out and back in; tokens last 1 day |
| 403 "Insufficient permissions" | Wrong role for the endpoint (e.g. admin calling a teacher-only grading write) |
| AI summary always fails | `OMNIROUTE_API_KEY` unset or gateway down — check `GET /api/ai/status` |
| Frontend requests fail after deploying | API host is hardcoded to `localhost:5000`; serve the backend on the same hostname/port or change the URLs |
| Login works, all else 403 | Admin/teacher deleted or restored from backup while a stale token is still in `localStorage` |
