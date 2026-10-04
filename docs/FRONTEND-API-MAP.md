# TopTunes Frontend-to-Backend API Mapping Specification (Phase 1)

## 1. Overview & Architecture Strategy
This document maps every route, controller, user action, and data requirement in the existing AngularJS 1.8.3 SPA to the corresponding RESTful Express + MongoDB API endpoints.

### Mapping & Serialization Strategy
- **Layered Serializers (`backend/utils/serializers.js`)**: MongoDB Mongoose documents will be transformed into the exact field shapes expected by the frontend (e.g. `_id` $\to$ `id`, `available: boolean`, `hue: number`, `shape: number`, `plays: number`, `album: string`, `artist: string`).
- **Synchronous Catalog In-Memory Index**: The AngularJS `Catalog` service will bootstrap once at application startup via `GET /api/catalog` (or `/api/songs` + `/api/albums` + `/api/genres`), ensuring all synchronous filter helpers in controllers (`albumSongs`, `songSearch`, `matchesAlbum`) continue working with zero frontend rewriting.
- **Optimistic State Updates**: The `Library` and `Player` services update client-side state optimistically for snappy responsiveness, syncing in the background with backend endpoints and reverting with `Toast` on network failure.
- **Dual Guest/Auth Model**: Guests retain client-side localStorage fallback; logged-in users synchronize likes, saved albums, playlists, history, and queue with MongoDB.

---

## 2. Route & Action Endpoint Mapping

### 2.1 Route: `#/home` (`HomeCtrl as vm`)
- **UI Elements**: Time-based greeting, Guest banner, Featured Track Hero, "Pick up where you left off" (Recent history), "Trending now" song rows with genre chips, "Your playlists" cards, "Albums" cards.
- **Data Required**:
  - Catalog songs (for trending ranking by play count)
  - Catalog albums (sorted by year)
  - User's recent listening history
  - User's playlists
- **API Endpoints**:
  - `GET /api/browse` or `GET /api/catalog`
  - `GET /api/library/recent`
  - `GET /api/playlists`

---

### 2.2 Route: `#/search` (`SearchCtrl as vm`)
- **UI Elements**: Debounced search input, Clear button, Genre filter chips, "Hide unavailable" checkbox, Genre browse tiles (with dynamic hue), Grouped search results (Songs with "Play all", Albums).
- **Data Required**:
  - Full catalog or search query matches
  - Genre list with song counts per genre
- **API Endpoints**:
  - `GET /api/search?q=:query&genre=:genre&available=:bool`
  - `GET /api/genres`

---

### 2.3 Route: `#/library` (`LibraryCtrl as vm`)
- **UI Elements**: 3 Tabs (`Songs`, `Liked`, `Albums`) with live numeric count badges, Sort dropdown (`recent`, `title`, `artist`, `duration`), Genre chips, Action buttons ("Play all", "Shuffle"), Universal song rows, Empty states.
- **Data Required**:
  - User's library song IDs & liked song IDs
  - User's saved album IDs
- **API Endpoints**:
  - `GET /api/library` (Combined user state: liked songs, library songs, saved albums, playlists, history)
  - `GET /api/library/liked`
  - `GET /api/library/albums`
  - `PUT /api/library/liked/:songId` (Toggle like)
  - `DELETE /api/library/liked/:songId` (Toggle unlike)
  - `PUT /api/library/albums/:albumId` (Save album)
  - `DELETE /api/library/albums/:albumId` (Unsave album)

---

### 2.4 Route: `#/playlists` & `#/playlists/:id` (`PlaylistsCtrl`, `PlaylistCtrl`)
- **UI Elements**:
  - `#/playlists`: Create playlist inline form (`name`), Playlist cards grid.
  - `#/playlists/:id`: Gradient hero with large cover art, Kind badge, 2-line clamped title, Inline rename form, Metadata & stats pills (`Tracks`, `Playable`, `Liked`, `Top genre`), Actions (Play, Shuffle, Rename, Delete with confirmation), Song rows, Recommended song suggestions with `+ Add` button.
  - Context menu on song rows: Multi-playlist checkboxes.
- **Data Required**:
  - Playlist details, tracklist populated with song objects, ownership flag (`isOwner`).
  - Suggested tracks matching genre/artist not yet in the playlist.
