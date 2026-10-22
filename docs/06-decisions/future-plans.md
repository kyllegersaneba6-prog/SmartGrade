# Future Plans

## Product

- Student portal for viewing grades and attendance
- Multi-institution / multi-department support
- Broadcast / notification system — needs a table, API, and delivery; the current form is UI-only
- Non-numeric grade marks (DRP / P / F) — documented in `formula.md`, not implemented
- Class-wide trend analytics and a grade analytics dashboard
- Grade computation history / audit trail
- Activity logging on the teacher side (grade additions, deletions, all CRUD)
- Dark mode
- Mobile-responsive refinements
- Replace low-contrast gray text with more readable colors

## Engineering

- Centralized API client with a configurable base URL (currently hardcoded `localhost:5000`)
- 404 page + backend 404/JSON error middleware
- Centralize term-lock and ownership checks into shared middleware/services
- Harden authorization:
  - Scope attendance/activity/student reads to the caller
  - Verify ownership for every row in a bulk score upsert
  - Stop trusting client-supplied `user_name`/`department` on `POST /api/activity`
- Restrict CORS to known origins
- Add DB-level constraints (single active term, score ranges, component weight total)
- Resolve the attendance unique-constraint conflict between SQL files
- Link `/admin/bulk-students` from Manage Sections and fix its header title
- Automated / scheduled backups (manual export/restore exists)
- AI: persist summaries, add a batch/class-level view, add prompt/version tracking
- Tests and a migration runner
