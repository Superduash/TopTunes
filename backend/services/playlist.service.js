const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Playlist, Song, User } = require('../models');
const { serializePlaylist, serializeSong } = require('../utils/serializers');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getUserLikedSongIds(user) {
  if (!user) return [];
  if (Array.isArray(user.likedSongs) && user.likedSongs.length > 0) {
    return user.likedSongs.map(id => id.toString());
  }
  const freshUser = await User.findById(user._id || user.id).select('likedSongs');
  return freshUser?.likedSongs?.map(id => id.toString()) || [];
}

async function getPlaylists(user) {
  const userDoc = await User.findById(user._id).select('savedPlaylists');
  const savedIds = (userDoc?.savedPlaylists || []).map(id => id.toString());

  const playlists = await Playlist.find({
    $or: [
      { owner: user._id },
      { _id: { $in: userDoc?.savedPlaylists || [] } }
    ]
  })
    .populate('owner', 'name')
    .populate({
      path: 'songs.song',
      populate: [{ path: 'artist', select: 'name' }, { path: 'genre', select: 'name slug' }]
    })
    .sort({ createdAt: -1 });

  const likedSongIds = await getUserLikedSongIds(user);

  return playlists.map(p => serializePlaylist(p, {
    currentUserId: user._id,
    likedSongIds: likedSongIds
  }));
}

async function createPlaylist(user, { name, description = '' }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw ApiError.badRequest('Playlist name is required');
  }

  const hues = [335, 18, 265, 190, 215, 155, 45, 130];
  const randomHue = hues[Math.floor(Math.random() * hues.length)];
  const randomShape = Math.floor(Math.random() * 4);

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: user._id,
    songs: [],
    hue: randomHue,
    shape: randomShape
  });

  // Add to user's savedPlaylists
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { savedPlaylists: playlist._id }
  });

  return serializePlaylist(playlist, {
    currentUserId: user._id,
    likedSongIds: await getUserLikedSongIds(user)
  });
}

async function getPlaylistById(id, user = null) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid playlist ID format');
  }

  const playlist = await Playlist.findById(id)
    .populate('owner', 'name')
    .populate({
      path: 'songs.song',
      populate: [
        { path: 'artist', select: 'name bio hue shape' },
        { path: 'album', select: 'title year hue shape' },
        { path: 'genre', select: 'name slug color' }
      ]
    });

  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }

  const likedSongIds = await getUserLikedSongIds(user);
  return serializePlaylist(playlist, {
    currentUserId: user ? (user._id || user.id) : null,
    likedSongIds: likedSongIds
  });
}

async function updatePlaylist(id, user, { name, description }) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid playlist ID format');
  }

  const playlist = await Playlist.findById(id);
  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }

  if (playlist.owner.toString() !== user._id.toString()) {
    throw ApiError.forbidden('You do not have permission to edit this playlist');
  }

  if (name !== undefined) {
    if (!name.trim()) throw ApiError.badRequest('Playlist name cannot be empty');
    playlist.name = name.trim();
  }

  if (description !== undefined) {
    playlist.description = description.trim();
  }

  await playlist.save();
  return getPlaylistById(playlist._id, user);
}

async function deletePlaylist(id, user) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid playlist ID format');
  }

  const playlist = await Playlist.findById(id);
  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }

  if (playlist.owner.toString() !== user._id.toString()) {
    throw ApiError.forbidden('You do not have permission to delete this playlist');
  }

  await Playlist.findByIdAndDelete(id);

  // Remove from all users' savedPlaylists
  await User.updateMany(
    { savedPlaylists: id },
    { $pull: { savedPlaylists: id } }
  );

  return true;
}

async function addSongToPlaylist(id, songId, user) {
  if (!isValidObjectId(id) || !isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid ID format');
  }

  const [playlist, song] = await Promise.all([
    Playlist.findById(id),
    Song.findById(songId)
  ]);

  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }
  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  if (playlist.owner.toString() !== user._id.toString()) {
    throw ApiError.forbidden('You do not have permission to modify this playlist');
  }

  const songIdStr = song._id.toString();
  const alreadyInPlaylist = playlist.songs.some(
    item => item.song && item.song.toString() === songIdStr
  );

  if (!alreadyInPlaylist) {
    playlist.songs.push({
      song: song._id,
      addedAt: new Date()
    });
    await playlist.save();
  }

  return getPlaylistById(playlist._id, user);
}

async function removeSongFromPlaylist(id, songId, user) {
  if (!isValidObjectId(id) || !isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid ID format');
  }

  const playlist = await Playlist.findById(id);
  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }

  if (playlist.owner.toString() !== user._id.toString()) {
    throw ApiError.forbidden('You do not have permission to modify this playlist');
  }

  const songIdStr = songId.toString();
  playlist.songs = playlist.songs.filter(
    item => item.song && item.song.toString() !== songIdStr
  );

  await playlist.save();
  return getPlaylistById(playlist._id, user);
}

async function getSuggestions(id, user = null, { limit = 10 } = {}) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid playlist ID format');
  }

  const playlist = await Playlist.findById(id).populate('songs.song');
  if (!playlist) {
    throw ApiError.notFound('Playlist not found');
  }

  const existingSongIds = playlist.songs.map(item => item.song?._id).filter(Boolean);
  const existingGenres = playlist.songs.map(item => item.song?.genre).filter(Boolean);

  const limitNum = Math.min(50, Math.max(1, parseInt(limit || '10', 10)));

  // Find songs not in the playlist
  let suggestions = await Song.find({
    _id: { $nin: existingSongIds },
    available: true,
    ...(existingGenres.length > 0 ? { genre: { $in: existingGenres } } : {})
  })
    .populate('artist album genre')
    .sort({ playCount: -1 })
    .limit(limitNum);

  // If not enough suggestions from matching genres, backfill with top available songs
  if (suggestions.length < limitNum) {
    const additionalLimit = limitNum - suggestions.length;
    const additionalSongIds = [...existingSongIds, ...suggestions.map(s => s._id)];
    const backfill = await Song.find({
      _id: { $nin: additionalSongIds },
      available: true
    })
      .populate('artist album genre')
      .sort({ playCount: -1 })
      .limit(additionalLimit);
    suggestions = suggestions.concat(backfill);
  }

  const likedSongIds = await getUserLikedSongIds(user);
  return suggestions.map(s => serializeSong(s, {
    liked: likedSongIds.includes(s._id.toString())
  }));
}

module.exports = {
  getPlaylists,
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getSuggestions
};
