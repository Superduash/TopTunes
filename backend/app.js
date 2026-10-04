const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes/index');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security Headers (relaxed CSP for local SVG & fonts)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: env.CORS_ORIGIN || '*',
  credentials: true
}));

// Request Logging in Development
if (env.isDev) {
  app.use(morgan('dev'));
}

// Body Parsers with payload limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// NoSQL Injection Protection
const noSqlSanitize = require('./middleware/noSqlSanitize');
app.use('/api', noSqlSanitize);

// Mount API Routes
app.use('/api', apiRoutes);

// 404 & Global Error Handlers for API
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
