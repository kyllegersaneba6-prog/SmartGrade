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
- Frontend 404 page + catch-all route in `App.jsx` (backend now returns JSON 404s)
- Centralize write-side ownership checks into shared middleware/services (read helpers live in `backend/middleware/access.js`; term locks now live in `backend/middleware/termLock.js`)
- Restrict CORS to known origins
- Link `/admin/bulk-students` from Manage Sections and fix its header title
- Automated / scheduled backups (manual export/restore exists)
- AI: persist summaries, add a batch/class-level view, add prompt/version tracking
- Tests and a migration runner
