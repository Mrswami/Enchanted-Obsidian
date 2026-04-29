const ical = require('node-ical');

/**
 * Fetch and parse a WhenToWork iCal feed URL.
 * Returns an array of confirmed shift/schedule objects.
 */
async function parseShiftFeed(icalUrl) {
  // webcal:// is semantically identical to https:// — normalize it
  if (icalUrl) icalUrl = icalUrl.replace(/^webcals?:\/\//i, 'https://');

  if (!icalUrl || !icalUrl.startsWith('http')) {
    throw new Error('Invalid iCal URL. Paste your WhenToWork iCal link from the Calendar Sync section.');
  }

  let rawEvents;
  try {
    rawEvents = await ical.async.fromURL(icalUrl);
  } catch (err) {
    throw new Error(`Could not fetch iCal feed: ${err.message}`);
  }

  const now = new Date();
  const schedules = [];

  for (const key of Object.keys(rawEvents)) {
    const event = rawEvents[key];

    if (event.type !== 'VEVENT') continue;

    const start = event.start ? new Date(event.start) : null;
    const end = event.end ? new Date(event.end) : null;

    if (!start || !end) continue;

    // Only include future events (confirmed upcoming shifts)
    if (end < now) continue;

    // WhenToWork usually uses "Assign:" prefix or specific status codes
    const status = (event.status || '').toUpperCase();
    const isConfirmed = !status || status === 'CONFIRMED' || status === 'TENTATIVE';
    if (!isConfirmed) continue;

    // Filter out blockages/availability if they appear in the same feed
    if (event.summary && (event.summary.includes('Block') || event.summary.includes('Unavailable'))) continue;

    schedules.push({
      id: event.uid || key,
      title: cleanTitle(event.summary || 'Work Shift'),
      description: event.description || '',
      location: event.location || '',
      start: start.toISOString(),
      end: end.toISOString(),
      status: status || 'CONFIRMED',
      rawStart: event.start,
      rawEnd: event.end,
    });
  }

  // Sort by start time ascending
  schedules.sort((a, b) => new Date(a.start) - new Date(b.start));

  return schedules;
}

function cleanTitle(title) {
  // WhenToWork often prefixes with "Assign: "
  return title.replace(/^Assign:\s*/i, '').trim().replace(/\s+/g, ' ');
}

/**
 * Convert a parsed schedule into a Google Calendar event payload.
 */
function scheduleToCalendarEvent(schedule, timeZone = 'America/New_York') {
  return {
    title: schedule.title,
    description: schedule.description
      ? `${schedule.description}\n\n[Auto-synced from WhenToWork]`
      : '[Auto-synced from WhenToWork]',
    location: schedule.location,
    start: schedule.start,
    end: schedule.end,
    timeZone,
  };
}

/**
 * Normalize and parse scraped W2W shifts into standard sync objects.
 */
function parseScrapedShifts(scraped) {
  return scraped.map((s) => {
    const { start, end } = parseW2WRange(s.date, s.time);
    return {
      id: s.id,
      title: s.title,
      description: s.fullText,
      location: s.location,
      start: start.toISOString(),
      end: end.toISOString(),
      status: 'CONFIRMED',
    };
  });
}

function parseW2WRange(dateStr, timeStr) {
  // dateStr: "Sun Mar 29, 2026"
  // timeStr: "1:45pm - 6:15pm"
  const [startPart, endPart] = timeStr.split('-').map((p) => p.trim());

  const start = parseW2WDateTime(dateStr, startPart);
  const end = parseW2WDateTime(dateStr, endPart);

  // If end is before start, it might cross midnight
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function parseW2WDateTime(dateStr, timePart) {
  // dateStr: "Sun Mar 29, 2026"
  // timePart: "1:45pm" or "4pm"
  const d = new Date(dateStr);
  const match = timePart.match(/(\d{1,2})(?::(\d{2}))?(am|pm)/i);
  if (!match) return d;

  let [, hours, mins, ampm] = match;
  hours = parseInt(hours);
  mins = parseInt(mins || '0');

  if (ampm.toLowerCase() === 'pm' && hours < 12) hours += 12;
  if (ampm.toLowerCase() === 'am' && hours === 12) hours = 0;

  d.setHours(hours, mins, 0, 0);
  return d;
}

module.exports = {
  parseShiftFeed,
  scheduleToCalendarEvent,
  parseScrapedShifts,
};
