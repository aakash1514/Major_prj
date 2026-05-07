import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Server initialization message
console.log('[SERVER] Initializing with CORS support for dev ports...');

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:5176'
  ],
  credentials: true
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
    // Initialize database
    await initDatabase();
    console.log('✓ Database initialized');

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Frontend: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log(`✓ API docs: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
