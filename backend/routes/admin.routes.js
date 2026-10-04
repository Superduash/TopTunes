const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth');
const { uploadAudio, uploadCover } = require('../middleware/upload');

// Require Admin authorization for all endpoints in this router
router.use(requireAdmin);

router.post('/songs', adminController.createSong);
router.patch('/songs/:id', adminController.updateSong);
router.delete('/songs/:id', adminController.deleteSong);
router.post('/songs/:id/audio', uploadAudio.single('audio'), adminController.uploadAudio);
router.post('/songs/:id/cover', uploadCover.single('cover'), adminController.uploadCover);

module.exports = router;
