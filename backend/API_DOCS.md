# School ERP — Backend API Reference

> **Version:** 1.0  
> **Base URL:** `http://localhost:<PORT>/api`  
> **Last Updated:** June 2026

This document is the **single source of truth** for all backend API endpoints of the School ERP system. It is intended for backend testers, new engineers onboarding the codebase, and engineers migrating from/to this system.

---

## Table of Contents

1. [Architecture & Conventions](#1-architecture--conventions)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Global Error Reference](#3-global-error-reference)
4. [Category: Health Check](#4-category-health-check)
5. [Category: Authentication](#5-category-authentication)
6. [Category: Schools (Super Admin)](#6-category-schools-super-admin)
7. [Category: Users (Admin / Super Admin)](#7-category-users-admin--super-admin)
8. [Category: Academics — Classes & Sections](#8-category-academics--classes--sections)
9. [Category: Attendance](#9-category-attendance)
10. [Category: Notices](#10-category-notices)
11. [Category: Assignments](#11-category-assignments)
12. [Category: Fees](#12-category-fees)
13. [Category: Timetable](#13-category-timetable)
14. [Category: Bulk Import](#14-category-bulk-import)
15. [Category: Bug Reports](#15-category-bug-reports)
16. [Category: Dashboard](#16-category-dashboard)
17. [Appendix: Data Models & Enums](#17-appendix-data-models--enums)

---

## 1. Architecture & Conventions

### Request Format
- All request bodies must use **JSON** (`Content-Type: application/json`), except endpoints that accept file uploads, which use **`multipart/form-data`**.
- All IDs are **UUID v4** strings.
- Dates must be ISO 8601 strings (e.g., `"2026-06-01T00:00:00.000Z"` or `"2026-06-01"`).
- Monetary amounts are stored internally in **integer paise/cents** (e.g., ₹150.00 → `15000`). The API accepts and returns amounts in this format.

### Response Format
- All successful responses return **JSON**.
- All error responses return a JSON object with at minimum a `"message"` key.
- Zod validation errors additionally return an `"errors"` array with per-field detail.

### Pagination
Endpoints that support pagination accept `page` and `limit` as **query parameters** (both integers). When these are provided, the response headers will include:

| Header | Description |
|---|---|
| `X-Total-Count` | Total number of records |
| `X-Total-Pages` | Total number of pages |
| `X-Current-Page` | Current page number |
| `X-Limit` | Records per page |

### Rate Limiting
- `POST /api/auth/login` is rate-limited to **10 requests per 15 minutes** per IP. Exceeding this returns HTTP `429`.

### School Isolation
Every non-Super-Admin user is scoped to a single school. The `schoolId` is embedded in the JWT and enforced by middleware on every request. Attempting to access data from another school will result in a `403 Forbidden`.

### School Subscription Validity
Most protected routes pass through `schoolValidityMiddleware`, which checks if the school's `validUntil` date has passed:
- **SUPER_ADMIN**: bypasses this check entirely.
- **ADMIN**: receives `403` with `code: "SCHOOL_EXPIRED_ADMIN"`.
- All other roles: receive `401` with `code: "SCHOOL_EXPIRED"`.

---

## 2. Authentication & Authorization

### JWT Token
All protected endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

The JWT payload contains:
```json
{
  "userId": "<uuid>",
  "schoolId": "<uuid> | null",
  "role": "SUPER_ADMIN | ADMIN | TEACHER | STUDENT | ACCOUNTS"
}
```

### Roles

| Role | Description |
|---|---|
| `SUPER_ADMIN` | Platform owner. Manages all schools. Not associated with any school. |
| `ADMIN` | School administrator. Full access within their school. |
| `TEACHER` | Can mark attendance, create assignments, publish notices within their school. |
| `STUDENT` | Can view notices/assignments/timetable, submit assignments, view own attendance/fees. |
| `ACCOUNTS` | Can manage fee invoices and payments within their school. |

### Common Auth Errors

| Scenario | HTTP Status | Response Body |
|---|---|---|
| No `Authorization` header | `401` | `{"message": "Authentication required"}` |
| Invalid or expired JWT | `401` | `{"message": "Invalid or expired token"}` |
| User not found in DB | `401` | `{"message": "User not found", "code": "USER_NOT_FOUND"}` |
| User account archived | `401` | `{"message": "Account is archived", "code": "ACCOUNT_ARCHIVED"}` |
| User account disabled | `401` | `{"message": "Your account has been disabled...", "code": "ACCOUNT_DISABLED"}` |
| Role not permitted for route | `403` | `{"message": "Access forbidden: Insufficient permissions"}` |

---

## 3. Global Error Reference

The global error handler translates all errors into structured responses. Internals are never leaked.

| Error Class | HTTP Status | Trigger |
|---|---|---|
| `ValidationError` | `400` | Manual schema validation failure |
| `NotFoundError` | `404` | A requested database record was not found |
| `ForbiddenError` | `403` | Business-rule access denial (e.g., operating on another school's data) |
| `ConflictError` | `409` | A duplicate record was attempted |
| `UnauthorizedError` | `401` | Authentication or credential failure |
| `AppError` (generic) | Configurable | Explicit custom errors |
| Zod `ZodError` | `400` | Request body fails schema validation |
| Prisma `P2002` | `409` | Database unique constraint violation |
| Prisma `P2003` | `400` | Foreign key constraint failure |
| Prisma `P2025` | `404` | Record to update/delete was not found |
| Unexpected error | `500` | Unhandled server error |

### Zod Validation Error Shape
```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

## 4. Category: Health Check

### `GET /api/health`

**Purpose:** Basic liveness probe to check whether the API server is running. No authentication required.

**Auth Required:** No  
**Roles:** Any

**Request:** None

**Response `200 OK`:**
```json
{
  "status": "OK",
  "message": "School ERP API is running"
}
```

---

## 5. Category: Authentication

Base path: `/api/auth`

---

### `POST /api/auth/login`

**Purpose:** Authenticates a user using their ERP ID and password. Returns a signed JWT token and full user profile needed to bootstrap the frontend session.

**Auth Required:** No  
**Rate Limit:** 10 requests per 15 minutes per IP

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `erpId` | `string` | ✅ | The unique ERP identifier of the user |
| `password` | `string` | ✅ | The user's plaintext password |

```json
{
  "erpId": "ABC001",
  "password": "mypassword123"
}
```

**Success Response `200 OK`:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-of-user",
    "name": "John Doe",
    "role": "ADMIN",
    "schoolId": "uuid-of-school",
    "erpId": "ABC001",
    "profilePicUrl": "https://res.cloudinary.com/...",
    "isPrimary": true,
    "schoolSettings": {
      "id": "uuid",
      "schoolId": "uuid-of-school",
      "logoUrl": null,
      "themeColor": "#3b82f6",
      "description": "Best School",
      "contactInfo": null
    },
    "schoolName": "ABC Public School",
    "schoolCode": "ABC",
    "contactDetails": "9876543210",
    "studentProfile": null,
    "teacherProfile": null
  }
}
```

> **Note:** For STUDENT users, `studentProfile` will be populated with section and class details. For TEACHER users, `teacherProfile` will include their assignments and sections.

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Missing `erpId` or `password` | Zod validation error |
| `401` | User not found | `"Invalid credentials"` |
| `401` | Wrong password | `"Invalid credentials"` |
| `401` | User account archived | `"Account is archived. Please contact administration."` |
| `401` | User account disabled | `"Account is disabled. Please contact administration."` |
| `401` | School archived | `"School account is archived. Please contact administration."` |
| `401` | School status is INACTIVE | `"School account is inactive. Please contact administration."` |
| `401` | School subscription expired (non-admin role) | `"School subscription has expired. Please contact administration."` |
| `429` | Rate limit exceeded | `"Too many login attempts. Please try again after 15 minutes."` |

---

### `GET /api/auth/me`

**Purpose:** Returns the full profile of the currently authenticated user. Used to re-hydrate the session after a page refresh without re-logging in.

**Auth Required:** Yes  
**Roles:** Any authenticated user

**Request:** None (token is read from `Authorization` header)

**Success Response `200 OK`:**
```json
{
  "user": {
    "id": "uuid-of-user",
    "name": "Jane Smith",
    "role": "TEACHER",
    "schoolId": "uuid-of-school",
    "erpId": "ABC003",
    "profilePicUrl": null,
    "contactDetails": "9876543210",
    "isPrimary": false,
    "schoolSettings": { "themeColor": "#3b82f6", "description": "..." },
    "schoolName": "ABC Public School",
    "schoolCode": "ABC",
    "studentProfile": null,
    "teacherProfile": {
      "id": "uuid",
      "userId": "uuid-of-user",
      "designation": "Math Teacher",
      "teacherAssignments": [
        {
          "section": { "name": "A", "class": { "name": "10" } }
        }
      ]
    }
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `401` | No or invalid token | `"Authentication required"` / `"Invalid or expired token"` |
| `404` | User deleted from DB after token was issued | `"User not found"` |

---

## 6. Category: Schools (Super Admin)

Base path: `/api/schools`

> **All routes in this section require `SUPER_ADMIN` role**, except `GET /api/schools/settings` and `PUT /api/schools/settings` which require `ADMIN` role.

---

### `GET /api/schools`

**Purpose:** Retrieves all schools registered on the platform, with user and class counts. Optionally includes archived schools.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `includeArchived` | `boolean` (string `"true"`) | ❌ | Include archived schools. Defaults to `false`. |

**Example Request:**
```
GET /api/schools?includeArchived=true
```

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-school",
    "code": "ABC",
    "name": "ABC Public School",
    "status": "ACTIVE",
    "validUntil": "2027-03-31T00:00:00.000Z",
    "isArchived": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z",
    "settings": {
      "id": "uuid",
      "schoolId": "uuid-of-school",
      "logoUrl": null,
      "themeColor": "#3b82f6",
      "description": "A great school"
    },
    "_count": {
      "users": 120,
      "classes": 10
    }
  }
]
```

---

### `GET /api/schools/:id`

**Purpose:** Retrieves a single school by its UUID, including settings and counts.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:**

| Variable | Type | Description |
|---|---|---|
| `id` | `string (UUID)` | The school's UUID |

**Success Response `200 OK`:** Same shape as a single element from `GET /api/schools`.

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `404` | School ID not found | `"School not found"` |

---

### `POST /api/schools`

**Purpose:** Creates a new school on the platform. Optionally provisions an initial ADMIN user (the primary admin) at the same time. The admin's ERP ID is auto-generated as `{schoolCode}001`.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Full name of the school |
| `code` | `string` | ✅ | Short unique code (e.g., `"ABC"`). Used for ERP ID generation. |
| `validUntil` | `string (ISO date)` | ✅ | Subscription expiry date |
| `themeColor` | `string` | ❌ | Hex color for branding (default: `"#3b82f6"`) |
| `description` | `string` | ❌ | Short school description |
| `adminName` | `string` | ❌ | If provided, creates the primary admin user |
| `adminEmail` | `string (email)` | ❌ | Email of the admin (informational only, not used for login) |
| `adminPassword` | `string (min 6)` | ❌ | Password for the admin user |

```json
{
  "name": "ABC Public School",
  "code": "ABC",
  "validUntil": "2027-03-31",
  "themeColor": "#6366f1",
  "description": "A premier institution",
  "adminName": "Principal Sharma",
  "adminPassword": "secure123"
}
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-school",
  "code": "ABC",
  "name": "ABC Public School",
  "status": "ACTIVE",
  "validUntil": "2027-03-31T00:00:00.000Z",
  "isArchived": false,
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z",
  "settings": {
    "themeColor": "#6366f1",
    "description": "A premier institution"
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Missing required fields | Zod validation error |
| `409` | `code` already exists | `"A record with this code already exists."` |

---

### `PUT /api/schools/:id`

**Purpose:** Updates a school's name, validity date, or appearance settings.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Request Body (all optional):**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | New school name |
| `validUntil` | `string (ISO date)` | New expiry date |
| `themeColor` | `string` | New hex theme color |
| `description` | `string` | New description |

```json
{
  "name": "ABC International School",
  "validUntil": "2028-03-31"
}
```

**Success Response `200 OK`:** Returns the updated school object including settings.

---

### `DELETE /api/schools/:id`

**Purpose:** **Permanently and irreversibly deletes** a school and all of its associated data (users, classes, attendance records, fee invoices, payments, notices, assignments, timetable, etc.). This is a cascading hard delete wrapped in a database transaction.

> ⚠️ **DESTRUCTIVE OPERATION.** This cannot be undone.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Success Response `200 OK`:**
```json
{ "message": "School deleted successfully" }
```

---

### `PATCH /api/schools/:id/disable`

**Purpose:** Sets the school's `status` to `INACTIVE`, preventing all non-admin users from logging in.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "School disabled successfully" }
```

---

### `PATCH /api/schools/:id/enable`

**Purpose:** Sets the school's `status` back to `ACTIVE`.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "School enabled successfully" }
```

---

### `PATCH /api/schools/:id/archive`

**Purpose:** Soft-deletes a school by setting `isArchived: true`. The school data is retained but the school is hidden from most listings and users cannot log in.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Success Response `200 OK`:**
```json
{ "message": "School archived successfully" }
```

---

### `PATCH /api/schools/:id/restore`

**Purpose:** Restores an archived school by setting `isArchived: false`.

**Auth Required:** Yes — `SUPER_ADMIN` only

**Path Variables:** `id` — School UUID

**Success Response `200 OK`:**
```json
{ "message": "School restored successfully" }
```

---

### `GET /api/schools/settings`

**Purpose:** Returns the current school's full details and settings. Used by the Admin to view the school profile.

**Auth Required:** Yes — `ADMIN` only  
**Middleware:** `schoolValidityMiddleware` (school must be active and not expired)

**Request:** None

**Success Response `200 OK`:**
```json
{
  "id": "uuid-of-school",
  "code": "ABC",
  "name": "ABC Public School",
  "status": "ACTIVE",
  "validUntil": "2027-03-31T00:00:00.000Z",
  "settings": {
    "id": "uuid",
    "schoolId": "uuid-of-school",
    "logoUrl": "https://cdn.example.com/logo.png",
    "themeColor": "#3b82f6",
    "description": "A premier institution",
    "contactInfo": null
  }
}
```

---

### `PUT /api/schools/settings`

**Purpose:** Allows the school's ADMIN to update their school's branding/appearance settings (theme color, description, logo URL).

**Auth Required:** Yes — `ADMIN` only  
**Middleware:** `schoolValidityMiddleware`

**Request Body (all optional):**

| Field | Type | Description |
|---|---|---|
| `themeColor` | `string` | Hex color (e.g., `"#6366f1"`) |
| `description` | `string` | Short description of the school |
| `logoUrl` | `string (URL) \| null` | URL to the school logo image |

```json
{
  "themeColor": "#10b981",
  "description": "Empowering students since 1990",
  "logoUrl": "https://cdn.example.com/abc-logo.png"
}
```

**Success Response `200 OK`:** Returns the updated `SchoolSettings` object.

```json
{
  "id": "uuid",
  "schoolId": "uuid-of-school",
  "themeColor": "#10b981",
  "description": "Empowering students since 1990",
  "logoUrl": "https://cdn.example.com/abc-logo.png"
}
```

---

## 7. Category: Users (Admin / Super Admin)

Base path: `/api/users`

> All routes are protected by `authMiddleware` and `schoolValidityMiddleware`. Role restrictions are documented per-endpoint.

---

### `GET /api/users`

**Purpose:** Lists all users within the authenticated admin's school. Supports filtering by role, pagination, and optionally showing archived users.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`, `TEACHER`, `ACCOUNTS`

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `role` | `string` | ❌ | Filter by role: `TEACHER`, `STUDENT`, `ACCOUNTS`, `ADMIN` |
| `schoolId` | `string (UUID)` | ❌ | `SUPER_ADMIN` only: query users from a specific school |
| `page` | `integer` | ❌ | Page number for pagination |
| `limit` | `integer` | ❌ | Results per page |
| `includeArchived` | `"true"` | ❌ | Include archived users. Defaults to `false`. |

**Example Request:**
```
GET /api/users?role=STUDENT&page=1&limit=20
```

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-user",
    "erpId": "ABC005",
    "name": "Ravi Kumar",
    "role": "STUDENT",
    "isActive": true,
    "isArchived": false,
    "isPrimary": false,
    "profilePicUrl": null,
    "contactDetails": "9876543210",
    "studentProfile": {
      "id": "uuid",
      "userId": "uuid-of-user",
      "sectionId": "uuid-of-section",
      "admissionDate": "2024-04-01T00:00:00.000Z",
      "section": {
        "id": "uuid-of-section",
        "name": "A",
        "class": { "id": "uuid-of-class", "name": "10" }
      }
    },
    "teacherProfile": null
  }
]
```

> **Note:** When `page` and `limit` are provided, pagination headers are set on the response.

---

### `GET /api/users/:userId`

**Purpose:** Retrieves the complete profile of a single user by their UUID, including school, student/teacher profile details.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:**

| Variable | Type | Description |
|---|---|---|
| `userId` | `string (UUID)` | The user's UUID |

**Success Response `200 OK`:**
```json
{
  "id": "uuid-of-user",
  "erpId": "ABC005",
  "name": "Ravi Kumar",
  "role": "STUDENT",
  "profilePicUrl": null,
  "contactDetails": "9876543210",
  "isActive": true,
  "isArchived": false,
  "isPrimary": false,
  "createdAt": "2026-01-15T00:00:00.000Z",
  "updatedAt": "2026-06-01T00:00:00.000Z",
  "school": { "name": "ABC Public School", "code": "ABC" },
  "studentProfile": {
    "section": { "name": "A", "class": { "name": "10" } }
  },
  "teacherProfile": null
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | User belongs to a different school | `"Access forbidden: Insufficient permissions"` |
| `404` | User not found | `"User not found"` |

---

### `POST /api/users`

**Purpose:** Creates a new user (STUDENT, TEACHER, ACCOUNTS, ADMIN, or SUPER_ADMIN). The ERP ID is **auto-generated** from the school code. An optional default password of `"password123"` is used if `password` is not specified.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Request Body (`Content-Type: application/json`):**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Full name of the user |
| `role` | `string (enum)` | ✅ | One of: `TEACHER`, `STUDENT`, `ACCOUNTS`, `ADMIN`, `SUPER_ADMIN` |
| `password` | `string (min 6)` | ❌ | Login password. Defaults to `"password123"` if omitted. |
| `schoolId` | `string (UUID)` | ❌ | Required only when `SUPER_ADMIN` creates a non-super-admin user |
| `profileData` | `object` | ❌ | Role-specific data (see below) |

**`profileData` for STUDENT role:**

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | `string (UUID)` | ✅ | Section to enroll the student in |
| `admissionDate` | `string (ISO date)` | ❌ | Admission date (defaults to today) |

**`profileData` for TEACHER role:**

| Field | Type | Required | Description |
|---|---|---|---|
| `designation` | `string` | ❌ | Teacher designation (defaults to `"Teacher"`) |
| `assignedSectionIds` | `string[] (UUID[])` | ❌ | Section IDs to assign teacher to (uses current academic year) |

**Example — Create Student:**
```json
{
  "name": "Ananya Sharma",
  "role": "STUDENT",
  "password": "student@123",
  "profileData": {
    "sectionId": "uuid-of-section",
    "admissionDate": "2026-04-01"
  }
}
```

**Example — Create Teacher:**
```json
{
  "name": "Mr. Rajesh Gupta",
  "role": "TEACHER",
  "profileData": {
    "designation": "Mathematics Teacher",
    "assignedSectionIds": ["uuid-section-1", "uuid-section-2"]
  }
}
```

**Success Response `201 Created`:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid-of-new-user",
    "erpId": "ABC007",
    "name": "Ananya Sharma",
    "role": "STUDENT"
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Missing `name` or `role` | Zod validation error |
| `400` | `SUPER_ADMIN` creates non-super-admin without `schoolId` | `"schoolId is required when SUPER_ADMIN creates a non-super-admin user"` |
| `404` | `schoolId` in body does not exist | `"School not found"` |
| `409` | ERP ID conflict (race condition) | `"A record with this schoolId, erpId already exists."` |

---

### `PUT /api/users/:userId`

**Purpose:** Updates a user's profile. Supports optional profile picture upload via `multipart/form-data`. For TEACHER and STUDENT roles, role-specific `profileData` can also be updated (e.g., section reassignment, section assignments).

> **Note:** This endpoint uses `multipart/form-data` if uploading a profile picture. If not uploading, use `application/json`.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `userId` — User UUID

**Request Fields (`multipart/form-data` or `application/json`):**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ❌ | New full name |
| `erpId` | `string` | ❌ | New ERP ID (admin override) |
| `password` | `string (min 6)` | ❌ | New password (will be hashed) |
| `role` | `string (enum)` | ❌ | Updated role |
| `contactDetails` | `string` | ❌ | Phone number or contact info |
| `isPrimary` | `boolean` | ❌ | Transfer primary account status (see rules below) |
| `profilePic` | `file` | ❌ | Profile picture file (multipart only, field name: `profilePic`) |
| `profileData` | `JSON string or object` | ❌ | Role-specific updates |

**`isPrimary` Transfer Rules:**
- Only the **currently primary** admin/super-admin can transfer the `isPrimary` flag to another user of the same role.
- The old primary loses the flag atomically.

**Success Response `200 OK`:**
```json
{
  "id": "uuid-of-user",
  "erpId": "ABC005",
  "name": "Updated Name",
  "role": "STUDENT"
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Non-primary admin tries to transfer primary | `"Only the current primary Admin can transfer primary status"` |
| `403` | User belongs to a different school | `"Access forbidden..."` |
| `404` | User not found | `"User not found"` |

---

### `PATCH /api/users/:userId/disable`

**Purpose:** Deactivates a user account by setting `isActive: false`. The user cannot log in until re-enabled. Primary accounts cannot be disabled.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `userId` — User UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "User disabled successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Target user is a primary account | `"Cannot disable primary account"` |
| `404` | User not found | `"User not found"` |

---

### `PATCH /api/users/:userId/enable`

**Purpose:** Re-activates a disabled user account by setting `isActive: true`.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `userId` — User UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "User enabled successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `404` | User not found | `"User not found"` |

---

### `PATCH /api/users/:userId/archive`

**Purpose:** Soft-deletes a user by setting `isArchived: true` and `isActive: false`. The user record is retained but they cannot log in and are hidden from default listings. Primary accounts cannot be archived.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `userId` — User UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "User archived successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Target user is a primary account | `"Cannot archive primary account"` |
| `404` | User not found | `"User not found"` |

---

### `PATCH /api/users/:userId/restore`

**Purpose:** Restores an archived user by setting `isArchived: false` and `isActive: true`.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `userId` — User UUID

**Request Body:** None

**Success Response `200 OK`:**
```json
{ "message": "User restored successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `404` | User not found | `"User not found"` |

---

## 8. Category: Academics — Classes & Sections

Base path: `/api/classes`

> All routes are protected by `authMiddleware` and `schoolValidityMiddleware`. Write operations require `ADMIN` role.

---

### `GET /api/classes`

**Purpose:** Returns all classes and their sections for the authenticated user's school, including section-level teacher assignments and student counts.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Request:** None

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-class",
    "schoolId": "uuid-of-school",
    "name": "10",
    "isArchived": false,
    "sections": [
      {
        "id": "uuid-of-section",
        "classId": "uuid-of-class",
        "name": "A",
        "isArchived": false,
        "teacherAssignments": [
          {
            "teacher": {
              "user": { "id": "uuid", "name": "Mr. Rajesh", "erpId": "ABC003" }
            }
          }
        ],
        "_count": {
          "students": 35,
          "teacherAssignments": 3
        }
      }
    ]
  }
]
```

---

### `POST /api/classes`

**Purpose:** Creates a new class under the current school. Class names must be unique within a school (e.g., you can only have one class named "10").

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Class name (e.g., `"10"`, `"12"`, `"LKG"`) |

```json
{ "name": "10" }
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-new-class",
  "schoolId": "uuid-of-school",
  "name": "10",
  "isArchived": false,
  "sections": []
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `409` | Class with the same name already exists | `"A record with this schoolId, name already exists."` |

---

### `PUT /api/classes/:classId`

**Purpose:** Renames an existing class within the school.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `classId` — Class UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | New class name |

```json
{ "name": "Class X" }
```

**Success Response `200 OK`:** Returns the updated class object.

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Class belongs to a different school | `"The specified class does not belong to your school"` |

---

### `POST /api/classes/:classId/sections`

**Purpose:** Creates a new section under a specific class. Section names must be unique within a class (e.g., you can only have one section "A" in class "10").

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `classId` — Class UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Section name (e.g., `"A"`, `"B"`, `"Science"`) |

```json
{ "name": "A" }
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-new-section",
  "classId": "uuid-of-class",
  "name": "A",
  "isArchived": false
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Class belongs to a different school | `"The specified class does not belong to your school"` |
| `409` | Section name already exists in class | `"A record with this classId, name already exists."` |

---

### `PUT /api/classes/sections/:sectionId`

**Purpose:** Renames an existing section.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `sectionId` — Section UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | New section name |

**Success Response `200 OK`:** Returns the updated section object.

---

### `DELETE /api/classes/sections/:sectionId`

**Purpose:** Deletes a section from the school. This may fail if students or timetable entries are still linked to it (Prisma foreign key constraint).

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `sectionId` — Section UUID

**Success Response `200 OK`:**
```json
{ "message": "Section deleted successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Section has linked records (students, attendance) | `"Cannot complete this action because it references related records..."` |
| `403` | Section belongs to a different school | `"The specified section does not belong to your school"` |

---

### `GET /api/classes/sections/:sectionId/students`

**Purpose:** Returns a list of all students enrolled in a specific section.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Path Variables:** `sectionId` — Section UUID

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-profile",
    "userId": "uuid-of-user",
    "sectionId": "uuid-of-section",
    "admissionDate": "2024-04-01T00:00:00.000Z",
    "user": {
      "id": "uuid-of-user",
      "name": "Ravi Kumar",
      "erpId": "ABC005"
    }
  }
]
```

---

### `GET /api/classes/:classId/students`

**Purpose:** Returns a list of all students across all sections within a class.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Path Variables:** `classId` — Class UUID

**Success Response `200 OK`:** Same shape as `GET /api/classes/sections/:sectionId/students`.

---

## 9. Category: Attendance

Base path: `/api/attendance`

> All routes require `authMiddleware` and `schoolValidityMiddleware`. Marking/locking/saving requires `ADMIN` or `TEACHER` role.

**Key Business Rules:**
- Attendance records that are **locked or saved** cannot be overwritten via `POST /api/attendance`. They must be explicitly unlocked first.
- The `date` field is always normalized to midnight (00:00:00 UTC) before storage.
- Student users can only see their own attendance records.

---

### `POST /api/attendance`

**Purpose:** Marks attendance for an entire section on a specific date. This operation **replaces** any existing (unsaved/unlocked) records for that section-date combination atomically within a transaction.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `TEACHER`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | `string (UUID)` | ✅ | The section to mark attendance for |
| `date` | `string (ISO date)` | ✅ | The attendance date (e.g., `"2026-06-04"`) |
| `records` | `AttendanceRecord[]` | ✅ | Array of per-student records (min 1) |

**`AttendanceRecord` object:**

| Field | Type | Required | Description |
|---|---|---|---|
| `studentId` | `string (UUID)` | ✅ | The student's user UUID |
| `status` | `string (enum)` | ✅ | `"PRESENT"`, `"ABSENT"`, or `"LEAVE"` |

```json
{
  "sectionId": "uuid-of-section",
  "date": "2026-06-04",
  "records": [
    { "studentId": "uuid-student-1", "status": "PRESENT" },
    { "studentId": "uuid-student-2", "status": "ABSENT" },
    { "studentId": "uuid-student-3", "status": "LEAVE" }
  ]
}
```

**Success Response `201 Created`:**
```json
{ "message": "Attendance marked successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Attendance for this section/date is already locked or saved | `"Cannot modify attendance as it is locked or saved."` |
| `400` | Validation failure | Zod error |
| `403` | Section belongs to a different school | `"The specified section does not belong to your school"` |

---

### `GET /api/attendance`

**Purpose:** Fetches attendance records with optional filters. Student users are automatically restricted to their own records.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sectionId` | `string (UUID)` | ❌ | Filter by section |
| `date` | `string (ISO date)` | ❌ | Filter by specific date |
| `studentId` | `string (UUID)` | ❌ | Filter by specific student (ignored for STUDENT role — they always see only their own) |
| `page` | `integer` | ❌ | Page number |
| `limit` | `integer` | ❌ | Results per page |

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-record",
    "sectionId": "uuid-of-section",
    "studentId": "uuid-of-student",
    "date": "2026-06-04T00:00:00.000Z",
    "status": "PRESENT",
    "isLocked": false,
    "isSaved": true,
    "lockedAt": null,
    "remarks": null,
    "createdBy": "uuid-of-teacher",
    "createdAt": "2026-06-04T08:30:00.000Z",
    "updatedAt": "2026-06-04T08:30:00.000Z",
    "student": {
      "name": "Ravi Kumar",
      "erpId": "ABC005"
    }
  }
]
```

---

### `PUT /api/attendance/save`

**Purpose:** Marks all attendance records for a given section-date as **saved** (`isSaved: true`). Saved attendance can still be unlocked but is considered finalized for reporting purposes.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `TEACHER`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | `string (UUID)` | ✅ | The section |
| `date` | `string (ISO date)` | ✅ | The attendance date |

```json
{
  "sectionId": "uuid-of-section",
  "date": "2026-06-04"
}
```

**Success Response `200 OK`:**
```json
{ "message": "Attendance state updated successfully" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | No records found for section/date | `"No attendance records found to update. Please save attendance first."` |
| `403` | Section belongs to a different school | `"The specified section does not belong to your school"` |

---

### `PUT /api/attendance/lock`

**Purpose:** Locks all attendance records for a section-date (`isLocked: true`). Locked records **cannot be overwritten** by `POST /api/attendance` until unlocked.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `TEACHER`

**Request Body:** Same as `PUT /api/attendance/save`

**Success Response `200 OK`:**
```json
{ "message": "Attendance state updated successfully" }
```

---

### `PUT /api/attendance/unlock`

**Purpose:** Unlocks previously locked attendance records (`isLocked: false`), allowing them to be re-marked.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `TEACHER`

**Request Body:** Same as `PUT /api/attendance/save`

**Success Response `200 OK`:**
```json
{ "message": "Attendance state updated successfully" }
```

---

## 10. Category: Notices

Base path: `/api/notices`

> All routes require `authMiddleware` and `schoolValidityMiddleware`.

---

### `POST /api/notices`

**Purpose:** Creates and publishes a new notice for the school. The `targetRoles` field determines which user roles can see the notice. An empty array means the notice is visible to all roles.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `TEACHER`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Notice headline |
| `content` | `string` | ✅ | Full text content of the notice |
| `targetRoles` | `string[]` | ❌ | Array of roles to target. Defaults to `[]` (everyone). Valid values: `"STUDENT"`, `"TEACHER"`, `"ADMIN"`, `"ACCOUNTS"`, `"SUPER_ADMIN"` |

```json
{
  "title": "School Holiday Announcement",
  "content": "School will remain closed on June 10th for school annual day.",
  "targetRoles": ["STUDENT", "TEACHER"]
}
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-notice",
  "schoolId": "uuid-of-school",
  "title": "School Holiday Announcement",
  "content": "School will remain closed on June 10th for school annual day.",
  "attachmentUrl": null,
  "targetRoles": ["STUDENT", "TEACHER"],
  "isArchived": false,
  "createdBy": "uuid-of-author",
  "createdAt": "2026-06-04T09:00:00.000Z",
  "updatedAt": "2026-06-04T09:00:00.000Z"
}
```

---

### `GET /api/notices`

**Purpose:** Retrieves active (non-archived) notices for the school. Non-admin/super-admin users automatically see only notices targeted to their role (or notices with an empty `targetRoles`).

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | `integer` | ❌ | Page number |
| `limit` | `integer` | ❌ | Results per page |

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-notice",
    "title": "School Holiday Announcement",
    "content": "School will remain closed on June 10th.",
    "targetRoles": ["STUDENT", "TEACHER"],
    "isArchived": false,
    "createdAt": "2026-06-04T09:00:00.000Z",
    "author": {
      "name": "Principal Sharma",
      "role": "ADMIN"
    }
  }
]
```

---

## 11. Category: Assignments

Base path: `/api/assignments`

> All routes require `authMiddleware` and `schoolValidityMiddleware`.

---

### `POST /api/assignments`

**Purpose:** Creates a new assignment for a specific section. Optionally accepts a file attachment (e.g., PDF question paper) uploaded directly to cloud storage.

**Auth Required:** Yes  
**Roles:** `TEACHER`, `ADMIN`  
**Content-Type:** `multipart/form-data`

**Request Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Assignment title |
| `description` | `string` | ✅ | Assignment description or instructions |
| `dueDate` | `string (ISO date)` | ✅ | Submission deadline |
| `sectionId` | `string (UUID)` | ✅ | Target section UUID |
| `file` | `file` | ❌ | Attachment file (field name: `file`) |

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-assignment",
  "schoolId": "uuid-of-school",
  "sectionId": "uuid-of-section",
  "title": "Chapter 5 Practice Problems",
  "description": "Solve all problems from Ex. 5.1 to 5.4",
  "fileUrl": "https://res.cloudinary.com/.../assignment.pdf",
  "dueDate": "2026-06-10T00:00:00.000Z",
  "isArchived": false,
  "createdBy": "uuid-of-teacher",
  "createdAt": "2026-06-04T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Section belongs to a different school | `"The specified section does not belong to your school"` |

---

### `GET /api/assignments`

**Purpose:** Fetches assignments with role-aware filtering:
- **STUDENT**: automatically sees only assignments for their enrolled section, plus their own submission status.
- **TEACHER/ADMIN**: can filter by `sectionId` and see submission counts.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sectionId` | `string (UUID)` | ❌ | Filter by section (for TEACHER/ADMIN) |
| `page` | `integer` | ❌ | Page number |
| `limit` | `integer` | ❌ | Results per page |

**Success Response `200 OK` (for TEACHER/ADMIN):**
```json
[
  {
    "id": "uuid-of-assignment",
    "title": "Chapter 5 Practice Problems",
    "description": "Solve all problems...",
    "fileUrl": null,
    "dueDate": "2026-06-10T00:00:00.000Z",
    "section": { "name": "A", "class": { "name": "10" } },
    "_count": { "submissions": 20 }
  }
]
```

**Success Response `200 OK` (for STUDENT):**
```json
[
  {
    "id": "uuid-of-assignment",
    "title": "Chapter 5 Practice Problems",
    "dueDate": "2026-06-10T00:00:00.000Z",
    "section": { "name": "A", "class": { "name": "10" } },
    "submissions": [
      {
        "id": "uuid-of-submission",
        "studentId": "uuid-of-student",
        "fileUrl": "https://...",
        "submittedAt": "2026-06-08T14:00:00.000Z"
      }
    ]
  }
]
```

> If `submissions` is an empty array, the student has not yet submitted.

---

### `POST /api/assignments/:assignmentId/submit`

**Purpose:** Allows a student to submit their work for an assignment by uploading a file or providing a URL.

**Auth Required:** Yes  
**Roles:** `STUDENT`  
**Content-Type:** `multipart/form-data`

**Path Variables:** `assignmentId` — Assignment UUID

**Request Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `file` | ❌* | Submission file (field name: `file`) |
| `fileUrl` | `string (URL)` | ❌* | Alternatively, a URL to an already-uploaded file |

> *Either `file` (uploaded) or `fileUrl` (in body) is required.

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-submission",
  "assignmentId": "uuid-of-assignment",
  "studentId": "uuid-of-student",
  "fileUrl": "https://res.cloudinary.com/.../submission.pdf",
  "submittedAt": "2026-06-08T14:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Neither `file` nor `fileUrl` provided | `"A file or URL is required for submission."` |
| `403` | Assignment belongs to a different school | `"The specified assignment does not belong to your school"` |
| `409` | Student has already submitted | `"A record with this assignmentId, studentId already exists."` |

---

### `GET /api/assignments/:assignmentId/submissions`

**Purpose:** Retrieves all student submissions for a given assignment. Students are not permitted to call this endpoint.

**Auth Required:** Yes  
**Roles:** `TEACHER`, `ADMIN`

**Path Variables:** `assignmentId` — Assignment UUID

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-submission",
    "assignmentId": "uuid-of-assignment",
    "studentId": "uuid-of-student",
    "fileUrl": "https://res.cloudinary.com/.../submission.pdf",
    "submittedAt": "2026-06-08T14:00:00.000Z",
    "student": {
      "name": "Ravi Kumar",
      "erpId": "ABC005"
    }
  }
]
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Student attempts to call this endpoint | `"Students are not authorized to view all submissions"` |
| `403` | Assignment belongs to a different school | `"The specified assignment does not belong to your school"` |

---

## 12. Category: Fees

Base path: `/api/fees`

> All routes require `authMiddleware` and `schoolValidityMiddleware`. Invoice/payment write operations require `ADMIN` or `ACCOUNTS` role.

**Amount Convention:** All monetary amounts are stored and returned in the smallest unit (paise for INR, e.g., ₹1500.00 → `150000`).

---

### `POST /api/fees/invoice`

**Purpose:** Creates a fee invoice for a specific student for a given month and year. Generates a unique invoice number in the format `INV-{year}-{month}-{randomId}`.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `ACCOUNTS`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `studentId` | `string (UUID)` | ✅ | UUID of the student (must belong to the same school) |
| `amount` | `number \| string` | ✅ | Fee amount (positive number; stored as paise internally) |
| `month` | `number \| string` | ✅ | Month number (1–12) |
| `year` | `number \| string` | ✅ | Year (2000–2100) |
| `dueDate` | `string (ISO date)` | ❌ | Payment due date |
| `remarks` | `string` | ❌ | Optional note for the invoice |

```json
{
  "studentId": "uuid-of-student",
  "amount": 1500,
  "month": 6,
  "year": 2026,
  "dueDate": "2026-06-15",
  "remarks": "June tuition fee"
}
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-invoice",
  "invoiceNumber": "INV-2026-6-A1B2C3D4",
  "schoolId": "uuid-of-school",
  "studentId": "uuid-of-student",
  "month": 6,
  "year": 2026,
  "totalAmount": 150000,
  "dueDate": "2026-06-15T00:00:00.000Z",
  "remarks": "June tuition fee",
  "createdBy": "uuid-of-accounts-user",
  "createdAt": "2026-06-04T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Invalid amount, month, or year | Zod validation error |
| `404` | Student not found in this school | `"Student not found not found"` |

---

### `POST /api/fees/payment`

**Purpose:** Records a payment against an existing fee invoice.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `ACCOUNTS`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | `string (UUID)` | ✅ | UUID of the invoice being paid |
| `amount` | `number \| string` | ✅ | Payment amount (positive number) |
| `paymentMode` | `string` | ❌ | E.g., `"CASH"`, `"ONLINE"`, `"CHEQUE"` |
| `referenceNo` | `string` | ❌ | Transaction/cheque reference number |
| `remarks` | `string` | ❌ | Optional payment notes |

```json
{
  "invoiceId": "uuid-of-invoice",
  "amount": 1500,
  "paymentMode": "ONLINE",
  "referenceNo": "TXN123456",
  "remarks": "Paid via UPI"
}
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-payment",
  "schoolId": "uuid-of-school",
  "invoiceId": "uuid-of-invoice",
  "amount": 150000,
  "paymentMode": "ONLINE",
  "referenceNo": "TXN123456",
  "remarks": "Paid via UPI",
  "paidAt": "2026-06-04T10:30:00.000Z",
  "receivedBy": "uuid-of-accounts-user",
  "createdAt": "2026-06-04T10:30:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `404` | Invoice not found in this school | `"Invoice not found not found"` |

---

### `GET /api/fees/summary`

**Purpose:** Returns a consolidated fee summary per student showing total amount charged, total paid, amount due, and overall status. STUDENT users see only their own record.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Request:** None

**Success Response `200 OK`:**
```json
[
  {
    "student": {
      "id": "uuid-of-student",
      "name": "Ravi Kumar",
      "erpId": "ABC005",
      "classDetails": "10 - A"
    },
    "totalAmount": 450000,
    "dueAmount": 150000,
    "dueDate": "2026-07-15T00:00:00.000Z",
    "status": "PARTIALLY_PAID"
  }
]
```

**Possible `status` values:**

| Value | Meaning |
|---|---|
| `"PAID"` | All invoices fully paid |
| `"PENDING"` | Fee generated, no payment yet |
| `"PARTIALLY_PAID"` | Some amount paid, balance remaining |
| `"OVERDUE"` | Balance remaining and earliest due date has passed |

---

### `GET /api/fees/history`

**Purpose:** Returns a chronological transaction log of all invoices and payments for the school (or a specific student). Each entry is tagged with `type: "Invoice"` or `type: "Payment"`.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `studentId` | `string (UUID)` | ❌ | Filter by specific student (STUDENT users are auto-filtered to themselves) |

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-payment",
    "type": "Payment",
    "invoiceNumber": "INV-2026-6-A1B2C3D4",
    "amount": 150000,
    "date": "2026-06-04T10:30:00.000Z",
    "paymentMode": "ONLINE",
    "referenceNo": "TXN123456",
    "remarks": "Paid via UPI",
    "student": { "name": "Ravi Kumar", "erpId": "ABC005" }
  },
  {
    "id": "uuid-of-invoice",
    "type": "Invoice",
    "invoiceNumber": "INV-2026-6-A1B2C3D4",
    "amount": 150000,
    "date": "2026-06-04T10:00:00.000Z",
    "remarks": "June tuition fee",
    "month": 6,
    "year": 2026,
    "student": { "name": "Ravi Kumar", "erpId": "ABC005" },
    "creator": { "name": "Accounts Staff" }
  }
]
```

---

## 13. Category: Timetable

Base path: `/api/timetable`

> All routes require `authMiddleware` and `schoolValidityMiddleware`. Write operations (POST, PUT, DELETE) require `ADMIN` role.

---

### Subjects

#### `GET /api/timetable/subjects`

**Purpose:** Returns all active (non-archived) subjects defined for the school, sorted alphabetically.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-subject",
    "schoolId": "uuid-of-school",
    "name": "Mathematics",
    "code": "MATH",
    "isArchived": false
  }
]
```

---

#### `POST /api/timetable/subjects`

**Purpose:** Creates a new subject for the school. Subject names must be unique per school.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Subject name |
| `code` | `string` | ❌ | Short code (e.g., `"MATH"`, `"PHY"`) |

```json
{ "name": "Mathematics", "code": "MATH" }
```

**Success Response `201 Created`:**
```json
{
  "id": "uuid-of-subject",
  "schoolId": "uuid-of-school",
  "name": "Mathematics",
  "code": "MATH",
  "isArchived": false
}
```

---

#### `DELETE /api/timetable/subjects/:id`

**Purpose:** Soft-deletes a subject by setting `isArchived: true`. The subject will no longer appear in listings.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `id` — Subject UUID

**Success Response `200 OK`:**
```json
{ "message": "Subject deleted" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Subject belongs to a different school | `"The specified subject does not belong to your school"` |

---

### Periods

#### `GET /api/timetable/periods`

**Purpose:** Returns all periods defined for the school, sorted by start time.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-period",
    "schoolId": "uuid-of-school",
    "name": "Period 1",
    "startTime": "08:00",
    "endTime": "08:45"
  }
]
```

---

#### `POST /api/timetable/periods`

**Purpose:** Creates a new time period slot for the school. Period names must be unique per school.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Period label (e.g., `"Period 1"`, `"Lunch Break"`) |
| `startTime` | `string` | ✅ | Start time in 24h format (e.g., `"08:00"`) |
| `endTime` | `string` | ✅ | End time in 24h format (e.g., `"08:45"`) |

```json
{ "name": "Period 1", "startTime": "08:00", "endTime": "08:45" }
```

**Success Response `201 Created`:** Returns the created period object.

---

#### `PUT /api/timetable/periods/:id`

**Purpose:** Updates an existing period's name or time range.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `id` — Period UUID

**Request Body (all optional):**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | New period name |
| `startTime` | `string` | New start time |
| `endTime` | `string` | New end time |

**Success Response `200 OK`:** Returns the updated period object.

---

#### `DELETE /api/timetable/periods/:id`

**Purpose:** Permanently deletes a period. Will fail if any timetable entries reference this period.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `id` — Period UUID

**Success Response `200 OK`:**
```json
{ "message": "Period deleted" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Timetable entries reference this period | `"Cannot complete this action because it references related records..."` |
| `403` | Period belongs to a different school | `"The specified period does not belong to your school"` |

---

### Timetable Entries

#### `GET /api/timetable`

**Purpose:** Returns timetable entries with optional filters. Role-aware:
- **STUDENT**: automatically sees only their own section's timetable.
- **TEACHER**: automatically sees only their own schedule.
- **ADMIN**: can query by classId, sectionId, or teacherId.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `classId` | `string (UUID)` | ❌ | Filter by class (ADMIN only) |
| `sectionId` | `string (UUID)` | ❌ | Filter by section (ADMIN only) |
| `teacherId` | `string (UUID)` | ❌ | Filter by teacher profile ID (ADMIN only) |

**Success Response `200 OK`:**
```json
[
  {
    "id": "uuid-of-entry",
    "dayOfWeek": "MONDAY",
    "subject": { "id": "uuid", "name": "Mathematics", "code": "MATH" },
    "period": { "id": "uuid", "name": "Period 1", "startTime": "08:00", "endTime": "08:45" },
    "teacher": {
      "id": "uuid-of-teacher-profile",
      "user": { "name": "Mr. Rajesh Gupta" }
    },
    "class": { "id": "uuid", "name": "10" },
    "section": { "id": "uuid", "name": "A" }
  }
]
```

---

#### `POST /api/timetable`

**Purpose:** Creates a new timetable entry (a slot assigning a teacher to teach a subject to a section during a period on a specific day). All referenced IDs must belong to the same school. Prevents double-booking a teacher at the same period-day combination.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `classId` | `string (UUID)` | ✅ | Class UUID |
| `sectionId` | `string (UUID)` | ❌ | Section UUID (within the class) |
| `subjectId` | `string (UUID)` | ✅ | Subject UUID |
| `teacherId` | `string (UUID)` | ✅ | Teacher profile UUID |
| `periodId` | `string (UUID)` | ✅ | Period UUID |
| `dayOfWeek` | `string (enum)` | ✅ | `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY` |

```json
{
  "classId": "uuid-of-class",
  "sectionId": "uuid-of-section",
  "subjectId": "uuid-of-subject",
  "teacherId": "uuid-of-teacher-profile",
  "periodId": "uuid-of-period",
  "dayOfWeek": "MONDAY"
}
```

**Success Response `201 Created`:** Returns the full timetable entry with related objects included.

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Any referenced resource (class/section/subject/period/teacher) belongs to a different school | `"The specified ... does not belong to your school"` |
| `409` | Teacher is already assigned to this period-day | `"A record with this teacherId, periodId, dayOfWeek already exists."` |
| `409` | Section already has a class assigned for this period-day | `"A record with this classId, sectionId, periodId, dayOfWeek already exists."` |

---

#### `DELETE /api/timetable/:id`

**Purpose:** Deletes a specific timetable entry.

**Auth Required:** Yes  
**Roles:** `ADMIN`

**Path Variables:** `id` — Timetable entry UUID

**Success Response `200 OK`:**
```json
{ "message": "Entry deleted" }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `403` | Entry belongs to a different school | `"The specified timetable entry does not belong to your school"` |

---

## 14. Category: Bulk Import

Base path: `/api/import`

> All routes require `authMiddleware`, `schoolValidityMiddleware`, and `ADMIN` or `SUPER_ADMIN` role. File uploads use `multipart/form-data` with an in-memory multer buffer.

The import flow for fees is a **multi-step pipeline**:
1. **Upload** → 2. **Validate** → 3. **Match** → 4. **Reconcile** → 5. **Resolve Ambiguities** → 6. **Preview** → 7. **Confirm**

---

### `GET /api/import/template/:type`

**Purpose:** Downloads a CSV template file for bulk import. The file shows the required column headers with example data.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:**

| Variable | Type | Description |
|---|---|---|
| `type` | `string` | One of: `"students"`, `"teachers"`, `"fees"` |

**Success Response `200 OK`:**
- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="{type}_template.csv"`
- Response body is a raw CSV string.

**CSV Columns by type:**
- **students:** `Student Name, Class, Section, Contact, Admission Date`
- **teachers:** `Teacher Name, Designation, Contact, Assigned Sections`
- **fees:** `ERP ID, Student Name, Father Name, Class Name, Section, Total Fee, Amount Paid, Month, Year, Payment Mode, Reference No, Remarks`

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `404` | Invalid type | `"Template not found"` |

---

### `POST /api/import/students`

**Purpose:** Bulk-imports students from a CSV file. On success, returns count of imported students. On failure, returns a CSV error report as a downloadable file.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`  
**Content-Type:** `multipart/form-data`

**Request:**
- Field name: `file` — The CSV file (required)

**Success Response `200 OK`:**
```json
{
  "message": "students imported successfully",
  "count": 42
}
```

**Failure Response `400 Bad Request`:**
- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="students_import_errors.csv"`
- Response body is a CSV error report showing which rows failed and why.

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | No file attached | `"No file uploaded"` |

---

### `POST /api/import/teachers`

**Purpose:** Bulk-imports teachers from a CSV file. Behavior is identical to student import.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`  
**Content-Type:** `multipart/form-data`

**Request:** Field name: `file`

**Success Response `200 OK`:**
```json
{
  "message": "teachers imported successfully",
  "count": 15
}
```

---

### Fee Import Pipeline

The fee import uses a stateful **ImportJob** (stored in the database). Each step advances the job through its pipeline.

---

#### `POST /api/import/fees/upload`

**Purpose:** **Step 1.** Uploads and parses a fees CSV file. Creates a new `ImportJob` record and returns the `jobId` for subsequent steps.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`  
**Content-Type:** `multipart/form-data`

**Request:** Field name: `file`

**Success Response `200 OK`:**
```json
{
  "message": "File uploaded and parsed successfully",
  "jobId": "uuid-of-import-job",
  "totalRows": 50
}
```

---

#### `POST /api/import/fees/:jobId/validate`

**Purpose:** **Step 2.** Validates the parsed rows in the job for data integrity (required columns, type checks, etc.).

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:**
```json
{
  "message": "Validation successful",
  "status": "VALIDATED"
}
```

---

#### `POST /api/import/fees/:jobId/match`

**Purpose:** **Step 3.** Attempts to match each row to an existing student in the database using the ERP ID and name. Returns counts of matched, ambiguous, and unmatched rows.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:**
```json
{
  "message": "Matching complete",
  "status": "MATCHED",
  "matchedRows": 45,
  "ambiguousRows": 3,
  "unmatchedRows": 2
}
```

---

#### `POST /api/import/fees/:jobId/reconcile-matching`

**Purpose:** **Step 4.** Runs an additional reconciliation pass to resolve or flag ambiguous matches before manual resolution.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:** Returns reconciliation result details.

---

#### `GET /api/import/fees/:jobId/ambiguous-rows`

**Purpose:** Retrieves the list of ambiguous rows that need manual resolution by the admin.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:** Returns an object with ambiguous row details and potential student matches for each.

---

#### `POST /api/import/fees/:jobId/resolve`

**Purpose:** **Step 5.** Submits manual resolutions for ambiguous rows, mapping each ambiguous row to a specific student.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `resolutions` | `Resolution[]` | ✅ | Array of resolution objects |

**`Resolution` object:**

| Field | Type | Description |
|---|---|---|
| `rowNumber` | `integer` | The row number of the ambiguous entry |
| `resolvedStudentId` | `string (UUID)` | The student UUID to map this row to |

```json
{
  "resolutions": [
    { "rowNumber": 12, "resolvedStudentId": "uuid-of-student" },
    { "rowNumber": 18, "resolvedStudentId": "uuid-of-another-student" }
  ]
}
```

**Success Response `200 OK`:**
```json
{ "message": "Resolutions applied", "resolvedRows": 2 }
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | `resolutions` is missing or not an array | `"resolutions must be an array"` |

---

#### `POST /api/import/fees/:jobId/preview`

**Purpose:** **Step 6.** Generates a preview of what will be imported (invoices and payments that will be created), allowing admin to review before committing.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:**
```json
{
  "message": "Preview generated",
  "previewData": [...]
}
```

---

#### `POST /api/import/fees/:jobId/confirm`

**Purpose:** **Step 7 (Final).** Executes the import — creates all fee invoices and payment records in the database based on the matched and resolved data.

**Auth Required:** Yes  
**Roles:** `ADMIN`, `SUPER_ADMIN`

**Path Variables:** `jobId` — Import job UUID

**Success Response `200 OK`:**
```json
{
  "message": "Import confirmed and executed successfully",
  "importedCount": 45
}
```

---

## 15. Category: Bug Reports

Base path: `/api/bugs`

> Submission is open to all authenticated users. Viewing and managing bug reports is restricted to `SUPER_ADMIN`.

---

### `POST /api/bugs`

**Purpose:** Allows any authenticated user to submit a bug report with a title, description, and up to 3 screenshot images.

**Auth Required:** Yes  
**Roles:** Any authenticated user  
**Content-Type:** `multipart/form-data`

**Request Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | ✅ | Short bug title |
| `description` | `string` | ✅ | Detailed description of the bug |
| `screenshots` | `file[]` | ❌ | Up to 3 screenshot images (field name: `screenshots`) |

**Success Response `201 Created`:**
```json
{
  "message": "Bug reported successfully",
  "bug": {
    "id": "uuid-of-bug",
    "title": "Attendance not saving",
    "description": "When I click save, the page reloads but records are not saved.",
    "screenshots": [
      "https://res.cloudinary.com/.../screenshot1.png"
    ],
    "status": "OPEN",
    "reportedById": "uuid-of-user",
    "createdAt": "2026-06-04T11:00:00.000Z",
    "updatedAt": "2026-06-04T11:00:00.000Z"
  }
}
```

---

### `GET /api/bugs`

**Purpose:** Returns all bug reports across all schools, sorted newest first. Supports pagination.

**Auth Required:** Yes  
**Roles:** `SUPER_ADMIN` only

**Query Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `page` | `integer` | ❌ | Page number |
| `limit` | `integer` | ❌ | Results per page |

**Success Response `200 OK`:**
```json
{
  "bugs": [
    {
      "id": "uuid-of-bug",
      "title": "Attendance not saving",
      "description": "...",
      "screenshots": [],
      "status": "OPEN",
      "createdAt": "2026-06-04T11:00:00.000Z",
      "reportedBy": {
        "id": "uuid-of-user",
        "name": "Ravi Kumar",
        "role": "TEACHER",
        "school": { "name": "ABC Public School" }
      }
    }
  ]
}
```

---

### `PATCH /api/bugs/:id/status`

**Purpose:** Updates the status of a bug report (e.g., mark it as in-progress or closed).

**Auth Required:** Yes  
**Roles:** `SUPER_ADMIN` only

**Path Variables:** `id` — Bug report UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | `string (enum)` | ✅ | `"OPEN"`, `"IN_PROGRESS"`, or `"CLOSED"` |

```json
{ "status": "IN_PROGRESS" }
```

**Success Response `200 OK`:**
```json
{
  "message": "Status updated successfully",
  "bug": {
    "id": "uuid-of-bug",
    "status": "IN_PROGRESS"
  }
}
```

**Error Responses:**

| Status | Condition | Message |
|---|---|---|
| `400` | Invalid status value | Zod validation error |

---

## 16. Category: Dashboard

Base path: `/api/dashboard`

> Protected by `authMiddleware` and `schoolValidityMiddleware`. Returns different data shapes depending on the authenticated user's role.

---

### `GET /api/dashboard/stats`

**Purpose:** Returns role-specific dashboard statistics for the current user. The response shape varies significantly by role.

**Auth Required:** Yes  
**Roles:** Any authenticated school user

**Request:** None

---

**Response for `ADMIN` / `SUPER_ADMIN`:**

If the school has no data yet (`isNewSchool: true`), a simplified empty-state object is returned:
```json
{
  "isNewSchool": true,
  "studentCount": 0,
  "teacherCount": 0,
  "classCount": 0,
  "attendanceTodayRate": 0,
  "feesCollected": 0,
  "pendingFees": 0,
  "schoolHealth": { ... },
  "actionCenter": { ... },
  "academicSnapshot": [],
  "attendanceSnapshot": [],
  "financialSnapshot": { ... },
  "activities": []
}
```

For an established school, the full stats are returned:
```json
{
  "isNewSchool": false,
  "studentCount": 120,
  "teacherCount": 15,
  "classCount": 10,
  "attendanceTodayRate": 87,
  "feesCollected": 5000000,
  "pendingFees": 1500000,
  "schoolHealth": {
    "attendance": "✓ 87% attendance marked",
    "fees": "✓ ₹50,000 collected (77%)",
    "teacherActivity": "✓ Teacher checklist complete",
    "pendingActionsCount": 0
  },
  "actionCenter": {
    "attendancePendingCount": 2,
    "pendingFeeRecordsCount": 8,
    "recentNoticesText": "3 notices published this week",
    "recentImportsText": "Imported 42 students on Jun 1"
  },
  "academicSnapshot": [
    { "className": "Class 10", "studentCount": 60 }
  ],
  "attendanceSnapshot": [
    { "date": "Mon, Jun 1", "rate": 90 },
    { "date": "Tue, Jun 2", "rate": 85 }
  ],
  "financialSnapshot": {
    "feesCollected": 5000000,
    "pendingFees": 1500000,
    "collectionRate": 77
  },
  "activities": [
    {
      "id": "payment-0-1717...",
      "type": "FEE_PAID",
      "description": "Fee payment of ₹1,500 received from student Ravi Kumar (ABC005) for June 2026",
      "timestamp": "2026-06-04T10:30:00.000Z"
    }
  ]
}
```

**Activity `type` values:**

| Type | Description |
|---|---|
| `STUDENT_ADDED` | A single student was added |
| `TEACHER_ADDED` | A single teacher was added |
| `IMPORT_COMPLETED` | A bulk import was completed |
| `NOTICE_PUBLISHED` | A notice was published |
| `FEE_PAID` | A fee payment was received |
| `ATTENDANCE_SUBMITTED` | Attendance was submitted for a class |

---

**Response for `STUDENT`:**
```json
{
  "attendanceStatus": "PRESENT",
  "pendingAssignments": 3
}
```

| Field | Description |
|---|---|
| `attendanceStatus` | Today's attendance: `"PRESENT"`, `"ABSENT"`, `"LEAVE"`, or `"NOT_MARKED"` |
| `pendingAssignments` | Number of upcoming assignments not yet submitted |

---

**Response for `TEACHER` / `ACCOUNTS`:**
```json
{}
```

> Dashboard for TEACHER and ACCOUNTS roles currently returns an empty object. Role-specific data is planned for future development.

---

## 17. Appendix: Data Models & Enums

### Enums

#### `UserRole`
| Value | Description |
|---|---|
| `SUPER_ADMIN` | Platform-level administrator |
| `ADMIN` | School administrator |
| `TEACHER` | Teaching staff |
| `STUDENT` | Enrolled student |
| `ACCOUNTS` | Finance/accounts staff |

#### `AttendanceStatus`
| Value | Description |
|---|---|
| `PRESENT` | Student was present |
| `ABSENT` | Student was absent |
| `LEAVE` | Student was on approved leave |

#### `FeeStatus` (derived, not stored)
| Value | Description |
|---|---|
| `PAID` | All dues cleared |
| `PENDING` | Invoice exists, nothing paid |
| `PARTIALLY_PAID` | Some amount paid, balance remains |
| `OVERDUE` | Balance remaining, due date has passed |

#### `SchoolStatus`
| Value | Description |
|---|---|
| `ACTIVE` | School is active and users can log in |
| `INACTIVE` | School is disabled — users cannot log in |

#### `BugStatus`
| Value | Description |
|---|---|
| `OPEN` | Bug is newly reported |
| `IN_PROGRESS` | Bug is being investigated |
| `CLOSED` | Bug has been resolved |

#### `DayOfWeek`
`MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`

---

### Key Model Relationships

```
School
  ├── SchoolSettings (1:1)
  ├── User[] (1:N)
  │   ├── StudentProfile (1:1) → Section → Class
  │   └── TeacherProfile (1:1) → TeacherAssignment[]
  ├── Class[] (1:N)
  │   └── Section[] (1:N)
  │       ├── StudentProfile[] (N)
  │       ├── Attendance[] (N)
  │       └── Assignment[] (N)
  ├── Subject[] (1:N)
  ├── Period[] (1:N)
  ├── TimeTableEntry[] (N) — links Class, Section, Subject, Teacher, Period, DayOfWeek
  ├── Notice[] (1:N)
  ├── FeeInvoice[] (1:N) → Payment[]
  └── AcademicYear[] (1:N) → TeacherAssignment[]
```

---

*End of API Reference. For questions or updates, contact the backend engineering team.*
