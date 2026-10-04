const asyncHandler = require('../utils/asyncHandler');
const usersService = require('../services/users.service');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await usersService.getProfile(req.user._id);
  res.status(200).json({
    data: profile
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, preferences, avatarColor } = req.body;
  const updated = await usersService.updateProfile(req.user._id, { name, preferences, avatarColor });
  res.status(200).json({
    data: updated
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await usersService.changePassword(req.user._id, { currentPassword, newPassword });
  res.status(204).send();
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
