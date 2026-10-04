const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const catalogRoutes = require('./catalog.routes');
const libraryRoutes = require('./library.routes');
const playlistsRoutes = require('./playlists.routes');
const queueRoutes = require('./queue.routes');
const searchRoutes = require('./search.routes');
const adminRoutes = require('./admin.routes');

// GET /api/health
router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    service: 'toptunes-api',
    db: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Mount modular sub-routers
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/library', libraryRoutes);
router.use('/playlists', playlistsRoutes);
router.use('/queue', queueRoutes);
router.use('/admin', adminRoutes);
router.use('/', searchRoutes);
router.use('/', catalogRoutes);

module.exports = router;
