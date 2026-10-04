// Seed dataset mirroring frontend/public/js/data.js
const genres = [
  { name: 'Pop', slug: 'pop', color: '#ffb224' },
  { name: 'Rock', slug: 'rock', color: '#f43f5e' },
  { name: 'Hip-Hop', slug: 'hip-hop', color: '#8b5cf6' },
  { name: 'Electronic', slug: 'electronic', color: '#06b6d4' },
  { name: 'Jazz', slug: 'jazz', color: '#10b981' },
  { name: 'Lo-fi', slug: 'lo-fi', color: '#ec4899' }
];

const artists = [
  { name: 'Mira Vale', bio: 'Indie pop singer-songwriter with shimmering synths and rich vocal textures.', hue: 335, shape: 0 },
  { name: 'Cedar & Stone', bio: 'Atmospheric folk rock duo rooted in raw storytelling and soaring guitars.', hue: 18, shape: 1 },
  { name: 'Kofi Lane', bio: 'Lyricist and producer blending jazz-infused hip-hop beats with urban reflections.', hue: 265, shape: 2 },
  { name: 'Orbit Theory', bio: 'Modular synthesizer explorer crafting deep, cosmic electronic landscapes.', hue: 190, shape: 3 },
  { name: 'The Quiet Quartet', bio: 'Contemporary jazz ensemble known for intimate late-night acoustic sets.', hue: 215, shape: 0 },
  { name: 'Soft Static', bio: 'Lo-fi beatmaker cultivating warm vinyl crackle and nostalgic melodies.', hue: 155, shape: 1 },
  { name: 'Juno Park', bio: 'Electropop innovator blending catchy hooks with vibrant production.', hue: 45, shape: 2 },
  { name: 'Wildfire Radio', bio: 'Desert rock quartet bringing driving rhythms and gritty vintage overdrive.', hue: 130, shape: 3 }
];

const albumsData = [
  {
    title: 'Neon Harbor',
    artist: 'Mira Vale',
    genre: 'Pop',
    year: 2025,
    hue: 335,
    shape: 0,
    tracks: [
      { title: 'Glass Hours', duration: 212, available: true, plays: 128450 },
      { title: 'Paper Satellites', duration: 187, available: true, plays: 94100 },
      { title: 'Late Bus Home', duration: 241, available: true, plays: 78300 },
      { title: 'Static Bloom', duration: 198, available: false, plays: 12400 }
    ]
  },
  {
    title: 'Rust & Rivers',
    artist: 'Cedar & Stone',
    genre: 'Rock',
    year: 2024,
    hue: 18,
    shape: 1,
    tracks: [
      { title: 'Gravel Road Hymn', duration: 264, available: true, plays: 112000 },
      { title: 'Burn the Map', duration: 231, available: true, plays: 88500 },
      { title: 'Salt in the Wind', duration: 283, available: true, plays: 64200 },
      { title: 'Hollow Town', duration: 205, available: true, plays: 45900 }
    ]
  },
  {
    title: 'Concrete Gardens',
    artist: 'Kofi Lane',
    genre: 'Hip-Hop',
    year: 2025,
    hue: 265,
    shape: 2,
    tracks: [
      { title: 'Rooftop Ledger', duration: 196, available: true, plays: 142300 },
      { title: 'Bus Fare Blues', duration: 178, available: true, plays: 98100 },
      { title: 'Second Shift', duration: 222, available: false, plays: 15200 },
      { title: 'Name on the Door', duration: 209, available: true, plays: 83400 }
    ]
  },
  {
    title: 'Signal Bloom',
    artist: 'Orbit Theory',
    genre: 'Electronic',
    year: 2026,
    hue: 190,
    shape: 3,
    tracks: [
      { title: 'Carrier Wave', duration: 301, available: true, plays: 165000 },
      { title: 'Pulse Width', duration: 254, available: true, plays: 119800 },
      { title: 'Low Earth', duration: 276, available: true, plays: 92300 },
      { title: 'Afterimage', duration: 233, available: true, plays: 71400 }
    ]
  },
  {
    title: 'Blue Hour Sessions',
    artist: 'The Quiet Quartet',
    genre: 'Jazz',
    year: 2023,
    hue: 215,
    shape: 0,
    tracks: [
      { title: 'Smoke and Mirrors', duration: 318, available: true, plays: 89300 },
      { title: 'Lantern Waltz', duration: 287, available: true, plays: 72100 },
      { title: 'Last Train Uptown', duration: 344, available: true, plays: 54900 },
      { title: 'Open Window', duration: 262, available: true, plays: 43200 }
    ]
  },
  {
    title: 'Rainy Desk',
    artist: 'Soft Static',
    genre: 'Lo-fi',
    year: 2025,
    hue: 155,
    shape: 1,
    tracks: [
      { title: 'Tea Gone Cold', duration: 148, available: true, plays: 134200 },
      { title: 'Window Seat', duration: 162, available: true, plays: 108900 },
      { title: 'Notebook Margins', duration: 171, available: true, plays: 87600 },
      { title: 'Sleepy Pixels', duration: 139, available: true, plays: 66400 }
    ]
  },
  {
    title: 'Paper Planes',
    artist: 'Juno Park',
    genre: 'Pop',
    year: 2026,
    hue: 45,
    shape: 2,
    tracks: [
      { title: 'Wishful Thinking', duration: 204, available: true, plays: 158700 },
      { title: 'Weekend Rehearsal', duration: 191, available: true, plays: 113400 },
      { title: 'Sunburn Season', duration: 226, available: true, plays: 96800 },
      { title: 'Postcards', duration: 183, available: true, plays: 75200 }
    ]
  },
  {
    title: 'Dust Devils',
    artist: 'Wildfire Radio',
    genre: 'Rock',
    year: 2022,
    hue: 130,
    shape: 3,
    tracks: [
      { title: 'Mile Marker 9', duration: 243, available: true, plays: 122100 },
      { title: 'Neon Cactus', duration: 219, available: true, plays: 84600 },
      { title: 'Slow Burn Highway', duration: 297, available: false, plays: 18900 },
      { title: 'Last Call Lullaby', duration: 256, available: true, plays: 59300 }
    ]
  }
];

const demoUser = {
  name: 'Demo Listener',
  email: 'demo@toptunes.dev',
  password: 'demo1234',
  avatarColor: '#ffb224',
  avatarSeed: 'DL',
  listeningSeconds: 5400
};

module.exports = {
  genres,
  artists,
  albumsData,
  demoUser
};
