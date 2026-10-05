const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Genre } = require('../models');
const { genres, demoUser, demoAdmin } = require('./seedData');

async function seedDatabase(options = {}) {
  const { silent = false } = options;
  if (mongoose.connection.readyState !== 1) {
    if (!silent) console.log('\n[Seed] Connecting to database...');
    await connectDB();
  }

  try {
    // 1. Ensure Genres exist
    if (!silent) console.log('[Seed] Ensuring base genres exist...');
    for (const g of genres) {
      await Genre.updateOne(
        { slug: g.slug },
        { $setOnInsert: { name: g.name, slug: g.slug, color: g.color } },
        { upsert: true }
      );
    }
    const insertedGenres = await Genre.find();

    // 2. Ensure Demo Admin User exists
    if (!silent) console.log('[Seed] Ensuring demo admin account exists...');
    let adminDoc = await User.findOne({ email: demoAdmin.email });
    if (!adminDoc) {
      const passwordHash = await User.hashPassword(demoAdmin.password);
      adminDoc = await User.create({
        name: demoAdmin.name,
        email: demoAdmin.email,
        passwordHash,
        role: 'admin',
        avatarColor: demoAdmin.avatarColor,
        avatarSeed: demoAdmin.avatarSeed
      });
    } else if (adminDoc.role !== 'admin') {
      adminDoc.role = 'admin';
      await adminDoc.save();
    }

    // 3. Ensure Demo Normal User exists
    if (!silent) console.log('[Seed] Ensuring demo listener account exists...');
    let userDoc = await User.findOne({ email: demoUser.email });
    if (!userDoc) {
      const passwordHash = await User.hashPassword(demoUser.password);
      userDoc = await User.create({
        name: demoUser.name,
        email: demoUser.email,
        passwordHash,
        role: 'user',
        avatarColor: demoUser.avatarColor,
        avatarSeed: demoUser.avatarSeed,
        listeningSeconds: demoUser.listeningSeconds
      });
    }

    if (!silent) {
      console.log('\n==================================================');
      console.log('  TopTunes Database Seeding Completed Successfully');
      console.log(`  Genres:     ${insertedGenres.length}`);
      console.log(`  Demo Admin: ${demoAdmin.email} / ${demoAdmin.password}`);
      console.log(`  Demo User:  ${demoUser.email} / ${demoUser.password}`);
      console.log('==================================================\n');
    }

    return {
      genres: insertedGenres,
      admin: adminDoc,
      user: userDoc
    };
  } finally {
    if (options.disconnect !== false) {
      await disconnectDB();
    }
  }
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('[Seed Fatal Error]:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
