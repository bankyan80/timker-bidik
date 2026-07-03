import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
console.log('Students per jenjang:');
for (const r of byJenjang.rows) console.log('  "' + (r.jenjang || '?') + '": ' + r.cnt);

// SD rombel distribution
const sdRombels = await DB.execute("SELECT DISTINCT rombel FROM students WHERE jenjang='SD' ORDER BY rombel");
console.log('\nDistinct SD rombel values: ' + sdRombels.rows.length);
for (const r of sdRombels.rows) console.log('  "' + r.rombel + '"');

// Check for leftover short forms (non-Kelas entries)
const weird = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel NOT LIKE 'Kelas%' AND rombel NOT LIKE 'KELAS%'");
console.log('\nNon-Kelas rombel entries: ' + weird.rows[0].cnt);

// Check jenjang empty students
const emptyJenjang = await DB.execute("SELECT jenjang, count(1) as cnt FROM students WHERE jenjang IS NULL OR jenjang = '' OR jenjang = '?' GROUP BY jenjang");
console.log('\nEmpty/weird jenjang:');
for (const r of emptyJenjang.rows) console.log('  "' + (r.jenjang || 'NULL') + '": ' + r.cnt);
