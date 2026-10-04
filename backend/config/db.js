const mongoose = require('mongoose');
const env = require('./env');

let memoryServer = null;

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (!env.isProd) {
      console.warn(`\n[Database Warning] Could not connect to local MongoDB at ${env.MONGODB_URI} (${error.message}).`);
      console.warn(`[Database] Attempting fallback to in-memory MongoDB instance for development...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        const conn = await mongoose.connect(memUri, {
          autoIndex: true
        });
        console.log(`[Database] Connected to in-memory MongoDB at ${memUri}`);
        return conn;
      } catch (memError) {
        console.error(`[Database Error] In-memory MongoDB initialization failed: ${memError.message}`);
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
  if (memoryServer) {
    await memoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB };

