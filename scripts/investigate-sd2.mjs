import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// Test case-sensitive LIKE
const test1 = await DB.execute("SELECT count(1) as cnt, rombel FROM students WHERE jenjang='SD' AND rombel LIKE 'Kelas 1' COLLATE BINARY LIMIT 1");
console.log('LIKE with COLLATE BINARY inline:');
console.log(test1.rows[0]);

const test2 = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel = 'Kelas 1'");
console.log('Exact match "Kelas 1": ' + test2.rows[0].cnt);

const test3 = await DB.execute("SELECT rombel, count(1) as cnt FROM students WHERE jenjang='SD' AND (rombel = 'Kelas 1' OR rombel = 'KELAS 1') GROUP BY rombel");
console.log('Kelas 1 vs KELAS 1:');
for (const r of test3.rows) console.log('  "' + r.rombel + '": ' + r.cnt);

// Show first few "Kelas" entries
const sample = await DB.execute("SELECT rombel FROM students WHERE jenjang='SD' AND rombel LIKE 'Kelas%' LIMIT 10");
console.log('\nSample "Kelas" entries:');
for (const r of sample.rows) console.log('  "' + r.rombel + '" (length: ' + r.rombel.length + ')');

const sample2 = await DB.execute("SELECT rombel FROM students WHERE jenjang='SD' AND rombel LIKE 'KELAS%' LIMIT 10");
console.log('\nSample "KELAS" entries:');
for (const r of sample2.rows) console.log('  "' + r.rombel + '" (length: ' + r.rombel.length + ')');
