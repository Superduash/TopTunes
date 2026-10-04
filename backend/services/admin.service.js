const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const { Song, Artist, Album, Genre, User, Playlist, PlaybackState } = require('../models');
const ApiError = require('../utils/ApiError');
const { serializeSong, serializeGenre } = require('../utils/serializers');

async function resolveArtist(artistInput) {
  if (!artistInput) throw ApiError.badRequest('Artist is required');
  if (mongoose.Types.ObjectId.isValid(artistInput)) {
    const found = await Artist.findById(artistInput);
    if (found) return found;
  }
  let artist = await Artist.findOne({ name: { $regex: new RegExp(`^${artistInput.trim()}$`, 'i') } });
  if (!artist) {
    const hue = Math.floor(Math.random() * 360);
    artist = await Artist.create({ name: artistInput.trim(), hue });
  }
  return artist;
}

async function resolveGenre(genreInput) {
  if (!genreInput) return null;
  if (mongoose.Types.ObjectId.isValid(genreInput)) {
    const found = await Genre.findById(genreInput);
    if (found) return found;
  }
  const slug = genreInput.trim().toLowerCase().replace(/\s+/g, '-');
  let genre = await Genre.findOne({ $or: [{ name: { $regex: new RegExp(`^${genreInput.trim()}$`, 'i') } }, { slug }] });
  if (!genre) {
    genre = await Genre.create({ name: genreInput.trim(), slug, color: '#ffb224' });
  }
  return genre;
}

async function resolveAlbum(albumInput, artistId, genreId) {
  if (!albumInput) return null;
  if (mongoose.Types.ObjectId.isValid(albumInput)) {
    const found = await Album.findById(albumInput);
    if (found) return found;
  }
  let album = await Album.findOne({ title: { $regex: new RegExp(`^${albumInput.trim()}$`, 'i') }, artist: artistId });
  if (!album) {
    album = await Album.create({
      title: albumInput.trim(),
      artist: artistId,
      genre: genreId || undefined,
      year: new Date().getFullYear()
    });
  }
  return album;
}

class AdminService {
  async createSong(songData) {
    const { title, artist: artistInput, album: albumInput, genre: genreInput, duration, trackNumber, available, hue, shape, audioUrl, coverUrl } = songData;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw ApiError.badRequest('Song title is required');
    }

    const artistDoc = await resolveArtist(artistInput);
    const genreDoc = genreInput ? await resolveGenre(genreInput) : null;
    const albumDoc = albumInput ? await resolveAlbum(albumInput, artistDoc._id, genreDoc ? genreDoc._id : null) : null;

    const parsedDuration = Number(duration) > 0 ? Number(duration) : 180;

    const song = await Song.create({
      title: title.trim(),
      artist: artistDoc._id,
      album: albumDoc ? albumDoc._id : null,
      genre: genreDoc ? genreDoc._id : null,
      duration: parsedDuration,
      trackNumber: Number(trackNumber) || 1,
      available: available !== false,
      hue: Number(hue) || 0,
      shape: Number(shape) || 0,
      audioUrl: audioUrl || null,
      coverUrl: coverUrl || null
    });

