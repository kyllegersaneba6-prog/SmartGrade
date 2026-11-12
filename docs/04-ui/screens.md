# UI Screens

## Backend Availability (All Routes)

- Shared `components/common/BackendAvailability.jsx`, outside the router via `main.jsx`; no dedicated URL.
- Covers Login, all role pages, and Not Found while the backend health check fails. Full-screen solid-white canvas and status card; server-off icon in `#0D1E2D` on a `bg-gray-50` badge with a `border-gray-800` border. No gradient background.
- Title: **Service Unavailable**.
- Paragraph: **The service could not be started. We're unable to process your request at this time.**
- **Try Again** becomes **Checking Connection...** during a probe. Automatic checks run every 5 s and on focus/online; initial pending connection uses **Connecting to Service** with a spinner.
- Startup routes wait for health. Later outages hide/inert mounted pages instead of resetting forms; recovery restores the same route/session without a browser reload or automatic write replay.

## Login (`/login`)

Public. Two-column split:

- **Left (form):** `gray-200` (`#e5e7eb`) area around the `gray-100` (`#f3f4f6`) `rounded-xl` form card, which has dark text and a visible gray shadow; logo, username (`User` icon), password (`Lock` icon + show/hide), amber **Sign In**, "Institutional Access Only". Username and password inputs are white with `#0c1925` focus rings; errors use `bg-red-50`/`border-red-200`. The page is constrained to viewport height; the form column scrolls internally only when content exceeds a short viewport, while the right hero panel remains fixed without its own scrollbar. No gradient background.
- **Right (hero, `lg+` only):** blurred `STI_Background.png` with brand lockup ("Academic Management System") and the five feature blocks (Grade Computation & Analytics, Attendance Tracking, Class & Teacher Management, Performance Reports, AI Student Summary) placed directly on the photo (no card/panel behind them); feature icons carry a thin black outline (`.stroke-icon`), "© 2026 SmartGrade Educational Systems."
- Login network failures trigger the shared health check. The global unavailable screen takes over if that fails; the existing inline connection message can appear while the check is pending. Database/offline errors from a reachable API stay page-local.
- Invalid-password errors include the backend-calculated remaining attempt count, e.g. **Invalid password. 4 attempts remaining.** The smallest remaining username/account/IP allowance is shown; at zero the message also says **Please try again later.** The existing rate-limit error appears on subsequent blocked requests; there is no browser-local attempt counter.
- Redirect: teacher → `/teacher/overview`, admin → `/admin`, superadmin → `/superadmin`.
- After Phase 1 deployment, old tokens require login again. Password/security-field changes or account deletion trigger the existing 401 redirect on the next API call; missing department is a 403, not a forced logout.

## Not Found (`*`)

Standalone page (no app shell) rendered for any unmatched URL, including unknown child routes such as `/admin/typo`.

- Page and card use solid white backgrounds with a visible gray shadow; no gradient background.
- Logo, dark `SmartGrade` title, search-off icon in an amber-100 tile, large dark `404`, "Page not found", and the attempted path in a `bg-gray-100` code chip.
- Primary button ("Go to dashboard" for admin/superadmin, **"Go to overview"** for teachers → `/teacher/overview`, "Go to login" when signed out) is amber-300 with `#0c1925` text; secondary "Go back" is white with a `gray-300` border.

## Superadmin Pages

