/**
 * Express async controller wrapper to forward exceptions to the next() error handler.
 * @param {Function} fn Async controller function (req, res, next)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
