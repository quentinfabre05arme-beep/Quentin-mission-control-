const { google } = require('googleapis');
const fs = require('fs');

// Load tokens
const tokens = JSON.parse(fs.readFileSync('google_token.json'));
const credentials = JSON.parse(fs.readFileSync('google_credentials.json'));
const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(tokens);

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

async function listAllFiles() {
    console.log('=== SCANNING GOOGLE DRIVE ===\n');
    
    try {
        // Get all files (not in trash)
        const response = await drive.files.list({
            pageSize: 1000,
            fields: 'files(id, name, mimeType, parents, modifiedTime, size, trashed)',
            q: 'trashed = false'
        });
        
        const files = response.data.files;
        console.log('Total files found:', files.length);
        
        // Group by type
        const byType = {};
        const spreadsheets = [];
        const documents = [];
        const folders = [];
        const images = [];
        const pdfs = [];
        const others = [];
        
        files.forEach(file => {
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                folders.push(file);
            } else if (file.mimeType.includes('spreadsheet')) {
                spreadsheets.push(file);
            } else if (file.mimeType.includes('document')) {
                documents.push(file);
            } else if (file.mimeType.includes('image')) {
                images.push(file);
            } else if (file.mimeType === 'application/pdf') {
                pdfs.push(file);
            } else {
                others.push(file);
            }
        });
        
        console.log('\n📊 FILE BREAKDOWN:');
        console.log('  Folders:', folders.length);
        console.log('  Spreadsheets:', spreadsheets.length);
        console.log('  Documents:', documents.length);
        console.log('  Images:', images.length);
        console.log('  PDFs:', pdfs.length);
        console.log('  Others:', others.length);
        
        console.log('\n📁 EXISTING FOLDERS:');
        folders.slice(0, 10).forEach((f, i) => {
            console.log(`  ${i+1}. ${f.name}`);
        });
        
        console.log('\n📈 SPREADSHEETS:');
        spreadsheets.slice(0, 10).forEach((f, i) => {
            console.log(`  ${i+1}. ${f.name}`);
        });
        
        return { folders, spreadsheets, documents, images, pdfs, others };
        
    } catch (err) {
        console.error('Error:', err.message);
        return null;
    }
}

// Run
listAllFiles().then(data => {
    console.log('\n=== SCAN COMPLETE ===');
    if (data) {
        console.log(`Found ${data.folders.length} folders, ${data.spreadsheets.length} spreadsheets`);
    }
});
