# API Routes

All routes are mounted under `http://localhost:5000`. Authentication via JWT Bearer token.

## Auth

| Method | Route             | Auth   | Description        |
| ------ | ----------------- | ------ | ------------------ |
| POST   | `/api/auth/login` | Public | Login, returns JWT |

## Users

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Token | List users (filtered by role) |
| POST | `/api/users` | Token | Create user |
| PATCH | `/api/users/:id` | Token | Update user |
| DELETE | `/api/users/:id` | Token | Delete user |

## Departments

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/departments` | Token | List departments |
| POST | `/api/departments` | Superadmin | Create department |
| PATCH | `/api/departments/:id` | Superadmin | Update department |
| DELETE | `/api/departments/:id` | Superadmin | Delete department |

## Courses

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/courses` | Token | List courses |
| POST | `/api/courses` | Superadmin | Create course |
| PATCH | `/api/courses/:id` | Superadmin | Update course |
| DELETE | `/api/courses/:id` | Superadmin | Delete course |

## Sections

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/sections` | Token | List sections |
| POST | `/api/sections` | Admin | Create section |
| DELETE | `/api/sections/:id` | Admin | Delete section |
| GET | `/api/sections/:sectionId/students` | Token | List students in section |
| POST | `/api/sections/:sectionId/students` | Admin | Add student(s) |
| DELETE | `/api/sections/students/:studentId` | Admin | Delete student |
| POST | `/api/sections/seed` | Admin | Seed sample students |

## Subjects

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/subjects` | Token | List subjects |
| POST | `/api/subjects` | Admin | Create subject |
| DELETE | `/api/subjects/:id` | Admin | Delete subject |

## Teacher Assignments

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/assignments` | Token | List assignments |
| POST | `/api/assignments` | Admin | Create assignment |
| DELETE | `/api/assignments/:id` | Admin | Delete assignment |

## Academic Terms

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/terms` | Token | List all terms |
| GET | `/api/terms/active` | Token | Get active term (404 if none) |
| POST | `/api/terms/create` | Superadmin | Create initial active term |
| POST | `/api/terms/end` | Superadmin | End active term, open next |

## Grading Components

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/grading-components` | Token | List components |
| POST | `/api/grading-components` | Teacher | Create component (403 if term closed) |
| PUT | `/api/grading-components/:id` | Teacher | Update component (403 if term closed) |
| DELETE | `/api/grading-components/:id` | Teacher | Delete component (403 if term closed) |
| POST | `/api/grading-components/copy-from-prelims` | Teacher | Copy PRELIMS components to other terms (403 if term closed) |

## Component Activities

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/component-activities` | Token | List activities |
| POST | `/api/component-activities` | Teacher | Create activity (403 if term closed) |
| PUT | `/api/component-activities/:id` | Teacher | Update activity (403 if term closed) |
| DELETE | `/api/component-activities/:id` | Teacher | Delete activity (403 if term closed) |

## Component Scores

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/component-scores` | Token | List scores |
| POST | `/api/component-scores/bulk` | Teacher | Bulk save scores (403 if term closed) |

## Attendance

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/attendance` | Token | List attendance records |
| GET | `/api/attendance/dates` | Token | Get attendance date columns |
| POST | `/api/attendance/bulk` | Teacher | Bulk save attendance (403 if term closed) |
| GET | `/api/attendance/computed-scores` | Token | Get computed attendance totals |
| DELETE | `/api/attendance/date` | Teacher | Delete attendance date (403 if term closed) |

## Activity Log

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/activity` | Token | List activity logs |
| POST | `/api/activity` | Token | Create activity log entry |
