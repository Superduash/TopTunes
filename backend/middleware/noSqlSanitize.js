const ApiError = require('../utils/ApiError');

function isPlainObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function sanitizeObject(obj) {
  if (!obj) return;
  
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      throw ApiError.badRequest('Invalid parameter key containing prohibited characters');
    }
    if (isPlainObject(obj[key])) {
      sanitizeObject(obj[key]);
    }
  }
}

function noSqlSanitize(req, res, next) {
  try {
    if (req.body && isPlainObject(req.body)) {
      sanitizeObject(req.body);
    }
    if (req.query && isPlainObject(req.query)) {
      sanitizeObject(req.query);
    }
    if (req.params && isPlainObject(req.params)) {
      sanitizeObject(req.params);
    }

    // Ensure email, q, and id fields if present in query or body are strings and not objects
    if (req.query) {
      if (req.query.q !== undefined && typeof req.query.q !== 'string') {
        throw ApiError.badRequest('Query parameter "q" must be a string');
      }
      if (req.query.email !== undefined && typeof req.query.email !== 'string') {
        throw ApiError.badRequest('Query parameter "email" must be a string');
      }
    }
    if (req.body) {
      if (req.body.email !== undefined && typeof req.body.email !== 'string') {
        throw ApiError.badRequest('Body parameter "email" must be a string');
      }
      if (req.body.password !== undefined && typeof req.body.password !== 'string') {
        throw ApiError.badRequest('Body parameter "password" must be a string');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = noSqlSanitize;
