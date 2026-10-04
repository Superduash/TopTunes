const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User, PlaybackState } = require('../models');
const { serializeUser } = require('../utils/serializers');

function signToken(userId) {
  return jwt.sign(
    { sub: userId.toString(), id: userId.toString() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict('An account with this email address already exists.');
  }

  const passwordHash = await User.hashPassword(password);

  // Derive initial avatar seed from initials
  const initials = name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const avatarColors = ['#ffb224', '#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f97316'];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: passwordHash,
    avatarColor: avatarColor,
    avatarSeed: initials
  });

  // Create initial PlaybackState for the user
  await PlaybackState.create({
    user: user._id,
    queue: [],
    currentIndex: 0,
    position: 0,
    volume: 0.8
  });

  const token = signToken(user._id);

  return {
    user: serializeUser(user),
    token: token
  };
}

async function login({ email, password }) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const token = signToken(user._id);

  return {
    user: serializeUser(user),
    token: token
  };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User not found.');
  }
  return serializeUser(user);
}

module.exports = {
  signToken,
  register,
  login,
  getMe
};
