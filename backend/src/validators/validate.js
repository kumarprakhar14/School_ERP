const { ZodError } = require('zod');

/**
 * Express middleware factory that validates request data against a Zod schema.
 * 
 * @param {Object} schemas - Object with optional `body`, `query`, `params` Zod schemas.
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   validate({ body: createUserSchema })
 *   validate({ body: schema, query: querySchema })
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error.name === 'ZodError' || error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        const fieldErrors = issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));

        return res.status(400).json({
          message: 'Validation failed',
          errors: fieldErrors
        });
      }
      next(error);
    }
  };
};

module.exports = { validate };
