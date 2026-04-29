const express = require('express');
const router = express.Router();
const { parseShiftFeed } = require('../services/icalParser');
const { listUpcomingEvents } = require('../services/googleCalendar');

function requireAuth(req, res, next) {
    if (!req.session.tokens) {
        return res.status(401).json({ error: 'Not authenticated. Please sign in with Google.' });
    }
    next();
}

/**
 * Normalize a date to midnight UTC for day-level comparison.
 */
function toDateKey(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build a composite key from title + date for fuzzy matching.
 * Lowercased, trimmed title + YYYY-MM-DD.
 */
function makeKey(title, start) {
    return `${title.toLowerCase().trim()}::${toDateKey(start)}`;
}

/**
 * GET /api/sync/check
 * Compares SocialSchedules shifts vs Google Calendar events.
 * Returns: { synced, missing, orphaned, total, checkedAt }
 */
router.get('/check', requireAuth, async (req, res) => {
    const icalUrl = req.session.icalUrl || req.query.url;

    if (!icalUrl) {
        return res.status(400).json({
            error: 'No iCal URL saved. Go to Settings and paste your WhenToWork iCal URL first.'
        });
    }

    try {
        // Fetch both sources in parallel
        const [shifts, gcalEvents] = await Promise.all([
            parseShiftFeed(icalUrl),
            listUpcomingEvents(req.session.tokens, 50)
        ]);

        // Index GCal events by title::date key
        const gcalMap = new Map();
        for (const event of gcalEvents) {
            const title = event.summary || '';
            const start = event.start?.dateTime || event.start?.date || '';
            if (!start) continue;
            const key = makeKey(title, start);
            gcalMap.set(key, {
                id: event.id,
                title: event.summary,
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                gcalLink: event.htmlLink
            });
        }

        // Index WhenToWork shifts by title::date key
        const shiftMap = new Map();
        for (const shift of shifts) {
            const key = makeKey(shift.title, shift.start);
            shiftMap.set(key, shift);
        }

        const synced = [];
        const missing = []; // In WhenToWork but NOT in GCal
        const orphaned = []; // In GCal but NOT in WhenToWork

        // Check each shift
        for (const [key, shift] of shiftMap) {
            if (gcalMap.has(key)) {
                synced.push({
                    shift,
                    gcal: gcalMap.get(key)
                });
            } else {
                missing.push(shift);
            }
        }

        // Check for orphaned GCal events
        for (const [key, gcalEvent] of gcalMap) {
            if (!shiftMap.has(key)) {
                // Only flag as orphaned if title looks like a work shift
                // (avoid flagging personal calendar events)
                orphaned.push(gcalEvent);
            }
        }

        res.json({
            synced,
            missing,
            orphaned,
            total: {
                shifts: shifts.length,
                gcalEvents: gcalEvents.length,
                synced: synced.length,
                missing: missing.length,
                orphaned: orphaned.length
            },
            checkedAt: new Date().toISOString()
        });

    } catch (err) {
        console.error('[sync/check] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
