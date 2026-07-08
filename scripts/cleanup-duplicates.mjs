import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Delete confirmed NISN duplicates
const toDelete = [
  { id: '6ff6ba05-6f86-4de6-b2ea-95b77b0104a4', nisn: '3154894680', reason: 'wrong casing rombel KELAS 4 B' },
  { id: '805ca1b0-9d8a-4993-b93a-e337f0f4eb61', nisn: '3163820507', reason: 'null rombel' },
  { id: 'a75e1064-91f7-4da2-8478-4fe7f51b411a', nisn: '3202587458', reason: 'wrong kelas Kelompok Bermain' },
];

for (const d of toDelete) {
  await turso.execute('DELETE FROM students WHERE id = ?', [d.id]);
  console.log(`Deleted ${d.id} (NISN ${d.nisn}): ${d.reason}`);
}

// Summary
const after = await turso.execute('SELECT COUNT(*) AS c FROM students');
console.log(`\nTotal students after cleanup: ${after.rows[0].c}`);

// Check remaining duplicate names at SDN 1 Asem
const asem = await turso.execute(`
  SELECT nama, nisn, kelas_kelompok, rombel, COUNT(*) AS cnt
  FROM students WHERE school_npsn = '20215216'
  GROUP BY LOWER(nama), nisn
  HAVING cnt > 1
`);
if (asem.rows.length > 0) {
  console.log('\nRemaining duplicates at SDN 1 Asem:');
  for (const r of asem.rows) {
    console.log(`  ${r.nama} | NISN:${r.nisn} | ${r.kelas_kelompok} | rombel:${r.rombel} (${r.cnt}x)`);
  }
} else {
  console.log('\nNo remaining NISN duplicates at SDN 1 Asem');
}

// Check remaining duplicate names across all schools
const dups = await turso.execute(`
  SELECT nama, school_npsn, nisn, COUNT(*) AS cnt
  FROM students
  WHERE nisn IS NOT NULL AND nisn != '' AND nisn != '-'
  GROUP BY nisn
  HAVING cnt > 1
`);
if (dups.rows.length > 0) {
  console.log('\nRemaining NISN duplicates:');
  for (const r of dups.rows) {
    console.log(`  ${r.nama} | NISN:${r.nisn} | school:${r.school_npsn} (${r.cnt}x)`);
  }
} else {
  console.log('\nNo remaining NISN duplicates across all schools.');
}

turso.close();