    const populated = await Song.findById(song._id).populate('artist album genre');
    return serializeSong(populated);
  }

  async updateSong(songId, songData) {
    const song = await Song.findById(songId);
    if (!song) throw ApiError.notFound('Song not found');

    const { title, artist: artistInput, album: albumInput, genre: genreInput, duration, available, audioUrl, coverUrl } = songData;

    if (title && typeof title === 'string' && title.trim()) {
      song.title = title.trim();
    }

    if (artistInput) {
      const artistDoc = await resolveArtist(artistInput);
      song.artist = artistDoc._id;
    }

    if (genreInput !== undefined) {
      const genreDoc = genreInput ? await resolveGenre(genreInput) : null;
      song.genre = genreDoc ? genreDoc._id : null;
    }

    if (albumInput !== undefined) {
      const albumDoc = albumInput ? await resolveAlbum(albumInput, song.artist, song.genre) : null;
      song.album = albumDoc ? albumDoc._id : null;
    }

    if (duration !== undefined && Number(duration) > 0) {
      song.duration = Number(duration);
    }

    if (available !== undefined) {
      song.available = !!available;
    }

    if (audioUrl !== undefined) {
      song.audioUrl = audioUrl;
    }

    if (coverUrl !== undefined) {
      song.coverUrl = coverUrl;
    }

    await song.save();
    const populated = await Song.findById(song._id).populate('artist album genre');
    return serializeSong(populated);
  }

  async deleteSong(songId) {
    const song = await Song.findById(songId);
    if (!song) throw ApiError.notFound('Song not found');

    // 1. Remove physical files if stored locally in /storage
    const projectRoot = path.join(__dirname, '..', '..');
    if (song.audioUrl && song.audioUrl.startsWith('/storage/audio/')) {
      const audioPath = path.join(projectRoot, song.audioUrl);
      if (fs.existsSync(audioPath)) {
        try { fs.unlinkSync(audioPath); } catch (e) { /* ignore */ }
      }
    }
    if (song.coverUrl && song.coverUrl.startsWith('/storage/covers/')) {
      const coverPath = path.join(projectRoot, song.coverUrl);
      if (fs.existsSync(coverPath)) {
        try { fs.unlinkSync(coverPath); } catch (e) { /* ignore */ }
      }
    }

    // 2. Cascade cleanup references safely
    await User.updateMany({}, {
      $pull: {
        likedSongs: song._id,
        recentlyPlayed: { song: song._id }
      }
    });

    await Playlist.updateMany({}, {
      $pull: { songs: { song: song._id } }
    });

    await PlaybackState.updateMany({ currentSong: song._id }, {
      $set: { currentSong: null }
    });

    await PlaybackState.updateMany({}, {
      $pull: { queue: song._id }
    });

    // 3. Delete song document
    await Song.findByIdAndDelete(song._id);

    return { id: songId, message: 'Song deleted successfully and references updated.' };
  }

  async inspectAudioFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw ApiError.badRequest('Audio file not found.');
    }
    const metadata = await mm.parseFile(filePath);
    let coverBase64 = null;
    let hasCover = false;

    if (metadata.common && metadata.common.picture && metadata.common.picture.length > 0) {
      const pic = metadata.common.picture[0];
      const mime = pic.format || 'image/jpeg';
      coverBase64 = `data:${mime};base64,${pic.data.toString('base64')}`;
      hasCover = true;
    }

    return {
      title: metadata.common.title || null,
      artist: metadata.common.artist || null,
      album: metadata.common.album || null,
      genre: (metadata.common.genre && metadata.common.genre.length > 0) ? metadata.common.genre[0] : null,
      duration: metadata.format && metadata.format.duration ? Math.round(metadata.format.duration) : null,
      hasCover,
      coverBase64
    };
  }

  async setAudioUrl(songId, audioUrl, filePath) {
    const song = await Song.findById(songId);
    if (!song) throw ApiError.notFound('Song not found');
    song.audioUrl = audioUrl;

    if (filePath && fs.existsSync(filePath)) {
      try {
        const metadata = await mm.parseFile(filePath);

        // Auto-extract embedded album cover art if song doesn't already have one
        if ((!song.coverUrl || song.coverUrl === '') && metadata.common && metadata.common.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          let ext = '.jpg';
          if (pic.format === 'image/png') ext = '.png';
          else if (pic.format === 'image/webp') ext = '.webp';

          const coverFileName = `embedded-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          const projectRoot = path.join(__dirname, '..', '..');
          const coversDir = path.join(projectRoot, 'storage', 'covers');
          if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

          const coverPath = path.join(coversDir, coverFileName);
          fs.writeFileSync(coverPath, pic.data);
          song.coverUrl = `/storage/covers/${coverFileName}`;
        }

        // Auto-update duration if parsed and song duration was default (180)
        if (metadata.format && metadata.format.duration && (!song.duration || song.duration === 180)) {
          song.duration = Math.round(metadata.format.duration);
        }
      } catch (err) {
        console.warn('[Audio Metadata Warning] Could not parse embedded tags:', err.message);
      }
    }

    await song.save();
    const populated = await Song.findById(song._id).populate('artist album genre');
    return serializeSong(populated);
  }

  async setCoverUrl(songId, coverUrl) {
    const song = await Song.findById(songId);
    if (!song) throw ApiError.notFound('Song not found');
    song.coverUrl = coverUrl;
    await song.save();
    const populated = await Song.findById(song._id).populate('artist album genre');
    return serializeSong(populated);
  }

  async createGenre(genreData) {
    const { name, color } = genreData;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw ApiError.badRequest('Genre name is required');
    }
    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let existing = await Genre.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } },
        { slug: slug || 'genre' }
      ]
    });
    if (existing) {
      throw ApiError.conflict(`Genre "${cleanName}" already exists`);
    }
    const genre = await Genre.create({
      name: cleanName,
      slug: slug || ('genre-' + Date.now()),
      color: color || '#ffb224'
    });
    return serializeGenre(genre);
  }

  async deleteGenre(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid genre ID');
    }
    const genre = await Genre.findById(id);
    if (!genre) throw ApiError.notFound('Genre not found');

    await Song.updateMany({ genre: genre._id }, { $set: { genre: null } });
    await Album.updateMany({ genre: genre._id }, { $set: { genre: null } });
    await Genre.findByIdAndDelete(genre._id);

    return { id, message: `Genre "${genre.name}" removed successfully` };
  }
}

module.exports = new AdminService();
