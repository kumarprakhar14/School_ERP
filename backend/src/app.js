import express from 'express';
import cors from 'cors';
import corsOptions from './config/cors.js';
import morgan from 'morgan';

import apiRoutes from './routes/index.routes.js';
import { requestContextMiddleware } from './middlewares/requestContext.middleware.js';
import { reportError } from './services/errorReportingService.js';
import { getContext } from './utils/requestContext.js';

const app = express();

app.use(requestContextMiddleware);

app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));  // not needed for now. include Per-request savings when required.

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'SchoolChakra API is running' });
});


// Import and use routes here
app.use('/api', apiRoutes);

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
  const contextStore = getContext();
  // Non-blocking fire-and-forget
  reportError(err, contextStore).catch(() => {});

  res.status(500).json({
    message: 'An unexpected server error occurred. Please try again later.'
  });
});

export default app;
