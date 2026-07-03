import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  const dupNiks = await tgt.execute("SELECT nik, group_concat(id) as ids FROM students WHERE school_npsn = '20270605' AND nik IS NOT NULL AND nik != '' GROUP BY nik HAVING count(1) > 1");
  console.log('Found ' + dupNiks.rows.length + ' duplicate NIK groups');

  // For each duplicate pair, keep the one with NISN+rombel (seed), delete the other (migration)
  const toDelete = [];
  const toKeep = [];

  for (const row of dupNiks.rows) {
    const ids = row.ids.split(',');
    const keep = ids.find(id => id.startsWith('cmq0y'));
    ids.forEach(id => {
      if (id !== keep) {
        toDelete.push(id);
      } else {
        toKeep.push(id);
      }
    });
  }

  console.log('IDs to keep (seed, keep NISN+rombel): ' + toKeep.length);
  console.log('IDs to delete (migration duplicates): ' + toDelete.length);

  if (toDelete.length > 0) {
    console.log('\nExecuting delete...');
    for (const id of toDelete) {
      const r = await tgt.execute({ sql: 'DELETE FROM students WHERE id = ?', args: [id] });
      console.log('  Deleted ' + id + ' (rows affected: ' + r.rowsAffected + ')');
    }
  }

  // Verify
  const remaining = await tgt.execute("SELECT count(1) as cnt FROM students WHERE school_npsn = '20270605'");
  console.log('\nRemaining students at 20270605: ' + remaining.rows[0].cnt);

  const total = await tgt.execute('SELECT count(1) as cnt FROM students');
  console.log('Total students in DB: ' + total.rows[0].cnt);
}

main().catch(console.error);
