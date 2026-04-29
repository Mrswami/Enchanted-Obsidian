require('dotenv').config();
const express = require('express');
const session = require('cookie-session');
const cors = require('cors');
const path = require('path');
const { initFirebase } = require('./services/firebase');

initFirebase();

const authRoutes = require('./routes/auth');
const calendarRoutes = require('./routes/calendar');
const { router: schedulesRoutes } = require('./routes/schedules');
const userRoutes = require('./routes/user');
const groupMeRoutes = require('./routes/groupme');
const syncRoutes = require('./routes/sync');
const cronRoutes = require('./routes/cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Allowed origins: Firebase Hosting + local dev
const ALLOWED_ORIGINS = [
  'https://scheduleassistant-735d8.web.app',
  'https://scheduleassistant-735d8.firebaseapp.com',
  'chrome-extension://',  // Allow any chrome extension origin prefix
  'http://localhost:3000',
  'http://localhost:3001',
];

// Security headers
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
  // Allow framing only from our own domain
  res.setHeader("Content-Security-Policy", `frame-ancestors 'self' https://scheduleassistant-735d8.web.app`);
  if (!isAllowed) {
    res.removeHeader("X-Frame-Options");
  }
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Basic XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Session MUST come before static files
app.use(session({
  name: 'schedule-assistant-session',
  secret: process.env.SESSION_SECRET || 'schedule-assistant-dev-secret',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/user', userRoutes);
app.use('/api/groupme', groupMeRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/cron', cronRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Schedule Assistant running at http://localhost:${PORT}`);
  });
}

module.exports = app;