| Route | Component | Description |
|---|---|---|
| `/superadmin` | `SuperAdminDashboard` | Four metrics (Total Accounts, Faculty Members, Admin Accounts, Audit logs), Department User Overview table, recent activity feed, and a broadcast form for sending in-app notifications to selected Admin/Teacher roles |
| `/superadmin/audit` | `Audit` (`audit.jsx`) | **System Audit Logs** heading, black Superadmin role badge, Admin role badge in `#0D1E2D` with white text, Teacher role badge with black text on gray `#e5e7eb`, metrics for Critical Alerts, Total Logged Events, and Teacher Data Exports (with XLSX/PDF counts, independent of search/filter); search across timestamp/user/role/action/details plus action filters (All, Created, Updated, Deleted, Import, Export, Failed Logins, Successful Logins, Backup, Notification); search and filter reset pagination; sticky column header, 50 logs per page, animated 500ms scroll back to the audit section top on page changes, 10 s auto-refresh |
| `/superadmin/admins` | `SuperAdminUsers` | Admin accounts table with ID, name, username, department, date added, and actions; all accounts display without pagination. IDs are bold monospace, names use regular weight, and account details use `text-gray-900` while the empty state remains `text-gray-500`. Edit Admin modal uses a `gray-100` surface and white fields. Admin deletion requires the acting superadmin's current password; Staff ID is read-only and Department is disabled while editing; "No Active Term" gate before creating |
| `/superadmin/admins/create` | `CreateSuperAdminUser` | Create-admin modal uses a `gray-100` surface with white form fields; includes staff ID, names, read-only username preview, department (departments with an admin are disabled), and password. The success modal uses the same surface and a white read-only username field |
| `/superadmin/departments` | `ManageDepartments` | Department management only; page title is “Departments.” Add Department uses the fixed CICT/CAS/CED/COE/CBMA/CHTM/CCJE list, fills the abbreviation from the selected option, and shows existing departments as dark disabled choices; department deletion is blocked while Admin or Teacher accounts are assigned; typed-confirm deletes. Course records remain in the database and are matched or created by class-list imports, with no manual course CRUD UI. |
| `/superadmin/settings` | `SuperAdminSettings` | Term lifecycle (Create Term, End Semester) + `BackupRestore` panel |

`CreateSuperAdminUser` is also used as a modal from `/superadmin/admins`; when opened as a direct route, Cancel and Done navigate back to `/superadmin/admins`.

## Admin Pages

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminDashboard` | Welcome header, Total Teachers / Total Teacher Exports (with XLSX/PDF counts) / Activity metrics, Teacher Overview with usernames and each teacher's unique section/subject/term class count, Recent Activities feed with a visible Filter control for Created, Updated, Deleted, and login events |
| `/admin/teachers` | `AdminTeachers` | Teacher account table (ID, Name, Username, Date Added) paginated at 10 teachers per page, with Add, Search, Edit, and Delete; deletion requires the acting admin's current password; search resets to page 1. Edit Teacher modal uses a `gray-100` surface and white fields; Staff ID is read-only while editing; admins do not browse or assign classes |
| `/admin/teachers/create` | `CreateAdminTeacher` | Create-teacher modal uses a `gray-100` surface with white form fields and an auto-generated username preview; the success modal uses the same surface and a white read-only username field |
| `/admin/settings` | `AdminSettings` | Export signatory fields (BSIT program head, BSCS program head, CICT dean); Save shows a spinning loader and “Saving…” while the update is pending; active term card, term history, archive entry/exit with confirmation modal |

Admin pages use the shared white page heading and bordered card/table styling from the Teacher and Superadmin interfaces. Section and subject setup now happens when the teacher imports the official class-list PDF in My Classes.

Notes:
- Teacher/course/section/subject choices are scoped by the backend. A direct request cannot grant foreign access; account role/username/creator edits are not supported.
- `CreateAdminTeacher` is also used as a modal from `/admin/teachers`; when opened as a direct route, Cancel and Done navigate back to `/admin/teachers`.

## Teacher Pages

| Route | Component | Description |
|---|---|---|
| `/teacher`, `/teacher/overview` | `TeacherOverview` | Welcome header, assigned subjects in four year-level columns with bold year labels and counts (1st–4th Year, each with an empty state) inside a `border-gray-300` grid with `shadow-lg`; columns grow with their subject cards and use the page scrollport without an inner list scrollbar. Year headers stay sticky while scrolling. Layout uses one column on mobile, two on tablets, and four on wide desktop. Vertical year dividers and sticky-header rules use `border-gray-200`; subject-card and outer borders use `border-gray-300`. Archive chip + Exit Archive when browsing. |
| `/teacher/attendance` | `Attendance` | Term tabs, Add Date (date + AM/PM + LEC/LAB; session sublabels "Morning session" / "Afternoon session" are `text-gray-900`), attendance matrix, 0/1/2 entry, autosave, delete column (the `X` sits above the date to save width; no export button) |
| `/teacher/class-record` | `ClassRecord` | Term tabs, component builder (presets, weights, attendance component, subcomponent Add menu with `Sub-Comp` and Attendance choices, drag reorder; add/edit component modal uses `text-gray-900` for all gray text and caps weight input at the remaining term weight (max 100) without the "no more than" error, the modal's Add Component/Save Changes button stays enabled and shows "Enter a component name" on click when the name is empty; component errors render only inside this modal, with no page-level error banner under the assignment selector; **Copy from previous term** is offered only when the target is empty and the immediately preceding term has components; empty table shows a message only, no Add Component button), wide score matrix with TOTAL / EQUIV / W_TOTAL / final grade column labelled `PRELIM GRADE`, `MIDTERM GRADE`, `PRE-FINAL GRADE`, or `FINAL GRADE` per selected term, Excel + PDF export (export disabled with an inline reason until component weights total 100%; successful generation records safe audit metadata). The assignment selector row matches Attendance/Analytics/Grade Summary and its popover paints above the grid (`z-[100]`). |
| `/teacher/my-class-list` | `MyClassList` | Shows existing section rosters with a sticky `#0D1E2D` table header and imports a class-list PDF into a new or existing section, subject, and teacher assignment for the active term. Text-based official PDFs are parsed locally into an editable preview; incoming rows are labeled Verified or Already listed, existing roster students absent from an updated PDF are labeled Missing without being removed, invalid/duplicate rows are flagged, and archived terms are read-only. |
| `/teacher/analytics` | `BehavioralAnalytics` | Four KPI cards with a permanent elevated shadow (shared `.kpi-card` class, no hover change); Overall Submission Rate, Overall Attendance Rate, and Overall Performance values are green at 75%+, amber from 60% to below 75%, and red below 60%. Sortable student table (per-component EQUIV, performance, submission %, final grade, attendance, trend), student detail modal with **Summarize** AI action and per-component Sub-Comp Score/linear-regression charts when at least two scored non-attendance activities exist. Student-detail Submitted rates exclude Attendance; attendance-only components show `—` for Submitted. Component weight labels use `Weight (value%)` in `text-gray-900` (no Excel/PDF export button). AI button text/icon use `amber-300`. |
| `/teacher/grade-summary` | `GradeSummary` | Per-term grade + G.P., semester grade/G.P./remarks, grade-point legend (numeric 1.00–5.00 only; DRP/P/F hidden), horizontal scroll, Excel + PDF export (successful generation records safe audit metadata). Uses the shared `TEACHER_TABLE_PAGE_SIZE` pagination. |
| `/teacher/settings` | `TeacherSettings` | Active term card, term history, archive confirmation modal, Exit Archive |

