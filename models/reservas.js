require('dotenv').config();

class Reservas {

    #credentials = require(__dirname + '/../credentials.json');

    static criarReserva(){

        const { google } = require('googleapis');

        const oauth2Client = new google.auth.OAuth2(
            this.credentials.client_id,
            this.credentials.client_secret,
            this.credentials.redirect_uris + ":" + process.env.PORT
        );

        // 2. Set the user's access (and optionally refresh) tokens
        // In a real application, you obtain these after the user completes the OAuth login flow
        oauth2Client.setCredentials({
        access_token: 'USER_ACCESS_TOKEN',
        refresh_token: 'USER_REFRESH_TOKEN' // Highly recommended for long-running scripts
        });

        // 3. Connect to the Google Calendar API (v3)
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        async function createCalendarEvent() {
        // Define event details
        const event = {
            summary: 'Project Sync Meeting',
            location: 'Virtual / Google Meet',
            description: 'A brief catch-up to align on project milestones.',
            start: {
            dateTime: '2026-10-15T10:00:00-03:00', // ISO 8601 format with timezone offset
            timeZone: 'America/Fortaleza',
            },
            end: {
            dateTime: '2026-10-15T11:00:00-03:00',
            timeZone: 'America/Fortaleza',
            },
            attendees: [
            { email: 'colleague@example.com' },
            ],
            reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 }, // 1 day before
                { method: 'popup', minutes: 15 },       // 15 minutes before
            ],
            },
            // Optional: Request an automatic Google Meet link creation
            conferenceData: {
            createRequest: {
                requestId: `meet-${Date.now()}`, // Unique string
                conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
            },
        };

        try {
            const response = await calendar.events.insert({
            calendarId: 'primary', // 'primary' defaults to the authenticated user's calendar
            resource: event,
            conferenceDataVersion: 1, // Must be 1 to enable Google Meet link generation
            sendUpdates: 'all',        // Automatically emails calendar invites to attendees
            });

            console.log('✅ Event successfully created!');
            console.log(`Event Link: ${response.data.htmlLink}`);
            if (response.data.conferenceData?.entryPoints) {
            console.log(`Google Meet Link: ${response.data.conferenceData.entryPoints[0].uri}`);
            }
        } catch (error) {
            console.error('Error creating calendar event:', error);
        }
        }

        createCalendarEvent();

    }

}