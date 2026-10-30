/**
 * Wraps an async route handler to catch errors and pass them to Express next().
 * @param {Function} fn
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
