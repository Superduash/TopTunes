const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User } = require('../models');

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'bearer')) {
    return parts[1];
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next(ApiError.unauthorized('Authentication token is missing.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Session has expired. Please log in again.'));
      }
      return next(ApiError.unauthorized('Invalid authentication token.'));
    }

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      return next(ApiError.unauthorized('Invalid token payload.'));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(ApiError.unauthorized('User account associated with this token no longer exists.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const userId = decoded.sub || decoded.id;
      if (userId) {
        const user = await User.findById(userId);
        req.user = user || null;
      } else {
        req.user = null;
      }
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user || req.user.role !== 'admin') {
      return next(ApiError.forbidden('Admin privileges required for this action.'));
    }
    next();
  });
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireAdmin
};
