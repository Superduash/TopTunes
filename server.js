const path = require('path');
const express = require('express');
const env = require('./backend/config/env');
const { connectDB } = require('./backend/config/db');
const backendApp = require('./backend/app');

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
    ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 1.1 Auto-seed database to ensure all genres and admin/demo accounts exist
    const seedDatabase = require('./backend/seed/seed');
    await seedDatabase({ silent: true, disconnect: false });

    // 1.2 Auto-restore catalog: rebuilds any Song records from physical files
    //     that are missing from the DB (e.g. after a DB reset or first run)
    const restoreCatalog = require('./backend/seed/restore');
    await restoreCatalog({ silent: false, disconnect: false });
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
      const url = `http://localhost:${PORT}/#/home`;
      console.log(`\n==================================================`);
      console.log(`  TopTunes Music Streaming System`);
      console.log(`  Frontend: ${url}`);
      console.log(`  API Base: http://localhost:${PORT}/api/health`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`==================================================\n`);

      // Open browser only AFTER backend is fully listening
      if (process.env.AUTO_OPEN !== 'false' && process.env.NODE_ENV !== 'test') {
        openBrowser(url);
      }
    });
  } catch (error) {
    console.error('\n[FATAL SERVER INITIALIZATION ERROR]');
    console.error('Server failed to start due to database or configuration failure.');
    console.error(error);
    process.exit(1);
  }
}

startServer();
