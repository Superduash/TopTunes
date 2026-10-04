const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Song, Artist, Album, Genre, User, Playlist, PlaybackState } = require('../models');
const ApiError = require('../utils/ApiError');
const { serializeSong } = require('../utils/serializers');

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

  async setAudioUrl(songId, audioUrl) {
    const song = await Song.findById(songId);
    if (!song) throw ApiError.notFound('Song not found');
    song.audioUrl = audioUrl;
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
}

module.exports = new AdminService();
