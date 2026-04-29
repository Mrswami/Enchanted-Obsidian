const express = require('express');
const router = express.Router();
const { parseShiftFeed, parseScrapedShifts } = require('../services/icalParser');

// FOR LOCAL DEV ONLY: Store latest scraped shifts globally since cookies 
// don't travel between Extension (W2W) and Localhost (HTTP) easily.
let tempScrapedShifts = null;

// GET /api/schedules?url=<ical_url>
// Fetch and parse SocialSchedules iCal feed
router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    // Check session first, then global fallback (for local dev)
    const activeShifts = (req.session.scrapedShifts && req.session.scrapedShifts.length > 0)
      ? req.session.scrapedShifts
      : tempScrapedShifts;

    if (activeShifts && activeShifts.length > 0) {
      return res.json({ 
        schedules: parseScrapedShifts(activeShifts), 
        count: activeShifts.length,
        source: 'scraped'
      });
    }
    return res.status(400).json({
      error: 'Missing iCal URL. Add ?url=YOUR_ICAL_URL or use the extension to scrape shifts.',
    });
  }

  try {
    const schedules = await parseShiftFeed(decodeURIComponent(url));
    res.json({ schedules, count: schedules.length });
  } catch (err) {
    console.error('Schedule fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedules/save-url  — save iCal URL to session
router.post('/save-url', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }
  console.log(`🐝 Saving iCal URL to session: ${url.substring(0, 30)}...`);
  req.session.icalUrl = url;
  res.json({ success: true });
});

// POST /api/schedules/save-raw — save scraped shifts to session
router.post('/save-raw', (req, res) => {
  let { shifts } = req.body;
  if (!shifts || !Array.isArray(shifts)) {
    return res.status(400).json({ error: 'Array of shifts is required.' });
  }

  // Optimize for cookie-session size (4KB limit)
  const optimized = shifts.map(s => ({
    id: s.id,
    title: s.title,
    date: s.date,
    time: s.time,
    location: s.location
  }));

  console.log(`🐝 received ${shifts.length} scraped shifts. Saving ${JSON.stringify(optimized).length} bytes to session.`);
  req.session.scrapedShifts = optimized;
  tempScrapedShifts = optimized; // Global fallback
  res.json({ success: true, count: optimized.length });
});

// GET /api/schedules/saved-url
router.get('/saved-url', (req, res) => {
  res.json({
    url: req.session.icalUrl || null,
    scrapedCount: (req.session.scrapedShifts || tempScrapedShifts || []).length
  });
});

module.exports = {
  router,
  getTempShifts: () => tempScrapedShifts
};
