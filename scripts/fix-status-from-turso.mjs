import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const tursoPegawai = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/pegawai.json', 'utf-8'));

// Build NIK→status map from tursodb (skip seed data with fake NIKs)
const nikMap = new Map();
let skippedSeed = 0;
for (const p of tursoPegawai) {
  const nik = (p.nik || '').trim();
  if (!nik) continue;
  // Skip obvious seed data (fake NIKs like 3209123456780001)
  if (nik.endsWith('0001') || nik.endsWith('0002') || nik.endsWith('0003') || nik.endsWith('0004')) {
    skippedSeed++;
    continue;
  }
  // Map "PPPK Paruh Waktu" → "PPPK PW" to match timker-bidik convention
  let status = p.status_pegawai || '';
  if (status.toLowerCase().includes('paruh waktu')) status = 'PPPK PW';
  else if (status.toLowerCase() === 'pppk') status = 'PPPK';
  else if (status.toLowerCase() === 'pns') status = 'PNS';
  else if (status.toLowerCase().includes('honor daerah')) status = 'Honorer';
  else if (status.toLowerCase().includes('tenaga honor')) status = 'Honorer';
  else if (status.toLowerCase().includes('guru honor')) status = 'Honorer';
  nikMap.set(nik, status);
}
console.log(`tursodb pegawai: ${tursoPegawai.length} total, ${tursoPegawai.length - skippedSeed} mapped by NIK (skipped ${skippedSeed} seed records)`);

// Query timker-bidik employees
const timkerEmps = await tgt.execute('SELECT id, nik, nama, status_pegawai, sekolah_id FROM employees WHERE is_active = 1');
const total = timkerEmps.rows.length;
console.log(`timker-bidik employees: ${total}`);

// Cross-reference
let matched = 0;
let updated = 0;
let masihLainnya = 0;
let pnsFixed = 0;

for (const row of timkerEmps.rows) {
  const nik = (row.nik || '').trim();
  const currentStatus = (row.status_pegawai || '').trim();
  const expectedStatus = nikMap.get(nik);
  
  if (expectedStatus) {
    matched++;
    // Only fix if current is empty, NULL, or 'Lainnya' — don't overwrite existing meaningful status
    if (!currentStatus || currentStatus === 'Lainnya') {
      if (currentStatus !== expectedStatus) {
        await tgt.execute({
          sql: 'UPDATE employees SET status_pegawai = ?, updated_at = ? WHERE id = ?',
          args: [expectedStatus, Date.now(), row.id]
        });
        console.log(`  FIX: ${row.nama} (${nik}): ${currentStatus || '(empty)'} → ${expectedStatus}`);
        updated++;
        if (expectedStatus === 'PNS') pnsFixed++;
      } else {
        masihLainnya++;
      }
    }
  }
}

// Summary
console.log(`\n=== Summary ===`);
console.log(`Matched by NIK: ${matched}/${total}`);
console.log(`Updated: ${updated}`);
console.log(`  - Fixed to PNS: ${pnsFixed}`);
console.log(`Still 'Lainnya' (confirmed correct): ${masihLainnya}`);

// Final breakdown
const r = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");
console.log(`\n=== Final Employee Status ===`);
for (const row of r.rows) console.log(`  ${(row.status_pegawai || 'NULL').padEnd(20)} ${row.cnt}`);
