# Design System

## Styling

- **Framework:** Tailwind CSS v4
- **Plugin:** `@tailwindcss/vite`
- **Utility helpers:** `clsx` + `tailwind-merge` for conditional class merging
- **Icons:** Lucide React

## Layout

- All layouts use a fixed sidebar + header + scrollable main content area
- Sidebar is collapsible via a hamburger toggle on mobile
- Sidebar nav links use `whitespace-nowrap` to prevent text wrapping on long item names
- Content area uses `flex-1 overflow-y-auto p-6`
- Header shows page title, active term badge, and a reload button

## Common UI Patterns

| Pattern | Implementation |
|---|---|
| Data tables | HTML `<table>` with Tailwind styling (striped rows, sticky headers) |
| Forms | Standard `<input>`, `<select>`, `<textarea>` with Tailwind |
| Buttons | `<button>` with Tailwind classes (blue primary, red danger, gray secondary) |
| Modals | Custom modal overlay with backdrop blur and close on Escape/outside click |
| Cards | `bg-white rounded-lg shadow-sm border p-4` |
| Tabs | Button group with active underline style |
| Badges | `px-2 py-0.5 rounded-full text-xs font-medium` with role-specific colors |
| Pagination | Page number buttons with prev/next, ellipsis for large ranges, "Showing X–Y of Z" label, resets to page 1 on search |
| Loading | Inline spinner or skeleton-like states |
| Empty state | "No data available" message with optional icon |
| Amber warning banner | `bg-amber-50 border-amber-200 text-amber-700` with alert icon, used for closed-term read-only notice |
| Amber archive badge | `bg-amber-500/20 border-amber-400/30 text-amber-300` with Archive icon, shown in header when browsing past terms |
| Amber pill button | `bg-amber-50 border-amber-300 text-amber-700` for archive-mode button states |
| Amber archive layout banner | `bg-amber-600/90 text-white` with Archive icon and Exit Archive button, rendered in TeacherLayout above the main content |
| Amber "Viewing" badge | `bg-amber-100 text-amber-700` — "Viewing" label on currently viewed archive term row in TeacherSettings |
| Confirmation modal | Fixed overlay with backdrop blur, Archive icon header, explanation text, and Cancel + View Archive buttons — used in TeacherSettings before entering archive mode |
| Floating selector | Inline dropdown button with icon + label + badge, rendered at top of teacher pages for assignment switching, lists filtered assignments from TeacherContext — no term-selection or archive features |
| Grade point scale legend table | Three-column table (Grade / Equivalent / Description) rendered below the grade summary table with `border-collapse` and row lines |

## Color Scheme (Tailwind defaults)

- Primary: `blue-600` / `blue-700`
- Success: `green-500` / `green-600`
- Danger: `red-500` / `red-600`
- Warning: `yellow-500`
- Background: pearl (`#F0EAD6`, token `--color-bg-light`)
- Cards: `white`
- Text: `gray-900` / `gray-600`
