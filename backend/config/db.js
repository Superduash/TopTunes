const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('./env');

let persistentServer = null;

// Path for persistent local database (survives restarts)
const PERSIST_DB_PATH = path.join(__dirname, '..', '..', 'data', 'db');
const PERSIST_DB_NAME = 'toptunes';

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1200,
      autoIndex: true
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (!env.isProd) {
      console.warn(`\n[Database Warning] Could not connect to local MongoDB at ${env.MONGODB_URI} (${error.message}).`);
      console.warn(`[Database] Starting persistent local MongoDB (data will be saved to data/db/)...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');

        // Ensure the persistent data directory exists
        if (!fs.existsSync(PERSIST_DB_PATH)) {
          fs.mkdirSync(PERSIST_DB_PATH, { recursive: true });
          console.log(`[Database] Created persistent data directory: ${PERSIST_DB_PATH}`);
        }

        persistentServer = await MongoMemoryServer.create({
          instance: {
            dbPath: PERSIST_DB_PATH,
            dbName: PERSIST_DB_NAME,
            storageEngine: 'wiredTiger'
          }
        });

        const persistUri = persistentServer.getUri() + PERSIST_DB_NAME;
        const conn = await mongoose.connect(persistUri, { autoIndex: true });
        console.log(`[Database] Connected to persistent local MongoDB (data/db/) — data survives restarts!`);
        return conn;
      } catch (persistError) {
        console.error(`[Database Error] Persistent MongoDB initialization failed: ${persistError.message}`);
        console.warn(`[Database] Falling back to temporary in-memory instance (data will NOT persist)...`);
        try {
          const { MongoMemoryServer } = require('mongodb-memory-server');
          const tmpServer = await MongoMemoryServer.create();
          const tmpUri = tmpServer.getUri();
          const conn = await mongoose.connect(tmpUri, { autoIndex: true });
          console.warn(`[Database] ⚠️  Connected to TEMPORARY in-memory MongoDB. Data will be LOST on restart!`);
          persistentServer = tmpServer; // track for cleanup
          return conn;
        } catch (tmpError) {
          console.error(`[Database Error] All fallback attempts failed: ${tmpError.message}`);
        }
      }
    }

    console.error(`\n[FATAL DATABASE ERROR] Failed to connect to MongoDB at ${env.MONGODB_URI}:`);
    console.error(error.message);
    console.error(`Ensure MongoDB is running locally or verify your MONGODB_URI in .env.\n`);
    throw error;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (persistentServer) {
    // doCleanup:false = keep data files on disk for next restart
    await persistentServer.stop({ doCleanup: false });
  }
}

module.exports = { connectDB, disconnectDB };


