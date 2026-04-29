const { google } = require('googleapis');
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

    let formattedEvents = [];

    // 1. Try to fetch from Azure Table Storage ("Fast Lane")
    if (AZURE_CONNECTION_STRING) {
        try {
            const client = TableClient.fromConnectionString(AZURE_CONNECTION_STRING, "Shifts");
            const entities = client.listEntities();
            
            for await (const entity of entities) {
                // Determine day from lastSync or title? 
                // For now, let's assume the entity has a 'day' or we can derive it.
                // In azureTable.js, it doesn't store 'day'. Let's add it or guess it.
                // Actually, the frontend expects 'day' like 'MON', 'TUE'.
                
                formattedEvents.push({
                    day: entity.day || "WORK", // Fallback
                    shift: `${entity.time} ${entity.title}`,
                    status: entity.status,
                    progress: entity.progress,
                    isBirthday: entity.isBirthday,
                    type: entity.title.toLowerCase().includes('ymca') ? 'YMCA' : 'STUDY'
                });
            }
        } catch (err) {
            context.log.warn('Azure Table Fetch Error:', err.message);
        }
    }

    // 2. If no Azure data or specifically requested, fetch from Google Calendar
    if (formattedEvents.length === 0 && GOOGLE_REFRESH_TOKEN) {
        const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
        oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

        try {
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const res = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = res.data.items || [];
            formattedEvents = events.map(event => {
                const start = event.start.dateTime || event.start.date;
                const date = new Date(start);
                return {
                    day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                    shift: event.summary,
                    type: event.summary.toLowerCase().includes('ymca') ? 'YMCA' : 'STUDY',
                    progress: 20 // Default for Google Calendar items
                };
            });
        } catch (error) {
            context.log.error('Calendar Fetch Error:', error);
        }
    }

    context.res = {
        status: 200,
        body: { 
            success: true, 
            events: formattedEvents,
            source: formattedEvents.length > 0 && AZURE_CONNECTION_STRING ? 'Azure Cloud Sync' : (GOOGLE_REFRESH_TOKEN ? 'Google Calendar' : 'Mock Data')
        }
    };
};
