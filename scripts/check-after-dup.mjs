import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const total = await DB.execute('SELECT count(1) as cnt FROM students');
console.log('Total students: ' + total.rows[0].cnt);

const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt, count(nisn) as nisn FROM students GROUP BY jenjang ORDER BY jenjang');
console.log('Per jenjang:');
for (const r of byJenjang.rows) console.log('  ' + (r.jenjang || '?') + ': ' + r.cnt + ' (nisn: ' + r.nisn + ')');

// Check specific format counts for SD
const fmtCounts = [
  "rombel LIKE 'Kelas %' COLLATE BINARY AND rombel NOT LIKE 'KELAS%' COLLATE BINARY",
  "rombel GLOB 'KELAS *'",
  "rombel = 'Kelas I' OR rombel = 'Kelas II' OR rombel = 'Kelas III' OR rombel = 'Kelas IV' OR rombel = 'Kelas V' OR rombel = 'Kelas VI'",
  "rombel GLOB '[0-9]' OR rombel GLOB '[0-9][A-Z]'",
];
console.log('\nSD format counts:');
const f1 = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND (" + fmtCounts[0] + ")");
const f2 = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND (" + fmtCounts[1] + ")");
const f3 = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND (" + fmtCounts[2] + ")");
const f4 = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND (" + fmtCounts[3] + ")");
console.log('  Proper (BINARY): ' + f1.rows[0].cnt);
console.log('  Uppercase KELAS: ' + f2.rows[0].cnt);
console.log('  Roman numerals: ' + f3.rows[0].cnt);
console.log('  Short forms: ' + f4.rows[0].cnt);

// Check SD total
const sdTotal = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD'");
console.log('\nSD total: ' + sdTotal.rows[0].cnt);
console.log('Sum of formats: ' + (f1.rows[0].cnt + f2.rows[0].cnt + f3.rows[0].cnt + f4.rows[0].cnt));

// Check distinct rombel values for SD
const rombels = await DB.execute("SELECT DISTINCT rombel FROM students WHERE jenjang='SD' ORDER BY rombel");
console.log('\nDistinct SD rombel values: ' + rombels.rows.length);
for (const r of rombels.rows) console.log('  "' + r.rombel + '"');
