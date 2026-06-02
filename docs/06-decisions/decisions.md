# Decisions

| Decision | Reason | Date |
|---|---|---|
| Supabase for database | Serverless PostgreSQL with easy JS client | 2026-06-02 |
| No TypeScript | Faster development, smaller team | 2026-06-02 |
| No state management library | Simple app, React hooks sufficient | 2026-06-02 |
| Hardcoded API URL in frontend | No need for multi-environment config yet | 2026-06-02 |
| 0/1/2 attendance scoring | Supports Absent/Late/Present with simple math | 2026-06-02 |
| 4-term grading (PRELIMS → FINALS) | Standard Philippine HEI academic calendar | 2026-06-02 |
| End Semester restricted to Superadmin | Critical system action should be controlled by highest role | 2026-06-02 |
| Removed auto term/semester detection | Terms must be explicitly created by superadmin, not guessed from date | 2026-06-02 |
| React Context for teacher state | Eliminates redundant API calls; shared assignment selection across pages | 2026-06-02 |
| localStorage for assignment selection | Survives page refreshes; simple, no extra library needed | 2026-06-02 |
| Closed-term read-only enforced on both ends | Backend 403 + frontend disabled controls prevents accidental edits | 2026-06-02 |
| Subject `course_id = null` for department-wide | Simple nullable column avoids a many-to-many join table | 2026-06-02 |
| Archive mode via frontend term filtering | `GET /api/assignments` already returns all teacher assignments across terms; filtering by viewTerm on frontend avoids extra API calls and keeps the archive UI responsive | 2026-06-02 |
| Assignments are always additive (no "reassign" replace) | The unique constraint `(teacher_id, section_id, subject_id, school_year, semester)` prevents duplicates but allows the same teacher to have multiple subjects/sections; old data is never lost. Frontend UX makes this clear with grouped term views, deletion guards, and data-loss warnings. | 2026-06-02 |
| AdminContext for sharing term/archive state across admin pages | Before `AdminContext`, each admin page fetched `activeTerm` independently and had its own archive toggle logic. `AdminContext` centralizes activeTerm, allTerms, viewTerm, and isArchiveMode — same pattern as `TeacherContext` — eliminating redundant API calls and standardizing archive mode behavior across all admin pages. | 2026-06-02 |
| AdminTeachers assignment filtering by currentTerm | The "Assigned Course" column and View modal filter assignments by `currentTerm` instead of showing all terms at once. This matches the teacher-side UX where assignments are shown per-term, avoids confusion when many terms accumulate, and lets admins clearly see which teachers are active in the current/archive term. The API still returns all assignments; filtering is done in `useMemo` / in the fetch handler so no backend changes are needed. | 2026-06-02 |
| Teacher Settings page for archive management | A dedicated Settings page for teachers provides a clear, non-disruptive way to browse term history and enter/exit archive mode, matching the AdminSettings pattern and reducing clutter in the Dashboard and FloatingAssignmentSelector. | 2026-06-02 |
| Confirmation modal before archive mode entry (moved to TeacherSettings) | Prevents accidental archive mode switching — users must explicitly confirm they want to view a past term in read-only mode. The modal explains the restrictions before committing. Originally in FloatingAssignmentSelector, now only in TeacherSettings to keep the selector focused on assignment switching. | 2026-06-02 |
| TeacherLayout inner component pattern | Wrapping `TeacherLayoutInner` inside `TeacherProvider` (instead of having layout children also wrapped) follows the same pattern as `AdminLayout` and lets the layout directly consume context for the archive banner, eliminating prop drilling. | 2026-06-02 |
| TeacherContext `currentTerm` property | Adding `currentTerm = viewTerm || activeTerm` mirrors `AdminContext` so both contexts expose an identical API for term/archive display in layouts and reusable components. | 2026-06-02 |
| Grade-point scale as documented in `grade-point.md` | The numeric thresholds (98–100%, 95–97%, etc.) and classification remarks (Excellent, Very Good, etc.) are externalized to a doc file and implemented via a `GRADE_RANGES` lookup array. `gradeToPoint` returns a `{ gp, desc }` object so the remarks column shows meaningful descriptions. | 2026-06-02 |
| Activity feed scoped by department username list | Instead of relying on the `department` column in `activity_log` (which can be null/missing for superadmin entries), the admin GET handler queries `staff_users` for usernames in the admin's department and filters `activity_log` by `.in('user_name', ...)`. Superadmin usernames are explicitly subtracted from the list to prevent any cross-role visibility. | 2026-06-02 |
| One admin per department enforced in app code | Rather than a DB-level constraint, the check is done in `POST /api/users` and `PATCH /api/users/:id` routes by querying `staff_users` for an existing admin in the target department. This allows admin reassignment via the superadmin while preventing accidental duplicates. | 2026-06-02 |
