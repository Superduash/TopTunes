/* TopTunes seed data. All artists, albums and songs are fictional.
 * When the Express/MongoDB backend exists, this file is only used as an offline fallback:
 * Api.getCatalog() in app.js is the single place that would call GET /api/catalog instead. */
(function () {
  'use strict';

  var genres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Lo-fi'];

  // t=title, a=artist, g=genre, y=year, h=cover hue, s=cover shape (0-3)
  // tr = [song title, seconds, available?]  (third value 0 = unavailable)
  var raw = [
    { t: 'Neon Harbor', a: 'Mira Vale', g: 'Pop', y: 2025, h: 335, s: 0, tr: [['Glass Hours', 212], ['Paper Satellites', 187], ['Late Bus Home', 241], ['Static Bloom', 198, 0]] },
    { t: 'Rust & Rivers', a: 'Cedar & Stone', g: 'Rock', y: 2024, h: 18, s: 1, tr: [['Gravel Road Hymn', 264], ['Burn the Map', 231], ['Salt in the Wind', 283], ['Hollow Town', 205]] },
    { t: 'Concrete Gardens', a: 'Kofi Lane', g: 'Hip-Hop', y: 2025, h: 265, s: 2, tr: [['Rooftop Ledger', 196], ['Bus Fare Blues', 178], ['Second Shift', 222, 0], ['Name on the Door', 209]] },
    { t: 'Signal Bloom', a: 'Orbit Theory', g: 'Electronic', y: 2026, h: 190, s: 3, tr: [['Carrier Wave', 301], ['Pulse Width', 254], ['Low Earth', 276], ['Afterimage', 233]] },
    { t: 'Blue Hour Sessions', a: 'The Quiet Quartet', g: 'Jazz', y: 2023, h: 215, s: 0, tr: [['Smoke and Mirrors', 318], ['Lantern Waltz', 287], ['Last Train Uptown', 344], ['Open Window', 262]] },
    { t: 'Rainy Desk', a: 'Soft Static', g: 'Lo-fi', y: 2025, h: 155, s: 1, tr: [['Tea Gone Cold', 148], ['Window Seat', 162], ['Notebook Margins', 171], ['Sleepy Pixels', 139]] },
    { t: 'Paper Planes', a: 'Juno Park', g: 'Pop', y: 2026, h: 45, s: 2, tr: [['Wishful Thinking', 204], ['Weekend Rehearsal', 191], ['Sunburn Season', 226], ['Postcards', 183]] },
    { t: 'Dust Devils', a: 'Wildfire Radio', g: 'Rock', y: 2022, h: 130, s: 3, tr: [['Mile Marker 9', 243], ['Neon Cactus', 219], ['Slow Burn Highway', 297, 0], ['Last Call Lullaby', 256]] }
  ];

  var songs = [], albums = [], n = 0;
  raw.forEach(function (r, ai) {
    var album = { id: 'a' + (ai + 1), title: r.t, artist: r.a, genre: r.g, year: r.y, hue: r.h, shape: r.s, songIds: [] };
    r.tr.forEach(function (t, ti) {
      n++;
      album.songIds.push('s' + n);
      songs.push({
        id: 's' + n, title: t[0], artist: r.a, genre: r.g, year: r.y,
        albumId: album.id, album: r.t, track: ti + 1,
        duration: t[1], available: t[2] !== 0,
        plays: ((n * 7919) % 900 + 100) * 137,
        hue: r.h, shape: r.s
      });
    });
    albums.push(album);
  });

  var demoState = {
    likes: ['s1', 's14', 's21'],
    library: ['s1', 's5', 's13', 's17', 's21', 's25'],
    albums: ['a4'],
    playlists: [
      { id: 'p1', name: 'Morning Drive', songIds: ['s1', 's25', 's5', 's14'], created: 1767225600000 },
      { id: 'p2', name: 'Focus Flow', songIds: ['s17', 's21', 's22', 's23'], created: 1767312000000 }
    ],
    history: ['s17', 's2'], plays: {}, listened: 5400, nextPid: 3
  };
  var emptyState = { likes: [], library: [], albums: [], playlists: [], history: [], plays: {}, listened: 0, nextPid: 1 };

  angular.module('topTunes.data', []).constant('SEED', {
    catalog: { songs: songs, albums: albums, genres: genres },
    demoUser: { id: 'demo', name: 'Demo Listener', email: 'demo@toptunes.dev', password: 'demo1234', joined: 1767225600000 },
    demoState: demoState,
    emptyState: emptyState
  });
})();
