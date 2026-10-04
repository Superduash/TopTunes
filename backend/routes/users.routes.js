const express = require('express');
const { body } = require('express-validator');
const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('preferences')
    .optional()
    .isObject().withMessage('Preferences must be an object'),
  body('avatarColor')
    .optional()
    .isString().withMessage('Avatar color must be a valid string'),
  validate
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long'),
  validate
];

router.use(requireAuth);

router.get('/me', usersController.getProfile);
router.patch('/me', updateProfileValidation, usersController.updateProfile);
router.patch('/me/password', changePasswordValidation, usersController.changePassword);

module.exports = router;