- **API Endpoints**:
  - `GET /api/playlists` (List user's playlists)
  - `POST /api/playlists` (Create playlist `{ name, description? }`)
  - `GET /api/playlists/:id` (Get playlist with populated songs and stats)
  - `PATCH /api/playlists/:id` (Rename/edit playlist `{ name }`)
  - `DELETE /api/playlists/:id` (Delete playlist)
  - `PUT /api/playlists/:id/songs/:songId` (Idempotent add to playlist)
  - `DELETE /api/playlists/:id/songs/:songId` (Remove song from playlist)
  - `GET /api/playlists/:id/suggestions` (Get recommended songs)

---

### 2.5 Route: `#/albums/:id` (`AlbumCtrl as vm`)
- **UI Elements**: Album hero with large artwork, title, artist link, year, genre, stats pills (`Tracks`, `Playable`, `Liked`), Actions (Play, Shuffle, "Save Album" / "Saved to Library" toggle), Full tracklist.
- **Data Required**:
  - Album details with ordered track list.
  - Saved status (`saved: boolean`).
- **API Endpoints**:
  - `GET /api/albums/:id`
  - `PUT /api/library/albums/:id`
  - `DELETE /api/library/albums/:id`

---

### 2.6 Route: `#/profile` (`ProfileCtrl as vm`, `needUser` Guard)
- **UI Elements**: User initials monogram avatar, account information (name, email, member since date), 6 listening-stat tiles (`Liked songs`, `Library songs`, `Saved albums`, `Playlists`, `Listening time`, `Top genre`), Display name edit form with validation, Recently played tracks, Danger zone ("Reset library data" with confirmation).
- **Data Required**:
  - User profile details
  - Aggregated stats (total listened time, counts, top genre)
  - Recently played song objects
- **API Endpoints**:
  - `GET /api/users/me`
  - `PATCH /api/users/me` (Update name `{ name }`)
  - `GET /api/stats/me` (6 stat tile counters)
  - `POST /api/library/reset` (Reset likes, library, saved albums, history, listening time)

---

### 2.7 Routes: `#/login` & `#/register` (`LoginCtrl`, `RegisterCtrl`, `guestOnly` Guard)
- **UI Elements**:
  - `#/login`: Email/password inputs, validation errors, instant **"Fill demo account"** button (`demo@toptunes.dev` / `demo1234`).
  - `#/register`: Full name, Email address, Password with 4-tier live strength meter, Confirm password matcher (`tt-match`), Terms checkbox.
- **API Endpoints**:
  - `POST /api/auth/login` (Returns `{ data: { user, token } }`)
  - `POST /api/auth/register` (Returns `{ data: { user, token } }`)
  - `GET /api/auth/me` (Session restore on boot)
  - `POST /api/auth/logout` (Client-side token drop)

---

### 2.8 Global Audio Player & Queue Drawer (`Player` Service)
- **UI Elements**: Desktop 3-zone player bar, custom scrub slider with `--p`, volume slider, transport buttons (Play, Pause, Next, Prev, Shuffle, Repeat modes), mobile mini-player, full-screen expanded player sheet, right-side queue drawer with *Clear upcoming* action.
- **Data & Persistence**:
  - Atomic play count increments & listening history logging on track playback.
  - Debounced queue state persistence (`PUT /api/queue`).
- **API Endpoints**:
  - `POST /api/songs/:id/play` (Increment play count, record recent play, add listening seconds)
  - `GET /api/queue` (Restore playback queue, position, shuffle, repeat, volume)
  - `PUT /api/queue` (Debounced sync of current queue & transport state)
  - `DELETE /api/queue` (Clear queue)

---

## 3. Data Schema & Field Serialization Reference

### Song Entity (Client Shape Expected)
```json
{
  "id": "s1",
  "title": "Glass Hours",
  "artist": "Mira Vale",
  "album": "Neon Harbor",
  "albumId": "a1",
  "genre": "Pop",
  "year": 2025,
  "track": 1,
  "duration": 212,
  "available": true,
  "plays": 128450,
  "hue": 335,
  "shape": 0,
  "liked": false
}
```

### Album Entity (Client Shape Expected)
```json
{
  "id": "a1",
  "title": "Neon Harbor",
  "artist": "Mira Vale",
  "genre": "Pop",
  "year": 2025,
  "hue": 335,
  "shape": 0,
  "songIds": ["s1", "s2", "s3", "s4"],
  "saved": false
}
```

### Playlist Entity (Client Shape Expected)
```json
{
  "id": "p1",
  "name": "Morning Drive",
  "songIds": ["s1", "s25", "s5", "s14"],
  "created": 1767225600000,
  "isOwner": true
}
```

---

## 4. Phase 1 Verification
- Frontend structure and dependencies confirmed intact.
- Static serving through `node server.js` verified.
- Proceeding to Phase 2 (Backend Skeleton, Environment Configuration, Database Connection & Server Mounting).
