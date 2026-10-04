# TopTunes — Music Streaming System

TopTunes is a Spotify-inspired music streaming simulation built with **AngularJS 1.8.3 + ngRoute** and a **Node.js, Express, MongoDB/Mongoose backend**. It demonstrates SPA navigation, dynamic music data, search, playlists, library management, simulated playback, authentication, and responsive UI.

## Features

- 🎵 Dynamic songs, albums, artists, genres and playlists
- 🔎 Search and filtering by song, artist and genre
- 📚 Liked songs, saved albums and playlist management
- ▶️ Simulated player with queue, shuffle, repeat and volume
- 📊 Dynamic playlist and listening statistics
- 🔐 Registration, login, JWT authentication and form validation
- 📱 Responsive desktop, tablet and mobile interface
- 🛡️ Express middleware, validation, security headers and protected API routes

## Tech Stack

**Frontend:** AngularJS 1.8.3, ngRoute, HTML, CSS, JavaScript  
**Backend:** Node.js, Express 4, Mongoose  
**Database:** MongoDB  
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

Open `http://localhost:3000`.

For development:

```bash
npm run dev
```

## Demo Account

```text
Email:    demo@toptunes.dev
Password: demo1234
```

The seed data provides sample songs, albums, playlists and user activity for demonstration.

## Project Structure

```text
TopTunes/
├── server.js
├── package.json
├── .env.example
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

## API

The AngularJS SPA communicates with the Express API under `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Restore session |
| GET | `/api/catalog` | Load music catalog |
| GET | `/api/songs` | Search/filter songs |
| GET | `/api/albums` | Browse albums |
| GET | `/api/library` | User library |
| PUT/DELETE | `/api/library/liked/:songId` | Like/unlike song |
| GET/POST | `/api/playlists` | List/create playlists |
| PATCH/DELETE | `/api/playlists/:id` | Update/delete playlist |
| POST/DELETE | `/api/playlists/:id/songs` | Manage playlist songs |
| GET/PUT | `/api/queue` | Queue and playback state |
| GET | `/api/search` | Unified search |
| GET | `/api/stats/me` | User statistics |

## Testing

Run the API smoke tests with:

```bash
npm run test:api
```

## License

MIT License.