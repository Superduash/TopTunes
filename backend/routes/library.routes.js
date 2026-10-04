const express = require('express');
const libraryController = require('../controllers/library.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', libraryController.getLibrarySummary);
router.get('/liked', libraryController.getLikedSongs);
router.put('/liked/:songId', libraryController.likeSong);
router.delete('/liked/:songId', libraryController.unlikeSong);

router.get('/albums', libraryController.getSavedAlbums);
router.put('/albums/:albumId', libraryController.saveAlbum);
router.delete('/albums/:albumId', libraryController.unsaveAlbum);

router.get('/recent', libraryController.getRecentHistory);
router.post('/reset', libraryController.resetLibrary);

module.exports = router;
