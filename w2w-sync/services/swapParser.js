/**
 * Shift swap / coverage request parser for GroupMe messages.
 * Detects swap/cover requests, extracts dates, and filters out past shifts.
 */

const SWAP_KEYWORDS = [
    'swap', 'switch', 'trade', 'cover', 'pick up', 'pickup', 'need off',
    'give away', 'giving away', 'looking for', 'anyone want', 'who wants',
    'can anyone', 'shift available', 'need someone', 'need a cover',
    'available shift', 'open shift', 'can cover', 'willing to swap'
];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
const SHORT_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Check if a message text looks like a shift swap/cover request.
 */
function isShiftSwapMessage(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return SWAP_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Extract a probable shift date from a message text.
 * Returns a Date object or null if no date could be parsed.
 */
function extractShiftDate(text, messageCreatedAt) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const now = new Date(messageCreatedAt * 1000);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // "tomorrow"
    if (lower.includes('tomorrow')) {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d;
    }

    // "tonight" / "today"
    if (lower.includes('tonight') || lower.includes('today')) {
        return today;
    }

    // "this [weekday]" / "next [weekday]" / plain weekday
    for (let i = 0; i < DAY_NAMES.length; i++) {
        const dayName = DAY_NAMES[i];
        const shortDay = SHORT_DAYS[i];

        const patterns = [
            new RegExp(`\\bthis ${dayName}\\b`),
            new RegExp(`\\bnext ${dayName}\\b`),
            new RegExp(`\\b${dayName}\\b`),
            new RegExp(`\\b${shortDay}\\b`),
        ];

        for (const pat of patterns) {
            if (pat.test(lower)) {
                const todayDow = today.getDay();
                let daysAhead = i - todayDow;

                // "next [day]" — always means next week
                if (pat.source.includes('next')) daysAhead = (daysAhead <= 0 ? daysAhead + 7 : daysAhead + 7);
                else if (daysAhead <= 0) daysAhead += 7; // past weekday this week → next occurrence

                const d = new Date(today);
                d.setDate(today.getDate() + daysAhead);
                return d;
            }
        }
    }

    // "March 5", "Mar 5th", "3/5", "3-5"
    // Month name + day
    for (let m = 0; m < MONTH_NAMES.length; m++) {
        const pattern = new RegExp(`\\b(?:${MONTH_NAMES[m]}|${SHORT_MONTHS[m]})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`);
        const match = lower.match(pattern);
        if (match) {
            const day = parseInt(match[1]);
            const year = now.getMonth() > m ? now.getFullYear() + 1 : now.getFullYear();
            const d = new Date(year, m, day);
            return d;
        }
    }

    // Numeric date: 3/5 or 3-5
    const numericMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
    if (numericMatch) {
        const month = parseInt(numericMatch[1]) - 1;
        const day = parseInt(numericMatch[2]);
        const year = now.getFullYear();
        const d = new Date(year, month, day);
        return d;
    }

    return null;
}

/**
 * Parse GroupMe messages for shift swap/cover requests.
 * Returns only messages that:
 *  1. Contain swap/cover language
 *  2. Have a detected shift date that is >= today (or no date = keep)
 */
function parseSwapMessages(messages) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return messages
        .filter(m => isShiftSwapMessage(m.text))
        .map(m => {
            const shiftDate = extractShiftDate(m.text, m.created_at);
            return {
                id: m.id,
                name: m.name,
                text: m.text,
                avatarUrl: m.avatar_url,
                createdAt: m.created_at,
                shiftDate: shiftDate ? shiftDate.toISOString() : null,
                shiftDateStr: shiftDate
                    ? shiftDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : null
            };
        })
        .filter(m => {
            // Keep if no date found (might still be relevant) or if shift date is today or future
            if (!m.shiftDate) return true;
            return new Date(m.shiftDate) >= now;
        })
        .sort((a, b) => {
            // Prioritize messages with a detected future date (soonest first)
            if (a.shiftDate && b.shiftDate) return new Date(a.shiftDate) - new Date(b.shiftDate);
            if (a.shiftDate) return -1;
            if (b.shiftDate) return 1;
            return b.createdAt - a.createdAt; // fallback: newest first
        });
}

module.exports = { parseSwapMessages, isShiftSwapMessage };
