const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Song, Album, Artist, Genre, User } = require('../models');
const {
  serializeSong,
  serializeAlbum,
  serializeArtist,
  serializeGenre
} = require('../utils/serializers');

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

async function getUserSavedAlbumIds(user) {
  if (!user) return [];
  if (Array.isArray(user.savedAlbums) && user.savedAlbums.length > 0) {
    return user.savedAlbums.map(id => id.toString());
  }
  const freshUser = await User.findById(user._id || user.id).select('savedAlbums');
  return freshUser?.savedAlbums?.map(id => id.toString()) || [];
}

async function getSongs(queryParams = {}, user = null) {
  const {
    q,
    genre,
    artist,
    album,
    available,
    sort = 'title',
    order = 'asc',
    page,
    limit
  } = queryParams;

  const filter = {};

  if (available !== undefined && available !== '') {
    filter.available = String(available).toLowerCase() === 'true';
  }

  if (q && typeof q === 'string' && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }

  if (genre) {
    if (isValidObjectId(genre)) {
      filter.genre = genre;
    } else {
      const genreDoc = await Genre.findOne({
        $or: [
          { slug: genre.toLowerCase().trim() },
          { name: { $regex: `^${genre.trim()}$`, $options: 'i' } }
        ]
      });
      if (genreDoc) {
        filter.genre = genreDoc._id;
      }
    }
  }

  if (artist) {
    if (isValidObjectId(artist)) {
      filter.artist = artist;
    } else {
      const artistDoc = await Artist.findOne({ name: { $regex: `^${artist.trim()}$`, $options: 'i' } });
      if (artistDoc) {
        filter.artist = artistDoc._id;
      }
    }
  }

  if (album) {
    if (isValidObjectId(album)) {
      filter.album = album;
    } else {
      const albumDoc = await Album.findOne({ title: { $regex: `^${album.trim()}$`, $options: 'i' } });
      if (albumDoc) {
        filter.album = albumDoc._id;
      }
    }
  }

  const sortDirection = String(order).toLowerCase() === 'desc' ? -1 : 1;
  const sortMap = {
    title: { title: sortDirection },
    playCount: { playCount: sortDirection },
    plays: { playCount: sortDirection },
    recent: { createdAt: -1 },
    duration: { duration: sortDirection }
  };
  const sortQuery = sortMap[sort] || { title: 1 };

  const total = await Song.countDocuments(filter);

  let query = Song.find(filter)
    .populate('artist', 'name bio hue shape')
    .populate('album', 'title year hue shape')
    .populate('genre', 'name slug color')
    .sort(sortQuery);

  const isPaginated = page !== undefined || limit !== undefined;
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit || '100', 10)));

  if (isPaginated) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const songDocs = await query;
  const likedSongIds = await getUserLikedSongIds(user);

  const songs = songDocs.map(doc => serializeSong(doc, {
    liked: likedSongIds.includes(doc._id.toString())
  }));

  return {
    songs,
    meta: {
      total,
      page: isPaginated ? pageNum : 1,
      limit: isPaginated ? limitNum : total
    }
  };
}

async function getSongById(id, user = null) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const song = await Song.findById(id)
    .populate('artist', 'name bio hue shape')
    .populate('album', 'title year hue shape')
    .populate('genre', 'name slug color');

  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  const likedSongIds = await getUserLikedSongIds(user);
  return serializeSong(song, {
    liked: likedSongIds.includes(song._id.toString())
  });
}

async function recordPlay(id, { seconds = 0, user = null } = {}) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid song ID format');
  }

  const song = await Song.findById(id);
  if (!song) {
    throw ApiError.notFound('Song not found');
  }

  if (!song.available) {
    throw ApiError.conflict('Song is currently unavailable for playback');
  }

  song.playCount = (song.playCount || 0) + 1;
  await song.save();

  if (user) {
    const userDoc = await User.findById(user._id || user.id);
    if (userDoc) {
      // De-duplicate recentlyPlayed and push to front
      const songIdStr = song._id.toString();
      userDoc.recentlyPlayed = userDoc.recentlyPlayed.filter(
        item => item.song && item.song.toString() !== songIdStr
      );
      userDoc.recentlyPlayed.unshift({
        song: song._id,
        playedAt: new Date()
      });

      // Cap at 20
      if (userDoc.recentlyPlayed.length > 20) {
        userDoc.recentlyPlayed = userDoc.recentlyPlayed.slice(0, 20);
      }

      if (typeof seconds === 'number' && seconds > 0) {
        userDoc.listeningSeconds = (userDoc.listeningSeconds || 0) + Math.round(seconds);
      }

      await userDoc.save();
    }
  }

  return {
    id: song._id.toString(),
    playCount: song.playCount
  };
}

