import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const tursoPegawai = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/pegawai.json', 'utf-8'));

const nipMap = new Map();
let skipped = 0;
for (const p of tursoPegawai) {
  const nik = (p.nik || '').trim();
  if (nik.endsWith('0001') || nik.endsWith('0002') || nik.endsWith('0003') || nik.endsWith('0004')) { skipped++; continue; }
  if (!p.nip || p.nip === '') continue;
  let status = p.status_pegawai || '';
  if (status.toLowerCase().includes('paruh waktu')) status = 'PPPK PW';
  else if (status.toLowerCase() === 'pppk') status = 'PPPK';
  else if (status.toLowerCase() === 'pns') status = 'PNS';
  else if (status.toLowerCase().includes('honor')) status = 'Honorer';
  nipMap.set(p.nip.trim(), status);
}
console.log(`tursodb NIP-map: ${nipMap.size} entries (skipped ${skipped} seed)`);

const masih = await tgt.execute("SELECT id, nik, nip, nama FROM employees WHERE status_pegawai = 'Lainnya' AND is_active = 1");
console.log(`Still Lainnya: ${masih.rows.length}`);

let matched = 0;
for (const e of masih.rows) {
  const nip = (e.nip || '').trim();
  if (nip && nipMap.has(nip)) {
    const status = nipMap.get(nip);
    await tgt.execute({
      sql: 'UPDATE employees SET status_pegawai = ?, updated_at = ? WHERE id = ?',
      args: [status, Date.now(), e.id]
    });
    console.log(`  FIX by NIP: ${e.nama} (NIP=${nip}) -> ${status}`);
    matched++;
  }
}
console.log(`\nMatched by NIP: ${matched}`);

// Final check
const r = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");
console.log('\n=== Final breakdown ===');
for (const row of r.rows) console.log(`  ${(row.status_pegawai || 'NULL').padEnd(20)} ${row.cnt}`);
