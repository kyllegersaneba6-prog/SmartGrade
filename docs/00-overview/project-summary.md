# SmartGrade — Project Summary

## What It Is

SmartGrade is a full-stack academic grading and classroom management web application for colleges and universities. It manages departments, courses, sections, students, teachers, subjects, grading, attendance, and grade computation across academic terms.

## Main Purpose

Replace paper-based or spreadsheet-based grading with a centralized, role-based web platform. Teachers record attendance and compute grades; admins manage sections, subjects, and teacher assignments; superadmins oversee the entire institution and own academic-term control.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js (v20+), Express.js 5 |
| Database | PostgreSQL (Supabase), accessed with `@supabase/supabase-js` service-role key |
| Auth | bcryptjs + JWT (`expiresIn: '1d'`) |
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
| Admin | One department. Teachers, sections, students, subjects, teacher assignments. No grading writes. |
| Teacher | Own assignments only. Attendance, grading components, scores, analytics, grade summary. No structural writes. |

## Main Features

**Organization & people**
- Department + course management with abbreviations
- Admin accounts (one per department, enforced in app code + DB unique index)
- Teacher accounts with 9-digit staff ID and auto-generated username
- Section auto-naming (`<course abbr> <year>-<section letter>`) with duplicate checks
- Student records with structured fields (First Name, Last Name, MI, Gender)
- Excel student import with duplicate detection and preview

**Terms & access**
- Superadmin-only academic term create/end (no date auto-detection)
- Role-scoped dashboards and navigation
- Read-only enforcement for closed terms (backend 403 + disabled controls)
- Archive mode: teachers and admins browse past terms read-only; writes are also blocked server-side
- Failed-login audit entries (deduped per username per 60 s)

**Teaching & grading**
- Subjects persist across school years, semester-scoped (1st/2nd/Summer/All)
- Teacher assignment to section + subject per term (additive, never overwrites)
- Attendance: date columns with AM/PM session and Lecture/Laboratory type, 0/1/2 scoring
- Class record: weighted components, sub-activities, per-activity scores, drag-drop reorder, copy-from-PRELIMS
- Auto-computed totals, 50-base transmutation, weighted equivalents, final term grade
- Grade summary across 4 terms with 20/20/20/40 weighting and grade-point remarks
- Behavioral analytics (component performance, submission rate, attendance, linear-regression trend)
- AI student narrative summary (read-only; AI never computes grades)

**Data & operations**
- Activity/audit logging, role-scoped (superadmin all; admin department-only; teacher empty)
- Backup/restore (`.backup.sg`), checksummed, optional AES-256-GCM encryption, merge/replace/full modes
- Excel and PDF export for class records, summaries, and account lists

## Current Status

Functional MVP. Core grading, attendance, and user management work end to end. Database access is locked down: RLS is enabled on all 13 public tables with no policies, and only the backend's service-role key can read or write.

Known gaps (see `05-development/notes.md`):
- No tests, no TypeScript, no centralized API client (pages call a thin `utils/api.js` wrapper with relative `/api/...` paths and a configurable base URL).
- Superadmin "Broadcast Notification" UI is not wired to an API.
- Grade computation, grade-point conversion, and all Excel/PDF work live in the frontend, not the backend.
