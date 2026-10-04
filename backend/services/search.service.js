const mongoose = require('mongoose');
const { Song, Album, Artist, Genre, Playlist, User } = require('../models');
const {
  serializeSong,
  serializeAlbum,
  serializeArtist,
  serializePlaylist
} = require('../utils/serializers');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegex(str) {
  return typeof str === 'string' ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
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

async function search(queryParams = {}, user = null) {
  const {
    q = '',
    genre,
    type,
    available,
    limit = 20
  } = queryParams;

  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
  const term = typeof q === 'string' ? q.trim() : '';
  const escapedTerm = escapeRegex(term);
  const regex = escapedTerm ? new RegExp(escapedTerm, 'i') : null;

  let genreId = null;
  if (genre) {
    if (isValidObjectId(genre)) {
      genreId = genre;
    } else {
      const gDoc = await Genre.findOne({
        $or: [
          { slug: genre.toLowerCase().trim() },
          { name: { $regex: `^${genre.trim()}$`, $options: 'i' } }
        ]
      });
      if (gDoc) genreId = gDoc._id;
    }
  }

  const likedSongIds = await getUserLikedSongIds(user);
  const savedAlbumIds = await getUserSavedAlbumIds(user);

  let songs = [];
  let albums = [];
  let artists = [];
  let playlists = [];

  const searchAll = !type || type === 'all';

  // 1. Search Songs
  if (searchAll || type === 'songs') {
    const songFilter = {};
    if (available !== undefined && available !== '') {
      songFilter.available = String(available).toLowerCase() === 'true';
    }
    if (genreId) {
      songFilter.genre = genreId;
    }

    if (regex) {
      // Also match artist name or album title
      const [matchingArtists, matchingAlbums] = await Promise.all([
        Artist.find({ name: regex }).select('_id'),
        Album.find({ title: regex }).select('_id')
      ]);

      const artistIds = matchingArtists.map(a => a._id);
      const albumIds = matchingAlbums.map(a => a._id);

      songFilter.$or = [
        { title: regex },
        ...(artistIds.length ? [{ artist: { $in: artistIds } }] : []),
        ...(albumIds.length ? [{ album: { $in: albumIds } }] : [])
      ];
    }

    const songDocs = await Song.find(songFilter)
      .populate('artist', 'name bio hue shape')
      .populate('album', 'title year hue shape')
      .populate('genre', 'name slug color')
      .sort({ playCount: -1 })
      .limit(limitNum);

    songs = songDocs.map(s => serializeSong(s, {
      liked: likedSongIds.includes(s._id.toString())
    }));
  }

  // 2. Search Albums
  if (searchAll || type === 'albums') {
    const albumFilter = {};
    if (genreId) {
      albumFilter.genre = genreId;
    }

    if (regex) {
      const matchingArtists = await Artist.find({ name: regex }).select('_id');
      const artistIds = matchingArtists.map(a => a._id);

      albumFilter.$or = [
        { title: regex },
        ...(artistIds.length ? [{ artist: { $in: artistIds } }] : [])
      ];
    }

    const albumDocs = await Album.find(albumFilter)
      .populate('artist', 'name bio hue shape')
      .populate('genre', 'name slug color')
      .sort({ year: -1 })
      .limit(limitNum);

    albums = albumDocs.map(a => serializeAlbum(a, {
      saved: savedAlbumIds.includes(a._id.toString())
    }));
  }

  // 3. Search Artists
  if ((searchAll || type === 'artists') && !genreId) {
    const artistFilter = regex ? { name: regex } : {};
    const artistDocs = await Artist.find(artistFilter).limit(limitNum);
    artists = artistDocs.map(a => serializeArtist(a));
  }

  // 4. Search Playlists
  if ((searchAll || type === 'playlists') && !genreId) {
    const playlistFilter = {};
    if (regex) {
      playlistFilter.name = regex;
    }

    if (user) {
      playlistFilter.$or = [
        { isPublic: true },
        { owner: user._id }
      ];
    } else {
      playlistFilter.isPublic = true;
    }

    const playlistDocs = await Playlist.find(playlistFilter)
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .limit(limitNum);

    playlists = playlistDocs.map(p => serializePlaylist(p, {
      currentUserId: user ? user._id : null,
      likedSongIds: likedSongIds
    }));
  }

  return {
    songs,
    albums,
    artists,
    playlists,
    meta: {
      q: term,
      genre: genre || null,
      type: type || 'all',
      total: songs.length + albums.length + artists.length + playlists.length
    }
  };
}

async function getBrowse(user = null) {
  const likedSongIds = await getUserLikedSongIds(user);
  const savedAlbumIds = await getUserSavedAlbumIds(user);

  const [trendingDocs, newReleasesDocs, genresDocs, featuredAlbumsDocs] = await Promise.all([
    Song.find({ available: true })
      .populate('artist album genre')
      .sort({ playCount: -1 })
      .limit(10),
    Album.find()
      .populate('artist genre')
      .sort({ year: -1, createdAt: -1 })
      .limit(6),
    Genre.find().sort({ name: 1 }),
    Album.find()
      .populate('artist genre')
      .populate({
        path: 'songs',
        populate: { path: 'artist', select: 'name' }
      })
      .limit(4)
  ]);

  // Aggregate song count per genre
  const genreCounts = await Song.aggregate([
    { $group: { _id: '$genre', count: { $sum: 1 } } }
  ]);
  const countMap = {};
  genreCounts.forEach(g => {
    if (g._id) countMap[g._id.toString()] = g.count;
  });

  return {
    trending: trendingDocs.map(s => serializeSong(s, {
      liked: likedSongIds.includes(s._id.toString())
    })),
    newReleases: newReleasesDocs.map(a => serializeAlbum(a, {
      saved: savedAlbumIds.includes(a._id.toString())
    })),
    genres: genresDocs.map(g => ({
      id: g._id.toString(),
      name: g.name,
      slug: g.slug,
      color: g.color,
      songCount: countMap[g._id.toString()] || 0
    })),
    featuredAlbums: featuredAlbumsDocs.map(a => serializeAlbum(a, {
      saved: savedAlbumIds.includes(a._id.toString()),
      likedSongIds: likedSongIds
    }))
  };
}

async function getMyStats(user) {
  const userDoc = await User.findById(user._id)
    .populate({
      path: 'likedSongs',
      populate: [{ path: 'genre', select: 'name' }, { path: 'artist', select: 'name' }]
    })
    .populate({
      path: 'recentlyPlayed.song',
      populate: [{ path: 'genre', select: 'name' }, { path: 'artist', select: 'name' }]
    });

  if (!userDoc) {
    throw ApiError.notFound('User not found');
  }

  const ownedPlaylistsCount = await Playlist.countDocuments({ owner: userDoc._id });
  const likedSongs = (userDoc.likedSongs || []).filter(Boolean);
  const recentSongs = (userDoc.recentlyPlayed || []).map(r => r.song).filter(Boolean);

  // Compute top genre and top artist from liked + recent songs
  const genreCounts = {};
  const artistCounts = {};

  [...likedSongs, ...recentSongs].forEach(s => {
    const gName = s.genre?.name;
    const aName = s.artist?.name;
    if (gName) genreCounts[gName] = (genreCounts[gName] || 0) + 1;
    if (aName) artistCounts[aName] = (artistCounts[aName] || 0) + 1;
  });

  let topGenre = 'Pop';
  let maxGenreCount = 0;
  for (const [g, count] of Object.entries(genreCounts)) {
    if (count > maxGenreCount) {
      maxGenreCount = count;
      topGenre = g;
    }
  }

  let topArtist = 'Mira Vale';
  let maxArtistCount = 0;
  for (const [a, count] of Object.entries(artistCounts)) {
    if (count > maxArtistCount) {
      maxArtistCount = count;
      topArtist = a;
    }
  }

  const listeningSeconds = userDoc.listeningSeconds || 0;
  const minutes = Math.floor(listeningSeconds / 60);
  const hours = (listeningSeconds / 3600).toFixed(1);
  const formattedListeningTime = hours >= 1 ? `${hours} hrs` : `${minutes} mins`;

  return {
    likedCount: likedSongs.length,
    libraryCount: likedSongs.length,
    savedAlbumsCount: (userDoc.savedAlbums || []).length,
    playlistCount: ownedPlaylistsCount,
    listeningSeconds: listeningSeconds,
    listeningTimeFormatted: formattedListeningTime,
    topGenre: topGenre,
    topArtist: topArtist
  };
}

async function getTopSongs({ limit = 10 } = {}) {
  const limitNum = Math.min(50, Math.max(1, parseInt(limit || '10', 10)));
  const songs = await Song.find({ available: true })
    .populate('artist album genre')
    .sort({ playCount: -1 })
    .limit(limitNum);

  return songs.map(s => serializeSong(s));
}

module.exports = {
  search,
  getBrowse,
  getMyStats,
  getTopSongs
};
