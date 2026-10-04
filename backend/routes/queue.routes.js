const express = require('express');
const queueController = require('../controllers/queue.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', queueController.getPlaybackState);
router.put('/', queueController.updatePlaybackState);
router.post('/add', queueController.addToQueue);
router.delete('/:songId', queueController.removeFromQueue);
router.delete('/', queueController.clearQueue);

module.exports = router;
