# Backend API Documentation

## Authentication
- `POST /api/auth/login` - Login with `erpId`, `password`, and optional `schoolId`. Returns JWT.
- `GET /api/auth/me` - Get current logged-in user profile.

## Schools (Super Admin)
- `GET /api/schools` - List all schools.
- `POST /api/schools` - Create a new school.
- `PUT /api/schools/:id/renew` - Renew a school's validity date.
- `PUT /api/schools/settings` - (Admin) Update school settings (theme).

## Users (Admin)
- `GET /api/users` - List all users in the school.
- `POST /api/users` - Create a new user (Teacher/Student/Accounts).

## Academics
- `GET /api/classes` - List all classes and sections.
- `POST /api/classes` - Create a new class.
- `POST /api/classes/:classId/sections` - Create a new section.

## Attendance
- `GET /api/attendance` - Fetch attendance for a section/date.
- `POST /api/attendance` - Mark daily attendance for a section.

## Notices
- `GET /api/notices` - Fetch visible notices.
- `POST /api/notices` - Publish a notice.

## Assignments
- `GET /api/assignments` - Fetch assignments.
- `POST /api/assignments` - Create an assignment.
- `POST /api/assignments/:id/submit` - Submit an assignment (Student).

## Fees
- `GET /api/fees` - View fee records.
- `POST /api/fees` - Create a fee record.
- `PUT /api/fees/:id/pay` - Mark fee as paid.

## Dashboard
- `GET /api/dashboard/stats` - Get role-specific dashboard metrics.
