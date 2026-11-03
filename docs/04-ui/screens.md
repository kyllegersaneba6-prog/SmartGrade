# UI Screens

## Backend Availability (All Routes)

- Shared `components/common/BackendAvailability.jsx`, outside the router via `main.jsx`; no dedicated URL.
- Covers Login, all role pages, and Not Found while the backend health check fails. Full-screen white/gray gradient, SmartGrade logo, server-off icon with left-to-right navy gradient strokes (`#0c1925 → #102132 → #142a3f`) on a `bg-gray-50` badge with a `border-gray-800` border, centered status card.
- Title: **Service Unavailable**.
- Paragraph: **The service could not be started. We're unable to process your request at this time.**
- **Try Again** becomes **Checking Connection...** during a probe. Automatic checks run every 5 s and on focus/online; initial pending connection uses **Connecting to Service** with a spinner.
- Startup routes wait for health. Later outages hide/inert mounted pages instead of resetting forms; recovery restores the same route/session without a browser reload or automatic write replay.

## Login (`/login`)

Public. Two-column split:

- **Left (form):** `linear-gradient(135deg, #FFFFFF 0%, #F3F6FA 50%, #E2E8F0 100%)` canvas and form card (same gradient) with `rounded-2xl` and a borderless, clearly visible shadow (`0 18px 50px -10px rgba(71,85,105,0.45)`); logo, `SmartGrade` title in `#0c1925`, "Academic Management System", username (`User` icon), password (`Lock` icon + show/hide), amber **Sign In**, "Institutional Access Only". Inputs are `bg-gray-50` with `#0c1925` focus rings; errors use `bg-red-50`/`border-red-200`.
- **Right (hero, `lg+` only):** blurred `STI_Background.png` with brand lockup ("Academic Management System") and the five feature blocks (Grade Computation & Analytics, Attendance Tracking, Class & Teacher Management, Performance Reports, AI Student Summary) placed directly on the photo (no card/panel behind them); feature icons carry a thin black outline (`.stroke-icon`), "© 2026 SmartGrade Educational Systems."
- Login network failures trigger the shared health check. The global unavailable screen takes over if that fails; the existing inline connection message can appear while the check is pending. Database/offline errors from a reachable API stay page-local.
- Invalid-password errors include the backend-calculated remaining attempt count, e.g. **Invalid password. 4 attempts remaining.** The smallest remaining username/account/IP allowance is shown; at zero the message also says **Please try again later.** The existing rate-limit error appears on subsequent blocked requests; there is no browser-local attempt counter.
- Redirect: teacher → `/teacher/overview`, admin → `/admin`, superadmin → `/superadmin`.
- After Phase 1 deployment, old tokens require login again. Password/security-field changes or account deletion trigger the existing 401 redirect on the next API call; missing department is a 403, not a forced logout.

## Not Found (`*`)

Standalone page (no app shell) rendered for any unmatched URL, including unknown child routes such as `/admin/typo`.

- Page and card share `linear-gradient(135deg, #FFFFFF 0%, #F3F6FA 50%, #E2E8F0 100%)` (same as Login); the card has no border and uses a visible gray shadow `0 18px 50px -10px rgba(71,85,105,0.45)`.
- Logo, `SmartGrade` title in `#0c1925`, search-off icon in an amber-100 tile, large `404` in `#0c1925`, "Page not found", and the attempted path in a `bg-gray-100` code chip.
- Primary button ("Go to dashboard" for admin/superadmin, **"Go to overview"** for teachers → `/teacher/overview`, "Go to login" when signed out) is amber-300 with `#0c1925` text; secondary "Go back" is a white button with a `gray-300` border.

## Superadmin Pages

| Route | Component | Description |
|---|---|---|
| `/superadmin` | `SuperAdminDashboard` | Four metrics (Total Accounts, Faculty Members, Admin Accounts, Audit logs), Department User Overview table, recent activity feed, Broadcast Notification form (not wired) |
| `/superadmin/audit` | `Audit` (`audit.jsx`) | Critical alerts / total events, filterable audit trail (All, Created, Updated, Deleted, Failed Logins, Successful Logins), sticky column header, 50 logs per page, animated 500ms scroll back to the audit section top on page changes, 10 s auto-refresh |
| `/superadmin/admins` | `SuperAdminUsers` | Admin accounts table, add/edit/delete (typed `Confirm`), "No Active Term" gate before creating |
| `/superadmin/admins/create` | `CreateSuperAdminUser` | Full-screen create-admin form: staff ID, names, department (departments with an admin are disabled), read-only username |
| `/superadmin/departments` | `ManageDepartments` | Department accordions with nested course CRUD, abbreviation editing, typed-confirm deletes |
| `/superadmin/settings` | `SuperAdminSettings` | Term lifecycle (Create Term, End Semester) + `BackupRestore` panel |

