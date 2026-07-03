import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// Fix the 1 remaining ? jenjang
console.log('Fix remaining empty jenjang...');
const fixMe = await DB.execute("SELECT school_npsn, rombel FROM students WHERE jenjang IS NULL OR jenjang = '' OR jenjang = '?'");
for (const r of fixMe.rows) {
  // Get the school level
  const school = await DB.execute({ sql: "SELECT level FROM schools WHERE npsn = ?", args: [r.school_npsn] });
  if (school.rows.length > 0) {
    await DB.execute({ sql: "UPDATE students SET jenjang = ? WHERE (jenjang IS NULL OR jenjang = '' OR jenjang = '?') AND school_npsn = ?", args: [school.rows[0].level, r.school_npsn] });
  }
}
console.log('Fixed: ' + fixMe.rows.length + ' students');

const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
console.log('\nAfter fix:');
for (const r of byJenjang.rows) console.log('  "' + (r.jenjang || '?') + '": ' + r.cnt);
