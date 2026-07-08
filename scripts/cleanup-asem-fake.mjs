import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Delete remaining fake students at SDN 1 Asem: NISN prefix >= 32 AND not in portal-dinas
// (portal-dinas max SD prefix is 31; only 3 TK/KB have prefix 32)
const toDelete = await turso.execute(`
  SELECT id, nama, nisn, kelas_kelompok, rombel
  FROM students 
  WHERE school_npsn = '20215216'
    AND nisn IS NOT NULL AND nisn != '' AND nisn != '-'
    AND CAST(SUBSTR(nisn, 1, 2) AS INTEGER) >= 32
  ORDER BY nisn
`);

console.log(`Menghapus ${toDelete.rows.length} siswa dengan NISN prefix >= 32:`);
for (const s of toDelete.rows) {
  console.log(`  ${String(s.nama).padEnd(30)} NISN:${String(s.nisn).padEnd(12)} ${s.kelas_kelompok} ${s.rombel || ''}`);
  const nisn = String(s.nisn).trim();
  await turso.execute("DELETE FROM student_parents WHERE siswa_nisn = ?", [nisn]);
  await turso.execute("DELETE FROM student_addresses WHERE siswa_nisn = ?", [nisn]);
  await turso.execute("DELETE FROM student_health WHERE siswa_nisn = ?", [nisn]);
  await turso.execute("DELETE FROM students WHERE id = ?", [s.id]);
}

const r = await turso.execute("SELECT COUNT(*) AS c FROM students WHERE school_npsn = '20215216'");
console.log(`\nSisa siswa SDN 1 Asem: ${r.rows[0].c}`);

turso.close();
