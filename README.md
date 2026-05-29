# School ERP Platform

A modern, multi-tenant SaaS application for managing multiple schools, their students, teachers, academics, and finances.

## Implemented Features by Module

### Super Admin / System
- **Multi-Tenancy:** Centralized panel to manage multiple schools, licenses, and subscriptions.
- **Dynamic Theming:** Custom brand colors per school that instantly propagate across the UI.
- **Background Jobs:** Configured Cron jobs for automated system tasks (e.g., auto-saving attendance).
- **API Logging:** Integrated `morgan` for robust backend request tracking.

### Admin Module
- **User Management:** Create, update, and delete user profiles across all roles.
- **Enhanced Profiles:** Support for contact details and profile photo uploads (via Cloudinary integration) in user update forms.
- **Academic Structure Management:** Create and manage classes, sections, and subjects.
- **Role-Based Access Control (RBAC):** Granular dashboard routing and permission handling.

### Teacher Module
- **Smart Filtering:** Drop-downs automatically filter to show only classes/sections assigned to the teacher.
- **Robust Attendance Tracking:** 
  - Mark daily attendance (Present/Absent).
  - Multi-state attendance flow: Save Temp (draft), Lock (prevents accidental edits), and Final Save.
  - Automatic unsaved changes browser warning if exiting without locking.
  - Auto-finalization of locked attendance records after 48 hours.
- **Assignments:** Upload assignments, view which specific students have submitted them, and update submission statuses.

### Student Module
- **Academics Dashboard:** Tailored, read-only grid view displaying enrolled subjects and assigned teachers.
- **Timetable:** Access daily schedules.
- **Homework & Assignments:** Download assignment files and submit homework documents.
- **Notices:** View school announcements targeted at the student role.

### Accounts Module
- **Fee Management:** Generate student fee records and bills.
- **Transaction Processing:** Process payments and mark pending fees as paid.
- **Record Tracking:** Automated tracking of which staff member generated a fee transaction (Added By).
- **Exclusive Visibility:** "Added By" tracking logs are securely restricted to be visible only to Accounts users.

## Tech Stack
- **Frontend**: React (Vite), Zustand, TailwindCSS v4
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Prisma ORM
- **Cloud Storage**: Cloudinary

## Getting Started
1. Clone the repository.
2. Run `npm install` in both `/frontend` and `/backend` directories.
3. Configure your `.env` in the `/backend` using `.env.example`.
4. Run `node prisma/seed.js` in the `/backend` to populate demo data.
5. Start the backend: `npm run dev` in `/backend`.
6. Start the frontend: `npm run dev` in `/frontend`.

Request `credentials.md` for demo user logins.