`CreateSuperAdminUser` is also used as a modal from `/superadmin/admins`; when opened as a direct route, Cancel and Done navigate back to `/superadmin/admins`.

## Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Welcome header, Total Teachers / Courses / Activity metrics, Teacher Overview with subject counts, Recent Activities feed |
| `/admin/teachers` | `AdminTeachers` | Scrollable teacher table (ID, Name, Username, Assigned Course, Actions) with sticky column headers, all matching teachers displayed, and no pagination; scroll height capped at `min(480px, 60vh)`. Add Teacher button followed by a search bar (filters by ID, name, or username and resets vertical scroll); matching/total teacher count, row menu (Assign, View Assigned, Edit, Delete); assignment modals with Active/Historical grouping |
| `/admin/teachers/create` | `CreateAdminTeacher` | Full-screen create-teacher form with auto-generated username preview |
| `/admin/sections` | `AdminSections` | Course + year filters; sections panel (**+ Add** with course-selection validation tooltip and **Transfer student** modal with student ID lookup, read-only student info summary, and target year/section selection), delete, labels shown as `BSCS-1A`; roster panel (Add Student, Add Multiple, Import, pagination); Excel import preview |
| `/admin/subjects` | `AdminSubjects` | Course + semester filters; four year-level columns; Add Subject with course-selection validation tooltip and 1-second course dropdown red-border alert; add multiple subjects; Assigned Teachers modal with an upper-right search field (teacher name, section, or year level), clear button, and no-matches state; delete |
| `/admin/bulk-students` | `BulkStudentImport` | Excel-template builder (`firstname`, `lastname`, `middle initial`, `student id`, `gender`); downloads blank or filled `.xlsx`; shared admin shell shows its route title |
| `/admin/settings` | `AdminSettings` | Active term card, term history, archive entry/exit with confirmation modal |

Admin pages use the shared white page heading and bordered card/table styling from the Teacher and Superadmin interfaces. Existing page actions, filters, forms, archive controls, and data behavior are unchanged.

Notes:
- Manage Subjects add errors (including **This term is closed. No modifications allowed.**) appear only inside the Add Subjects modal, not on the page behind it. Repeated identical messages from multiple subject rows appear once. If only some rows succeed, the modal stays open with failed rows for correction/retry; successful rows are already added to the board.
- Manage Sections import only accepts Student IDs in `##-####-###` format (e.g. `26-1234-001`). Uploaded-file and manual-grid previews mark invalid IDs in red, show an invalid-format count, and disable their include checkboxes; **Select all** excludes them. Submit and the bulk API validate the format again. Existing students are not changed.
- The Transfer Student modal keeps the same `max-w-lg` width and 520 px height for empty, searching, found, not-found, error, and success states. Height is capped at 90% of the dynamic viewport; only the body scrolls, keeping the header and action buttons visible.
- Its Student ID input uses a navy border and inset focus ring, so clicking or keyboard-focusing it does not draw a ring outside the field into the scrollable body's edges.
- A matched complete Student ID shows a continuously rotating spinner (1000 ms per turn, slowed to 2 s under reduced motion) and "Searching student..." at the modal's center while destinations load. Student Information and Destination are hidden until that lookup finishes; old responses are ignored after changing the ID/year or closing the modal. Actual transfer submission uses the separate "Transferring..." button state, not the search indicator.
- Teacher/course/section/subject choices are scoped by the backend. A direct request cannot grant foreign access; account role/username/creator edits are not supported. Student transfers require owned, same-department source and destination sections in the active term.
- `/admin/bulk-students` is not linked from the sidebar.
- `CreateAdminTeacher` is also used as a modal from `/admin/teachers`; when opened as a direct route, Cancel and Done navigate back to `/admin/teachers`.

