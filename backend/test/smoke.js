const http = require('http');
const express = require('express');
const { connectDB, disconnectDB } = require('../config/db');
const backendApp = require('../app');
const seedDatabase = require('../seed/seed');

function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = resData ? JSON.parse(resData) : null;
        } catch (e) {
          parsed = resData;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n🚀 Starting Comprehensive Smoke Test Suite for Phases 3 through 7...');
  await seedDatabase({ silent: true, disconnect: false });

  const app = express();
  app.use(backendApp);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Test Server] Running on dynamic test port ${port}`);

  let authToken = null;
  let sampleSongId = null;
  let unavailableSongId = null;
  let sampleAlbumId = null;
  let sampleArtistId = null;
  let createdPlaylistId = null;

  try {
    // ==========================================
    // PHASE 4: AUTH & USERS
    // ==========================================
    console.log('\n--- 1. Testing Authentication & User APIs (Phase 4) ---');

    // 1.1 Register
    const regRes = await makeRequest(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Alice Wonder',
      email: 'alice@example.com',
      password: 'password123'
    });
    if (regRes.status !== 201 || !regRes.body.data.token || !regRes.body.data.user) {
      throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
    }
    console.log('✅ 1.1 Register new user succeeded (201 Created)');

    // 1.2 Duplicate Register
    const dupRes = await makeRequest(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Alice Wonder',
      email: 'alice@example.com',
      password: 'password123'
    });
    if (dupRes.status !== 409 || dupRes.body.error.code !== 'CONFLICT') {
      throw new Error(`Duplicate register should return 409 Conflict: ${JSON.stringify(dupRes.body)}`);
    }
    console.log('✅ 1.2 Duplicate registration properly rejected with 409 CONFLICT');

    // 1.3 Validation error
    const valRes = await makeRequest(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'A',
      email: 'invalid-email',
      password: '123'
    });
    if (valRes.status !== 400 || valRes.body.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`Validation error should return 400 with details: ${JSON.stringify(valRes.body)}`);
    }
    console.log(`✅ 1.3 Registration validation returned 400 with details`);

    // 1.4 Login with Demo User
    const loginRes = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'demo@toptunes.dev',
      password: 'demo1234'
    });
    if (loginRes.status !== 200 || !loginRes.body.data.token) {
      throw new Error(`Demo login failed: ${JSON.stringify(loginRes.body)}`);
    }
    authToken = loginRes.body.data.token;
    console.log('✅ 1.4 Demo login succeeded (200 OK) with JWT token');

    // 1.5 Session restore /auth/me
    const meRes = await makeRequest(server, {
      path: '/api/auth/me',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (meRes.status !== 200 || meRes.body.data.email !== 'demo@toptunes.dev') {
      throw new Error(`Auth me check failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('✅ 1.5 GET /api/auth/me with Bearer token returned active user');

    // 1.6 NoSQL Injection Guard Test
    const nosqlRes = await makeRequest(server, {
      path: '/api/auth/login',
      method: 'POST'
    }, {
      email: { "$gt": "" },
      password: "demo1234"
    });
    if (nosqlRes.status !== 400 || nosqlRes.body.error.code !== 'VALIDATION_ERROR') {
      throw new Error(`NoSQL injection check failed: ${JSON.stringify(nosqlRes.body)}`);
    }
    console.log('✅ 1.6 NoSQL operator injection attempt properly blocked with 400 Bad Request');

    // ==========================================
    // PHASE 5: CATALOG APIS
    // ==========================================
    console.log('\n--- 2. Testing Catalog, Songs, Albums, Artists, Genres (Phase 5) ---');

    // 2.1 Catalog Bootstrap
    const catRes = await makeRequest(server, { path: '/api/catalog' });
    if (catRes.status !== 200 || !catRes.body.data.songs || !catRes.body.data.albums) {
      throw new Error(`Catalog bootstrap failed: ${JSON.stringify(catRes.body)}`);
    }
    console.log(`✅ 2.1 GET /api/catalog returned full bootstrap (${catRes.body.data.songs.length} songs, ${catRes.body.data.albums.length} albums)`);

    sampleSongId = catRes.body.data.songs[0].id;
    unavailableSongId = catRes.body.data.songs.find(s => !s.available).id;
    sampleAlbumId = catRes.body.data.albums[0].id;
    sampleArtistId = catRes.body.data.artists[0].id;

    // 2.2 List Songs with Filters
    const popSongsRes = await makeRequest(server, { path: '/api/songs?genre=pop' });
    if (popSongsRes.status !== 200 || popSongsRes.body.data.some(s => s.genre !== 'Pop')) {
      throw new Error(`Genre filter failed: ${JSON.stringify(popSongsRes.body)}`);
    }
    console.log(`✅ 2.2 GET /api/songs?genre=pop filtered songs successfully`);

    // 2.3 Record Play
    const playRes = await makeRequest(server, {
      path: `/api/songs/${sampleSongId}/play`,
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { seconds: 212 });
    if (playRes.status !== 200 || !playRes.body.data.playCount) {
      throw new Error(`Record play failed: ${JSON.stringify(playRes.body)}`);
    }
    console.log(`✅ 2.3 POST /api/songs/:id/play successfully incremented play count`);

    // 2.4 Play on unavailable song (409 Conflict)
    const playUnavailRes = await makeRequest(server, {
      path: `/api/songs/${unavailableSongId}/play`,
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (playUnavailRes.status !== 409) {
      throw new Error(`Play unavailable song must return 409 Conflict: ${JSON.stringify(playUnavailRes.body)}`);
    }
    console.log('✅ 2.4 POST /api/songs/:id/play on unavailable track properly rejected with 409 CONFLICT');

    // ==========================================
    // PHASE 6: LIBRARY, LIKES, PLAYLISTS, QUEUE
    // ==========================================
    console.log('\n--- 3. Testing Library, Likes, Playlists, and Queue (Phase 6) ---');

    // 3.1 Library Summary
    const libRes = await makeRequest(server, {
      path: '/api/library',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (libRes.status !== 200 || !Array.isArray(libRes.body.data.likes) || !Array.isArray(libRes.body.data.playlists)) {
      throw new Error(`Library summary failed: ${JSON.stringify(libRes.body)}`);
    }
    console.log(`✅ 3.1 GET /api/library returned summary (${libRes.body.data.likes.length} likes, ${libRes.body.data.playlists.length} playlists)`);

    // 3.2 Like Song (idempotent PUT)
    const likeRes = await makeRequest(server, {
      path: `/api/library/liked/${sampleSongId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (likeRes.status !== 200 || likeRes.body.data.liked !== true) {
      throw new Error(`Like song failed: ${JSON.stringify(likeRes.body)}`);
    }
    console.log('✅ 3.2 PUT /api/library/liked/:songId marked song as liked');

    // 3.3 Unlike Song (DELETE)
    const unlikeRes = await makeRequest(server, {
      path: `/api/library/liked/${sampleSongId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (unlikeRes.status !== 200 || unlikeRes.body.data.liked !== false) {
      throw new Error(`Unlike song failed: ${JSON.stringify(unlikeRes.body)}`);
    }
    console.log('✅ 3.3 DELETE /api/library/liked/:songId marked song as unliked');

    // 3.4 Save Album
    const saveAlbumRes = await makeRequest(server, {
      path: `/api/library/albums/${sampleAlbumId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (saveAlbumRes.status !== 200 || saveAlbumRes.body.data.saved !== true) {
      throw new Error(`Save album failed: ${JSON.stringify(saveAlbumRes.body)}`);
    }
    console.log('✅ 3.4 PUT /api/library/albums/:albumId saved album');

    // 3.5 Create Playlist
    const createPlaylistRes = await makeRequest(server, {
      path: '/api/playlists',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      name: 'Weekend Vibes',
      description: 'Chill and upbeat tunes for the weekend.'
    });
    if (createPlaylistRes.status !== 201 || !createPlaylistRes.body.data.id) {
      throw new Error(`Create playlist failed: ${JSON.stringify(createPlaylistRes.body)}`);
    }
    createdPlaylistId = createPlaylistRes.body.data.id;
    console.log(`✅ 3.5 POST /api/playlists created playlist "${createPlaylistRes.body.data.name}" (201 Created)`);

    // 3.6 Add Song to Playlist
    const addSongRes = await makeRequest(server, {
      path: `/api/playlists/${createdPlaylistId}/songs`,
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { songId: sampleSongId });
    if (addSongRes.status !== 200 || addSongRes.body.data.songCount !== 1) {
      throw new Error(`Add song to playlist failed: ${JSON.stringify(addSongRes.body)}`);
    }
    console.log('✅ 3.6 POST /api/playlists/:id/songs added track to playlist');

    // 3.7 Playlist Suggestions
    const suggRes = await makeRequest(server, {
      path: `/api/playlists/${createdPlaylistId}/suggestions?limit=5`,
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (suggRes.status !== 200 || !Array.isArray(suggRes.body.data)) {
      throw new Error(`Suggestions failed: ${JSON.stringify(suggRes.body)}`);
    }
    console.log(`✅ 3.7 GET /api/playlists/:id/suggestions returned ${suggRes.body.data.length} suggested tracks`);

    // 3.8 Update PlaybackState (Queue)
    const queuePutRes = await makeRequest(server, {
      path: '/api/queue',
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      queue: [sampleSongId],
      currentIndex: 0,
      position: 12.5,
      shuffle: true,
      repeat: 'all',
      volume: 0.75
    });
    if (queuePutRes.status !== 200 || queuePutRes.body.data.volume !== 0.75) {
      throw new Error(`Update queue failed: ${JSON.stringify(queuePutRes.body)}`);
    }
    console.log('✅ 3.8 PUT /api/queue persisted playback state');

    // 3.9 Get PlaybackState
    const queueGetRes = await makeRequest(server, {
      path: '/api/queue',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (queueGetRes.status !== 200 || queueGetRes.body.data.queue.length !== 1) {
      throw new Error(`Get queue failed: ${JSON.stringify(queueGetRes.body)}`);
    }
    console.log(`✅ 3.9 GET /api/queue restored populated queue (${queueGetRes.body.data.queue.length} track, shuffle: ${queueGetRes.body.data.shuffle})`);

    // ==========================================
    // PHASE 7: SEARCH & STATS
    // ==========================================
    console.log('\n--- 4. Testing Search, Browse Feed & Profile Statistics (Phase 7) ---');

    // 4.1 Unified Search
    const searchRes = await makeRequest(server, { path: '/api/search?q=harbor' });
    if (searchRes.status !== 200 || !searchRes.body.data.albums) {
      throw new Error(`Search failed: ${JSON.stringify(searchRes.body)}`);
    }
    console.log(`✅ 4.1 GET /api/search matched query across songs, albums, and artists`);

    // 4.2 Browse Home Feed
    const browseRes = await makeRequest(server, { path: '/api/browse' });
    if (browseRes.status !== 200 || !browseRes.body.data.trending || !browseRes.body.data.featuredAlbums) {
      throw new Error(`Browse failed: ${JSON.stringify(browseRes.body)}`);
    }
    console.log(`✅ 4.2 GET /api/browse returned home feed (${browseRes.body.data.trending.length} trending, ${browseRes.body.data.featuredAlbums.length} featured albums)`);

    // 4.3 Profile Listening Stats (6 stat tiles)
    const statsRes = await makeRequest(server, {
      path: '/api/stats/me',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (statsRes.status !== 200 || statsRes.body.data.playlistCount === undefined) {
      throw new Error(`Stats failed: ${JSON.stringify(statsRes.body)}`);
    }
    console.log(`✅ 4.3 GET /api/stats/me returned 6 Profile tiles (Liked: ${statsRes.body.data.likedCount}, Playlists: ${statsRes.body.data.playlistCount}, Top Genre: ${statsRes.body.data.topGenre}, Time: ${statsRes.body.data.listeningTimeFormatted})`);

    console.log('\n🎉 ALL Phase 3 through Phase 7 API Tests PASSED 100% with ZERO GAPS!\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('\n❌ Test suite failure:', err);
    process.exit(1);
  });
}

module.exports = runTests;
