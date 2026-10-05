/**
 * TopTunes — Catalog Restore Script
 *
 * Scans storage/audio/ for orphaned MP3 files (files that exist on disk but
 * have no matching Song document in the DB). For each orphaned file it:
 *   1. Reads embedded ID3 tags (title, artist, genre, duration) via music-metadata
 *   2. Matches a cover image from storage/covers/ by timestamp prefix
 *   3. Creates the necessary Artist / Genre / Song documents
 *
 * Runs automatically from server.js after the normal seed step, or manually:
 *   node backend/seed/restore.js
 */

const fs   = require('fs');
const path = require('path');
const mm   = require('music-metadata');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../config/db');
const { Song, Artist, Genre } = require('../models');

const PROJECT_ROOT  = path.join(__dirname, '..', '..');
const AUDIO_DIR     = path.join(PROJECT_ROOT, 'storage', 'audio');
const COVERS_DIR    = path.join(PROJECT_ROOT, 'storage', 'covers');

async function upsertArtist(name) {
  const cleaned = (name || 'Unknown Artist').trim();
  const safe = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let artist = await Artist.findOne({ name: { $regex: new RegExp(`^${safe}$`, 'i') } });
  if (!artist) {
    artist = await Artist.create({ name: cleaned, hue: Math.floor(Math.random() * 360) });
  }
  return artist;
}

async function pickGenre(genreTag) {
  if (genreTag) {
    const cleaned = genreTag.trim();
    const safe = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slug = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const found = await Genre.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${safe}$`, 'i') } },
        { slug }
      ]
    });
    if (found) return found;
  }
  const all = await Genre.find();
  return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
}

function findMatchingCover(audioFilename) {
  const ts = audioFilename.split('-')[0];
  if (!ts || !fs.existsSync(COVERS_DIR)) return null;
  const coverFiles = fs.readdirSync(COVERS_DIR).filter(f =>
    f !== '.gitkeep' && f.startsWith(`embedded-${ts}`)
  );
  return coverFiles.length > 0 ? coverFiles[0] : null;
}

async function restoreCatalog(options = {}) {
  const { silent = false } = options;

  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  if (!fs.existsSync(AUDIO_DIR)) {
    if (!silent) console.log('[Restore] No audio storage directory found, skipping.');
    return { restored: 0, skipped: 0 };
  }

  const audioFiles = fs.readdirSync(AUDIO_DIR).filter(f =>
    f !== '.gitkeep' && /\.(mp3|flac|wav|ogg|aac|m4a)$/i.test(f)
  );

  if (audioFiles.length === 0) {
    if (!silent) console.log('[Restore] No audio files in storage/audio/, skipping.');
    return { restored: 0, skipped: 0 };
  }

  const existingSongs = await Song.find({}, 'audioUrl').lean();
  const existingUrls  = new Set(existingSongs.map(s => s.audioUrl).filter(Boolean));

  let restored = 0;
  let skipped  = 0;

  if (!silent) console.log(`[Restore] Scanning ${audioFiles.length} file(s) — ${existingSongs.length} already in DB...`);

  for (const audioFile of audioFiles) {
    const audioUrl = `/storage/audio/${audioFile}`;
    if (existingUrls.has(audioUrl)) { skipped++; continue; }

    const audioPath = path.join(AUDIO_DIR, audioFile);
    let meta = { common: {}, format: {} };
    try { meta = await mm.parseFile(audioPath, { skipCovers: false }); } catch (e) { /* ignore */ }

    const title      = meta.common.title  || `Track ${audioFile.split('-')[0].slice(-6)}`;
    const artistName = meta.common.artist || 'Unknown Artist';
    const genreTag   = meta.common.genre && meta.common.genre[0] ? meta.common.genre[0] : null;
    const duration   = meta.format && meta.format.duration ? Math.round(meta.format.duration) : 180;

    const artistDoc = await upsertArtist(artistName);
    const genreDoc  = await pickGenre(genreTag);
    const coverFile = findMatchingCover(audioFile);
    const coverUrl  = coverFile ? `/storage/covers/${coverFile}` : null;

    await Song.create({
      title,
      artist:    artistDoc._id,
      genre:     genreDoc ? genreDoc._id : null,
      duration,
      audioUrl,
      coverUrl,
      hue:       Math.floor(Math.random() * 360),
      shape:     Math.floor(Math.random() * 4),
      available: true
    });

    if (!silent) console.log(`[Restore]   + "${title}" by ${artistDoc.name}`);
    restored++;
  }

  if (!silent) {
    if (restored > 0) console.log(`[Restore] Restored ${restored} song(s) from disk.`);
    else console.log(`[Restore] All ${skipped} track(s) already in database.`);
  }

  return { restored, skipped };
}

if (require.main === module) {
  restoreCatalog({ silent: false })
    .then(r => { console.log(`Done. Restored: ${r.restored}, Skipped: ${r.skipped}`); return disconnectDB(); })
    .catch(err => { console.error('[Restore Fatal]:', err); process.exit(1); });
}

module.exports = restoreCatalog;