async function getArtists() {
  const artists = await Artist.find().sort({ name: 1 });
  return artists.map(a => serializeArtist(a));
}

async function getArtistById(id, user = null) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid artist ID format');
  }

  const artist = await Artist.findById(id);
  if (!artist) {
    throw ApiError.notFound('Artist not found');
  }

  const [topSongsDocs, albumDocs] = await Promise.all([
    Song.find({ artist: artist._id, available: true })
      .populate('artist album genre')
      .sort({ playCount: -1 })
      .limit(5),
    Album.find({ artist: artist._id })
      .populate('artist genre')
      .sort({ year: -1 })
  ]);

  const likedSongIds = await getUserLikedSongIds(user);
  const savedAlbumIds = await getUserSavedAlbumIds(user);

  return serializeArtist(artist, {
    topSongs: topSongsDocs.map(s => serializeSong(s, {
      liked: likedSongIds.includes(s._id.toString())
    })),
    albums: albumDocs.map(a => serializeAlbum(a, {
      saved: savedAlbumIds.includes(a._id.toString())
    }))
  });
}

async function getAlbums(queryParams = {}, user = null) {
  const { genre, artist } = queryParams;
  const filter = {};

  if (genre) {
    if (isValidObjectId(genre)) {
      filter.genre = genre;
    } else {
      const genreDoc = await Genre.findOne({ slug: genre.toLowerCase().trim() });
      if (genreDoc) filter.genre = genreDoc._id;
    }
  }

  if (artist) {
    if (isValidObjectId(artist)) {
      filter.artist = artist;
    } else {
      const artistDoc = await Artist.findOne({ name: { $regex: `^${artist.trim()}$`, $options: 'i' } });
      if (artistDoc) filter.artist = artistDoc._id;
    }
  }

  const albums = await Album.find(filter)
    .populate('artist', 'name')
    .populate('genre', 'name slug')
    .sort({ year: -1, title: 1 });

  const savedAlbumIds = await getUserSavedAlbumIds(user);

  // Fetch songIds for each album
  const songDocs = await Song.find({ album: { $in: albums.map(a => a._id) } }).select('_id album trackNumber').sort({ trackNumber: 1 });
  const albumSongsMap = {};
  songDocs.forEach(s => {
    const aid = s.album.toString();
    if (!albumSongsMap[aid]) albumSongsMap[aid] = [];
    albumSongsMap[aid].push(s._id.toString());
  });

  return albums.map(album => {
    const aid = album._id.toString();
    const serialized = serializeAlbum(album, {
      saved: savedAlbumIds.includes(aid)
    });
    serialized.songIds = albumSongsMap[aid] || [];
    serialized.trackCount = serialized.songIds.length;
    return serialized;
  });
}

async function getAlbumById(id, user = null) {
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid album ID format');
  }

  const album = await Album.findById(id)
    .populate('artist', 'name bio hue shape')
    .populate('genre', 'name slug color')
    .populate({
      path: 'songs',
      populate: [
        { path: 'artist', select: 'name' },
        { path: 'genre', select: 'name slug' }
      ]
    });

  if (!album) {
    throw ApiError.notFound('Album not found');
  }

  const likedSongIds = await getUserLikedSongIds(user);
  const savedAlbumIds = await getUserSavedAlbumIds(user);

  return serializeAlbum(album, {
    saved: savedAlbumIds.includes(album._id.toString()),
    likedSongIds: likedSongIds
  });
}

async function getGenres() {
  const genres = await Genre.find().sort({ name: 1 });
  
  // Aggregate song counts per genre
  const genreCounts = await Song.aggregate([
    { $group: { _id: '$genre', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  genreCounts.forEach(g => {
    if (g._id) countMap[g._id.toString()] = g.count;
  });

  return genres.map(g => serializeGenre(g, {
    songCount: countMap[g._id.toString()] || 0
  }));
}

async function getCatalog(user = null) {
  const [songsRes, albums, genres, artists] = await Promise.all([
    getSongs({ limit: 1000 }, user),
    getAlbums({}, user),
    getGenres(),
    getArtists()
  ]);

  return {
    songs: songsRes.songs,
    albums: albums,
    genres: genres,
    artists: artists
  };
}

module.exports = {
  getSongs,
  getSongById,
  recordPlay,
  getArtists,
  getArtistById,
  getAlbums,
  getAlbumById,
  getGenres,
  getCatalog
};
