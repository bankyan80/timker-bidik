import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // Group by status_pegawai
  const r = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");
  console.log('=== Employee Status Breakdown ===');
  for (const row of r.rows) {
    const status = row.status_pegawai || '(NULL)';
    console.log('  ' + status.padEnd(20) + ' ' + row.cnt);
  }

  // Check for inconsistent casing
  const r2 = await tgt.execute("SELECT DISTINCT LOWER(status_pegawai) as lower_status, status_pegawai as actual FROM employees ORDER BY lower_status");
  console.log('\n=== Unique Normalized Values ===');
  for (const row of r2.rows) {
    const ls = row.lower_status || '';
    const act = row.actual || 'NULL';
    console.log('  ' + ls.padEnd(15) + ' -> "' + act + '"');
  }
}

main().catch(console.error);
