/**
 * Utility to log slow database queries for Reports and other performance-sensitive areas.
 */

export const queryLogger = {
  log: (queryName, durationMs, context = {}) => {
    if (durationMs > 2000) {
      console.error(`[QUERY ERROR] ${queryName} took ${durationMs}ms`, context);
    } else if (durationMs > 500) {
      console.warn(`[QUERY WARN] ${queryName} took ${durationMs}ms`, context);
    } else {
      // Optional debug logging for fast queries could be enabled here if needed
      // console.debug(`[QUERY INFO] ${queryName} took ${durationMs}ms`, context);
    }
  },

  /**
   * Wraps an asynchronous operation to measure its execution time and log if it's slow.
   * @param {string} queryName Name of the query for logging purposes
   * @param {Function} asyncFn The asynchronous function to execute
   * @param {Object} context Additional context (e.g., schoolId, filters) to include in logs
   */
  measure: async (queryName, asyncFn, context = {}) => {
    const start = Date.now();
    try {
      return await asyncFn();
    } finally {
      const durationMs = Date.now() - start;
      queryLogger.log(queryName, durationMs, context);
    }
  }
};
