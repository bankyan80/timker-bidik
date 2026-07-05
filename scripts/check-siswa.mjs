import { createClient } from '@libsql/client';

const c = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const r = await c.execute("SELECT count(1) as cnt FROM students WHERE school_npsn = '20215162'");
console.log('SD NEGERI 1 LEMAHABANG (20215162): ' + r.rows[0].cnt + ' siswa');

const perKelas = await c.execute("SELECT kelas_kelompok, count(1) as cnt FROM students WHERE school_npsn = '20215162' GROUP BY kelas_kelompok ORDER BY kelas_kelompok");
for (const row of perKelas.rows) {
  console.log('  ' + row.kelas_kelompok + ': ' + row.cnt);
}
