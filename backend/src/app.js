const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io instance to request so controllers can emit events
app.use((req, _res, next) => {
  req.io = req.app.get('io');
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (must have 4 args)
app.use((err, _req, res, _next) => {
  // Malformed JSON body (e.g. a broken request from the client)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

module.exports = app;
