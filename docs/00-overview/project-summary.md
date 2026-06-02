# SmartGrade — Project Summary

## What It Is

SmartGrade is a full-stack academic grading and classroom management web application for colleges and universities. It manages departments, courses, sections, students, teachers, subjects, grading, attendance, and grade computation across academic terms.

## Main Purpose

Replace paper-based or spreadsheet-based grading with a centralized, role-based web platform. Teachers record attendance and compute grades; admins manage sections, subjects, and teacher assignments; superadmins oversee the entire institution.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js (v20+), Express.js 5 |
| Database | PostgreSQL (Supabase) |
| Auth | bcryptjs + JWT |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Charts | Recharts |
| Icons | Lucide React |
| Excel Export | xlsx / xlsx-js-style |
| Routing | React Router DOM 7 |

## Main Features

- Three roles: Superadmin, Admin, Teacher
- Role-based dashboards and navigation
- Department, course, section, subject, and user management
- Teacher assignment to sections/subjects
- Superadmin-only academic term management (create/end terms, no auto-detection)
- Attendance recording with date columns, AM/PM sessions, 0/1/2 scoring
- Class record with weighted grading components, activities, score entry, auto-computed equivalents and final grades
- Grade summary across 4 terms (PRELIMS, MIDTERMS, PRE-FINALS, FINALS)
- Grade-point scale conversion (1.00 = 98–100%, ..., 5.00 = below 75%) with classification remarks (Excellent, Very Good, Satisfactory, Fair, Failed)
- Behavioral analytics with charts
- Excel export for class records and grade summaries
- Activity/audit logging — role-scoped: superadmin sees all, admin sees department users only, superadmins excluded
- Global assignment selector (persists across teacher pages via React Context + localStorage)
- AdminContext: shared term/archive state across admin pages (React Context + localStorage)
- Read-only mode for closed terms (backend 403 + frontend disabled controls)
- Archive mode browsing — teachers can view past terms in read-only mode via TeacherSettings (only entry point)
- Teacher Settings page for browsing term history and managing archive mode entry/exit
- Confirmation modal before entering archive mode (shown in TeacherSettings only)
- TeacherLayout inner component pattern with archive mode amber banner
- Sidebar Settings nav item for teachers (gear icon, links to `/teacher/settings`)
- Department-wide subjects (course_id = null)
- One admin per department — enforced on POST and PATCH /api/users

## Current Status

Functional MVP. Core grading, attendance, and user management are working. Teacher and admin contexts shared globally via React Context (`TeacherContext`, `AdminContext`). Closed terms are read-only enforced on both ends. Archive mode lets teachers and admins browse past terms. No tests, no TypeScript, no centralized API client.
