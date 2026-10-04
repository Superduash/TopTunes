const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file at project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];

for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`\n[FATAL CONFIG ERROR] Missing required environment variable: ${v}`);
    console.error(`Please check your .env file or copy from .env.example before starting.\n`);
    process.exit(1);
  }
}

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  RATE_LIMIT_WINDOW_MIN: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production'
};

module.exports = env;
