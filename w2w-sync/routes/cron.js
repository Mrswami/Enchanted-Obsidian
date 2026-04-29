const express = require('express');
const router = express.Router();
const { getDb } = require('../services/firebase');
const { parseShiftFeed } = require('../services/icalParser');
const { listUpcomingEvents, createCalendarEvent } = require('../services/googleCalendar');

/**
 * GET /api/cron/sync
 * Verifies CRON_SECRET, then loops through all users with auto-sync enabled,
 * compares WhenToWork to Google Calendar, and inserts missing shifts.
 */
router.get('/sync', async (req, res) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }

    try {
        const usersSnapshot = await db.collection('users').get();
        let syncedCount = 0;
        let errors = 0;

        for (const doc of usersSnapshot.docs) {
            const user = doc.data();
            
            if (!user.tokens || !user.icalUrl) continue;

            try {
                const [shifts, gcalEvents] = await Promise.all([
                    parseShiftFeed(user.icalUrl),
                    listUpcomingEvents(user.tokens, 50)
                ]);

                const gcalKeys = new Set(
                    gcalEvents.map(e => {
                        const start = e.start?.dateTime || e.start?.date || '';
                        const title = e.summary ? e.summary.toLowerCase().trim() : '';
                        return `${title}::${start.substring(0,10)}`;
                    })
                );

                for (const shift of shifts) {
                    const shiftStartStr = new Date(shift.start).toISOString().substring(0,10);
                    const title = shift.title ? shift.title.toLowerCase().trim() : '';
                    const key = `${title}::${shiftStartStr}`;
                    
                    if (!gcalKeys.has(key)) {
                        await createCalendarEvent(user.tokens, {
                            title: shift.title,
                            start: shift.start,
                            end: shift.end,
                            description: shift.description,
                            location: shift.location
                        }, false); // don't notifySelf
                        syncedCount++;
                    }
                }
            } catch (err) {
                console.error(`Error syncing user ${doc.id}:`, err.message);
                errors++;
            }
        }

        res.json({ success: true, message: `Cron sync completed. Synced ${syncedCount} shifts. Errors: ${errors}` });

    } catch (err) {
        console.error('Cron error:', err);
        res.status(500).json({ error: 'Cron execution failed' });
    }
});

module.exports = router;
