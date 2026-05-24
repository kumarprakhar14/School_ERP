# School ERP Platform

A modern, multi-tenant SaaS application for managing multiple schools, their students, teachers, academics, and finances.

## Features
- **Multi-Tenancy**: Centralized super-admin panel to manage multiple schools, handle licensing, and expire subscriptions.
- **Dynamic Theming**: Each school can set a custom brand color that instantly propagates across the entire dashboard.
- **Role-Based Access Control**: Granular dashboards and permissions for Admins, Teachers, Students, and Accounts.
- **Academics & Attendance**: Create classes, sections, and track daily attendance.
- **Assignments**: Cloudinary-integrated file uploads for homework assignments and student submissions.
- **Fees Management**: Generate fee records and mark them as paid.

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

Check `credentials.md` for demo user logins.
