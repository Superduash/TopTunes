const path = require('path');
const express = require('express');
const env = require('./backend/config/env');
const { connectDB } = require('./backend/config/db');
const backendApp = require('./backend/app');

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 1.1 Auto-seed database to ensure all genres and admin/demo accounts exist
    const seedDatabase = require('./backend/seed/seed');
    await seedDatabase({ silent: true, disconnect: false });
    const server = express();

    // 3. Mount Backend Express App (handles /api routes & security middleware)
    server.use(backendApp);

    // 4. Serve Frontend Static Assets
    const staticPath = path.join(__dirname, 'frontend', 'public');
    server.use(express.static(staticPath, {
      index: 'index.html',
      maxAge: env.isProd ? '1d' : 0,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    // 5. Hash Routing fallback (serve index.html for non-API routes)
    server.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });

    // 6. Listen on configured port
    const PORT = env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`  TopTunes Music Streaming System`);
      console.log(`  Frontend: http://localhost:${PORT}/#/home`);
      console.log(`  API Base: http://localhost:${PORT}/api/health`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`==================================================\n`);
    });
  } catch (error) {
    console.error('\n[FATAL SERVER INITIALIZATION ERROR]');
    console.error('Server failed to start due to database or configuration failure.');
    console.error(error);
    process.exit(1);
  }
}

startServer();
