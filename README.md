# 🏫 SchoolChakra Platform

> **Last Modified:** 2 July 2026

A modern, multi-tenant SaaS application for managing multiple schools, their students, teachers, academics, and finances.

[![React](https://img.shields.io/badge/Frontend-React%20v18-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169e1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

---

## 🛠️ Implemented Features by Module

### 👑 Super Admin / System
- **Multi-Tenancy:** Centralized panel to manage multiple schools, licenses, and subscriptions.
- **School Lifecycle Management:** Register new schools with auto-created admin accounts; disable, enable, archive, restore, or permanently delete schools.
- **Dynamic Theming:** Custom brand colors per school that instantly propagate across the UI.
- **Administrator Management:** Create and manage multiple Super Admin accounts; transfer primary status between accounts.
- **Subscription Plan Management:** Define and manage tiered subscription plans with pricing options (monthly, annual, etc.). Assign, suspend, reactivate, cancel, or extend plans per school.
- **Feature Flag System:** Create and manage platform-level feature flags. Assign features to plans, apply per-school overrides, or broadcast global flags across all schools. Diagnose a school's effective feature set via the diagnostics endpoint.
- **Billing & Orders:** Track subscription purchase orders per school. Supports order creation, cancellation, and payment simulation for testing.
- **Bug Reports:** Platform-wide bug report inbox — view reports from all schools, see attached screenshots, and update report status (Open → In Progress → Closed).
- **Global Search:** Search across users, classes, notices, and assignments within a school.
- **Background Jobs:** Configured Cron jobs for automated system tasks (e.g., auto-finalization of locked attendance after 48 hours).
- **API Logging:** Integrated `morgan` for robust backend request tracking.

### 🏫 Admin Module
- **Setup Checklist:** First-time onboarding checklist shown on the dashboard to guide new admins through initial school setup.
- **Operational Dashboard:** School-wide stats (students, teachers, classes, attendance rate, fees collected/pending), attendance trend chart, student class distribution chart, financial snapshot, and a live activity timeline.
- **Notice Board & Announcements:** Post notices/announcements from the dashboard with **multi-audience targeting** (Everyone, or any combination of Students, Teachers, and Accounts). Notices display individual role pills per audience. Notices modified after creation show a subtle **Edited** flag. Published notices appear immediately on the dashboards of all targeted users.
- **User Management:** Create, update, and delete user profiles across all roles (Teacher, Student, Accounts, Admin). Supports profile photo uploads via Cloudinary, contact details, and ERP ID management.
- **User Status Control:** Disable (suspend) or archive (soft-delete) individual user accounts without losing their data.
- **Academic Structure Management:** Create and manage classes and sections; enforce uniqueness constraints.
- **Timetable Management:** Define subjects (with short codes), configure period time slots, and create timetable entries linking class/section, subject, teacher, period, and day of the week. Prevents double-booking of teachers and sections.
- **Data Import (Bulk Upload):** CSV-based bulk import for students, teachers, and fee records. Fee import uses a guided multi-step wizard (Upload → Validate → Match → Reconcile → Resolve Ambiguities → Preview → Confirm). Template mismatch and row-level validation errors are surfaced to the user with specific, actionable messages (400) rather than generic server errors. Downloadable error reports for failed rows.
- **Teacher Section Assignment UX:** When creating or editing a teacher, class/section assignments use a clean checkbox-based multi-select UI grouped by class, replacing the native `<select multiple>` element.
- **School Settings:** Update school name, theme color, logo URL, and description.
- **Academic Calendar:** Manage school-level calendar overrides — declare holidays, multi-day vacations, and special working days. The system defaults Mon–Sat as working days and Sunday as a holiday; overrides only need to be created when deviating from this default. Supports overlap detection and month-based filtering.
- **Reports & Insights:** Data-driven reporting dashboard with two tabs:
  - **Attendance Insights** — school-wide attendance summary (working days, present/absent counts, avg. attendance rate), Top 10 best-attending students ranking, and a low-attendance alert list (below 75% threshold).
  - **Fee Insights** — fee collection summary (expected, collected, outstanding, collection rate), payment method breakdown, and a fee defaulters table with overdue day tracking.
  - Both reports support flexible filtering by date range (Today, This Week, This Month, Last Month, This Year, Custom Range), class, and section.
- **Role-Based Access Control (RBAC):** Granular dashboard routing and permission handling per role.

### 👨‍🏫 Teacher Module
- **Notice Board:** View all active school announcements targeted at the teacher role or everyone.
- **Post Announcements:** Publish notices directly from the dashboard with **multi-audience targeting** (Everyone, or any combination of Students, Teachers, and Accounts). Selecting all roles automatically normalizes to "Everyone".
- **Smart Filtering:** Attendance and assignment dropdowns automatically filter to show only the classes/sections assigned to the teacher.
- **Robust Attendance Tracking:**
  - Mark daily attendance (Present/Absent) with "Mark All Present / Absent" bulk action.
  - Multi-state attendance flow: Save Temp (draft) → Lock (prevents accidental edits) → Final Save (permanent).
  - Unlock support to correct locked records before finalization.
  - Automatic browser warning if exiting with unsaved changes.
  - Auto-finalization of locked attendance records after 48 hours.
- **Timetable View:** Personal weekly teaching schedule showing assigned classes, sections, subjects, and periods.
- **Academics View:** Read-only view of all assigned classes and sections with enrolled student counts.
- **Assignments:** Create assignments with title, description, section, due date, and optional file attachment. View per-assignment student submission lists and download submitted files.

### 🎓 Student Module
- **Notice Board:** View all active school announcements targeted at the student role or everyone.
- **Academics Dashboard:** Tailored, read-only grid view displaying enrolled subjects and assigned teachers.
- **Timetable:** View personal daily and weekly class schedule.
- **Assignments:** Download assignment files and submit homework documents by uploading files against due assignments.
- **Fees:** View personal fee invoice history and payment status.

### 💳 Accounts Module
- **Notice Board:** View all active school announcements on the dashboard.
- **Fee Summary:** Table view of all students with fee status (Paid, Pending, Partially Paid, Overdue), total amount, amount paid, and due amount.
- **Invoice Generation:** Create fee invoices per student per month/year with optional due date and remarks. Auto-generated invoice numbers.
- **Payment Recording:** Log payments against invoices with payment mode, reference number, and remarks. Fee status updates automatically.
- **Transaction History:** Chronological log of all invoices and payments across the school, filterable by student.
- **Invoice & Receipt PDF:** Generate and download formatted PDF invoices and payment receipts. Invoices include the school logo, invoice number, billing period, payment status watermark (PAID / PARTIALLY PAID / PENDING), and a QR code. Previewed inline on desktop; downloadable on mobile.
- **UPI Payment Verification:** Review and approve or reject UPI payment proofs (UTR number + optional screenshot) submitted by students.
- **"Added By" Tracking:** All fee transactions record which staff member created them. This field is exclusively visible to Accounts users.
- **Fee Reports:** Dedicated fee reporting tab — collection summary (expected, collected, outstanding, collection rate), payment method breakdown by mode, and a fee defaulters table with overdue day tracking. Filterable by date range, class, and section.

---

## 🏗️ Backend Architecture
- **Entry Point Separation:** `server.js` handles server startup, cron initialization, and web push setup. `app.js` owns Express configuration, middleware, routing, and global error handling.
- **Centralized Route Registry:** All API routes are consolidated in `src/routes/index.routes.js` and mounted to `/api` from `app.js`, eliminating import clutter from the entry point.
- **Service → Repository Pattern:** Business logic is encapsulated in dedicated service classes; data access is isolated in repository classes (e.g., `AttendanceReportRepository`, `FeeReportRepository`).
- **Report Engine:** A dedicated `ReportEngine` and `ReportDTOs` layer standardizes report data aggregation and formatting across all report types.

---

## 💻 Tech Stack
- **Frontend**: `React (Vite)` • `Zustand` • `TailwindCSS v4`
- **Backend**: `Node.js` • `Express`
- **Database**: `PostgreSQL` with `Prisma ORM`
- **Cloud Storage**: `Cloudinary`

---

## 🔌 API Reference
For a full reference of all backend REST API endpoints — including request/response shapes, query parameters, authentication requirements, and error codes — see [API_DOCS](./backend/API_DOCS.md).

---

## 🚀 Getting Started
1. Clone the repository.
2. Run `npm install` in both `/frontend` and `/backend` directories.
3. Configure your `.env` in the `/backend` using `.env.example`.
4. Run `node prisma/seed.js` in the `/backend` to populate demo data.
5. Start the backend: `npm run dev` in `/backend`.
6. Start the frontend: `npm run dev` in `/frontend`.

---

> [!NOTE]
> Request `credentials.md` for demo user logins.