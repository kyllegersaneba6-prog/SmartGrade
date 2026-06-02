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
