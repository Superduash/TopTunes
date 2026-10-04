# TopTunes – Music Streaming System (MEAN Stack Architecture)

TopTunes is a full-stack, production-grade music streaming web application built with a **Node.js, Express 4, and MongoDB/Mongoose backend** seamlessly connected to an **AngularJS 1.8.3 + ngRoute single-page application (SPA)**.

---

## 🌟 Key Features

- **Full-Stack REST Architecture**: Complete RESTful backend handling authentication, catalog browsing, playlists, user library, player state, and real-time statistics.
- **JWT Authentication**: Secure registration, login, and session restoration with bcrypt password hashing (`BCRYPT_ROUNDS=10`) and stateless `Authorization: Bearer <token>` authorization.
- **Dynamic Procedural Cover Art**: `tt-cover` component generates gradient cover artwork procedurally using item `hue` and geometric `shape` values without requiring external image assets.
- **Seamless Catalog & Browse**: Supports genre filtering (`Pop`, `Rock`, `Hip-Hop`, `Electronic`, `Jazz`, `Lo-fi`), title search, sorting by popularity or length, and unavailable track indicators.
- **Full Library & Playlist Management**: Synchronized liked songs, saved albums, track recommendations, and playlist CRUD with owner permission enforcement.
- **Persistent Player Queue**: Simulated audio playback with debounced background queue and transport state (`position`, `shuffle`, `repeat`, `volume`) synchronization.
- **Robust Security & NoSQL Protection**: Built-in NoSQL operator injection guard (`noSqlSanitize`), Helmet security headers, CORS origin restrictions, body payload limits (10kb), auth rate limiting, and sanitized error handling.
- **Zero-Config In-Memory Fallback**: Connects directly to local MongoDB or automatically falls back to an in-memory MongoDB instance for development.

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy environment configuration
cp .env.example .env

# 3. Seed sample database & demo user
npm run seed

# 4. Start production server (serves frontend + /api)
npm start
# Open http://localhost:3000 in your browser

# 5. Start development mode with hot-reloading
npm run dev

# 6. Run automated API smoke test suite
npm run test:api
```

---

## 🔑 Demo Account Credentials

Use the **"Fill demo account"** button on the Login page (`#/login`) or sign in with:
- **Email**: `demo@toptunes.dev`
- **Password**: `demo1234`

*The seed script pre-populates this account with sample likes, saved albums, playlists, play counts, and listening history.*

---

## 📁 Repository Structure

```
toptunes/
├─ server.js                  # Entry point: DB connection + Express static & /api mount
├─ package.json               # Dependencies and npm scripts (start, dev, seed, test:api)
├─ .env.example / .env        # Environment configuration
├─ README.md                  # System documentation
├─ docs/
│  └─ FRONTEND-API-MAP.md     # Route-to-endpoint architectural mapping
├─ frontend/
│  └─ public/                 # Static SPA root (index.html, css/, js/app.js, vendor/)
└─ backend/
   ├─ app.js                  # Express app middleware & security setup
   ├─ config/                 # Environment validation (env.js) & DB connection (db.js)
   ├─ models/                 # Mongoose schemas (User, Song, Album, Artist, Genre, Playlist, PlaybackState)
   ├─ middleware/             # Auth, validation, rate limiting, NoSQL sanitizer, error handler
   ├─ controllers/            # Thin HTTP request handlers
   ├─ services/               # Core business logic & database queries
   ├─ routes/                 # Express API routers mounted under /api
   ├─ utils/                  # ApiError class, asyncHandler, entity serializers
   ├─ seed/                   # Catalog seed data & seed runner script (npm run seed)
   └─ test/                   # Automated smoke test suite (npm run test:api)
```

---

## 🛠️ REST API Table Reference

All API responses use a standard JSON envelope:
- **Success**: `{ "data": ... }` (plus `"meta": { ... }` for lists/search).
- **Error**: `{ "error": { "code": "STANDARD_CODE", "message": "Human readable", "details": [...] } }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | – | Health check & database connection status |
| `POST` | `/api/auth/register` | – | Create account (`{ name, email, password }`) |
| `POST` | `/api/auth/login` | – | Authenticate credentials (`{ email, password }`) |
| `GET` | `/api/auth/me` | ✔ | Restore user session |
| `POST` | `/api/auth/logout` | ✔ | End session (client-side token drop) |
| `GET` / `PATCH` | `/api/users/me` | ✔ | Get profile details / Update display name or preferences |
| `PATCH` | `/api/users/me/password` | ✔ | Change password (`{ currentPassword, newPassword }`) |
| `GET` | `/api/catalog` | – | Single-roundtrip bootstrap (songs, albums, artists, genres) |
| `GET` | `/api/songs` | – | Query songs (`q`, `genre`, `available`, `sort`, `page`, `limit`) |
| `GET` | `/api/songs/:id` | – | Song detail |
| `POST` | `/api/songs/:id/play` | opt | Increment play count, record history & listening time |
| `GET` | `/api/albums` / `:id` | – | Album list / Album detail with populated tracklist |
| `GET` | `/api/artists` / `:id` | – | Artist list / Artist detail with top tracks |
| `GET` | `/api/genres` | – | Genre list with song count aggregations |
| `GET` | `/api/library` | ✔ | Combined user state (liked songs, saved albums, playlists, history) |
| `PUT` / `DELETE` | `/api/library/liked/:songId` | ✔ | Like / Unlike song (idempotent) |
| `PUT` / `DELETE` | `/api/library/albums/:albumId` | ✔ | Save / Unsave album |
| `POST` | `/api/library/reset` | ✔ | Reset user library data & playlists |
| `GET` / `POST` | `/api/playlists` | ✔ | List user playlists / Create new playlist |
| `GET` / `PATCH` / `DELETE` | `/api/playlists/:id` | ✔ | Playlist detail, update name/description, or delete |
| `POST` / `DELETE` | `/api/playlists/:id/songs` | ✔ | Add or remove track from playlist |
| `GET` | `/api/playlists/:id/suggestions` | ✔ | Recommended tracks matching playlist genres |
| `GET` / `PUT` | `/api/queue` | ✔ | Get or persist queue and playback state |
| `GET` | `/api/search` | – | Unified multi-collection search |
| `GET` | `/api/browse` | – | Home feed (trending tracks, new releases, featured albums) |
| `GET` | `/api/stats/me` | ✔ | Profile listening statistics tiles |

---

## 🧪 Testing & Verification

Run the automated smoke test suite verifying all API endpoints, auth guards, input validation, and NoSQL injection protection:

```bash
npm run test:api
```

---

## 📄 License

MIT License. Designed and developed for TopTunes Music Streaming System.
