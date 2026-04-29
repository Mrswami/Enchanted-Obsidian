/**
 * WhenToWork (W2W) Integration Service
 * 
 * This service handles fetching your official YMCA schedule via the iCal feed.
 * It's cleaner than a scraper and stays synchronized even as W2W updates.
 */

const ical = require('node-ical');

async function fetchW2WSchedule(feedUrl) {
    if (!feedUrl) throw new Error("No W2W Feed URL provided");
    
    // Normalize webcal:// to https://
    const normalizedUrl = feedUrl.replace(/^webcals?:\/\//i, 'https://');
    
    try {
        const events = await ical.async.fromURL(normalizedUrl);
        const shifts = [];
        const now = new Date();

        for (const k in events) {
            const event = events[k];
            if (event.type !== 'VEVENT') continue;

            const start = new Date(event.start);
            const end = new Date(event.end);

            // Filter for relevant YMCA shifts (Current & Future)
            if (end > now) {
                shifts.push({
                    id: event.uid || k,
                    summary: event.summary,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    location: event.location,
                    description: event.description,
                    day: start.toLocaleDateString('en-US', { weekday: 'long' }),
                    timeRange: `${formatTime(start)} - ${formatTime(end)}`
                });
            }
        }

        // Sort by date/time
        return shifts.sort((a, b) => new Date(a.start) - new Date(b.start));
    } catch (err) {
        console.error("W2W Fetch Error:", err);
        throw new Error("Failed to pull WhenToWork schedule. Ensure your URL is valid.");
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
}

/**
 * Generate a professional Markdown report of your schedule
 * perfect for John Mitchell and the IT/Data team.
 */
function generateProfessionalScheduleReport(shifts) {
    let report = "# YMCA Service Schedule\n";
    report += `**Employee:** Jacob Moreno (Front Desk | ID: 2424273)\n`;
    report += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
    report += "| Day | Date | Shift Time | Location |\n";
    report += "| :--- | :--- | :--- | :--- |\n";

    shifts.forEach(s => {
        const dateStr = new Date(s.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        report += `| ${s.day} | ${dateStr} | ${s.timeRange} | ${s.location || 'TownLake YMCA'} |\n`;
    });

    report += "\n\n*Note: This schedule report was automatically generated via the Schedule Assistant platform.*";
    return report;
}

module.exports = { fetchW2WSchedule, generateProfessionalScheduleReport };
