import { google, Auth } from 'googleapis';
import { createReadStream } from 'fs';
import { join } from 'path';

const TEST_FILE = 'C:\\Users\\Bank Yan\\OneDrive\\Documents\\BIODATA SIMPEG PNS-ASN P3K\\IDENTITAS DIRI PDF (MAKS 2MB) (File responses)\\IDENTITAS_197504192023212001_WATIAH,SPd.I - SDN 1 LEMAHABANG.pdf';

// Use GoogleAuth which automatically handles ADC with quota project
const auth = new Auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
const drive = google.drive({ version: 'v3', auth });

// Test: list files
console.log('Testing Drive API connection...');
const list = await drive.files.list({ pageSize: 5, fields: 'files(id,name)' });
console.log('Success! Files accessible:', list.data.files.length);
for (const f of list.data.files) console.log('  -', f.name);

// Create test folder
const folder = await drive.files.create({
  requestBody: { name: 'TEST_UPLOAD_' + Date.now(), mimeType: 'application/vnd.google-apps.folder' },
  fields: 'id'
});
console.log('\nCreated test folder:', folder.data.id);

// Upload test file
const media = { mimeType: 'application/pdf', body: createReadStream(TEST_FILE) };
const file = await drive.files.create({
  requestBody: { name: 'test_upload.pdf', parents: [folder.data.id] },
  media,
  fields: 'id,webViewLink'
});
console.log('Uploaded file:', file.data.id);
console.log('URL:', file.data.webViewLink);

// Cleanup
await drive.files.delete({ fileId: folder.data.id });
console.log('Cleaned up test folder');
console.log('\n✅ Drive API works!');
process.exit(0);
