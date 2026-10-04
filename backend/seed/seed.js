const { connectDB, disconnectDB } = require('../config/db');
const { User, Artist, Genre, Album, Song, Playlist, PlaybackState } = require('../models');
const { genres, artists, albumsData, demoUser } = require('./seedData');

async function seedDatabase(options = {}) {
  const { keepUsers = false, silent = false } = options;
  if (!silent) console.log('\n[Seed] Connecting to database...');
  await connectDB();

  try {
    if (!silent) console.log('[Seed] Clearing existing catalog collections...');
    await Promise.all([
      Genre.deleteMany({}),
      Artist.deleteMany({}),
      Album.deleteMany({}),
      Song.deleteMany({})
    ]);

    if (!keepUsers) {
      if (!silent) console.log('[Seed] Clearing user collections...');
      await Promise.all([
        User.deleteMany({}),
        Playlist.deleteMany({}),
        PlaybackState.deleteMany({})
      ]);
    }

    // 1. Insert Genres
    if (!silent) console.log('[Seed] Inserting genres...');
    const insertedGenres = await Genre.insertMany(genres);
    const genreMap = {};
    insertedGenres.forEach(g => {
      genreMap[g.name] = g;
    });

    // 2. Insert Artists
    if (!silent) console.log('[Seed] Inserting artists...');
    const insertedArtists = await Artist.insertMany(artists);
    const artistMap = {};
    insertedArtists.forEach(a => {
      artistMap[a.name] = a;
    });

    // 3. Insert Albums & Songs
    if (!silent) console.log('[Seed] Inserting albums and songs...');
    const songDocsToInsert = [];
    const createdAlbums = [];
    const allCreatedSongs = [];

    for (const albumInfo of albumsData) {
      const artist = artistMap[albumInfo.artist];
      const genre = genreMap[albumInfo.genre];

      const album = await Album.create({
        title: albumInfo.title,
        artist: artist._id,
        genre: genre._id,
        year: albumInfo.year,
        hue: albumInfo.hue,
        shape: albumInfo.shape
      });
      createdAlbums.push(album);

      albumInfo.tracks.forEach((t, idx) => {
        songDocsToInsert.push({
          title: t.title,
          artist: artist._id,
          album: album._id,
          genre: genre._id,
          duration: t.duration,
          trackNumber: idx + 1,
          available: t.available !== false,
          playCount: t.plays || 0,
          likeCount: 0,
          hue: albumInfo.hue,
          shape: albumInfo.shape
        });
      });
    }

    const insertedSongs = await Song.insertMany(songDocsToInsert);
    allCreatedSongs.push(...insertedSongs);

    // 4. Create Demo User & Associations
    if (!keepUsers) {
      if (!silent) console.log('[Seed] Creating demo user...');
      const passwordHash = await User.hashPassword(demoUser.password);

      // Pick specific liked songs and saved albums
      const likedSongs = [insertedSongs[0]._id, insertedSongs[4]._id, insertedSongs[12]._id];
      const savedAlbums = [createdAlbums[3]._id]; // Signal Bloom

      const demoUserDoc = await User.create({
        name: demoUser.name,
        email: demoUser.email,
        passwordHash: passwordHash,
        avatarColor: demoUser.avatarColor,
        avatarSeed: demoUser.avatarSeed,
        likedSongs: likedSongs,
        savedAlbums: savedAlbums,
        recentlyPlayed: [
          { song: insertedSongs[16]._id, playedAt: new Date(Date.now() - 3600000) },
          { song: insertedSongs[1]._id, playedAt: new Date(Date.now() - 7200000) }
        ],
        listeningSeconds: demoUser.listeningSeconds
      });

      // Update like counts for liked songs
      await Song.updateMany({ _id: { $in: likedSongs } }, { $inc: { likeCount: 1 } });

      // Create Playlists for demo user
      const playlist1 = await Playlist.create({
        name: 'Morning Drive',
        description: 'Energizing tracks for early morning commutes.',
        owner: demoUserDoc._id,
        songs: [
          { song: insertedSongs[0]._id },
          { song: insertedSongs[5]._id },
          { song: insertedSongs[13]._id },
          { song: insertedSongs[20]._id }
        ],
        hue: 335,
        shape: 0
      });

      const playlist2 = await Playlist.create({
        name: 'Focus Flow',
        description: 'Deep electronic and lo-fi soundscapes for deep work.',
        owner: demoUserDoc._id,
        songs: [
          { song: insertedSongs[12]._id },
          { song: insertedSongs[13]._id },
          { song: insertedSongs[20]._id },
          { song: insertedSongs[21]._id }
        ],
        hue: 190,
        shape: 3
      });

      demoUserDoc.savedPlaylists = [playlist1._id, playlist2._id];
      await demoUserDoc.save();

      // Create initial PlaybackState
      await PlaybackState.create({
        user: demoUserDoc._id,
        queue: [insertedSongs[0]._id, insertedSongs[1]._id, insertedSongs[2]._id],
        currentIndex: 0,
        currentSong: insertedSongs[0]._id,
        position: 42,
        shuffle: false,
        repeat: 'off',
        volume: 0.8
      });
    }

    if (!silent) {
      console.log('\n==================================================');
      console.log('  TopTunes Database Seeding Completed Successfully');
      console.log(`  Genres:    ${insertedGenres.length}`);
      console.log(`  Artists:   ${insertedArtists.length}`);
      console.log(`  Albums:    ${createdAlbums.length}`);
      console.log(`  Songs:     ${insertedSongs.length}`);
      if (!keepUsers) {
        console.log(`  Demo User: ${demoUser.email} / ${demoUser.password}`);
      }
      console.log('==================================================\n');
    }

    return {
      genres: insertedGenres,
      artists: insertedArtists,
      albums: createdAlbums,
      songs: insertedSongs
    };
  } finally {
    if (options.disconnect !== false) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  const keepUsers = process.argv.includes('--keep-users');
  seedDatabase({ keepUsers }).catch(err => {
    console.error('[Seed Fatal Error]:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
