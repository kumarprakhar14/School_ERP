import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../utils/requestContext.js';

/**
 * Middleware to initialize the AsyncLocalStorage context for each request.
 */
export const requestContextMiddleware = (req, res, next) => {
  const store = new Map();
  
  // Generate or extract a Request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Pre-populate useful request metadata
  store.set('requestId', requestId);
  store.set('timestamp', new Date().toISOString());
  
  // Store a reference to the request object so we can access dynamic properties
  // like body, params, query, and user which might be added by subsequent middlewares.
  store.set('req', req);

  // Expose request ID in response header
  res.setHeader('X-Request-Id', requestId);

  // Run the rest of the request lifecycle within this context
  requestContext.run(store, () => {
    next();
  });
};
