import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // Check if schools exist
  const schools = await tgt.execute("SELECT npsn, name FROM schools WHERE npsn IN ('69986420','69986421')");
  console.log('Schools found:');
  for (const s of schools.rows) console.log('  ' + s.npsn + ' ' + s.name);

  // Check students
  const siswa = await tgt.execute("SELECT count(1) as cnt FROM students WHERE school_npsn IN ('69986420','69986421')");
  console.log('Siswa terkait: ' + siswa.rows[0].cnt);

  // Check employees
  const pegawai = await tgt.execute("SELECT count(1) as cnt FROM employees WHERE sekolah_id IN ('69986420','69986421')");
  console.log('Pegawai terkait: ' + pegawai.rows[0].cnt);

  // Delete from schools
  const del = await tgt.execute("DELETE FROM schools WHERE npsn IN ('69986420','69986421')");
  console.log('Deleted from schools: ' + del.rowsAffected + ' rows');

  // Verify
  const verify = await tgt.execute("SELECT npsn, name FROM schools ORDER BY level, name");
  console.log('\nTotal sekolah setelah hapus: ' + verify.rows.length);
  for (const s of verify.rows) {
    if (s.npsn === '69986420' || s.npsn === '69986421') console.log('  *** MASIH ADA: ' + s.npsn + ' ' + s.name);
  }
}

main().catch(console.error);
