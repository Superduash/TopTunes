const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { User, Song, Album, Playlist } = require('../models');
const { serializeSong, serializeAlbum, serializePlaylist } = require('../utils/serializers');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getLibrarySummary(user) {
  const userDoc = await User.findById(user._id)
    .populate({
      path: 'savedAlbums',
      populate: [{ path: 'artist', select: 'name' }, { path: 'genre', select: 'name slug' }]
    })
    .populate({
      path: 'savedPlaylists',
      populate: { path: 'songs.song', populate: { path: 'artist', select: 'name' } }
    })
    .populate({
      path: 'recentlyPlayed.song',
      populate: [{ path: 'artist', select: 'name' }, { path: 'genre', select: 'name slug' }]
    });

  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  // Also load all playlists owned by this user
  const ownedPlaylists = await Playlist.find({ owner: userDoc._id })
    .populate({ path: 'songs.song', populate: { path: 'artist', select: 'name' } })
    .sort({ createdAt: -1 });

  // Merge owned and saved playlists without duplicates
  const playlistMap = {};
  ownedPlaylists.forEach(p => {
    playlistMap[p._id.toString()] = p;
  });
  if (Array.isArray(userDoc.savedPlaylists)) {
    userDoc.savedPlaylists.forEach(p => {
      if (p && p._id) {
        playlistMap[p._id.toString()] = p;
      }
    });
  }

  const likedSongIds = (userDoc.likedSongs || []).map(id => id.toString());
  const savedAlbumIds = (userDoc.savedAlbums || []).map(a => (a._id || a).toString());
  const playlists = Object.values(playlistMap).map(p => serializePlaylist(p, {
    currentUserId: userDoc._id,
    likedSongIds: likedSongIds
  }));

  const historySongs = (userDoc.recentlyPlayed || [])
    .filter(item => item.song)
    .map(item => serializeSong(item.song, {
      liked: likedSongIds.includes(item.song._id.toString())
    }));

  return {
    likes: likedSongIds,
    library: likedSongIds, // Frontend treats likes as library songs
    albums: savedAlbumIds,
    savedAlbumsList: (userDoc.savedAlbums || []).filter(Boolean).map(a => serializeAlbum(a, { saved: true })),
    playlists: playlists,
    history: historySongs.map(s => s.id),
    historySongs: historySongs,
    listened: userDoc.listeningSeconds || 0,
    listeningSeconds: userDoc.listeningSeconds || 0
  };
}

async function getLikedSongs(user, { sort = 'recent', q } = {}) {
  const userDoc = await User.findById(user._id).populate({
    path: 'likedSongs',
    populate: [
      { path: 'artist', select: 'name bio hue shape' },
      { path: 'album', select: 'title year hue shape' },
      { path: 'genre', select: 'name slug color' }
    ]
  });

  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  let songs = (userDoc.likedSongs || []).filter(Boolean);

  if (q && typeof q === 'string' && q.trim()) {
    const term = q.trim().toLowerCase();
    songs = songs.filter(s => {
      const title = (s.title || '').toLowerCase();
      const artist = (s.artist?.name || '').toLowerCase();
      const album = (s.album?.title || '').toLowerCase();
      return title.includes(term) || artist.includes(term) || album.includes(term);
    });
  }

  // Sorting
  if (sort === 'title') {
    songs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sort === 'artist') {
    songs.sort((a, b) => (a.artist?.name || '').localeCompare(b.artist?.name || ''));
  } else if (sort === 'duration') {
    songs.sort((a, b) => (a.duration || 0) - (b.duration || 0));
  } else if (sort === 'plays' || sort === 'playCount') {
    songs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
  }
  // Default 'recent': retains userDoc.likedSongs array order (or reverse)

  return songs.map(s => serializeSong(s, { liked: true }));
}

