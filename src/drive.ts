import { google } from 'googleapis';

let _drive: ReturnType<typeof google.drive> | null = null;

function getDrive() {
  if (!_drive) {
    _drive = google.drive({ version: 'v3', auth: getAuth() });
  }
  return _drive;
}

export function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      return new google.auth.GoogleAuth({
        credentials: JSON.parse(keyJson),
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    } catch {
      // fall through to default auth
    }
  }
  return new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive();
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const search = await drive.files.list({ q, fields: 'files(id)' });
  if (search.data.files.length > 0) return search.data.files[0].id!;
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return res.data.id!;
}

export async function uploadToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  schoolName: string,
  employeeName: string,
): Promise<{ fileId: string; driveUrl: string }> {
  const drive = getDrive();
  const rootId = await getOrCreateFolder('Arsip SIMPEG Lemahabang', 'root');
  const schoolFolder = await getOrCreateFolder(schoolName, rootId);
  const empFolder = await getOrCreateFolder(employeeName, schoolFolder);

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [empFolder] },
    media: { mimeType, body: fileBuffer },
    fields: 'id,webViewLink',
  });

  const fileId = res.data.id!;
  const driveUrl = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, driveUrl };
}
