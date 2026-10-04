function serializeSong(song, options = {}) {
  if (!song) return null;
  const liked = options.liked !== undefined ? !!options.liked : false;

  const doc = typeof song.toJSON === 'function' ? song.toJSON() : song;
  const artistName = doc.artist ? (typeof doc.artist === 'object' ? doc.artist.name || doc.artist.title || '' : String(doc.artist)) : '';
  const albumTitle = doc.album ? (typeof doc.album === 'object' ? doc.album.title || '' : String(doc.album)) : '';
  const albumId = doc.album ? (typeof doc.album === 'object' ? (doc.album.id || doc.album._id?.toString() || '') : String(doc.album)) : '';
  const genreName = doc.genre ? (typeof doc.genre === 'object' ? doc.genre.name || doc.genre.slug || '' : String(doc.genre)) : '';
  const year = doc.year || (doc.album && typeof doc.album === 'object' ? doc.album.year : undefined);

  return {
    id: doc.id || doc._id?.toString(),
    title: doc.title || '',
    artist: artistName,
    artistObj: doc.artist && typeof doc.artist === 'object' ? { id: doc.artist.id || doc.artist._id?.toString(), name: doc.artist.name } : undefined,
    album: albumTitle,
    albumId: albumId,
    genre: genreName,
    year: year,
    track: doc.trackNumber || doc.track || 1,
    duration: doc.duration || 0,
    available: doc.available !== false,
    plays: doc.playCount || doc.plays || 0,
    playCount: doc.playCount || doc.plays || 0,
    likeCount: doc.likeCount || 0,
    hue: doc.hue !== undefined ? doc.hue : 0,
    shape: doc.shape !== undefined ? doc.shape : 0,
    liked: liked
  };
}

function serializeAlbum(album, options = {}) {
  if (!album) return null;
  const saved = options.saved !== undefined ? !!options.saved : false;
  const doc = typeof album.toJSON === 'function' ? album.toJSON() : album;

  const artistName = doc.artist ? (typeof doc.artist === 'object' ? doc.artist.name || '' : String(doc.artist)) : '';
  const genreName = doc.genre ? (typeof doc.genre === 'object' ? doc.genre.name || '' : String(doc.genre)) : '';

  let songsList = [];
  let songIds = [];
  let totalDuration = 0;

  if (Array.isArray(doc.songs)) {
    songsList = doc.songs.map(s => serializeSong(s, {
      liked: options.likedSongIds ? options.likedSongIds.includes((s.id || s._id).toString()) : false
    })).filter(Boolean);
    songIds = songsList.map(s => s.id);
    totalDuration = songsList.reduce((acc, s) => acc + (s.duration || 0), 0);
  } else if (Array.isArray(doc.songIds)) {
    songIds = doc.songIds;
  }

  return {
    id: doc.id || doc._id?.toString(),
    title: doc.title || '',
    artist: artistName,
    artistObj: doc.artist && typeof doc.artist === 'object' ? { id: doc.artist.id || doc.artist._id?.toString(), name: doc.artist.name } : undefined,
    genre: genreName,
    year: doc.year,
    hue: doc.hue !== undefined ? doc.hue : 0,
    shape: doc.shape !== undefined ? doc.shape : 0,
    songIds: songIds,
    songs: songsList.length ? songsList : undefined,
    trackCount: songsList.length || songIds.length,
    duration: totalDuration,
    saved: saved
  };
}

function serializePlaylist(playlist, options = {}) {
  if (!playlist) return null;
  const currentUserId = options.currentUserId ? options.currentUserId.toString() : null;
  const doc = typeof playlist.toJSON === 'function' ? playlist.toJSON() : playlist;

  const ownerId = doc.owner ? (typeof doc.owner === 'object' ? (doc.owner.id || doc.owner._id?.toString()) : doc.owner.toString()) : null;
  const isOwner = currentUserId ? (ownerId === currentUserId) : true;

  let songIds = [];
  let songsList = [];
  let totalDuration = 0;

  if (Array.isArray(doc.songs)) {
    doc.songs.forEach(item => {
      const s = item.song || item;
      if (s && (s.id || s._id)) {
        const songObj = serializeSong(s, {
          liked: options.likedSongIds ? options.likedSongIds.includes((s.id || s._id).toString()) : false
        });
        if (songObj) {
          songsList.push({
            ...songObj,
            addedAt: item.addedAt || doc.createdAt
          });
          songIds.push(songObj.id);
          totalDuration += (songObj.duration || 0);
        }
      } else if (typeof item === 'string') {
        songIds.push(item);
      }
    });
  }

  return {
    id: doc.id || doc._id?.toString(),
    name: doc.name || '',
    description: doc.description || '',
    owner: doc.owner && typeof doc.owner === 'object' ? { id: doc.owner.id || doc.owner._id?.toString(), name: doc.owner.name } : ownerId,
    songIds: songIds,
    songs: songsList,
    songCount: songIds.length,
    totalDuration: totalDuration,
    isOwner: isOwner,
    created: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    hue: doc.hue !== undefined ? doc.hue : 200,
    shape: doc.shape !== undefined ? doc.shape : 1
  };
}

function serializeArtist(artist, options = {}) {
  if (!artist) return null;
  const doc = typeof artist.toJSON === 'function' ? artist.toJSON() : artist;

  return {
    id: doc.id || doc._id?.toString(),
    name: doc.name || '',
    bio: doc.bio || '',
    hue: doc.hue !== undefined ? doc.hue : 0,
    shape: doc.shape !== undefined ? doc.shape : 0,
    topSongs: options.topSongs ? options.topSongs.map(s => serializeSong(s, options)) : [],
    albums: options.albums ? options.albums.map(a => serializeAlbum(a, options)) : []
  };
}

function serializeGenre(genre, options = {}) {
  if (!genre) return null;
  const doc = typeof genre.toJSON === 'function' ? genre.toJSON() : genre;

  return {
    id: doc.id || doc._id?.toString(),
    name: doc.name || '',
    slug: doc.slug || (doc.name || '').toLowerCase().replace(/\s+/g, '-'),
    color: doc.color || '#ffb224',
    songCount: options.songCount || 0
  };
}

function serializeUser(user) {
  if (!user) return null;
  const doc = typeof user.toJSON === 'function' ? user.toJSON() : user;

  return {
    id: doc.id || doc._id?.toString(),
    name: doc.name || '',
    email: doc.email || '',
    avatarColor: doc.avatarColor || '#ffb224',
    avatarSeed: doc.avatarSeed || '',
    listeningSeconds: doc.listeningSeconds || 0,
    preferences: doc.preferences || { theme: 'dark', notifications: true },
    createdAt: doc.createdAt
  };
}

function serializePlaybackState(state, options = {}) {
  if (!state) return null;
  const doc = typeof state.toJSON === 'function' ? state.toJSON() : state;

  const queue = Array.isArray(doc.queue)
    ? doc.queue.map(s => serializeSong(s, options)).filter(Boolean)
    : [];

  const currentSong = doc.currentSong ? serializeSong(doc.currentSong, options) : null;

  return {
    queue: queue,
    currentIndex: doc.currentIndex || 0,
    currentSong: currentSong,
    position: doc.position || 0,
    shuffle: !!doc.shuffle,
    repeat: doc.repeat || 'off',
    volume: doc.volume !== undefined ? doc.volume : 0.8
  };
}

module.exports = {
  serializeSong,
  serializeAlbum,
  serializePlaylist,
  serializeArtist,
  serializeGenre,
  serializeUser,
  serializePlaybackState
};
