# Request / Response Examples

## Login

```
POST /api/auth/login
Body: { "username": "admin", "password": "admin123" }
Response: { "token": "eyJ...", "user": { "id": "...", "full_name": "...", "system_role": "superadmin", "department": "..." } }
```

## Create User (Admin/Superadmin)

```
POST /api/users
Headers: Authorization: Bearer <token>
Body: { "first_name": "John", "last_name": "Doe", "username": "jdoe", "password": "temp123", "system_role": "teacher", "department": "CICT" }
Response: { "id": "uuid", "full_name": "John Doe", ... }
```

## Create Section

```
POST /api/sections
Headers: Authorization: Bearer <token>
Body: { "name": "BSIT 1-A", "course_id": "uuid", "year_level": "1st" }
Response: { "id": "uuid", "name": "BSIT 1-A", ... }
```

## Bulk Save Scores

```
POST /api/component-scores/bulk
Headers: Authorization: Bearer <token>
Body: { "scores": [{ "activity_id": "uuid", "student_id": "uuid", "score": 85 }] }
Response: { "message": "Scores saved", "count": 1 }
```

## Bulk Save Attendance

```
POST /api/attendance/bulk
Headers: Authorization: Bearer <token>
Body: { "records": [{ "teacher_assignment_id": "uuid", "student_id": "uuid", "date": "2025-09-01", "score": 2, "session": "AM", "type": "Lecture", "term": "PRELIMS" }] }
Response: { "message": "Attendance saved", "count": 1 }
```

## Add Student to Section

```
POST /api/sections/:sectionId/students
Headers: Authorization: Bearer <token>
Body: { "student_id": "2023-0001", "first_name": "Juan", "last_name": "Dela Cruz", "mi": "M", "gender": "Male" }
Response: { "id": "uuid", "student_id": "2023-0001", "first_name": "Juan", ... }
```

`student_name` is auto-computed as `"Dela Cruz, Juan M."`.

## Bulk Import Students (from Excel)

```
POST /api/sections/:sectionId/students/bulk
Headers: Authorization: Bearer <token>
Body: { "students": [{ "student_id": "2023-0001", "first_name": "Juan", "last_name": "Dela Cruz", "mi": "M", "gender": "Male" }, ...] }
Response: { "added": 10, "skipped": [{ "student_id": "2023-0005", "reason": "Student ID already exists in section" }] }
```

Duplicates are identified by checking existing `student_id` values in the section. Only non-duplicate rows are inserted; skipped rows are returned with a reason.

## Delete Student

```
DELETE /api/sections/students/:id
Headers: Authorization: Bearer <token>
Response: { "message": "Student deleted successfully" }
```

Also deletes associated `component_scores` and `attendance` records.

## List All Academic Terms (for archive browsing)

```
GET /api/terms
Headers: Authorization: Bearer <token>
Response:
[
  { "id": "uuid", "school_year": "2025-2026", "semester": "1st Semester", "is_active": true, "is_closed": false, "created_at": "..." },
  { "id": "uuid", "school_year": "2024-2025", "semester": "2nd Semester", "is_active": false, "is_closed": true, "created_at": "..." }
]
```

## Error Response Format

```json
{ "error": "Description of what went wrong" }
```

## Authentication

All protected routes require:
```
Authorization: Bearer <jwt-token>
```

Tokens are issued at login and expire after an unspecified duration (configurable via `JWT_SECRET`).
