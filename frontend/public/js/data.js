/* TopTunes seed data & offline fallback constants. */
(function () {
  'use strict';

  var genres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Lo-fi'];
  var emptyState = { likes: [], library: [], albums: [], playlists: [], history: [], plays: {}, listened: 0, nextPid: 1 };

  angular.module('topTunes.data', []).constant('SEED', {
    catalog: { songs: [], albums: [], genres: genres },
    demoUser: { id: 'demo', name: 'Demo Listener', email: 'demo@toptunes.dev', password: 'demo1234', role: 'user', joined: 1767225600000 },
    demoAdmin: { id: 'admin', name: 'System Admin', email: 'admin@toptunes.dev', password: 'admin1234', role: 'admin', joined: 1767225600000 },
    demoState: emptyState,
    emptyState: emptyState
  });
})();
