// Must stay the first import: loads .env before any module reads process.env.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import { initDatabase } from './models/schema.js';

// Routes
import userRoutes from './routes/users.js';
import cropRoutes from './routes/crops.js';
import farmerRoutes from './routes/farmers.js';
import buyerRoutes from './routes/buyers.js';
import orderRoutes from './routes/orders.js';
import agentRoutes from './routes/agent.js';
import adminRoutes from './routes/admin.js';
import predictionsRoutes from './routes/predictions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

console.log(`[SERVER] CORS allowed origins: ${allowedOrigins.join(', ')}`);

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
// No Origin (mobile app, curl, server-to-server) is allowed. Disallowed origins get
// no CORS headers (the browser blocks them) instead of an error, so same-origin
// requests like the Razorpay checkout page's verify POST still reach their handler.
// Auth is Bearer tokens, not cookies, so credentials stay off.
// cors skips Vary for rejected origins; set it on every response so caches key on Origin.
app.use((req, res, next) => { res.vary('Origin'); next(); });
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/predictions', predictionsRoutes);

// ─── ROOT ENDPOINT ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    message: 'Agriflow API is running',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      crops: '/api/crops',
      farmer: '/api/farmer',
      buyers: '/api/buyers',
      orders: '/api/orders',
      agent: '/api/agent',
      admin: '/api/admin',
      predictions: '/api/predictions'
    }
  });
});

// ─── ERROR HANDLING ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── START SERVER ────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('FATAL: JWT_SECRET environment variable is not set');
      process.exit(1);
    }
    if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
      console.error('FATAL: JWT_SECRET too short for production (min 32 chars)');
      process.exit(1);
    }

    // Initialize database
    await initDatabase();
    console.log('✓ Database initialized');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Running on http://0.0.0.0:${PORT}`);
      console.log(`[SERVER] Accessible on local network at http://<your-ip>:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
