import { createClient } from '@libsql/client';

const c = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  const r = await c.execute(`
    SELECT DISTINCT e.jabatan 
    FROM employees e 
    JOIN schools s ON e.sekolah_id = s.npsn 
    WHERE s.level = 'SD' 
    ORDER BY e.jabatan
  `);
  console.log('Unique jabatan values for SD employees:');
  for (const row of r.rows) {
    console.log('  "' + row.jabatan + '"');
  }
  console.log('\nTotal unique: ' + r.rows.length);
}

main().catch(console.error);