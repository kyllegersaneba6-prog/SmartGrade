# Design System

## Styling Stack

| Tool | Role |
|---|---|
| Tailwind CSS v4 (`@tailwindcss/vite`) | All styling; tokens declared in `src/index.css` under `@theme` |
| `clsx` + `tailwind-merge` | Conditional class merging |
| Lucide React | Icons |
| `@fontsource/inter` | Font (400/500/600/700/800) |

## Color Tokens (`src/index.css`)

| Token | Hex | Usage |
|---|---|---|
| `--color-sidebar` | `#0f172a` | Sidebar base, table header bands |
| `--color-sidebar-hover` | `#1e293b` | Hover/borders |
| `--color-sidebar-active` | `#020617` | Active nav base |
| `--color-gold` | `#fbbf24` | Primary accent, active nav border, gold buttons |
| `--color-gold-hover` | `#d9cf00` | Gold hover |
| `--color-gold-light` | `#ffff99` | Highlight |
| `--color-bg-light` | `#ffffff` | Page background |
| `--color-card` | `#ffffff` | Cards |
| `--color-border` | `#e6e0d4` | Borders |
| `--color-text-main` | `#333333` | Body text |
| `--color-text-muted` | `#6b7280` | Secondary text |
| `--color-green-valid` | `#22c55e` | Success / present |
| `--color-orange-warn` | `#f97316` | Warning / late |
| `--color-red-critical` | `#ef4444` | Danger / absent |

**Hardcoded values in use:**

| Value | Where |
|---|---|
| `#0D1E2D` | Solid background for Admin, Teacher, and Superadmin sidebars and teacher grading table header bands |
| `#FFFFFF` | Solid canvas/card backgrounds for Login, Not Found, and backend-unavailable screens |
| `#0c1925`, `#142a3f` | Primary buttons, focus rings, headings |
| `#0a316a` + `border-gold` | Active sidebar item (`bg-[#24384b]`, `text-amber-300`) |
| `#0c1925` | Dept/term header badges (`text-amber-300`), assigned-teacher year pill |
| `#f5a623`, `amber-300` | Archive chips, "View Archive" |
| `#fbf6eb`, `#fbf8f1` | Cream surfaces (bulk import page, inputs) |
| `#f0ede6`, `#e5e0d5` | Table/input borders |

There is **no per-role color palette**. Admin, teacher, and superadmin share navy + gold; roles are distinguished by navigation and route access only.

## Typography

- Family: **Inter** for everything (`--font-sans`; `--font-mono` also maps to Inter).
- Body: `font-feature-settings: 'cv11', 'ss01'`, `tabular-nums`, antialiased.
- Sizes: `text-[10px]`–`text-[13px]` for labels/table cells, `text-sm` controls, `text-xl`/`text-2xl` titles, `text-2xl`/`text-3xl` metrics.
- Section labels and table headers: uppercase, bold, tight tracking.

## Layout & Spacing

- Page container: `space-y-6 max-w-7xl mx-auto`; settings pages `max-w-3xl`.
- Header `h-16`; page header cards `min-height: 106px` (mobile) / `118px` (`sm+`).
- Role shells use a shared white `h-16` header; desktop sidebars are 224 px wide and collapse to 72 px.
- Card padding `p-4`/`p-5`/`p-6`; grids `gap-4`/`gap-5`/`gap-6`.
- Radius: `rounded-lg` inputs/buttons, `rounded-xl` cards/modals, `rounded-2xl` header cards, `rounded-full` pills, `rounded-3xl` count pills.
- Elevation: `shadow-sm` default; hover `0 4px 12px rgba(0,0,0,0.12)`; modal `0 12px 40px rgba(0,0,0,0.12)`.
- Motion: sidebar `300ms ease-in-out`, dropdown `150ms ease-out`, skeleton shimmer `1.8s linear infinite` (disabled under reduced motion).

## Component Patterns

