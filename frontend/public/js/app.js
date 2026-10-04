/* TopTunes - AngularJS 1.8.3 SPA.
 * Layers: Api (REST $http seam) -> Catalog / Session / Library (state) -> Player (queue + simulated playback)
 *         -> controllers (views) + directives + filters.
 */
(function () {
  'use strict';

  var app = angular.module('topTunes', ['ngRoute', 'topTunes.data']);

  /* ================= Routing ================= */
  app.config(['$routeProvider', '$locationProvider', function ($rp, $lp) {
    $lp.hashPrefix('');
    var boot = ['Boot', function (Boot) { return Boot.ready(); }];
    var needUser = ['Session', 'Boot', '$q', function (S, Boot, $q) {
      return Boot.ready().then(function () {
        return S.user ? true : $q.reject({ redirect: '/login', next: true, info: 'Log in to open your profile.' });
      });
    }];
    var guestOnly = ['Session', 'Boot', '$q', function (S, Boot, $q) {
      return Boot.ready().then(function () {
        return S.user ? $q.reject({ redirect: '/home' }) : true;
      });
    }];
    function view(path, name, ctrl, title, guard, opts) {
      var resolve = { boot: boot };
      if (guard) { resolve.guard = guard; }
      $rp.when(path, angular.extend({ templateUrl: name + '.html', controller: ctrl, controllerAs: 'vm', title: title, resolve: resolve }, opts));
    }
    view('/home', 'home', 'HomeCtrl', 'Home');
    view('/search', 'search', 'SearchCtrl', 'Search', null, { reloadOnSearch: false });
    view('/library', 'library', 'LibraryCtrl', 'Your library');
    view('/playlists', 'playlists', 'PlaylistsCtrl', 'Playlists');
    view('/playlists/:id', 'playlist', 'PlaylistCtrl', 'Playlist');
    view('/albums/:id', 'album', 'AlbumCtrl', 'Album');
    view('/profile', 'profile', 'ProfileCtrl', 'Profile', needUser);
    view('/login', 'login', 'LoginCtrl', 'Log in', guestOnly, { reloadOnSearch: false });
    view('/register', 'register', 'RegisterCtrl', 'Create account', guestOnly);
    $rp.otherwise({ redirectTo: '/home' });
  }]);

  app.run(['$rootScope', '$location', 'Toast', function ($rs, $loc, Toast) {
    $rs.title = 'TopTunes';
    $rs.$on('$routeChangeSuccess', function (e, cur) { $rs.title = (cur && cur.title ? cur.title + ' | ' : '') + 'TopTunes'; });
    $rs.$on('$routeChangeError', function (e, cur, prev, rej) {
      if (rej && rej.redirect) {
        var from = $loc.path();
        if (rej.info) { Toast.info(rej.info); }
        $loc.url(rej.redirect + (rej.next ? '?next=' + encodeURIComponent(from) : ''));
      } else {
        Toast.error('TopTunes could not load. Refresh the page and try again.');
      }
    });
  }]);

  /* ================= Backend Configuration (REST / Express Seam) ================= */
  app.constant('API_BASE', '/api');

  app.factory('AuthInterceptor', ['$q', '$window', 'Toast', function ($q, $window, Toast) {
    return {
      request: function (config) {
        try {
          var token = $window.localStorage.getItem('tt_token');
          if (token && config.url.indexOf('/api') === 0) {
            config.headers = config.headers || {};
            config.headers.Authorization = 'Bearer ' + token;
          }
        } catch (e) {}
        return config;
      },
      responseError: function (rejection) {
        if (rejection && rejection.status === 401 && rejection.config && rejection.config.url && rejection.config.url.indexOf('/api') === 0) {
          // Check if this was not an intentional bad-login request
          if (rejection.config.url.indexOf('/api/auth/login') === -1) {
            try {
              $window.localStorage.removeItem('tt_session');
              $window.localStorage.removeItem('tt_token');
            } catch (e) {}
            // Avoid spamming toast on initial session restore
            if (rejection.config.url.indexOf('/api/auth/me') === -1) {
              Toast.error('Your session has expired. Please log in again.');
            }
          }
        }
        return $q.reject(rejection);
      }
    };
  }]);

  app.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
  }]);

  /* ================= Api (backend HTTP service) ================= */
  app.factory('Api', ['$http', '$q', '$window', 'API_BASE', 'SEED', function ($http, $q, $window, API_BASE, SEED) {
    function extract(res) {
      return res.data && res.data.data !== undefined ? res.data.data : res.data;
    }

    function handleErr(rejection) {
      var msg = 'An unexpected error occurred.';
      var details = [];
      if (rejection && rejection.data && rejection.data.error) {
        msg = rejection.data.error.message || msg;
        details = rejection.data.error.details || [];
      } else if (rejection && rejection.status === -1) {
        msg = 'Cannot connect to server. Please check your network connection.';
      }
      return $q.reject({ message: msg, details: details, status: rejection ? rejection.status : 0 });
    }

    function localGet(k, def) {
      try { var v = $window.localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; }
    }
    function localSet(k, v) {
      try { $window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }

    return {
      // GET /api/catalog
      getCatalog: function () {
        return $http.get(API_BASE + '/catalog').then(extract).catch(function () {
          return angular.copy(SEED.catalog);
        });
      },

      // GET /api/browse
      getBrowse: function () {
        return $http.get(API_BASE + '/browse').then(extract).catch(handleErr);
      },

      // GET /api/library (for user) or localStorage (for guest)
      getState: function (key) {
        var token = null;
        try { token = $window.localStorage.getItem('tt_token'); } catch (e) {}

        if (token && key && key !== 'guest') {
          return $http.get(API_BASE + '/library').then(extract).catch(function () {
            var saved = localGet('tt_state_' + key, null);
            return saved || angular.copy(SEED.emptyState);
          });
        }

        var saved = localGet('tt_state_' + key, null);
        if (saved) { return $q.when(saved); }
        return $q.when(angular.copy(key === 'guest' || key === 'u:demo' ? SEED.demoState : SEED.emptyState));
      },

      // PUT /api/me/state (guest persistence fallback)
      saveState: function (key, state) {
        localSet('tt_state_' + key, state);
      },

      // Library / Like endpoints
      likeSong: function (songId, on) {
        var method = on ? 'PUT' : 'DELETE';
        return $http({ method: method, url: API_BASE + '/library/liked/' + songId }).then(extract).catch(handleErr);
      },

      saveAlbum: function (albumId, on) {
        var method = on ? 'PUT' : 'DELETE';
        return $http({ method: method, url: API_BASE + '/library/albums/' + albumId }).then(extract).catch(handleErr);
      },

      // Playlists
      createPlaylist: function (data) {
        return $http.post(API_BASE + '/playlists', data).then(extract).catch(handleErr);
      },
      updatePlaylist: function (id, data) {
        return $http.patch(API_BASE + '/playlists/' + id, data).then(extract).catch(handleErr);
      },
      deletePlaylist: function (id) {
        return $http.delete(API_BASE + '/playlists/' + id).then(extract).catch(handleErr);
      },
      addPlaylistSong: function (playlistId, songId) {
        return $http.put(API_BASE + '/playlists/' + playlistId + '/songs/' + songId).then(extract).catch(handleErr);
      },
      removePlaylistSong: function (playlistId, songId) {
        return $http.delete(API_BASE + '/playlists/' + playlistId + '/songs/' + songId).then(extract).catch(handleErr);
      },
      getPlaylistSuggestions: function (playlistId) {
        return $http.get(API_BASE + '/playlists/' + playlistId + '/suggestions').then(extract).catch(handleErr);
      },

      // Listening
      recordPlay: function (songId, seconds) {
        return $http.post(API_BASE + '/songs/' + songId + '/play', { seconds: seconds || 0 }).then(extract).catch(function () {});
      },

      resetLibrary: function () {
        return $http.post(API_BASE + '/library/reset').then(extract).catch(handleErr);
      },

      // Auth
      register: function (d) {
        return $http.post(API_BASE + '/auth/register', {
          name: d.name,
          email: d.email,
          password: d.password
        }).then(function (res) {
          var data = extract(res);
          if (data && data.token) {
            try { $window.localStorage.setItem('tt_token', data.token); } catch (e) {}
          }
          return data.user;
        }).catch(handleErr);
      },

      login: function (d) {
        return $http.post(API_BASE + '/auth/login', {
          email: d.email,
          password: d.password
        }).then(function (res) {
          var data = extract(res);
          if (data && data.token) {
            try { $window.localStorage.setItem('tt_token', data.token); } catch (e) {}
          }
          return data.user;
        }).catch(handleErr);
      },

      getMe: function () {
        return $http.get(API_BASE + '/auth/me').then(extract).catch(handleErr);
      },

      updateUser: function (id, patch) {
        return $http.patch(API_BASE + '/users/me', patch).then(extract).catch(handleErr);
      },

      // Queue persistence
      getQueue: function () {
        return $http.get(API_BASE + '/queue').then(extract).catch(function () { return null; });
      },
      saveQueue: function (state) {
        return $http.put(API_BASE + '/queue', state).then(extract).catch(function () {});
      },

      // Search & Stats
      search: function (params) {
        return $http.get(API_BASE + '/search', { params: params }).then(extract).catch(handleErr);
      },
      getMyStats: function () {
        return $http.get(API_BASE + '/stats/me').then(extract).catch(handleErr);
      }
    };
  }]);

  /* ================= Toast ================= */
  app.factory('Toast', ['$timeout', function ($timeout) {
    var T = { items: [] }, id = 0;
    T.push = function (type, msg) {
      var t = { id: ++id, type: type, msg: msg };
      T.items.push(t);
      if (T.items.length > 3) { T.items.shift(); }
      $timeout(function () { T.dismiss(t); }, 3800);
    };
    T.success = function (m) { T.push('success', m); };
    T.error = function (m) { T.push('error', m); };
    T.info = function (m) { T.push('info', m); };
    T.dismiss = function (t) { var i = T.items.indexOf(t); if (i > -1) { T.items.splice(i, 1); } };
    return T;
  }]);

  /* ================= Catalog ================= */
  app.factory('Catalog', ['Api', function (Api) {
    var C = { songs: [], albums: [], genres: [], _s: {}, _a: {} };
    C.load = function () {
      return Api.getCatalog().then(function (c) {
        C.songs = c.songs || [];
        C.albums = c.albums || [];
        C.genres = (c.genres || []).map(function (g) { return typeof g === 'object' ? g.name : g; });
        C._s = {};
        C._a = {};
        (c.songs || []).forEach(function (s) { C._s[s.id] = s; });
        (c.albums || []).forEach(function (a) { C._a[a.id] = a; });
        return C;
      });
    };
    C.song = function (id) { return C._s[id]; };
    C.album = function (id) { return C._a[id]; };
    C.albumSongs = function (id) {
      var a = C._a[id];
      if (!a) return [];
      if (a.songs && a.songs.length) return a.songs;
      return a.songIds ? a.songIds.map(C.song).filter(Boolean) : [];
    };
    function tokens(q) { return (q || '').toLowerCase().split(/\s+/).filter(Boolean); }
    function hit(hay, q) { hay = (hay || '').toLowerCase(); return tokens(q).every(function (w) { return hay.indexOf(w) > -1; }); }
    C.matches = function (s, q, genre) {
      if (genre && s.genre !== genre) { return false; }
      return hit((s.title || '') + ' ' + (s.artist || '') + ' ' + (s.genre || '') + ' ' + (s.album || ''), q);
    };
    C.matchesAlbum = function (a, q, genre) {
      if (genre && a.genre !== genre) { return false; }
      return hit((a.title || '') + ' ' + (a.artist || '') + ' ' + (a.genre || ''), q);
    };
    return C;
  }]);

  /* ================= Library (per-user state with API synchronization) ================= */
  app.factory('Library', ['Api', 'Catalog', 'Toast', function (Api, C, Toast) {
    var L = { key: 'guest', state: null };
    function normalize(s) {
      var base = angular.extend({ likes: [], library: [], albums: [], playlists: [], history: [], plays: {}, listened: 0, nextPid: 1 }, s);
      base.likes = (base.likes || []).filter(function (id) { return !!C.song(id); });
      base.library = (base.library || []).filter(function (id) { return !!C.song(id); });
      base.albums = (base.albums || []).filter(function (id) { return !!C.album(id); });
      base.history = (base.history || []).filter(function (id) { return !!C.song(id); });
      base.playlists = (base.playlists || []).map(function (p) {
        return {
          id: p.id,
          name: p.name || 'Untitled Playlist',
          songIds: (p.songIds || []).filter(function (id) { return !!C.song(id); }),
          created: p.created || Date.now()
        };
      });
      return base;
    }
    L.state = normalize();

    function save() {
      if (L.key === 'guest') {
        Api.saveState(L.key, L.state);
      }
    }

    function toggle(arr, id) {
      var i = arr.indexOf(id);
      if (i > -1) { arr.splice(i, 1); return false; }
      arr.push(id); return true;
    }

    L.load = function (key) {
      if (key) { L.key = key; }
      return Api.getState(L.key).then(function (s) {
        L.state = normalize(s);
        return L;
      });
    };

    // likes / library / albums
    L.isLiked = function (id) { return L.state.likes.indexOf(id) > -1; };
    L.toggleLike = function (s) {
      var on = toggle(L.state.likes, s.id);
      save();
      Toast.success(on ? 'Added to Liked Songs' : 'Removed from Liked Songs');
      if (L.key !== 'guest') {
        Api.likeSong(s.id, on).catch(function () {
          toggle(L.state.likes, s.id);
          Toast.error('Could not update liked songs on server.');
        });
      }
    };

    L.inLibrary = function (id) { return L.state.library.indexOf(id) > -1 || L.isLiked(id); };
    L.toggleLibrary = function (s) {
      var on = toggle(L.state.library, s.id);
      save();
      Toast.success(on ? 'Added "' + s.title + '" to your library' : 'Removed "' + s.title + '" from your library');
      if (L.key !== 'guest') {
        Api.likeSong(s.id, on).catch(function () {
          toggle(L.state.library, s.id);
          Toast.error('Could not update library on server.');
        });
      }
    };

    L.albumSaved = function (id) { return L.state.albums.indexOf(id) > -1; };
    L.toggleAlbum = function (a) {
      var on = toggle(L.state.albums, a.id);
      save();
      Toast.success(on ? 'Saved "' + a.title + '" to your library' : 'Removed "' + a.title + '" from your library');
      if (L.key !== 'guest') {
        Api.saveAlbum(a.id, on).catch(function () {
          toggle(L.state.albums, a.id);
          Toast.error('Could not save album to server.');
        });
      }
    };

    L.likedSongs = function () { return L.state.likes.slice().reverse().map(C.song).filter(Boolean); };
    L.librarySongs = function () { return L.state.library.slice().reverse().map(C.song).filter(Boolean); };
    L.savedAlbums = function () { return L.state.albums.map(C.album).filter(Boolean); };
    L.historySongs = function () { return L.state.history.map(C.song).filter(Boolean); };

    // playlists
    L.playlist = function (id) { return L.state.playlists.filter(function (p) { return p.id === id; })[0]; };
    L.validName = function (name, exceptId) {
      name = (name || '').trim();
      if (!name) { return 'Give your playlist a name.'; }
      if (name.length > 40) { return 'Keep the name to 40 characters or fewer.'; }
      var dup = L.state.playlists.some(function (p) { return p.id !== exceptId && p.name.toLowerCase() === name.toLowerCase(); });
      return dup ? 'You already have a playlist called "' + name + '".' : '';
    };

    L.createPlaylist = function (name) {
      var err = L.validName(name);
      if (err) { return { error: err }; }
      var p = { id: 'p' + (L.state.nextPid++), name: name.trim(), songIds: [], created: Date.now() };
      L.state.playlists.push(p);
      save();
      Toast.success('Created playlist "' + p.name + '"');

      if (L.key !== 'guest') {
        Api.createPlaylist({ name: name.trim() }).then(function (created) {
          if (created && created.id) {
            p.id = created.id;
          }
        }).catch(function (e) {
          Toast.error(e.message || 'Could not sync playlist with server.');
        });
      }

      return { playlist: p };
    };

    L.renamePlaylist = function (p, name) {
      var err = L.validName(name, p.id);
      if (err) { return err; }
      var oldName = p.name;
      p.name = name.trim();
      save();
      Toast.success('Renamed playlist to "' + p.name + '"');

      if (L.key !== 'guest') {
        Api.updatePlaylist(p.id, { name: p.name }).catch(function () {
          p.name = oldName;
          Toast.error('Could not rename playlist on server.');
        });
      }
      return '';
    };

    L.deletePlaylist = function (p) {
      var idx = L.state.playlists.indexOf(p);
      if (idx > -1) {
        L.state.playlists.splice(idx, 1);
        save();
        Toast.success('Deleted playlist "' + p.name + '"');

        if (L.key !== 'guest') {
          Api.deletePlaylist(p.id).catch(function () {
            L.state.playlists.splice(idx, 0, p);
            Toast.error('Could not delete playlist on server.');
          });
        }
      }
    };

    L.inPlaylist = function (p, id) { return !!(p && p.songIds && p.songIds.indexOf(id) > -1); };
    L.togglePlaylistSong = function (p, s) {
      if (!p || !p.songIds) return;
      var on = toggle(p.songIds, s.id);
      save();
      Toast.success(on ? 'Added to "' + p.name + '"' : 'Removed from "' + p.name + '"');

      if (L.key !== 'guest') {
        var action = on ? Api.addPlaylistSong(p.id, s.id) : Api.removePlaylistSong(p.id, s.id);
        action.catch(function () {
          toggle(p.songIds, s.id);
          Toast.error('Could not update playlist track on server.');
        });
      }
    };

    L.removeFromPlaylist = function (p, s) { if (L.inPlaylist(p, s.id)) { L.togglePlaylistSong(p, s); } };
    L.playlistSongs = function (p) { return p && p.songIds ? p.songIds.map(C.song).filter(Boolean) : []; };

    // stats
    function sum(songs) { return songs.reduce(function (t, s) { return t + (s.duration || 0); }, 0); }
    function topGenre(songs) {
      var n = {}, best = null;
      songs.forEach(function (s) {
        if (!s) return;
        var g = s.genre || '';
        n[g] = (n[g] || 0) + 1;
        if (!best || n[g] > n[best]) { best = g; }
      });
      return best || 'Pop';
    }

    L.listStats = function (songs) {
      return {
        count: songs.length, seconds: sum(songs),
        playable: songs.filter(function (s) { return s.available; }).length,
        liked: songs.filter(function (s) { return L.isLiked(s.id); }).length,
        top: topGenre(songs)
      };
    };

    L.stats = function () {
      return {
        likes: L.state.likes.length,
        library: L.state.library.length,
        albums: L.state.albums.length,
        playlists: L.state.playlists.length,
        listened: L.state.listened,
        top: topGenre(L.historySongs().concat(L.likedSongs()))
      };
    };

    // listening
    L.playsOf = function (s) { return (s.plays || s.playCount || 0) + (L.state.plays[s.id] || 0); };
    L.recordPlay = function (s) {
      var h = L.state.history, i = h.indexOf(s.id);
      if (i > -1) { h.splice(i, 1); }
      h.unshift(s.id); h.length = Math.min(h.length, 12);
      L.state.plays[s.id] = (L.state.plays[s.id] || 0) + 1;
      save();

      if (L.key !== 'guest') {
        Api.recordPlay(s.id);
      }
    };

    L.addListened = function (sec, currentSongId) {
      L.state.listened += sec;
      save();
      if (L.key !== 'guest' && currentSongId) {
        Api.recordPlay(currentSongId, sec);
      }
    };

    L.reset = function () {
      L.state = normalize();
      save();
      Toast.success('Your library data was reset.');
      if (L.key !== 'guest') {
        Api.resetLibrary().catch(function () {
          Toast.error('Could not reset library on server.');
        });
      }
    };

    return L;
  }]);

  /* ================= Session ================= */
  app.factory('Session', ['Api', 'Library', '$window', function (Api, Library, $window) {
    var S = { user: null };
    try { S.user = JSON.parse($window.localStorage.getItem('tt_session')); } catch (e) { S.user = null; }

    function write() {
      try {
        if (S.user) {
          $window.localStorage.setItem('tt_session', JSON.stringify(S.user));
        } else {
          $window.localStorage.removeItem('tt_session');
          $window.localStorage.removeItem('tt_token');
        }
      } catch (e) {}
    }

    S.key = function () { return S.user ? 'u:' + S.user.id : 'guest'; };

    function enter(u) {
      S.user = u;
      write();
      return Library.load(S.key()).then(function () { return u; });
    }

    S.restore = function () {
      var token = null;
      try { token = $window.localStorage.getItem('tt_token'); } catch (e) {}
      if (!token) {
        S.user = null;
        write();
        return Library.load('guest');
      }
      return Api.getMe().then(function (u) {
        S.user = u;
        write();
        return Library.load(S.key());
      }).catch(function () {
        S.user = null;
        write();
        return Library.load('guest');
      });
    };

    S.register = function (d) { return Api.register(d).then(enter); };
    S.login = function (d) { return Api.login(d).then(enter); };
    S.logout = function () {
      S.user = null;
      write();
      return Library.load(S.key());
    };
    S.rename = function (name) {
      return Api.updateUser(S.user.id, { name: name.trim() }).then(function (u) {
        S.user = u;
        write();
        return u;
      });
    };

    return S;
  }]);

  /* ================= Boot ================= */
  app.factory('Boot', ['$q', 'Catalog', 'Library', 'Session', function ($q, Catalog, Library, Session) {
    var p = null;
    return {
      ready: function () {
        if (!p) {
          p = Catalog.load().then(function () {
            return Session.restore();
          });
        }
        return p;
      }
    };
  }]);

  /* ================= Player (simulated playback with API sync) ================= */
  app.factory('Player', ['$interval', '$timeout', 'Library', 'Session', 'Api', 'Toast', function ($interval, $timeout, Library, Session, Api, Toast) {
    var P = {
      queue: [], original: null, index: -1, current: null,
      playing: false, position: 0, shuffle: false, repeat: 'off',
      open: false, expanded: false
    };
    var timer = null, pending = 0, TICK = 250;
    var saveQueueTimeout = null;

    function debouncedSaveQueue() {
      if (Session.user) {
        if (saveQueueTimeout) { $timeout.cancel(saveQueueTimeout); }
        saveQueueTimeout = $timeout(function () {
          Api.saveQueue({
            queue: P.queue.map(function (s) { return s.id; }),
            currentIndex: P.index,
            position: P.position,
            shuffle: P.shuffle,
            repeat: P.repeat,
            volume: (P.volume || 80) / 100
          });
        }, 1200);
      }
    }

    function shuffleArr(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function flush() {
      var whole = Math.floor(pending);
      if (whole > 0) {
        Library.addListened(whole, P.current ? P.current.id : null);
        pending -= whole;
      }
    }
    function startTimer() { if (!timer) { timer = $interval(tick, TICK); } }
    function stopTimer() { if (timer) { $interval.cancel(timer); timer = null; } }

    function tick() {
      if (!P.playing || !P.current) { return; }
      P.position += TICK / 1000; pending += TICK / 1000;
      if (pending >= 15) { flush(); }
      if (P.position >= P.current.duration) { finished(); }
    }

    function load(i) {
      P.index = i; P.current = P.queue[i]; P.position = 0; P.playing = true;
      Library.recordPlay(P.current);
      startTimer();
      debouncedSaveQueue();
    }

    function finished() {
      flush();
      if (P.repeat === 'one') { P.position = 0; return; }
      if (P.index < P.queue.length - 1) { load(P.index + 1); }
      else if (P.repeat === 'all') { load(0); }
      else { P.position = 0; P.playing = false; stopTimer(); Toast.info('Reached the end of your queue.'); }
      debouncedSaveQueue();
    }

    P.isCurrent = function (s) { return !!P.current && !!s && P.current.id === s.id; };

    P.playList = function (songs, start, opts) {
      opts = opts || {};
      var ok = (songs || []).filter(function (s) { return s.available; });
      if (start && !start.available) { Toast.error('"' + start.title + '" is unavailable right now.'); return false; }
      if (!ok.length) { Toast.error('None of these songs are available right now.'); return false; }
      if (opts.announce && ok.length < songs.length) { Toast.info((songs.length - ok.length) + ' unavailable song(s) skipped.'); }
      flush();
      var i = start ? ok.indexOf(start) : (opts.shuffle ? Math.floor(Math.random() * ok.length) : 0);
      P.queue = ok.slice(); P.original = null;
      if (opts.shuffle) { P.shuffle = true; }
      if (P.shuffle) {
        P.original = ok.slice();
        var cur = P.queue.splice(i, 1)[0];
        P.queue = [cur].concat(shuffleArr(P.queue)); i = 0;
      }
      load(i);
      return true;
    };

    P.toggle = function () {
      if (!P.current) { return; }
      P.playing = !P.playing;
      if (P.playing) { startTimer(); } else { stopTimer(); flush(); }
      debouncedSaveQueue();
    };

    P.seek = function (v) {
      if (P.current) {
        P.position = Math.max(0, Math.min(+v || 0, P.current.duration - 1));
        debouncedSaveQueue();
      }
    };

    P.next = function () {
      if (!P.current) { return; }
      flush();
      if (P.index < P.queue.length - 1) { load(P.index + 1); }
      else if (P.repeat === 'all') { load(0); }
      else { Toast.info('That is the last song in your queue.'); }
    };

    P.prev = function () {
      if (!P.current) { return; }
      flush();
      if (P.position > 3 || (P.index === 0 && P.repeat !== 'all')) { P.position = 0; return; }
      load(P.index > 0 ? P.index - 1 : P.queue.length - 1);
    };

    P.toggleShuffle = function () {
      P.shuffle = !P.shuffle;
      if (!P.current) { return; }
      if (P.shuffle) {
        var cur = P.current, rest = P.queue.filter(function (s) { return s !== cur; });
        P.original = P.queue.slice(); P.queue = [cur].concat(shuffleArr(rest)); P.index = 0;
      } else if (P.original) {
        var o = P.original, pos = function (s) { var k = o.indexOf(s); return k < 0 ? 1e6 : k; };
        P.queue.sort(function (a, b) { return pos(a) - pos(b); });
        P.index = P.queue.indexOf(P.current); P.original = null;
      }
      debouncedSaveQueue();
    };

    P.cycleRepeat = function () {
      P.repeat = P.repeat === 'off' ? 'all' : (P.repeat === 'all' ? 'one' : 'off');
      debouncedSaveQueue();
    };

    P.enqueue = function (song, next) {
      if (!song.available) { Toast.error('"' + song.title + '" is unavailable right now.'); return; }
      if (!P.current) { P.playList([song], song); return; }
      var at = P.queue.indexOf(song);
      if (at > -1) {
        if (song === P.current) { Toast.info('That song is playing now.'); return; }
        if (!next) { Toast.info('Already in your queue.'); return; }
        P.queue.splice(at, 1); if (at < P.index) { P.index--; }
      }
      P.queue.splice(next ? P.index + 1 : P.queue.length, 0, song);
      if (P.original && P.original.indexOf(song) < 0) { P.original.push(song); }
      Toast.success(next ? 'Playing "' + song.title + '" next' : 'Added "' + song.title + '" to your queue');
      debouncedSaveQueue();
    };

    P.playAt = function (i) { if (P.queue[i]) { flush(); load(i); } };
    P.removeAt = function (i) {
      if (i === P.index || !P.queue[i]) { return; }
      var s = P.queue.splice(i, 1)[0];
      if (i < P.index) { P.index--; }
      if (P.original) { P.original.splice(P.original.indexOf(s), 1); }
      debouncedSaveQueue();
    };
    P.upcoming = function () { return Math.max(0, P.queue.length - 1 - P.index); };
    P.clearUpcoming = function () {
      if (!P.current) { return; }
      P.queue.length = P.index + 1;
      if (P.original) { P.original.filter(function (s) { return P.queue.indexOf(s) > -1; }); }
      debouncedSaveQueue();
    };
    P.volume = 80;
    P.muted = false;
    var lastVol = 80;
    P.toggleMute = function () {
      P.muted = !P.muted;
      if (P.muted) { lastVol = P.volume || 80; P.volume = 0; }
      else { P.volume = lastVol || 80; }
      debouncedSaveQueue();
    };
    P.setVolume = function (v) {
      P.volume = +v;
      P.muted = P.volume === 0;
      if (P.volume > 0) { lastVol = P.volume; }
      debouncedSaveQueue();
    };

    return P;
  }]);

  /* ================= Filters ================= */
  app.filter('duration', function () {
    return function (s) { s = Math.max(0, Math.floor(+s || 0)); var r = s % 60; return Math.floor(s / 60) + ':' + (r < 10 ? '0' : '') + r; };
  });
  app.filter('totalTime', function () {
    return function (s) {
      var m = Math.round((+s || 0) / 60), h = Math.floor(m / 60);
      if (m < 1) { return '0 min'; }
      return h ? h + ' hr' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min';
    };
  });
  app.filter('plays', function () {
    return function (n) {
      n = +n || 0;
      if (n >= 1e6) { return (n / 1e6).toFixed(1).replace('.0', '') + 'M'; }
      if (n >= 1e3) { return (n / 1e3).toFixed(1).replace('.0', '') + 'K'; }
      return String(n);
    };
  });
  app.filter('plural', function () { return function (n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }; });
  app.filter('initials', function () {
    return function (name) { return (name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); };
  });
  app.filter('songSearch', ['Catalog', function (C) {
    return function (list, q, genre) { return (list || []).filter(function (s) { return C.matches(s, q, genre); }); };
  }]);

  /* ================= Directives ================= */
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; } return Math.abs(h); }

  app.directive('ttCover', function () {
    return {
      restrict: 'E', scope: { item: '<' },
      template: '<div class="cover s{{shape}}" ng-style="style"></div>',
      link: function (scope) {
        scope.$watch('item', function (it) {
          if (!it) { return; }
          var seed = hash(String(it.id || it.name || 'x'));
          var hue = it.hue != null ? it.hue : seed % 360;
          scope.shape = it.shape != null ? it.shape : seed % 4;
          scope.style = { background: 'linear-gradient(140deg, hsl(' + hue + ',68%,58%), hsl(' + ((hue + 48) % 360) + ',62%,30%))' };
        });
      }
    };
  });

  app.directive('ttFocus', ['$timeout', function ($timeout) {
    return { link: function (scope, el) { $timeout(function () { el[0].focus(); }, 30); } };
  }]);

  app.directive('ttClickOutside', ['$document', function ($document) {
    return {
      link: function (scope, el, attrs) {
        function onClick(e) { if (!el[0].contains(e.target)) { scope.$apply(attrs.ttClickOutside); } }
        $document.on('click', onClick);
        scope.$on('$destroy', function () { $document.off('click', onClick); });
      }
    };
  }]);

  app.directive('ttMatch', function () {
    return {
      require: 'ngModel',
      link: function (scope, el, attrs, ctrl) {
        ctrl.$validators.match = function (v) { return v === scope.$eval(attrs.ttMatch); };
        scope.$watch(attrs.ttMatch, function () { ctrl.$validate(); });
      }
    };
  });

  app.directive('ttSongRow', function () {
    return {
      restrict: 'E', templateUrl: 'songrow.html',
      scope: { song: '<', index: '<', list: '&', playlist: '<' },
      controller: ['$scope', 'Player', 'Library', function ($scope, P, L) {
        $scope.player = P; $scope.lib = L; $scope.menu = false; $scope.flipUp = false;
        $scope.cur = function () { return P.isCurrent($scope.song); };
        $scope.play = function () {
          if ($scope.cur()) { P.toggle(); return; }
          var l = $scope.list();
          P.playList(l && l.length ? l : [$scope.song], $scope.song);
        };
        $scope.toggleMenu = function ($event) {
          $scope.menu = !$scope.menu;
          if ($scope.menu && $event && $event.currentTarget) {
            var rect = $event.currentTarget.getBoundingClientRect();
            $scope.flipUp = (window.innerHeight - rect.bottom) < 280;
          }
        };
        $scope.close = function () { $scope.menu = false; };
        $scope.$on('app:escape', function () { $scope.menu = false; });
      }]
    };
  });

  /* ================= Controllers ================= */
  app.controller('AppCtrl', ['$rootScope', '$location', '$route', 'Catalog', 'Session', 'Library', 'Player', 'Toast', function ($rs, $loc, $route, Catalog, Session, Library, Player, Toast) {
    var vm = this;
    vm.session = Session; vm.lib = Library; vm.player = Player; vm.toast = Toast; vm.loading = true;
    vm.primaryNav = [
      { path: '/home', label: 'Home', icon: 'home' },
      { path: '/search', label: 'Search', icon: 'search' },
      { path: '/library', label: 'Library', icon: 'library' }
    ];
    vm.nav = [
      { path: '/home', label: 'Home', icon: 'home' }, { path: '/search', label: 'Search', icon: 'search' },
      { path: '/library', label: 'Library', icon: 'library' }, { path: '/playlists', label: 'Playlists', icon: 'list' },
      { path: '/profile', label: 'Profile', icon: 'user' }
    ];
    vm.isActive = function (p) { return $loc.path().indexOf(p) === 0; };
    vm.isPath = function (p) { return $loc.path() === p; };
    vm.playAlbum = function (a, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var songs = Catalog.albumSongs(a.id);
      if (songs && songs.length) { Player.playList(songs, songs[0], { announce: true }); }
    };
    vm.playPlaylist = function (p, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var songs = Library.playlistSongs(p);
      if (songs && songs.length) { Player.playList(songs, songs[0], { announce: true }); }
    };
    $rs.$on('$routeChangeStart', function () { vm.loading = true; });
    $rs.$on('$routeChangeSuccess', function () {
      vm.loading = false;
      setTimeout(function () {
        var h1 = document.querySelector('main h1');
        if (h1) {
          if (!h1.hasAttribute('tabindex')) { h1.setAttribute('tabindex', '-1'); }
          h1.focus();
        }
      }, 60);
    });
    $rs.$on('$routeChangeError', function () { vm.loading = false; });
    vm.logout = function () {
      Session.logout().then(function () {
        Toast.success('You have been logged out.');
        var same = $loc.path() === '/home'; $loc.url('/home'); if (same) { $route.reload(); }
      });
    };
    vm.toggleExpand = function () {
      if (window.innerWidth <= 900) {
        Player.expanded = !Player.expanded;
      }
    };
    vm.onKey = function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === 'Escape') {
        Player.open = false;
        Player.expanded = false;
        $rs.$broadcast('app:escape');
      } else if (e.key === ' ' && Player.current && tag !== 'input' && tag !== 'textarea' && tag !== 'button' && tag !== 'select' && tag !== 'a') {
        e.preventDefault();
        Player.toggle();
      }
    };
  }]);

  app.controller('HomeCtrl', ['Catalog', 'Library', 'Player', 'Session', function (C, L, P, S) {
    var vm = this, h = new Date().getHours();
    vm.lib = L; vm.session = S; vm.genres = C.genres; vm.genre = '';
    vm.greeting = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + (S.user ? ', ' + S.user.name.split(' ')[0] : '');
    vm.pick = function (g) { vm.genre = g; };
    vm.recent = function () { return L.historySongs().slice(0, 6); };
    vm.trending = function () {
      return C.songs.filter(function (s) { return !vm.genre || s.genre === vm.genre; })
        .sort(function (a, b) { return L.playsOf(b) - L.playsOf(a); }).slice(0, 8);
    };
    vm.featured = function () {
      var t = vm.trending();
      return t && t.length ? t[0] : null;
    };
    vm.albums = function () {
      return C.albums.filter(function (a) { return !vm.genre || a.genre === vm.genre; }).sort(function (a, b) { return b.year - a.year; });
    };
    vm.play = function (s, list) { P.playList(list, s); };
    vm.playAlbum = function (a, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var songs = C.albumSongs(a.id);
      if (songs && songs.length) { P.playList(songs, songs[0], { announce: true }); }
    };
    vm.playPlaylist = function (p, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var songs = L.playlistSongs(p);
      if (songs && songs.length) { P.playList(songs, songs[0], { announce: true }); }
    };
  }]);

  app.controller('SearchCtrl', ['$scope', '$location', '$filter', 'Catalog', 'Player', 'Api', function ($scope, $loc, $filter, C, P, Api) {
    var vm = this, q0 = $loc.search();
    vm.q = q0.q || ''; vm.genre = q0.genre || ''; vm.onlyAvailable = false; vm.genres = C.genres;
    vm.sync = function () { $loc.search({ q: vm.q || null, genre: vm.genre || null }).replace(); };
    vm.pick = function (g) { vm.genre = (!g || vm.genre === g) ? '' : g; vm.sync(); };
    vm.reset = function () { vm.q = ''; vm.genre = ''; vm.sync(); };
    vm.active = function () { return !!(vm.q.trim() || vm.genre); };
    $scope.$on('$routeUpdate', function () {
      var q = $loc.search();
      vm.q = q.q || '';
      vm.genre = q.genre || '';
    });
    vm.songs = function () {
      var list = $filter('songSearch')(C.songs, vm.q, vm.genre);
      return vm.onlyAvailable ? list.filter(function (s) { return s.available; }) : list;
    };
    vm.albums = function () { return C.albums.filter(function (a) { return C.matchesAlbum(a, vm.q, vm.genre); }); };
    vm.count = function (g) { return C.songs.filter(function (s) { return s.genre === g; }).length; };
    vm.hue = function (g) { return C.genres.indexOf(g) * 58 + 200; };
    vm.playAll = function () { P.playList(vm.songs(), null, { announce: true }); };
  }]);

  app.controller('LibraryCtrl', ['$filter', 'Catalog', 'Library', 'Player', function ($filter, C, L, P) {
    var vm = this;
    vm.lib = L; vm.tab = 'songs'; vm.genre = ''; vm.sort = 'recent'; vm.genres = C.genres;
    vm.sorts = [{ id: 'recent', label: 'Recently added' }, { id: 'title', label: 'Title' }, { id: 'artist', label: 'Artist' }, { id: 'duration', label: 'Length' }];
    vm.pick = function (g) { vm.genre = g; };
    vm.setTab = function (t) { vm.tab = t; vm.genre = ''; };
    vm.base = function () { return vm.tab === 'liked' ? L.likedSongs() : L.librarySongs(); };
    vm.songs = function () {
      var list = vm.base().filter(function (s) { return !vm.genre || s.genre === vm.genre; });
      return vm.sort === 'recent' ? list : $filter('orderBy')(list, vm.sort);
    };
    vm.stats = function () { return L.listStats(vm.songs()); };
    vm.playAll = function (shuffle) { P.playList(vm.songs(), null, { shuffle: shuffle, announce: true }); };
  }]);

  app.controller('PlaylistsCtrl', ['Library', function (L) {
    var vm = this;
    vm.lib = L; vm.name = ''; vm.error = '';
    vm.totalSongs = function () { return L.state.playlists.reduce(function (n, p) { return n + p.songIds.length; }, 0); };
    vm.create = function (form) {
      var r = L.createPlaylist(vm.name);
      if (r.error) { vm.error = r.error; return; }
      vm.name = ''; vm.error = ''; form.$setPristine(); form.$setUntouched();
    };
  }]);

  app.controller('PlaylistCtrl', ['$routeParams', '$location', 'Catalog', 'Library', 'Player', function ($rp, $loc, C, L, P) {
    var vm = this;
    vm.lib = L; vm.pl = L.playlist($rp.id); vm.editing = false; vm.error = ''; vm.confirming = false;
    vm.songs = function () { return vm.pl ? L.playlistSongs(vm.pl) : []; };
    vm.stats = function () { return L.listStats(vm.songs()); };
    vm.suggestions = function () {
      if (!vm.pl) { return []; }
      return C.songs.filter(function (s) { return s.available && !L.inPlaylist(vm.pl, s.id); })
        .sort(function (a, b) { return L.playsOf(b) - L.playsOf(a); }).slice(0, 5);
    };
    vm.edit = function () { vm.draft = vm.pl.name; vm.error = ''; vm.editing = true; };
    vm.save = function () {
      var err = L.renamePlaylist(vm.pl, vm.draft);
      if (err) { vm.error = err; return; }
      vm.editing = false;
    };
    vm.remove = function () {
      if (!vm.confirming) { vm.confirming = true; return; }
      L.deletePlaylist(vm.pl); $loc.path('/playlists');
    };
    vm.playAll = function (shuffle) { P.playList(vm.songs(), null, { shuffle: shuffle, announce: true }); };
  }]);

  app.controller('AlbumCtrl', ['$routeParams', 'Catalog', 'Library', 'Player', function ($rp, C, L, P) {
    var vm = this;
    vm.lib = L; vm.album = C.album($rp.id); vm.songs = C.albumSongs($rp.id);
    vm.stats = function () { return L.listStats(vm.songs); };
    vm.playAll = function (shuffle) { P.playList(vm.songs, null, { shuffle: shuffle, announce: true }); };
  }]);

  app.controller('ProfileCtrl', ['Session', 'Library', 'Toast', function (S, L, Toast) {
    var vm = this;
    vm.user = S.user; vm.name = S.user ? S.user.name : ''; vm.busy = false; vm.confirmReset = false;
    vm.stats = function () { return L.stats(); };
    vm.recent = function () { return L.historySongs().slice(0, 5); };
    vm.save = function (form) {
      if (form.$invalid) { return; }
      vm.busy = true;
      S.rename(vm.name).then(function (u) { vm.user = u; form.$setPristine(); Toast.success('Profile updated.'); })
        .catch(function (e) { Toast.error(e.message || 'Could not update your profile.'); })
        ['finally'](function () { vm.busy = false; });
    };
    vm.reset = function () {
      if (!vm.confirmReset) { vm.confirmReset = true; return; }
      L.reset(); vm.confirmReset = false;
    };
  }]);

  function safeNext(n) { return (n && n.charAt(0) === '/' && n.charAt(1) !== '/') ? n : '/home'; }

  app.controller('LoginCtrl', ['$location', 'Session', 'Toast', function ($loc, S, Toast) {
    var vm = this;
    vm.user = { email: '', password: '' }; vm.busy = false; vm.error = '';
    vm.demo = function () { vm.user.email = 'demo@toptunes.dev'; vm.user.password = 'demo1234'; vm.error = ''; };
    vm.submit = function (form) {
      vm.error = '';
      if (form.$invalid) { return; }
      vm.busy = true;
      S.login(vm.user).then(function (u) {
        Toast.success('Welcome back, ' + (u.name ? u.name.split(' ')[0] : 'Listener') + '.');
        $loc.url(safeNext($loc.search().next));
      }).catch(function (e) { vm.error = e.message || 'Could not log in. Try again.'; })
        ['finally'](function () { vm.busy = false; });
    };
  }]);

  app.controller('RegisterCtrl', ['$location', 'Session', 'Toast', function ($loc, S, Toast) {
    var vm = this;
    vm.user = { name: '', email: '', password: '', confirm: '', terms: false }; vm.busy = false; vm.error = '';
    vm.passwordRule = /^(?=.*[A-Za-z])(?=.*\d).+$/;
    vm.strength = function () {
      var p = vm.user.password || '', s = 0;
      if (p.length >= 8) { s++; } if (/[a-z]/.test(p) && /[A-Z]/.test(p)) { s++; } if (/\d/.test(p)) { s++; } if (/[^A-Za-z0-9]/.test(p)) { s++; }
      return p ? s : 0;
    };
    vm.strengthLabel = function () { return ['', 'Weak', 'Fair', 'Good', 'Strong'][vm.strength()]; };
    vm.submit = function (form) {
      vm.error = '';
      if (form.$invalid) { return; }
      vm.busy = true;
      S.register(vm.user).then(function (u) {
        Toast.success('Account created. Welcome to TopTunes, ' + (u.name ? u.name.split(' ')[0] : 'Listener') + '!');
        $loc.url('/home');
      }).catch(function (e) { vm.error = e.message || 'Could not create your account. Try again.'; })
        ['finally'](function () { vm.busy = false; });
    };
  }]);
})();
