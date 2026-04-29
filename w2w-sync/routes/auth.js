const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getAuthUrl, getTokensFromCode } = require('../services/googleCalendar');
const { upsertUser } = require('../services/firebase');

router.get('/google', (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.redirect('/?error=auth_denied');
  if (!code) return res.redirect('/?error=no_code');

  try {
    const tokens = await getTokensFromCode(code);
    // Fetch basic Google profile info
    const { createOAuthClient } = require('../services/googleCalendar');
    const client = createOAuthClient();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: client });

    const userInfo = await oauth2.userinfo.get();

    // ONLY store the tokens and basic ID - keep it under 4KB!
    req.session.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
    req.session.uid = userInfo.data.id;
    req.session.userInfo = {
      name: userInfo.data.name,
      email: userInfo.data.email,
      picture: userInfo.data.picture
    };

    console.log('🐝 Session data size check:', JSON.stringify(req.session).length, 'bytes');

    // Save/update user in Firestore (non-blocking)
    await upsertUser(userInfo.data.id, req.session.userInfo).catch(() => { });

    // Restore saved settings (iCal URL etc.) from Firestore into session
    try {
      const { getUser } = require('../services/firebase');
      const saved = await getUser(userInfo.data.id);
      if (saved?.settings?.icalUrl) req.session.icalUrl = saved.settings.icalUrl;
    } catch { }

    res.redirect('/?auth=success');
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect('/?error=auth_failed');
  }
});

router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.tokens,
    user: req.session.userInfo || null,
  });
});

router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

module.exports = router;
