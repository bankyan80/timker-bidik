import { createClient } from '@libsql/client';
const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});
const tgtCnt = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB')");
console.log('TK/KB total:', tgtCnt.rows[0].cnt);
const tgtNisn = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB') AND nisn IS NOT NULL AND nisn != ''");
console.log('TK/KB dengan NISN:', tgtNisn.rows[0].cnt);
const total = await tgt.execute('SELECT count(1) as cnt FROM students');
console.log('Total siswa:', total.rows[0].cnt);
