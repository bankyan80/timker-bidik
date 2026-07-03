import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // Normalize status_pegawai casing
  const rules = [
    { from: 'honorer', to: 'Honorer' },
    { from: 'pns', to: 'PNS' },
    { from: 'gty', to: 'GTY' },
  ];

  for (const rule of rules) {
    const r = await tgt.execute({
      sql: "UPDATE employees SET status_pegawai = ? WHERE LOWER(status_pegawai) = ? AND status_pegawai != ?",
      args: [rule.to, rule.from, rule.to]
    });
    if (r.rowsAffected > 0) console.log('Normalized ' + rule.from + ' -> ' + rule.to + ': ' + r.rowsAffected + ' rows');
  }

  // Fix empty status_pegawai -> Lainnya
  const empty = await tgt.execute("UPDATE employees SET status_pegawai = 'Lainnya' WHERE status_pegawai IS NULL OR status_pegawai = ''");
  if (empty.rowsAffected > 0) console.log('Fixed empty -> Lainnya: ' + empty.rowsAffected + ' rows');

  // Final breakdown
  const r = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");
  console.log('\nFinal Employee Status:');
  for (const row of r.rows) console.log('  ' + (row.status_pegawai || 'NULL').padEnd(15) + ' ' + row.cnt);
  const ec = await tgt.execute('SELECT count(1) as cnt FROM employees');
  console.log('Total: ' + ec.rows[0].cnt);
}

main().catch(console.error);
