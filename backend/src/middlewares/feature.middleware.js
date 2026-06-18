import { loadFeatureContext } from '../services/featureContextLoader.js';
import { evaluateAccess } from '../services/featureEvaluator.js';

/**
 * Express middleware to enforce feature access controls.
 * 
 * Can be called with a simple string:
 *   requireFeature('attendance')
 * 
 * Or with an options object for extensibility:
 *   requireFeature({ feature: 'attendance', minimumLimit: 100 })
 * 
 * @param {string|Object} options 
 */
export const requireFeature = (options) => {
  return async (req, res, next) => {
    try {
      const featureKey = typeof options === 'string' ? options : options.feature;
      const schoolId = req.user?.schoolId;

      // If there is no school context (e.g. Super Admin global action), we handle accordingly.
      // Typically, features are evaluated in the context of a school.
      if (!schoolId) {
        // Option 1: Allow Super Admins unrestricted access globally
        if (req.user?.role === 'SUPER_ADMIN') {
           return next();
        }
        return res.status(403).json({
          error: 'Feature evaluation requires a school context',
          code: 'MISSING_SCHOOL_CONTEXT'
        });
      }

      const context = await loadFeatureContext(schoolId);
      const resolution = evaluateAccess(context, featureKey);

      if (!resolution.enabled) {
        return res.status(403).json({
          error: 'Feature Not Available',
          resolution
        });
      }

      // Extensibility hook: check minimum limit if requested
      if (typeof options === 'object' && options.minimumLimit) {
        const value = resolution.limit?.value;
        if (value !== undefined && value !== null && value < options.minimumLimit) {
           return res.status(403).json({
             error: 'Feature Limit Exceeded',
             resolution,
             requiredLimit: options.minimumLimit
           });
        }
      }

      // Attach the full resolution object to the request so subsequent controllers can use it
      req.feature = resolution;
      
      next();
    } catch (err) {
      // Pass unexpected internal errors to the global error handler
      next(err);
    }
  };
};