| Pattern | Implementation |
|---|---|
| Page heading | White `rounded-2xl` card with an uppercase eyebrow, navy title, muted description, and optional count / filter / action chips; Admin, teacher, and superadmin use the same pattern |
| Card | `bg-white rounded-2xl border border-gray-200 shadow-sm`, optional `card-hover`. Behavioral Analytics KPI cards skip `card-hover` and use `.kpi-card` to keep the elevated shadow permanently. Teacher Overview year columns use `auto-rows-fr` + fixed `h-[420px]` for equal expanded height whether or not subjects are assigned; the subject list becomes vertically scrollable at 5+ subjects (`max-h-[17rem]`) |
| Data table | `.table-responsive` wrapper, light-gray header row, uppercase 10–12 px labels, thin gray borders, pagination footer |
| Teacher Accounts table | Replaces pagination with an `overflow-auto` region capped at `min(480px, 60vh)`, all filtered teachers rendered, and opaque `bg-gray-50 sticky top-0` column headers. Search resets vertical scroll; footer shows matching and total teacher counts. Actions use a 20 px Lucide `Bolt` icon; row menus remain portaled and close on scroll |
| Student import ID validation | IDs must match `##-####-###`; invalid rows use the flagged red background and an `Invalid ID (##-####-###)` status badge, with a disabled include checkbox and format guidance above the preview |
| Assigned Subjects modal icon | Header eye icon uses `text-amber-300` on a `bg-amber-300/10` rounded badge, keeping the icon visible against the lightly tinted background |
| Assigned Teachers modal search | Upper-right bordered search input beside the close button, with search/clear icons; header wraps on smaller screens. Filters teacher names, sections, and year levels case-insensitively; resets when the modal opens. Results retain the existing scrollable body and loading/empty states |
| Audit action text | `RATE_LIMITED_LOGIN` uses red `#dc2626`, matching failed-login and delete actions; update actions remain blue and create/success actions remain green |
| Activity feed login icons | Successful- and failed-login icons are black on gray (`#f3f4f6`) circular backgrounds in the Admin and Superadmin dashboards |
| Add Subjects errors | One modal-local `role="alert"` red error block; identical response messages are deduplicated across rows (including closed-term errors). No page-level add-error banner. Partial failures keep the modal open with failed rows only |
| Teacher grade grid | Attendance, My Classes, Class Record, Analytics, and Grade Summary use the page scrollport for vertical movement and sticky table headers. My Classes pins its Class List toolbar at the layout top and places sticky column headers directly beneath it. Attendance pins its three header rows and keeps frozen header cells opaque above student data. Class Record keeps its explicit `<colgroup>` to align frozen student columns and the spanning header, with 1px black separators at component boundaries and below MAX SCORE. |
| Class Record sticky layers | `.class-record-horizontal-anchor` is sticky at `z-index: 20`. The heading wrapper adds `.class-record-heading-anchor` (`z-index: 40`) so the Export dropdown (second item hangs over the toolbar row) stays clickable; without it, later `z-index: 20` toolbar rows swallow the click and only Excel works. |
| Primary button | Navy `#0c1925`/`#142a3f`, white text, `rounded-lg`, hover `scale-105`; global base rule gives every enabled `button`/`[role="button"]`/submit input/`select`/`summary` a pointer cursor (disabled ones get `not-allowed`) |
| Gold button | `#fbbf24` with dark text (Export, Import) |
| Destructive button | `bg-red-600` (disabled `bg-red-300`) + typed `Confirm` |
| Input / select | `bg-gray-100` or `#fbf8f1`, border `#e5e0d5`, `rounded-lg`, focus `ring-2 ring-[#142a3f]` |
| Search input | `border border-gray-900 rounded-lg`, focus `ring-2 ring-[#0c1925] focus:border-[#0c1925]`, leading search icon, trailing clear button when non-empty (Attendance, Teacher Overview, Admin Teacher Accounts) |
| Table row number | `text-gray-900 text-[10px]`, frozen left column, `bg-white` (or `bg-gray-50` on zebra rows), `bg-green-200` when the row is selected — identical in Attendance, Class Record, Analytics, Grade Summary |
| Pills | `rounded-full text-[10px] font-bold uppercase`; amber = active/role, green = open/success, gray = closed, red = critical |
| Settings surfaces | Active term card / active history row: `bg-amber-300 border-amber-200` (badge `bg-amber-100 text-amber-700`); viewing/archive row: `bg-amber-50 border-amber-300 ring-1 ring-amber-300`; inactive row: `bg-gray-50 border-gray-200` |
| Modal | Fixed overlay `rgba(0,0,0,0.6)` + 2 px blur at `z-index: 100` (`.modal-backdrop`, above frozen table columns), `rounded-xl` surface, Escape/outside close |
| Add/Edit grading component modal | All body, label, helper, empty-state, and action text uses `text-gray-900` (disabled subcomponent option adds `opacity-60` instead of a lighter gray). Weight input accepts digits/decimal only and silently caps typed values at the remaining term weight (max 100), so the "no more than" error is not shown. The modal's Add Component/Save Changes button stays enabled with an empty name; clicking it shows "Enter a component name" inside this modal. Component validation/API errors render only inside the modal — no error banner under the Class Record assignment selector |
| Transfer Student modal sizing | `max-w-lg w-full min-w-0`, `h-[520px] max-h-[90dvh]`; non-shrinking header/footer with a `min-h-0 flex-1 overflow-y-auto` body so lookup states do not resize the dialog |
| Transfer Student ID focus | Matching navy border and 2 px inset focus ring (`focus:ring-inset`) keep the focus indicator inside the input, avoiding clipping/overlap at the scrollable body's edges |
| Transfer Student search loading | Modal-relative `absolute inset-0` flex centering, a navy `LoaderCircle` rotating continuously every 1000 ms (slowed to 2 s under reduced motion) and `role="status"` message; no duplicate inline loader or student/destination panels while searching. Overlay is pointer-events-none, so ID correction and Cancel remain available |
| Dropdown | Custom trigger with icon tile, optional search, `max-h-56` scroll panel, check mark on selection. Sublabels default to `text-gray-400`; `sublabelClassName` overrides them (Attendance session uses `text-gray-900` for "Morning session" / "Afternoon session"). Teacher assignment-selector triggers use `.shadow-elevated` permanently |
| Teacher term tabs | Segmented `bg-bg-light border border-border rounded-lg p-1` container with `shadow-elevated`; selected tab `bg-[#0c1925] text-white shadow-sm` |
| Empty state | Centered icon at 30% opacity + short title + hint |
| Backend unavailable | App-wide fixed `inset-0 z-[1000]` solid-white screen; centered `max-w-lg rounded-2xl` white status card, server-off icon in `#0D1E2D` on a `bg-gray-50 border-gray-800` badge, dark title, gray-600 message, amber **Try Again** button; mounted routes hidden/inert underneath |
| Skeleton | `.skeleton-shimmer` blocks; presets in `components/common/Skeleton.jsx` |
| Pagination | `components/common/Pagination.jsx` — range label with configurable item label, ellipsis, prev/next; hidden at one page |
| Read-only notice | Amber banner "This term is closed. Viewing only." |
| Archive banner | `bg-amber-600/90 text-white`, Archive icon, "Exit Archive" |
| Clamp warning | Amber border + dot for 3 s when a score/weight is clamped |
| Course selection required tooltip | Dark tooltip (`bg-gray-800 text-white text-[10px] rounded`) shown above Add button (`Please select a course first`) for 1 s along with a 1-second red ring on the courses dropdown on click in Sections and Subjects |

## Grade Color Coding

| Element | Rule |
|---|---|
| Grade value | `≥ 75` green, `< 75` red |
| Grade point | `≤ 2.00` green, `≤ 3.00` amber, else red |
| Attendance cells | `2` green, `1` yellow/amber, `0` red |
| Trend icon | improving green ↗, declining red ↘, stable gray → |

## Responsive Rules

- Sidebar off-canvas below `lg` (`-translate-x-full` + overlay); fixed above.
- Tables scroll horizontally rather than collapsing.
- Header metadata truncates or hides (`hidden sm:flex`).
- Dashboard grids: 1–2 columns → 3–4 at `md`/`lg`.

## Known Inconsistencies

- `audit.jsx` role tags give admin and teacher nearly identical gold; the admin value also contains stray spaces.
- `SuperAdminUsers.jsx` declares an unused violet role color.
- `--color-bg-light` is white, though older docs/changelog mention a pearl (`#F0EAD6`) background.
