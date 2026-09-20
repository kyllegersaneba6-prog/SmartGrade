# Plan: UI Color Updates Implementation

Completing the outstanding border color updates for System Activities.

## Tasks
1. Update `frontend/src/pages/superadmin/SuperAdminDashboard.jsx` (System Activities border).
2. Update `frontend/src/pages/admin/AdminDashboard.jsx` (System Activities border).

## Implementation Details

### 1. `frontend/src/pages/superadmin/SuperAdminDashboard.jsx`
Locate the activity items loop (around line 169):
```jsx
<div key={log.id} className="flex gap-3 p-3 rounded-lg">
```
Change to:
```jsx
<div key={log.id} className="flex gap-3 p-3 rounded-lg border border-blue-500">
```

### 2. `frontend/src/pages/admin/AdminDashboard.jsx`
Locate the activity items loop (around line 167):
```jsx
<div key={log.id} className="flex gap-3 p-3 rounded-lg">
```
Change to:
```jsx
<div key={log.id} className="flex gap-3 p-3 rounded-lg border border-blue-500">
```
