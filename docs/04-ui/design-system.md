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
| `linear-gradient(to right, #0c1925, #102132, #142a3f)` | Sidebars, headers, page-header cards, login panel, table headers |
| `#0c1925`, `#142a3f` | Primary buttons, focus rings, headings |
| `#0a316a` + `border-gold` | Active sidebar item |
| `#f5a623`, `amber-*` | Archive chips, year pills, "View Archive" |
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
- Card padding `p-4`/`p-5`/`p-6`; grids `gap-4`/`gap-5`/`gap-6`.
- Radius: `rounded-lg` inputs/buttons, `rounded-xl` cards/modals, `rounded-2xl` header cards, `rounded-full` pills, `rounded-3xl` count pills.
- Elevation: `shadow-sm` default; hover `0 4px 12px rgba(0,0,0,0.12)`; modal `0 12px 40px rgba(0,0,0,0.12)`.
- Motion: sidebar `300ms ease-in-out`, dropdown `150ms ease-out`, skeleton shimmer `1.8s linear infinite` (disabled under reduced motion).

## Component Patterns

| Pattern | Implementation |
|---|---|
| Page header card | Navy gradient, white title, amber subtitle, optional count pill / action button |
| Card | `bg-white rounded-xl border border-gray-50 shadow-sm`, optional `card-hover` |
| Data table | `.table-responsive` wrapper, uppercase 10–12 px headers, warm thin borders, pagination footer |
| Primary button | Navy `#0c1925`/`#142a3f`, white text, `rounded-lg`, hover `scale-105` |
| Gold button | `#fbbf24` with dark text (Export, Import) |
| Destructive button | `bg-red-600` (disabled `bg-red-300`) + typed `Confirm` |
| Input / select | `bg-gray-100` or `#fbf8f1`, border `#e5e0d5`, `rounded-lg`, focus `ring-2 ring-[#142a3f]` |
| Pills | `rounded-full text-[10px] font-bold uppercase`; amber = active/role, green = open/success, gray = closed, red = critical |
| Modal | Fixed overlay `rgba(0,0,0,0.6)` + 2 px blur, `rounded-xl` surface, Escape/outside close |
| Dropdown | Custom trigger with icon tile, optional search, `max-h-56` scroll panel, check mark on selection |
| Empty state | Centered icon at 30% opacity + short title + hint |
| Skeleton | `.skeleton-shimmer` blocks; presets in `components/common/Skeleton.jsx` |
| Pagination | `components/common/Pagination.jsx` — range label, ellipsis, prev/next; hidden at one page |
| Read-only notice | Amber banner "This term is closed. Viewing only." |
| Archive banner | `bg-amber-600/90 text-white`, Archive icon, "Exit Archive" |
| Clamp warning | Amber border + dot for 3 s when a score/weight is clamped |

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

- `SecurityAudit.jsx` role tags give admin and teacher nearly identical gold; the admin value also contains stray spaces.
- `SuperAdminUsers.jsx` declares an unused violet role color.
- `--color-bg-light` is white, though older docs/changelog mention a pearl (`#F0EAD6`) background.
