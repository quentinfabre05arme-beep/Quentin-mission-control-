const { google } = require('googleapis');
const fs = require('fs');

// Load tokens
const tokens = JSON.parse(fs.readFileSync('google_token.json'));
const credentials = JSON.parse(fs.readFileSync('google_credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(tokens);

// Test Gmail API
async function testGmail() {
    console.log('=== TESTING GOOGLE APIs ===\n');
    
    try {
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        
        // Get profile
        const profile = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Gmail API Connected');
        console.log('   Email:', profile.data.emailAddress);
        console.log('   Messages:', profile.data.messagesTotal);
        console.log('   Threads:', profile.data.threadsTotal);
        
        // Get recent emails
        const messages = await gmail.users.messages.list({ 
            userId: 'me', 
            maxResults: 5 
        });
        console.log('\n✅ Recent Emails:');
        if (messages.data.messages) {
            for (let i = 0; i < Math.min(3, messages.data.messages.length); i++) {
                const msg = await gmail.users.messages.get({ 
                    userId: 'me', 
                    id: messages.data.messages[i].id 
                });
                const subject = msg.data.payload.headers.find(h => h.name === 'Subject');
                const from = msg.data.payload.headers.find(h => h.name === 'From');
                console.log('   ' + (i+1) + '. ' + (subject ? subject.value : 'No subject') + ' (' + (from ? from.value.split('<')[0].trim() : 'Unknown') + ')');
            }
        }
        
    } catch (err) {
        console.error('❌ Gmail Error:', err.message);
    }
}

// Test Calendar API
async function testCalendar() {
    try {
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: nextWeek.toISOString(),
            maxResults: 5,
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        console.log('\n✅ Calendar API Connected');
        console.log('   Upcoming events:');
        
        if (events.data.items && events.data.items.length > 0) {
            events.data.items.forEach((event, i) => {
                const start = event.start.dateTime || event.start.date;
                console.log('   ' + (i+1) + '. ' + event.summary + ' (' + start + ')');
            });
        } else {
            console.log('   No events in the next 7 days');
        }
        
    } catch (err) {
        console.error('❌ Calendar Error:', err.message);
    }
}

// Test Drive API
async function testDrive() {
    try {
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        
        const files = await drive.files.list({
            pageSize: 5,
            fields: 'files(name, mimeType, modifiedTime)'
        });
        
        console.log('\n✅ Drive API Connected');
        console.log('   Recent files:');
        
        if (files.data.files && files.data.files.length > 0) {
            files.data.files.forEach((file, i) => {
                console.log('   ' + (i+1) + '. ' + file.name + ' (' + file.mimeType + ')');
            });
        } else {
            console.log('   No files found');
        }
        
    } catch (err) {
        console.error('❌ Drive Error:', err.message);
    }
}

// Run all tests
async function runTests() {
    await testGmail();
    await testCalendar();
    await testDrive();
    console.log('\n=== TEST COMPLETE ===');
}

runTests().catch(console.error);
