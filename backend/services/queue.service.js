const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { PlaybackState, Song, User } = require('../models');
const { serializePlaybackState, serializeSong } = require('../utils/serializers');

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

async function getPlaybackState(user) {
  let state = await PlaybackState.findOne({ user: user._id })
    .populate({
      path: 'queue',
      populate: [
        { path: 'artist', select: 'name bio hue shape' },
        { path: 'album', select: 'title year hue shape' },
        { path: 'genre', select: 'name slug color' }
      ]
    })
    .populate({
      path: 'currentSong',
      populate: [
        { path: 'artist', select: 'name bio hue shape' },
        { path: 'album', select: 'title year hue shape' },
        { path: 'genre', select: 'name slug color' }
      ]
    });

  if (!state) {
    state = await PlaybackState.create({
      user: user._id,
      queue: [],
      currentIndex: 0,
      position: 0,
      volume: 0.8
    });
  }

  const likedSongIds = await getUserLikedSongIds(user);
  return serializePlaybackState(state, {
    likedSongIds: likedSongIds
  });
}

async function updatePlaybackState(user, updateData = {}) {
  const {
    queue,
    currentIndex,
    currentSong,
    position,
    shuffle,
    repeat,
    volume
  } = updateData;

  let state = await PlaybackState.findOne({ user: user._id });
  if (!state) {
    state = new PlaybackState({ user: user._id });
  }

  if (Array.isArray(queue)) {
    // Extract valid ObjectIds and filter valid songs
    const extractedIds = queue
      .map(item => (typeof item === 'object' && item !== null ? (item.id || item._id) : item))
      .filter(id => id && isValidObjectId(id))
      .slice(0, 200); // Cap at 200

    state.queue = extractedIds;
  }

  if (typeof currentIndex === 'number') {
    state.currentIndex = Math.max(0, currentIndex);
  }

  if (currentSong) {
    const csId = typeof currentSong === 'object' ? (currentSong.id || currentSong._id) : currentSong;
    if (isValidObjectId(csId)) {
      state.currentSong = csId;
    }
  }

  if (typeof position === 'number') {
    state.position = Math.max(0, position);
  }

  if (typeof shuffle === 'boolean') {
    state.shuffle = shuffle;
  }

  if (repeat && ['off', 'all', 'one'].includes(repeat)) {
    state.repeat = repeat;
  }

  if (typeof volume === 'number') {
    state.volume = Math.min(1, Math.max(0, volume));
  }

  await state.save();
  return getPlaybackState(user);
}

async function addToQueue(user, { songId, next = false }) {
  if (!isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const song = await Song.findById(songId);
  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  let state = await PlaybackState.findOne({ user: user._id });
  if (!state) {
    state = new PlaybackState({ user: user._id, queue: [] });
  }

  if (next) {
    const insertPos = (state.currentIndex || 0) + 1;
    state.queue.splice(insertPos, 0, song._id);
  } else {
    state.queue.push(song._id);
  }

  // Cap at 200
  if (state.queue.length > 200) {
    state.queue = state.queue.slice(0, 200);
  }

  await state.save();
  return getPlaybackState(user);
}

async function removeFromQueue(user, songId) {
  if (!isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const state = await PlaybackState.findOne({ user: user._id });
  if (state) {
    const songIdStr = songId.toString();
    state.queue = state.queue.filter(id => id.toString() !== songIdStr);
    await state.save();
  }

  return getPlaybackState(user);
}

async function clearQueue(user) {
  const state = await PlaybackState.findOne({ user: user._id });
  if (state) {
    state.queue = [];
    state.currentIndex = 0;
    state.position = 0;
    state.currentSong = null;
    await state.save();
  }
  return true;
}

module.exports = {
  getPlaybackState,
  updatePlaybackState,
  addToQueue,
  removeFromQueue,
  clearQueue
};
