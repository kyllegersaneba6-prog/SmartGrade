# SmartGrade — Project Summary

## What It Is

SmartGrade is a full-stack academic grading and classroom management web application for colleges and universities. It manages departments, courses, sections, students, teachers, subjects, grading, attendance, and grade computation across academic terms.

## Main Purpose

Replace paper-based or spreadsheet-based grading with a centralized, role-based web platform. Teachers import their official class lists and manage their own rosters, attendance, and grades; admins provision teacher accounts; superadmins oversee the institution and academic terms.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js (v20+), Express.js 5 |
| Database | PostgreSQL (Supabase), accessed with `@supabase/supabase-js` service-role key |
| Auth | bcryptjs + 1-day JWT; current-account/security-fingerprint verification on every request |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| Charts | Recharts |
| Icons | Lucide React |
| Export | `xlsx` / `xlsx-js-style` (Excel), `jspdf` + `jspdf-autotable` (PDF) — all client-side |
| AI | OmniRoute gateway (OpenAI-compatible HTTP) via `backend/services/` |

## Roles

| Role | Scope |
|---|---|
| Superadmin | Institution-wide. Departments, courses, admin accounts, academic terms, audit trail, backup/restore. |
| Admin | One department. Teacher account creation and maintenance, settings, and activity monitoring. No section or student roster management. |
| Teacher | Own imported classes only. Creates or reuses sections, subjects, and assignments by importing a class-list PDF; manages rosters, attendance, grading components, scores, analytics, and grade summaries. |

## Main Features

**Organization & people**
- Department + course management with abbreviations
- Admin accounts (one per department, enforced in app code + DB unique index)
- Teacher accounts with 9-digit staff ID and auto-generated username
- Teacher class-list import creates or reuses a section, subject, and assignment for the active term
- Student records with structured fields (First Name, Last Name, MI, Gender)
- PDF class-list import for teachers, with metadata checks, preview, and duplicate detection

**Terms & access**
- Superadmin-only academic term create/end (no date auto-detection)
- Role-scoped dashboards and navigation
- Read-only enforcement for closed terms (backend 403 + disabled controls)
- Archive mode: teachers and admins browse past terms read-only; writes are also blocked server-side
- Failed-login audit entries (deduped per username per 60 s)

**Teaching & grading**
- Subject and teacher assignment are created from the imported PDF for the active term
- Attendance: date columns with AM/PM session and Lecture/Laboratory type, 0/1/2 scoring
- Class record: weighted components, sub-activities, per-activity scores, drag-drop reorder, copy-from-PRELIMS
- Auto-computed totals, 50-base transmutation, weighted equivalents, final term grade
- Grade summary across 4 terms with 20/20/20/40 weighting and grade-point remarks
- Behavioral analytics (component performance, submission rate, attendance, linear-regression trend)
- AI student narrative summary (read-only; AI never computes grades)

**Data & operations**
- App-wide backend-unavailable screen with automatic recovery, manual retry, and an anonymous process-health check
- Activity/audit logging, role-scoped (superadmin all; admin department-only; teacher empty)
- Backup/restore (`.backup.sg`), checksummed, optional AES-256-GCM encryption, merge/replace/full modes
- Excel and PDF export for class records, summaries, and account lists

## Current Status

Functional MVP. Core grading, attendance, and user management work end to end. Database access is locked down with RLS and service-role-only access; the new notification tables follow the same pattern when their migration is applied.

Known gaps (see `05-development/notes.md`):
- Phase 1 authorization hardening is implemented: protected account fields, same-department ownership, scoped rosters, relationship validation, and stale-session rejection. Provider-side Supabase/AI credential rotation remains an operator task.
- `backend/.env` is no longer tracked; a sanitized `.env.example` is provided. Production dependency audits are clean; development-tool advisories remain.
- No tests, no TypeScript, no centralized API client (pages call a thin `utils/api.js` wrapper with relative `/api/...` paths and a configurable base URL).
- In-app broadcast notifications are implemented in code and `backend/sql/create_broadcast_notifications.sql` has been applied and read-only verified on the live database. Deploy the backend and frontend changes before using the feature in the hosted app.
- Grade computation, grade-point conversion, and all Excel/PDF work live in the frontend, not the backend.