## Teacher Pages

| Route | Component | Description |
|---|---|---|
| `/teacher`, `/teacher/overview` | `TeacherOverview` | Welcome header, assigned subjects in four year-level columns (1st–4th Year, each with a count and an empty state), archive chip + Exit Archive when browsing. All four columns use `auto-rows-fr` with a fixed `h-[420px]`, so filled and empty years share the same expanded height; the subject list scrolls vertically once 5 or more subjects are assigned (`max-h-[17rem]`) |
| `/teacher/attendance` | `Attendance` | Term tabs, Add Date (date + AM/PM + LEC/LAB; session sublabels "Morning session" / "Afternoon session" are `text-gray-900`), attendance matrix, 0/1/2 entry, autosave, delete column (the `X` sits above the date to save width; no export button) |
| `/teacher/class-record` | `ClassRecord` | Term tabs, component builder (presets, weights, attendance component, activities, drag reorder; add/edit component modal uses `text-gray-900` for all gray text and caps weight input at the remaining term weight (max 100) without the "no more than" error, the modal's Add Component/Save Changes button stays enabled and shows "Enter a component name" on click when the name is empty; component errors render only inside this modal, with no page-level error banner under the assignment selector; **Copy from PRELIMS** only in MIDTERMS/PRE-FINALS/FINALS while that term has no components; empty table shows a message only, no Add Component button), wide score matrix with TOTAL / EQUIV / W_TOTAL / final grade column labelled `PRELIM GRADE`, `MIDTERM GRADE`, `PRE-FINAL GRADE`, or `FINAL GRADE` per selected term, Excel + PDF export (export disabled with an inline reason until component weights total 100%). The assignment selector row matches Attendance/Analytics/Grade Summary and its popover paints above the grid (`z-[100]`). |
| `/teacher/analytics` | `BehavioralAnalytics` | Four KPI cards with a permanent elevated shadow (shared `.kpi-card` class, no hover change), sortable student table (per-component EQUIV, performance, submission %, final grade, attendance, trend), student modal with AI summary (no Excel/PDF export button). AI button text/icon use `amber-300`. |
| `/teacher/grade-summary` | `GradeSummary` | Per-term grade + G.P., semestral grade/G.P./remarks, grade-point legend (numeric 1.00–5.00 only; DRP/P/F hidden), horizontal scroll, Excel + PDF export. Uses the shared `TEACHER_TABLE_PAGE_SIZE` pagination. |
| `/teacher/settings` | `TeacherSettings` | Active term card, term history, archive confirmation modal, Exit Archive |

Shared teacher-page elements:
- **Floating Assignment Selector** — assignment switching only; no term selection or archive entry. Its trigger keeps a permanent elevated shadow (`.shadow-elevated`) on every teacher page.
- **Term tabs** — PRELIMS / MIDTERMS / PRE-FINALS / FINALS, wrapped in a bordered segmented control that also keeps a permanent elevated shadow (`.shadow-elevated`).
- **Read-only state** for closed terms: inputs disabled, mutate buttons hidden, banner "This term is closed. Viewing only."
- **Amber archive banner** from `TeacherLayout` when a past term is being viewed.
- **Pinned grade-grid header** — Grade Summary uses the `.table-scroll` wrapper (`max-height: min(480px, 60vh)`, scrolls both axes) with a sticky `<thead>`. Attendance and Class Record use page scrolling vertically and horizontal scrolling for wide tables. Attendance pins its three header rows with opaque frozen student columns. In Class Record, fixed `<colgroup>` widths keep the frozen student columns aligned with the "STUDENT INFORMATION" header, which layers above component headers; the heading, controls, alerts, and pagination stay anchored while the wide grid moves horizontally. Analytics has no inner vertical table scroll.

## Screen States

| State | Where |
|---|---|
| Skeleton loading (header/metrics/table/list/grid) | Dashboards, sections, settings, users |
| Empty state with icon at 30% opacity | Tables, feeds, assigned-classes grids |
| Typed confirmation (`Confirm` / `CONFIRM` / `FULL RESTORE`) | Deletes, end semester, restore |
| Amber clamp warning (3 s) | Attendance and Class Record score/weight inputs |
| Success banner | Create-account pages, broadcast form (local only) |
| No active term | Settings pages, teacher dashboard, Add Admin gate |
