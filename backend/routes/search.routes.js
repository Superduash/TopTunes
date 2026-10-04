const express = require('express');
const searchController = require('../controllers/search.controller');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/search', optionalAuth, searchController.search);
router.get('/browse', optionalAuth, searchController.getBrowse);
router.get('/stats/me', requireAuth, searchController.getMyStats);
router.get('/stats/songs/top', optionalAuth, searchController.getTopSongs);

module.exports = router;
