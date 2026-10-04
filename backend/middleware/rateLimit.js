const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const authLimiter = rateLimit({
  windowMs: (env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000,
  max: env.RATE_LIMIT_MAX || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.rateLimited('Too many authentication attempts. Please try again later.'));
  }
});

module.exports = { authLimiter };
