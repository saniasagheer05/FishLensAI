const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const speciesRoutes = require('./routes/speciesRoutes');
const scanRoutes = require('./routes/scanRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration for Expo Web, Metro, mobile emulators & devices
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root API Welcome & Info
app.get('/', (req, res) => {
  res.json({
    service: 'FishLensAI REST API',
    status: 'online',
    version: '1.0.0',
    documentation: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (Bearer token)',
      },
      species: {
        list: 'GET /api/species',
        detail: 'GET /api/species/:id',
      },
      scans: {
        create: 'POST /api/scans',
        list: 'GET /api/scans',
        detail: 'GET /api/scans/:id',
        delete: 'DELETE /api/scans/:id',
        clear: 'DELETE /api/scans',
      },
    },
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  const statusCode = dbStatus.connected ? 200 : 503;

  res.status(statusCode).json({
    status: dbStatus.connected ? 'ok' : 'degraded',
    service: 'FishLensAI Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      type: 'PostgreSQL',
      ...dbStatus,
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/scans', scanRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(` FishLensAI Express Server Running       `);
    console.log(` URL: http://localhost:${PORT}           `);
    console.log(` Health: http://localhost:${PORT}/api/health `);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'} `);
    console.log(`=========================================`);

    // Test DB on boot
    const dbCheck = await testConnection();
    if (dbCheck.connected) {
      console.log(`[PostgreSQL] Connected to "${dbCheck.database}" at ${dbCheck.timestamp}`);
    } else {
      console.warn(`[PostgreSQL] Connection warning: ${dbCheck.error}`);
      console.warn(`[PostgreSQL] Tip: Run 'npm run init-db' once database service and credentials in backend/.env are configured.`);
    }
  });
}

module.exports = app;
