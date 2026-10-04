// Seed dataset for structural setup (Genres & Demo Accounts)
const genres = [
  { name: 'Pop', slug: 'pop', color: '#ffb224' },
  { name: 'Electronic', slug: 'electronic', color: '#06b6d4' },
  { name: 'Tamil', slug: 'tamil', color: '#f97316' },
  { name: 'Phonk', slug: 'phonk', color: '#a855f7' },
  { name: 'J-Rock', slug: 'j-rock', color: '#ef4444' },
  { name: 'Hip-Hop', slug: 'hip-hop', color: '#8b5cf6' },
  { name: 'Indie', slug: 'indie', color: '#10b981' },
  { name: 'K-Pop', slug: 'k-pop', color: '#ec4899' },
  { name: 'R&B', slug: 'r-and-b', color: '#6366f1' },
  { name: 'Rock', slug: 'rock', color: '#f43f5e' }
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
