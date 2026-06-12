import { config } from './config/env.js';
import express from 'express';
import cors from 'cors';
import corsOptions from './config/cors.js';
import morgan from 'morgan';
import cronJob from './utils/cron.js';
import { initializeWebPush } from './services/notificationService.js';

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
import searchRoutes from './routes/search.routes.js';
import pushNotificationRoutes from './routes/pushNotification.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const app = express();

app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));  // not needed for now. include Per-request savings when required.

if (config.nodeEnv==="production") {
    cronJob.start();
}

// Initialize web-push VAPID credentials
initializeWebPush();

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'SchoolChakra API is running' });
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
app.use('/api/search', searchRoutes);
app.use('/api/push', pushNotificationRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'API Endpoint Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Always log the full error for server-side debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }

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

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
