const express = require('express');
const router = express.Router();
const { getUser, saveUserSettings, getSyncHistory } = require('../services/firebase');

function requireAuth(req, res, next) {
  if (!req.session.tokens || !req.session.uid) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

// GET /api/user/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await getUser(req.session.uid);
    res.json({ profile: profile || { uid: req.session.uid, ...req.session.userInfo } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/settings
// Body: { icalUrl, timeZone, notifySelf, defaultCalendarId }
router.post('/settings', requireAuth, async (req, res) => {
  try {
    const { icalUrl, timeZone, notifySelf, defaultCalendarId } = req.body;

    // Also persist to session for quick access
    if (icalUrl) req.session.icalUrl = icalUrl;

    await saveUserSettings(req.session.uid, { icalUrl, timeZone, notifySelf, defaultCalendarId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const history = await getSyncHistory(req.session.uid);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