Shared teacher-page elements:
- **Floating Assignment Selector** — assignment switching only; no term selection or archive entry. Its trigger keeps a permanent elevated shadow (`.shadow-elevated`) on every teacher page.
- **Term tabs** — PRELIMS / MIDTERMS / PRE-FINALS / FINALS, wrapped in a bordered segmented control that also keeps a permanent elevated shadow (`.shadow-elevated`).
- **Read-only state** for closed terms: inputs disabled, mutate buttons hidden, banner "This term is closed. Viewing only."
- **Amber archive banner** from `TeacherLayout` when a past term is being viewed.
- **Pinned teacher table headers** — Attendance, My Classes, Class Record, Analytics, and Grade Summary use page scrolling vertically, with sticky table headers that remain pinned as rows move. In My Classes, the Class List toolbar sticks at the layout top and the column headers stay immediately beneath it. Attendance pins its three header rows with opaque frozen student columns. Class Record keeps fixed `<colgroup>` widths to align frozen student columns and the "STUDENT INFORMATION" header.

## Screen States

| State | Where |
|---|---|
| Skeleton loading (header/metrics/table/list/grid) | Dashboards, sections, settings, users |
| Empty state with icon at 30% opacity | Tables, feeds, assigned-classes grids |
| Typed confirmation (`Confirm` / `CONFIRM` / `FULL RESTORE`) | Deletes, end semester, restore |
| Amber clamp warning (3 s) | Attendance and Class Record score/weight inputs |
| Success banner | Create-account pages, broadcast form (local only) |
| No active term | Settings pages, teacher dashboard, Add Admin gate |
