const express = require('express');
const router = express.Router();
const {
  listCalendars,
  listUpcomingEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  checkEventExists,
} = require('../services/googleCalendar');
const { parseShiftFeed, scheduleToCalendarEvent, parseScrapedShifts } = require('../services/icalParser');
const { recordSync } = require('../services/firebase');
const { sendMessage } = require('../services/groupme');
const { getTempShifts } = require('./schedules'); // We'll add this export

function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in with Google.' });
  }
  next();
}

// GET /api/calendar/list — list all user's writable Google Calendars
router.get('/list', requireAuth, async (req, res) => {
  try {
    const calendars = await listCalendars(req.session.tokens);
    res.json({ calendars });
  } catch (err) {
    console.error('Calendar list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/events — list upcoming events in a calendar
router.get('/events', requireAuth, async (req, res) => {
  try {
    const events = await listUpcomingEvents(req.session.tokens);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/sync
// Body: { icalUrl, calendarId, timeZone, notifySelf, selectedIds }
router.post('/sync', requireAuth, async (req, res) => {
  const {
    icalUrl,
    calendarId = 'primary',
    timeZone = 'America/New_York',
    notifySelf = false,
    selectedIds = null,
  } = req.body;

  const urlToUse = icalUrl || req.session.icalUrl;
  
  try {
    let schedules;
    if (urlToUse) {
      console.log('🐝 Fetching shifts from iCal URL...');
      schedules = await parseShiftFeed(urlToUse);
    } else {
      const activeScraped = req.session.scrapedShifts || getTempShifts();
      if (activeScraped && activeScraped.length > 0) {
        console.log(`🐝 Using ${activeScraped.length} scraped shifts from session/fallback.`);
        schedules = parseScrapedShifts(activeScraped);
      } else {
        console.error('🐝 No shifts found for sync!');
        return res.status(400).json({ error: 'No iCal URL and no scraped shifts found. Use the extension to grab shifts first.' });
      }
    }

    const toSync = selectedIds
      ? schedules.filter((s) => selectedIds.includes(s.id))
      : schedules;

    const results = { synced: [], skipped: [], failed: [] };
    console.log(`🐝 Syncing ${toSync.length} shifts to Google Calendar...`);
    console.log(`🐝 IDs to sync: ${JSON.stringify(toSync.map(s => s.id))}`);

    const processedInRequest = new Set();
    
    for (const schedule of toSync) {
      try {
        const uniqueKey = `${schedule.title}::${new Date(schedule.start).getTime()}`;
        if (processedInRequest.has(uniqueKey)) {
          console.log(`🐝 Skipping duplicate in same request: ${schedule.title}`);
          results.skipped.push({ id: schedule.id, title: schedule.title, reason: 'Duplicate in request' });
          continue;
        }

        console.log(`🐝 Processing sync for: ${schedule.title} (${schedule.start})`);
        const exists = await checkEventExists(req.session.tokens, schedule.title, schedule.start);
        if (exists) {
          console.log(`🐝 Skipping existing shift: ${schedule.title}`);
          results.skipped.push({ id: schedule.id, title: schedule.title, reason: 'Already exists' });
          continue;
        }

        const eventPayload = scheduleToCalendarEvent(schedule, timeZone);
        const created = await createCalendarEvent(
          req.session.tokens,
          eventPayload,
          notifySelf,
          calendarId
        );

        processedInRequest.add(uniqueKey);
        console.log(`🐝 Successfully synced: ${schedule.title}`);
        results.synced.push({
          id: schedule.id,
          title: schedule.title,
          gcalId: created.id,
          gcalLink: created.htmlLink,
        });
      } catch (eventErr) {
        console.error(`🐝 Failed to sync ${schedule.title}:`, eventErr.message);
        results.failed.push({ id: schedule.id, title: schedule.title, error: eventErr.message });
      }
    }

    const summary = {
      total: toSync.length,
      synced: results.synced.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      calendarId,
      details: results,
    };

    // Persist sync record to Firestore if user profile exists
    if (req.session.uid) {
      await recordSync(req.session.uid, summary).catch(() => { });
    }

    // Proactive GroupMe Notification
    const gmToken = process.env.GROUPME_ACCESS_TOKEN || req.session.groupmeToken;
    const gmGroupId = process.env.GROUPME_DEFAULT_GROUP_ID; // Optional env for auto-notify

    if (gmToken && gmGroupId && summary.synced > 0) {
      const msg = `🐝 Schedule Assistant: just synced ${summary.synced} shifts to my Google Calendar!`;
      await sendMessage(gmToken, gmGroupId, msg).catch(e => console.error('GM Notify Error:', e.message));
    }

    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    await deleteCalendarEvent(req.session.tokens, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
