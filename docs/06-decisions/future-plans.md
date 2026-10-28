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

- Finish centralizing API calls (base URL is now configurable via `VITE_API_BASE_URL`; pages still call the thin `utils/api.js` wrapper directly)
- Frontend error boundary for unexpected render failures (backend returns JSON 404s; unknown routes now render the 404 page)
- Centralize write-side ownership checks into shared middleware/services (read helpers live in `backend/middleware/access.js`; term locks now live in `backend/middleware/termLock.js`)
- Restrict CORS to known origins
- Link `/admin/bulk-students` from Manage Sections; its route title is already fixed
- Automated / scheduled backups (manual export/restore exists)
- AI: persist summaries, add a batch/class-level view, add prompt/version tracking
- Tests and a migration runner
