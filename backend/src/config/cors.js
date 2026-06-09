/**
 * cors.js — Production-grade CORS configuration for Express
 *
 * Supports:
 *  - Environment-aware allowed origins (dev vs prod)
 *  - Credentialed requests (cookies, Authorization headers)
 *  - Preflight caching
 *  - Strict method/header allowlists
 *  - Origin spoofing protection (rejects wildcard when credentials are used)
 */

import { config } from './env.js';

const PROD_ORIGINS = [
  "https://kumarprakhar.online",
  "https://www.kumarprakhar.online",
  "https://erp.kumarprakhar.online",
  "https://www.erp.kumarprakhar.online",
];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
];

const ALLOWED_ORIGINS =
  config.nodeEnv === "production"
    ? PROD_ORIGINS
    : [...PROD_ORIGINS, ...DEV_ORIGINS];

/**
 * Validates a request Origin against the allowlist.
 * Returns the origin string if allowed, false otherwise.
 *
 * IMPORTANT: When credentials: true, the CORS spec forbids the wildcard "*".
 * We must explicitly echo back the allowed origin instead.
 */
function originValidator(requestOrigin, callback) {
  // Allow server-to-server requests (e.g. curl, Postman, same-origin)
  // that send no Origin header at all.
  if (!requestOrigin) return callback(null, true);

  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return callback(null, requestOrigin); // echo back the exact origin
  }

  console.warn(
    `[CORS BLOCKED] ${requestOrigin}`
  );

  const err = new Error(`CORS: Origin '${requestOrigin}' is not allowed.`);
  err.status = 403;
  callback(err);
}

const corsOptions = {
  origin: originValidator,

  // Only allow the HTTP methods your API actually uses.
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // Headers the CLIENT is allowed to send.
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-CSRF-Token",
  ],

  // Headers the CLIENT is allowed to READ from the response.
  // Extend this list only as needed (e.g. "X-RateLimit-Remaining").
  exposedHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining"],

  // Required for cookies / Authorization headers to be sent cross-origin.
  // When true, the origin MUST NOT be "*" — handled above in originValidator.
  credentials: true,

  // Cache preflight (OPTIONS) response for 10 minutes (600 seconds).
  // Reduces latency; lower this during development if you change headers often.
  maxAge: 600,

  // Automatically respond to OPTIONS preflight requests.
  optionsSuccessStatus: 204,
};

export default corsOptions;