# Implementation Plan - UI Color Updates

The user requested the following UI updates for the "SmartGrade" system:
1.  **System Activities**: Update borders of activity log items to blue.
2.  **Broadcast Notification**: 
    *   Change the urgency radio button accent color to blue.
    *   Change the post notification button background color to blue.

## Proposed Changes

### 1. `frontend/src/pages/superadmin/SuperAdminDashboard.jsx`
- **System Activities Border**: Update the `div` with `className="flex gap-3 p-3 rounded-lg border border-gray-200"` (line 169) to `border-blue-500`.
- **Urgency Radio Button**: Update the `input` class `accent-[#f5a623]` (line 214 and 215) to `accent-blue-500`.
- **Post Notification Button**: Update the inline style `style={{ background: '#1a2233' }}` (line 218) to use a blue background color, e.g., `style={{ background: '#3b82f6' }}`.

### 2. `frontend/src/pages/admin/AdminDashboard.jsx`
- **System Activities Border**: Update the `div` with `className="flex gap-3 p-3 rounded-lg border"` and style `borderColor: '#f0ede6'` (line 167) to `border-blue-500`.

## Verification Plan
- Manually check the dashboard pages after changes to ensure the colors applied are blue and consistent with the design.
