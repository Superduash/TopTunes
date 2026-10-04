const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const details = errors.array().map(err => ({
    field: err.path || err.param,
    message: err.msg
  }));

  const primaryMessage = details[0]?.message || 'Validation failed';
  next(ApiError.badRequest(primaryMessage, details));
}

module.exports = validate;
