require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cronJob = require('./utils/cron.js')

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV==="production") {
    cronJob.start();
}

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'School ERP API is running' });
});

// Import and use routes here
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/schools', require('./routes/school.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/classes', require('./routes/class.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/notices', require('./routes/notice.routes'));
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/fees', require('./routes/fee.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/timetable', require('./routes/timeTable.routes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/bugs', require('./routes/bugRoutes'));

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
