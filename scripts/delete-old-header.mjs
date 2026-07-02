import { google } from 'googleapis';
import { createClient } from '@libsql/client';

const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// ── Which documents to delete ──
// Categories that DEFINTELY have old KEMENDIKBUD header:
// SK CPNS, SK PANGKAT, SK KGB — 100% old (pre-2024)
// SK JABATAN (SK Jabatan, SK Lainnya, SK Kepala Sekolah) — old
// SK PNS-P3K: SK Lainnya — classic old header
// SK PNS-P3K: SK P3K/PPPK — only delete if nama_file doesn't indicate it's a recent PPPK PW doc

const QUERY = `
  SELECT id, employee_id, nama_file, drive_file_id, kategori, jenis_dokumen
  FROM employee_documents 
  WHERE (
    kategori IN ('SK CPNS', 'SK PANGKAT', 'SK KGB')
    OR (kategori = 'SK JABATAN' AND jenis_dokumen IN ('SK Lainnya', 'SK Jabatan', 'SK Kepala Sekolah'))
    OR (kategori = 'SK PNS-P3K' AND jenis_dokumen = 'SK Lainnya')
  )
  AND drive_file_id IS NOT NULL AND drive_file_id != ''
`;  

const docs = await db.execute(QUERY);
console.log(`Found ${docs.rows.length} documents with old KEMENDIKBUD header to delete:`);
const byCategory = {};
for (const d of docs.rows) {
  if (!byCategory[d.kategori]) byCategory[d.kategori] = 0;
  byCategory[d.kategori]++;
}
for (const [cat, count] of Object.entries(byCategory)) console.log(`  ${cat}: ${count}`);

if (docs.rows.length === 0) {
  console.log('Nothing to delete.');
  process.exit(0);
}

// ── Delete from Drive ──
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

let deleted = 0, failed = 0, skipped = 0;

for (let i = 0; i < docs.rows.length; i++) {
  const d = docs.rows[i];
  try {
    await drive.files.delete({ fileId: d.drive_file_id });
    await db.execute("DELETE FROM employee_documents WHERE id = ?", [d.id]);
    deleted++;
  } catch (err) {
    if (err.message.includes('notFound') || err.message.includes('404')) {
      // File already gone, just delete from DB
      await db.execute("DELETE FROM employee_documents WHERE id = ?", [d.id]);
      skipped++;
    } else {
      failed++;
      console.error(`  FAILED: ${d.nama_file} (${err.message.substring(0, 80)})`);
    }
  }
  if ((i + 1) % 20 === 0) console.log(`Progress: ${i + 1}/${docs.rows.length} (OK: ${deleted}, skip: ${skipped}, fail: ${failed})`);
}

console.log(`\n=== DONE ===`);
console.log(`Deleted from Drive+DB: ${deleted}`);
console.log(`Skipped (already gone): ${skipped}`);
console.log(`Failed: ${failed}`);

// Final count
const finalCount = await db.execute("SELECT COUNT(*) as c FROM employee_documents");
console.log(`Total documents remaining: ${finalCount.rows[0].c}`);
