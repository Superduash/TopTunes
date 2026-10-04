const express = require('express');
const { query, param, body } = require('express-validator');
const catalogController = require('../controllers/catalog.controller');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(optionalAuth);

// Bootstrap full catalog
router.get('/catalog', catalogController.getCatalog);

// Songs
router.get(
  '/songs',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    validate
  ],
  catalogController.getSongs
);

router.get('/songs/:id', catalogController.getSongById);

router.post(
  '/songs/:id/play',
  [
    body('seconds').optional().isNumeric().withMessage('Seconds must be a number'),
    validate
  ],
  catalogController.recordPlay
);

// Artists
router.get('/artists', catalogController.getArtists);
router.get('/artists/:id', catalogController.getArtistById);

// Albums
router.get('/albums', catalogController.getAlbums);
router.get('/albums/:id', catalogController.getAlbumById);

// Genres
router.get('/genres', catalogController.getGenres);

module.exports = router;
