# TopTunes — Music Streaming System

TopTunes is a Spotify-inspired music streaming application built with **AngularJS 1.8.3 + ngRoute** and a **Node.js, Express, MongoDB/Mongoose backend**. It supports real local-audio playback via HTML5 Audio, role-based access control (normal user vs. admin), admin song management with file uploads, playlists, library management, search, and dynamic statistics.

## Features

- 🎵 Real local audio playback with HTML5 Audio element
- 🛠️ Admin-only catalog management (add tracks, upload audio & cover art, edit, delete with cascade cleanup)
- 🔎 Search and filtering by song, artist and genre
- 📚 Liked songs, saved albums and playlist management
- ▶️ Full-featured player with queue, shuffle, repeat, seek and volume
- 📊 Dynamic playlist and listening statistics
- 🔐 Registration, login, role-based authorization (User / Admin) and JWT authentication
- 📱 Responsive desktop, tablet and mobile interface
- 🛡️ Express security headers, input validation, NoSQL injection protection and file upload validation

## Tech Stack

**Frontend:** AngularJS 1.8.3, ngRoute, HTML5, CSS3, JavaScript  
**Backend:** Node.js, Express 4, Mongoose, Multer  
**Database:** MongoDB (with automatic in-memory fallback for local development)  
**Authentication:** JWT + bcrypt

## Quick Start

### Requirements

- Node.js 18+
- npm 9+
- MongoDB (local or automatic in-memory dev fallback)

### One-Click Launch (Windows)

Simply double-click **`run.bat`** (or run `run.bat` in command prompt). It automatically:
1. Creates `.env` from `.env.example` if missing.
2. Installs dependencies if missing.
3. Opens `http://localhost:3000/#/home` in your default browser.
4. Starts the TopTunes server.

### Manual Run

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

Open `http://localhost:3000/#/home`.

For development:

```bash
npm run dev
```

## Demo Accounts

The seed initializes clean system collections with two demo accounts:

### 1. Admin Account (Catalog & Audio Management)
```text
Email:    admin@toptunes.dev
Password: admin1234
Role:     admin
```
*Admins see an "Admin" entry in navigation allowing them to upload local audio files (.mp3, .wav, .m4a), auto-extract embedded ID3 album art & tags (or upload custom cover art), and manage songs.*

### 2. Listener Account (Normal User)
```text
Email:    demo@toptunes.dev
Password: demo1234
Role:     user
```
*Listeners can browse, search, play tracks, like songs, build playlists, and view listening statistics.*

## Local Media Storage

Local audio tracks and cover artwork are stored in the filesystem and served statically via Express:

```text
storage/
├── audio/    # Uploaded MP3 / WAV / M4A tracks
└── covers/   # Uploaded JPG / PNG / WebP artwork
```

## Project Structure

```text
TopTunes/
├── server.js
├── package.json
├── .env.example
├── storage/
│   ├── audio/
│   └── covers/
├── frontend/
│   └── public/
│       ├── index.html
│       ├── css/
│       ├── js/
│       └── vendor/
└── backend/
    ├── app.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    ├── seed/
    └── test/
```

## API Reference

The AngularJS SPA communicates with the Express API under `/api`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new listener |
| POST | `/api/auth/login` | Public | Log in & obtain JWT |
| GET | `/api/auth/me` | User | Restore authenticated session |
| GET | `/api/catalog` | Public | Load music catalog |
| GET | `/api/songs` | Public | Search/filter songs |
| GET | `/api/albums` | Public | Browse albums |
| GET | `/api/library` | User | User library (likes, playlists) |
| PUT/DELETE | `/api/library/liked/:songId` | User | Like/unlike song |
| GET/POST | `/api/playlists` | User | List/create playlists |
| PATCH/DELETE | `/api/playlists/:id` | User | Update/delete playlist |
| POST/DELETE | `/api/playlists/:id/songs` | User | Manage playlist songs |
| GET/PUT | `/api/queue` | User | Queue and playback state |
| GET | `/api/search` | Public | Unified search |
| GET | `/api/stats/me` | User | User profile statistics |
| POST | `/api/admin/songs` | Admin | Create catalog song |
| POST | `/api/admin/songs/inspect-audio` | Admin | Inspect ID3 tags & embedded cover art |
| PATCH | `/api/admin/songs/:id` | Admin | Update song metadata |
| DELETE | `/api/admin/songs/:id` | Admin | Delete song & cascade cleanup |
| POST | `/api/admin/songs/:id/audio` | Admin | Upload audio track file (auto-extracts cover if present) |
| POST | `/api/admin/songs/:id/cover` | Admin | Upload cover image file |

## Testing

Run the API and regression test suite:

```bash
npm run test:api
```

## License

MIT License.