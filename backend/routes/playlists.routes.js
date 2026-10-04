const express = require('express');
const { body } = require('express-validator');
const playlistsController = require('../controllers/playlists.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const createPlaylistValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Playlist name is required')
    .isLength({ min: 1, max: 60 }).withMessage('Playlist name must be between 1 and 60 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
  validate
];

const updatePlaylistValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 60 }).withMessage('Playlist name must be between 1 and 60 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Description cannot exceed 300 characters'),
  validate
];

// Authenticated endpoints
router.get('/', requireAuth, playlistsController.getPlaylists);
router.post('/', requireAuth, createPlaylistValidation, playlistsController.createPlaylist);

// Playlist detail (optional auth for guest viewing, attaches isOwner and liked flags for authed)
router.get('/:id', optionalAuth, playlistsController.getPlaylistById);
router.patch('/:id', requireAuth, updatePlaylistValidation, playlistsController.updatePlaylist);
router.delete('/:id', requireAuth, playlistsController.deletePlaylist);

// Playlist song operations
router.post('/:id/songs', requireAuth, playlistsController.addSongToPlaylist);
router.put('/:id/songs/:songId', requireAuth, playlistsController.addSongToPlaylist);
router.delete('/:id/songs/:songId', requireAuth, playlistsController.removeSongFromPlaylist);

// Suggestions
router.get('/:id/suggestions', optionalAuth, playlistsController.getSuggestions);

module.exports = router;