async function likeSong(user, songId) {
  if (!isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const song = await Song.findById(songId);
  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  const userDoc = await User.findById(user._id);
  const songIdStr = song._id.toString();
  const alreadyLiked = userDoc.likedSongs.some(id => id.toString() === songIdStr);

  if (!alreadyLiked) {
    userDoc.likedSongs.push(song._id);
    await userDoc.save();

    song.likeCount = (song.likeCount || 0) + 1;
    await song.save();
  }

  return {
    songId: songIdStr,
    liked: true,
    likeCount: song.likeCount
  };
}

async function unlikeSong(user, songId) {
  if (!isValidObjectId(songId)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const song = await Song.findById(songId);
  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  const userDoc = await User.findById(user._id);
  const songIdStr = song._id.toString();
  const index = userDoc.likedSongs.findIndex(id => id.toString() === songIdStr);

  if (index !== -1) {
    userDoc.likedSongs.splice(index, 1);
    await userDoc.save();

    song.likeCount = Math.max(0, (song.likeCount || 0) - 1);
    await song.save();
  }

  return {
    songId: songIdStr,
    liked: false,
    likeCount: song.likeCount
  };
}

async function getSavedAlbums(user) {
  const userDoc = await User.findById(user._id).populate({
    path: 'savedAlbums',
    populate: [
      { path: 'artist', select: 'name bio hue shape' },
      { path: 'genre', select: 'name slug color' },
      { path: 'songs', populate: { path: 'artist', select: 'name' } }
    ]
  });

  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  const likedSongIds = (userDoc.likedSongs || []).map(id => id.toString());
  return (userDoc.savedAlbums || []).filter(Boolean).map(a => serializeAlbum(a, {
    saved: true,
    likedSongIds: likedSongIds
  }));
}

async function saveAlbum(user, albumId) {
  if (!isValidObjectId(albumId)) {
    throw ApiError.badRequest('Invalid album ID format');
  }

  const album = await Album.findById(albumId);
  if (!album) {
    throw ApiError.notFound('Album not found');
  }

  const userDoc = await User.findById(user._id);
  const albumIdStr = album._id.toString();
  const alreadySaved = userDoc.savedAlbums.some(id => id.toString() === albumIdStr);

  if (!alreadySaved) {
    userDoc.savedAlbums.push(album._id);
    await userDoc.save();
  }

  return {
    albumId: albumIdStr,
    saved: true
  };
}

async function unsaveAlbum(user, albumId) {
  if (!isValidObjectId(albumId)) {
    throw ApiError.badRequest('Invalid album ID format');
  }

  const album = await Album.findById(albumId);
  if (!album) {
    throw ApiError.notFound('Album not found');
  }

  const userDoc = await User.findById(user._id);
  const albumIdStr = album._id.toString();
  const index = userDoc.savedAlbums.findIndex(id => id.toString() === albumIdStr);

  if (index !== -1) {
    userDoc.savedAlbums.splice(index, 1);
    await userDoc.save();
  }

  return {
    albumId: albumIdStr,
    saved: false
  };
}

async function getRecentHistory(user) {
  const userDoc = await User.findById(user._id).populate({
    path: 'recentlyPlayed.song',
    populate: [
      { path: 'artist', select: 'name bio hue shape' },
      { path: 'album', select: 'title year hue shape' },
      { path: 'genre', select: 'name slug color' }
    ]
  });

  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  const likedSongIds = (userDoc.likedSongs || []).map(id => id.toString());
  return (userDoc.recentlyPlayed || [])
    .filter(item => item.song)
    .map(item => serializeSong(item.song, {
      liked: likedSongIds.includes(item.song._id.toString())
    }));
}

async function resetLibrary(user) {
  const userDoc = await User.findById(user._id);
  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  // Clear user collections
  userDoc.likedSongs = [];
  userDoc.savedAlbums = [];
  userDoc.savedPlaylists = [];
  userDoc.recentlyPlayed = [];
  userDoc.listeningSeconds = 0;
  await userDoc.save();

  // Delete all playlists owned by this user
  await Playlist.deleteMany({ owner: userDoc._id });

  return true;
}

module.exports = {
  getLibrarySummary,
  getLikedSongs,
  likeSong,
  unlikeSong,
  getSavedAlbums,
  saveAlbum,
  unsaveAlbum,
  getRecentHistory,
  resetLibrary
};
