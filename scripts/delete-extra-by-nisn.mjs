import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// 1. Read portal-dinas data
const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
const mapping = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/mappings.json', 'utf-8'));

const nameToNpsn = {};
for (const m of mapping) {
  const key = m.school_name ? m.school_name.toUpperCase().trim() : '';
  if (key) nameToNpsn[key] = m.npsn;
}

const portalNisnByNpsn = {};
for (const s of raw) {
  const schoolName = (s.sekolah || s.school_name || s.nama_sekolah || '').toUpperCase().trim();
  const npsn = nameToNpsn[schoolName] || s.npsn || s.sekolah_id || '';
  if (!npsn) continue;
  if (!portalNisnByNpsn[npsn]) portalNisnByNpsn[npsn] = new Set();
  if (s.nisn) portalNisnByNpsn[npsn].add(String(s.nisn).trim());
}

const sdSchools = await turso.execute("SELECT npsn, name FROM schools WHERE level = 'SD' ORDER BY name");

let totalExtra = 0;
let totalCocok = 0;
let totalDb = 0;
const allExtra = [];

for (const sch of sdSchools.rows) {
  const npsn = String(sch.npsn).trim();
  const portalSet = portalNisnByNpsn[npsn] || new Set();
  
  const dbStudents = await turso.execute("SELECT id, nama, nisn, kelas_kelompok, rombel FROM students WHERE school_npsn = ? ORDER BY nisn", [npsn]);
  
  for (const s of dbStudents.rows) {
    totalDb++;
    const nisn = s.nisn ? String(s.nisn).trim() : '';
    if (nisn && portalSet.has(nisn)) {
      totalCocok++;
    } else {
      totalExtra++;
      allExtra.push({ school: String(sch.name).trim(), npsn, ...s });
    }
  }
}

console.log(`Total DB SD: ${totalDb}`);
console.log(`Cocok portal-dinas: ${totalCocok}`);
console.log(`Extra (hapus): ${totalExtra}`);

// Confirm
console.log(`\nProses hapus ${totalExtra} siswa...`);

for (const s of allExtra) {
  const nisn = s.nisn ? String(s.nisn).trim() : '';
  if (nisn) {
    await turso.execute("DELETE FROM student_parents WHERE siswa_nisn = ?", [nisn]);
    await turso.execute("DELETE FROM student_addresses WHERE siswa_nisn = ?", [nisn]);
    await turso.execute("DELETE FROM student_health WHERE siswa_nisn = ?", [nisn]);
  }
  await turso.execute("DELETE FROM students WHERE id = ?", [s.id]);
}

const final = await turso.execute("SELECT COUNT(*) AS c FROM students WHERE school_npsn IN (SELECT npsn FROM schools WHERE level = 'SD')");
console.log(`Sisa siswa SD: ${final.rows[0].c}`);

turso.close();
