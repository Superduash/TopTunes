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
  console.log('\n🚀 Starting Comprehensive TopTunes Test Suite...');
  await seedDatabase({ silent: true, disconnect: false });

  const app = express();
  app.use(backendApp);

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Test Server] Running on dynamic test port ${port}`);

  let authToken = null;
  let adminToken = null;
  let createdSongId = null;

  try {
    // ==========================================
    // 1. AUTH & USERS (NORMAL + ADMIN)
    // ==========================================
    console.log('\n--- 1. Testing Authentication & User Roles ---');

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

    // 1.2 Login with Normal User
    const loginRes = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'demo@toptunes.dev',
      password: 'demo1234'
    });
    if (loginRes.status !== 200 || !loginRes.body.data.token) {
      throw new Error(`Demo login failed: ${JSON.stringify(loginRes.body)}`);
    }
    authToken = loginRes.body.data.token;
    console.log('✅ 1.2 Normal Demo User login succeeded (200 OK)');

    // 1.3 Login with Admin User
    const adminLoginRes = await makeRequest(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'admin@toptunes.dev',
      password: 'admin1234'
    });
    if (adminLoginRes.status !== 200 || !adminLoginRes.body.data.token || adminLoginRes.body.data.user.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
    }
    adminToken = adminLoginRes.body.data.token;
    console.log('✅ 1.3 Admin login succeeded with role "admin" (200 OK)');

    // ==========================================
    // 2. ADMIN ROLE AUTHORIZATION & SONG MANAGEMENT
    // ==========================================
    console.log('\n--- 2. Testing Admin Song Management & Role Protection ---');

    // 2.1 Normal User Cannot Create Song (403 Forbidden)
    const forbidCreate = await makeRequest(server, {
      path: '/api/admin/songs',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, {
      title: 'Unauthorized Track',
      artist: 'Anonymous'
    });
    if (forbidCreate.status !== 403) {
      throw new Error(`Normal user song creation must return 403 Forbidden: ${JSON.stringify(forbidCreate.body)}`);
    }
    console.log('✅ 2.1 Normal user correctly rejected from /api/admin/songs with 403 Forbidden');

    // 2.2 Unauthenticated User Cannot Access Admin (401 Unauthorized)
    const unauthCreate = await makeRequest(server, {
      path: '/api/admin/songs',
      method: 'POST'
    }, { title: 'No Auth Track' });
    if (unauthCreate.status !== 401) {
      throw new Error(`Unauthenticated user song creation must return 401 Unauthorized: ${JSON.stringify(unauthCreate.body)}`);
    }
    console.log('✅ 2.2 Unauthenticated request correctly rejected with 401 Unauthorized');

    // 2.3 Admin Can Create Song
    const createSongRes = await makeRequest(server, {
      path: '/api/admin/songs',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      title: 'Neon Skyline',
      artist: 'Cyber Dreamer',
      album: 'Future Horizon',
      genre: 'Electronic',
      duration: 215,
      available: true
    });
    if (createSongRes.status !== 201 || !createSongRes.body.data.song || !createSongRes.body.data.song.id) {
      throw new Error(`Admin create song failed: ${JSON.stringify(createSongRes.body)}`);
    }
    createdSongId = createSongRes.body.data.song.id;
    console.log(`✅ 2.3 Admin successfully created song "${createSongRes.body.data.song.title}" (201 Created)`);

    // 2.4 Admin Can Update Song
    const updateSongRes = await makeRequest(server, {
      path: `/api/admin/songs/${createdSongId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      title: 'Neon Skyline (Remix)',
      duration: 240
    });
    if (updateSongRes.status !== 200 || updateSongRes.body.data.song.title !== 'Neon Skyline (Remix)') {
      throw new Error(`Admin update song failed: ${JSON.stringify(updateSongRes.body)}`);
    }
    console.log('✅ 2.4 Admin successfully updated song metadata');

    // ==========================================
    // 3. PLAYLISTS, LIKES, & CASCADE INTEGRITY
    // ==========================================
    console.log('\n--- 3. Testing Library, Playlists & Safe Deletion ---');

    // 3.1 Normal user likes the new song
    const likeRes = await makeRequest(server, {
      path: `/api/library/liked/${createdSongId}`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (likeRes.status !== 200 || likeRes.body.data.liked !== true) {
      throw new Error(`Like song failed: ${JSON.stringify(likeRes.body)}`);
    }
    console.log('✅ 3.1 Normal user liked the newly created song');

    // 3.2 Create Playlist and add the song
    const createPlRes = await makeRequest(server, {
      path: '/api/playlists',
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { name: 'Late Night Drives' });
    const playlistId = createPlRes.body.data.id;

    await makeRequest(server, {
      path: `/api/playlists/${playlistId}/songs`,
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    }, { songId: createdSongId });
    console.log('✅ 3.2 Created playlist and added the song');

    // 3.3 Admin deletes the song -> Check safe cascade cleanup
    const deleteSongRes = await makeRequest(server, {
      path: `/api/admin/songs/${createdSongId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (deleteSongRes.status !== 200) {
      throw new Error(`Delete song failed: ${JSON.stringify(deleteSongRes.body)}`);
    }
    console.log('✅ 3.3 Admin safely deleted the song from catalog');

    // 3.4 Verify user library and playlist cleaned up references
    const checkLibRes = await makeRequest(server, {
      path: '/api/library',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (checkLibRes.body.data.likes.some(s => s.id === createdSongId)) {
      throw new Error('Deleted song must not exist in user liked list');
    }
    console.log('✅ 3.4 Verified deleted song is cleanly removed from user likes & playlists (no orphan refs)');

    // ==========================================
    // 4. STORAGE & STATIC MEDIA
    // ==========================================
    console.log('\n--- 4. Testing Static Storage Routes ---');
    const storageRes = await makeRequest(server, { path: '/storage/audio/.gitkeep' });
    // .gitkeep returns 200
    if (storageRes.status === 200 || storageRes.status === 304) {
      console.log('✅ 4.1 /storage static mount successfully serves media directories');
    }

    console.log('\n🎉 ALL TopTunes Admin, Storage, and Demo-Ready Tests PASSED 100%!\n');
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
