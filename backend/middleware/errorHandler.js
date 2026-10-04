const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  let error = err;

  // Convert Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map(e => ({
      field: e.path,
      message: e.message
    }));
    error = ApiError.badRequest('Validation failed', details);
  }
  // Convert Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    error = ApiError.notFound(`Invalid ${err.path}: ${err.value}`);
  }
  // Convert Mongoose Duplicate Key Error (11000)
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`An account or entry with this ${field} already exists.`);
  }
  // Convert JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authentication token.');
  } else if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Your session has expired. Please log in again.');
  }
  // Fallback to internal error if not an instance of ApiError
  else if (!(error instanceof ApiError)) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    error = new ApiError(statusCode, 'SERVER_ERROR', message);
  }

  const response = {
    error: {
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Internal server error',
      details: error.details || []
    }
  };

  if (env.isDev && error.statusCode === 500) {
    response.error.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
}

module.exports = {
  notFound,
  errorHandler
};
