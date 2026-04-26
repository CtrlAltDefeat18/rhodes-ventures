require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc:    ["'self'", "fonts.gstatic.com"],
      connectSrc: ["'self'"],
      imgSrc:     ["'self'", "data:", "blob:"],
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30,
  message: { message: 'Too many attempts. Please wait 15 minutes.' } });

let dbConnected = false;

// Health always works regardless of DB
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbConnected ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV || 'development', mongo_set: !!process.env.MONGO_URI });
});

app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/ventures', require('./routes/ventures'));
app.use('/api/admin',    require('./routes/admin'));

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✓ Server on port ${PORT}`));

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => { dbConnected = true; console.log('✓ MongoDB connected'); })
    .catch(err => { console.error('✗ MongoDB failed:', err.message); });
  mongoose.connection.on('disconnected', () => { dbConnected = false; });
  mongoose.connection.on('reconnected',  () => { dbConnected = true; });
} else {
  console.warn('⚠ MONGO_URI not set in Secrets.');
}
