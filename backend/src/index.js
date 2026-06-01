import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cronJob from './utils/cron.js';

import authRoutes from './routes/auth.routes.js';
import schoolRoutes from './routes/school.routes.js';
import userRoutes from './routes/user.routes.js';
import classRoutes from './routes/class.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import noticeRoutes from './routes/notice.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import feeRoutes from './routes/fee.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import importRoutes from './routes/import.routes.js';
import bugRoutes from './routes/bug.routes.js';

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));  // not needed for now. include Per-request savings when required.

if (process.env.NODE_ENV==="production") {
    cronJob.start();
}

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'School ERP API is running' });
});

// Import and use routes here
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/import', importRoutes);
app.use('/api/bugs', bugRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'API Endpoint Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Always log the full error for server-side debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  // 1. Our own AppError subclasses (isOperational = true) — safe to send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // 2. Zod validation errors (from middleware or thrown manually)
  if (err.name === 'ZodError') {
    const fieldErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({ message: 'Validation failed', errors: fieldErrors });
  }

  // 3. Prisma known error codes — translate to client-friendly messages
  if (err.code === 'P2002') {
    // Unique constraint violation
    const target = err.meta?.target;
    let field = 'record';
    if (Array.isArray(target)) field = target.join(', ');
    else if (typeof target === 'string') field = target;
    return res.status(409).json({ message: `A record with this ${field} already exists.` });
  }
  if (err.code === 'P2003') {
    // Foreign key constraint failure
    return res.status(400).json({ message: 'Cannot complete this action because it references related records. Please remove dependent data first.' });
  }
  if (err.code === 'P2025') {
    // Record not found
    return res.status(404).json({ message: 'The requested record was not found.' });
  }

  // 4. Unknown / unexpected errors — NEVER leak internals to the client
  res.status(500).json({
    message: 'An unexpected server error occurred. Please try again later.'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
