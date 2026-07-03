import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const short = await DB.execute("SELECT count(1) as cnt, count(nisn) as nisnCnt FROM students WHERE jenjang='SD' AND (rombel GLOB '[0-9]' OR rombel GLOB '[0-9][A-Z]')");
console.log('Short-form: ' + short.rows[0].cnt + ' total, ' + short.rows[0].nisnCnt + ' with NISN');

const roman = await DB.execute("SELECT count(1) as cnt, count(nisn) as nisnCnt FROM students WHERE jenjang='SD' AND (rombel = 'Kelas I' OR rombel = 'Kelas II' OR rombel = 'Kelas III' OR rombel = 'Kelas IV' OR rombel = 'Kelas V' OR rombel = 'Kelas VI')");
console.log('Roman: ' + roman.rows[0].cnt + ' total, ' + roman.rows[0].nisnCnt + ' with NISN');
