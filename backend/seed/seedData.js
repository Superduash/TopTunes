// Seed dataset for structural setup (Genres & Demo Accounts)
const genres = [
  { name: 'Pop', slug: 'pop', color: '#ffb224' },
  { name: 'Rock', slug: 'rock', color: '#f43f5e' },
  { name: 'Hip-Hop', slug: 'hip-hop', color: '#8b5cf6' },
  { name: 'Electronic', slug: 'electronic', color: '#06b6d4' },
  { name: 'Jazz', slug: 'jazz', color: '#10b981' },
  { name: 'Lo-fi', slug: 'lo-fi', color: '#ec4899' }
];

const demoUser = {
  name: 'Demo Listener',
  email: 'demo@toptunes.dev',
  password: 'demo1234',
  role: 'user',
  avatarColor: '#ffb224',
  avatarSeed: 'DL',
  listeningSeconds: 1200
};

const demoAdmin = {
  name: 'System Admin',
  email: 'admin@toptunes.dev',
  password: 'admin1234',
  role: 'admin',
  avatarColor: '#f43f5e',
  avatarSeed: 'SA',
  listeningSeconds: 0
};

module.exports = {
  genres,
  demoUser,
  demoAdmin
};
