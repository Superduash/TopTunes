const ApiError = require('../utils/ApiError');
const { User, Playlist, Song } = require('../models');
const { serializeUser } = require('../utils/serializers');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return serializeUser(user);
}

async function updateProfile(userId, { name, preferences, avatarColor }) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (name !== undefined) {
    user.name = name.trim();
    // Update avatarSeed initials if name changed
    user.avatarSeed = user.name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  if (preferences !== undefined) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  if (avatarColor !== undefined) {
    user.avatarColor = avatarColor;
  }

  await user.save();
  return serializeUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect.', [
      { field: 'currentPassword', message: 'Current password is incorrect' }
    ]);
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return true;
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
