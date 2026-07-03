import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // Fix empty jenjang
  const empty = await tgt.execute("SELECT id, school_npsn FROM students WHERE jenjang IS NULL OR jenjang = ''");
  console.log('Empty jenjang: ' + empty.rows.length);

  for (const s of empty.rows) {
    const school = await tgt.execute({
      sql: 'SELECT level FROM schools WHERE npsn = ?',
      args: [s.school_npsn]
    });
    if (school.rows.length > 0) {
      await tgt.execute({
        sql: "UPDATE students SET jenjang = ? WHERE id = ?",
        args: [school.rows[0].level, s.id]
      });
    }
  }

  // Fix PAUD -> KB
  const paud = await tgt.execute("UPDATE students SET jenjang = 'KB' WHERE jenjang = 'PAUD'");
  console.log('PAUD -> KB: ' + paud.rowsAffected + ' rows');

  // Final counts
  const r1 = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  for (const r of r1.rows) console.log((r.jenjang || '(empty)') + ': ' + r.cnt);
  const tot = await tgt.execute('SELECT count(1) as cnt FROM students');
  console.log('Total: ' + tot.rows[0].cnt);

  // Employee status breakdown
  const emp = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");
  console.log('\nEmployees by status:');
  for (const r of emp.rows) console.log('  ' + (r.status_pegawai || '-') + ': ' + r.cnt);
  const emp2 = await tgt.execute('SELECT count(1) as cnt FROM employees');
  console.log('Total employees: ' + emp2.rows[0].cnt);
}

main().catch(console.error);
