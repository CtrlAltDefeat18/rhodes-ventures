require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app = express();

// ─── SECURITY & MIDDLEWARE ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc:     ["'self'", "fonts.gstatic.com"],
      connectSrc:  ["'self'"],
      imgSrc:      ["'self'", "data:"],
    }
  }
}));

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── RATE LIMITING ────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/ventures', require('./routes/ventures'));
app.use('/api/admin',    require('./routes/admin'));

// ─── HEALTH CHECK ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ─── STATIC FILES ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback — all unknown routes return index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── DATABASE + START ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✓ MongoDB Atlas connected');
    app.listen(PORT, () => console.log(`✓ Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });