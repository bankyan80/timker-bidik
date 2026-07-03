import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const sdRombels = await DB.execute("SELECT DISTINCT rombel FROM students WHERE jenjang='SD' ORDER BY rombel");
console.log('Distinct SD rombel values: ' + sdRombels.rows.length);
for (const r of sdRombels.rows) console.log('  "' + r.rombel + '"');

// Count per format with COLLATE BINARY
const proper = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY LIKE 'Kelas %' AND rombel COLLATE BINARY NOT LIKE 'KELAS%'");
const upper = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY LIKE 'KELAS%'");
const roman = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND (rombel COLLATE BINARY = 'Kelas I' OR rombel COLLATE BINARY = 'Kelas II' OR rombel COLLATE BINARY = 'Kelas III' OR rombel COLLATE BINARY = 'Kelas IV' OR rombel COLLATE BINARY = 'Kelas V' OR rombel COLLATE BINARY = 'Kelas VI')");
const other = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY NOT LIKE 'Kelas %' AND rombel COLLATE BINARY NOT LIKE 'KELAS%' AND rombel COLLATE BINARY NOT IN ('Kelas I','Kelas II','Kelas III','Kelas IV','Kelas V','Kelas VI')");

console.log('\nProper Kelas: ' + proper.rows[0].cnt);
console.log('Uppercase KELAS: ' + upper.rows[0].cnt);
console.log('Roman numerals: ' + roman.rows[0].cnt);
console.log('Other (short forms etc): ' + other.rows[0].cnt);

// Also check total
const total = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD'");
console.log('\nTotal SD: ' + total.rows[0].cnt);
