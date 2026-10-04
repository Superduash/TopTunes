const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const storageDir = path.join(__dirname, '..', '..', 'storage');
const audioDir = path.join(storageDir, 'audio');
const coversDir = path.join(storageDir, 'covers');

// Ensure storage directories exist
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

// Audio Multer Config
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, safeName);
  }
});

const audioFilter = (req, file, cb) => {
  const allowedExts = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'];
  const ext = path.extname(file.originalname).toLowerCase();
  const isAudioMime = file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4' || file.mimetype === 'application/octet-stream';

  if (allowedExts.includes(ext) && isAudioMime) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Unsupported audio format (${ext}). Allowed: MP3, WAV, M4A, OGG, FLAC, AAC.`));
  }
};

const uploadAudio = multer({
  storage: audioStorage,
  fileFilter: audioFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Cover Image Multer Config
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coversDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, safeName);
  }
});

const coverFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Unsupported image format (${ext}). Allowed: JPG, PNG, WebP.`));
  }
};

const uploadCover = multer({
  storage: coverStorage,
  fileFilter: coverFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = {
  uploadAudio,
  uploadCover
};
