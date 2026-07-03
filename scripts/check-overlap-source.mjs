import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';

const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
console.log('Total portal-dinas records: ' + raw.length);

const sdRecords = raw.filter(s => (s.jenjang || '').trim().toUpperCase() === 'SD');
const tkRecords = raw.filter(s => (s.jenjang || '').trim().toUpperCase() === 'TK');
const kbRecords = raw.filter(s => (s.jenjang || '').trim().toUpperCase() === 'KB' || (s.jenjang || '').trim().toUpperCase() === 'PAUD');
console.log('SD: ' + sdRecords.length + ', TK: ' + tkRecords.length + ', KB/PAUD: ' + kbRecords.length);

// Compare NISN from portal-dinas SD vs remaining SD students in DB
const dbSdNisn = await DB.execute("SELECT nisn FROM students WHERE jenjang='SD' AND nisn IS NOT NULL AND nisn != ''");
const dbNisnSet = new Set(dbSdNisn.rows.map(r => r.nisn));
console.log('\nDB remaining SD NISN values: ' + dbNisnSet.size);

// How many portal-dinas SD records have NISN in DB?
let overlap = 0;
for (const s of sdRecords) {
  const nisn = (s.nisn || '').trim();
  if (nisn && dbNisnSet.has(nisn)) overlap++;
}
console.log('Portal-dinas NISN overlapping with DB: ' + overlap);
console.log('Portal-dinas NISN NOT in DB: ' + (sdRecords.length - overlap));

// If overlap is small, re-running sync will INSERT almost all, creating massive duplicates
if (sdRecords.length - overlap > 100) {
  console.log('\nWould cause ~' + (sdRecords.length - overlap) + ' new INSERTs — too many!');
  console.log('Need to delete remaining old-format students first, then re-import cleanly.');
}
