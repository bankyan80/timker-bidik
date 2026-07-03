import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const src = createClient({
  url: 'libsql://laporan-pendidikan-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIwMzk3MTMsImlkIjoiMDE5ZWU5ZDctZjcwMS03NDYxLWI2YTQtMzIyNTM3YjY0ZGI3IiwicmlkIjoiMGU2NDhiZTAtY2FlNy00NjEwLWEyODMtZDA4YzEzZGQ4MjllIn0.ZPMXTMXMKUO5s9Wv_NGdg0gcKv4PYcbjxOciF9wEVVlDKIodVqA_WhtzSVdZIOTyx_GEIYa_tVGx9TCKK31oAQ'
});

async function main() {
  console.log('=== TIMKER-BIDIK SCHEMA ===');
  let r = await tgt.execute("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name");
  for (const row of r.rows) console.log(row.sql + '\n');

  console.log('\n=== LAPORAN-PENDIDIKAN SCHEMA ===');
  r = await src.execute("SELECT sql FROM sqlite_master WHERE type='table' ORDER BY name");
  for (const row of r.rows) console.log(row.sql + '\n');
}

main().catch(console.error);
