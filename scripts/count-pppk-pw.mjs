import { createClient } from '@libsql/client';
const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});
const r = await db.execute("SELECT e.id, e.nama, e.nip, e.sekolah_id, s.name as school_name FROM employees e JOIN schools s ON e.sekolah_id=s.npsn WHERE e.status_pegawai='pppk_paruh_waktu' ORDER BY e.nama");
for (const row of r.rows) {
  console.log(row.nama + ' | NIP: ' + (row.nip||'-') + ' | Sekolah: ' + row.school_name);
}
console.log('\nTotal PPPK Paruh Waktu: ' + r.rows.length);
process.exit(0);
