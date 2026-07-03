import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// NIKs of employees wrongly changed from PPPK PW → Honorer by first bad run
const wrongChanges = [
  '3209070902930007', // DIYAN HIDAYAT: was PPPK PW
  '3209071111890006', // AZI PURNAMA: was PPPK PW
  '3209071210730008', // NANA JUNAEDI: was PPPK PW
  '3209071310760006', // SUNANDAR: was PPPK PW
  '3209071509730007', // WACHYUDIN: was PPPK PW
  '3209072708910005', // SAEFUL ALIM: was PPPK PW
  '3209075503830006', // CARWINAH: was PPPK PW
];

const tursoPegawai = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/pegawai.json', 'utf-8'));
const tursoByNik = new Map();
for (const p of tursoPegawai) {
  const nik = (p.nik || '').trim();
  if (nik) tursoByNik.set(nik, p);
}

let reverted = 0;
for (const nik of wrongChanges) {
  // Check current status in timker-bidik
  const r = await tgt.execute({
    sql: 'SELECT id, nama, status_pegawai FROM employees WHERE nik = ? AND is_active = 1',
    args: [nik]
  });
  if (r.rows.length === 0) {
    console.log(`NOT FOUND: ${nik}`);
    continue;
  }
  const emp = r.rows[0];
  const turso = tursoByNik.get(nik);
  const tursoStatus = turso ? turso.status_pegawai : '?';
  
  console.log(`${emp.nama.padEnd(30)} Current: ${emp.status_pegawai.padEnd(12)} Turso: ${tursoStatus}`);
  
  // Revert to PPPK PW
  await tgt.execute({
    sql: 'UPDATE employees SET status_pegawai = ?, updated_at = ? WHERE id = ?',
    args: ['PPPK PW', Date.now(), emp.id]
  });
  reverted++;
}

console.log(`\nReverted ${reverted} employees back to PPPK PW`);
