import { google } from 'googleapis';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TOKEN_PATH = join(import.meta.dirname, '..', 'drive-token.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function main() {
  // Try loading saved token
  if (existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    // Check if expired
    if (tokens.expiry_date > Date.now()) {
      console.log('Token masih valid. Siap digunakan.');
      return;
    }
    console.log('Token expired. Refresh...');
    // We would need a refresh token or re-auth
  }

  // Use OAuth 2.0 Device Flow (no client secret needed for installed apps)
  console.log('Membuka browser untuk otorisasi Google Drive...\n');
  
  // For installed app flow, we use the Google OAuth playground client ID
  // This is the official Google OAuth client ID for desktop apps
  const oauth2Client = new google.auth.OAuth2(
    '407408718192.apps.googleusercontent.com',  // Google's generic client ID for desktop
    '',  // No secret needed for desktop
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('1. Buka link ini di browser:');
  console.log(authUrl);
  console.log('\n2. Login dengan akun Google Anda');
  console.log('3. Copy kode yang diberikan, paste di sini:\n');

  // Use a simpler approach - store the URL and let the user know
  console.log('═══════════════════════════════════════');
  console.log('SETELAH dapat kode, jalankan:');
  console.log('node scripts/drive-finish-auth.mjs <KODE>');
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
