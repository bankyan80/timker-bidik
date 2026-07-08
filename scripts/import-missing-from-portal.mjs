import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));

// SD school NPSNs
const sdNpsnSet = new Set();
const schools = await turso.execute("SELECT npsn, level FROM schools WHERE level = 'SD'");
for (const s of schools.rows) sdNpsnSet.add(String(s.npsn).trim());

// DB NISN per NPSN
const dbNisnByNpsn = {};
for (const npsn of sdNpsnSet) {
  const r = await turso.execute("SELECT nisn FROM students WHERE school_npsn = ? AND nisn IS NOT NULL AND nisn != ''", [npsn]);
  dbNisnByNpsn[npsn] = new Set();
  for (const row of r.rows) if (row.nisn) dbNisnByNpsn[npsn].add(String(row.nisn).trim());
}

// Find missing
const toImport = [];
for (const s of raw) {
  const npsn = s.npsn ? String(s.npsn).trim() : '';
  if (!npsn || !sdNpsnSet.has(npsn)) continue;
  const nisn = s.nisn ? String(s.nisn).trim() : '';
  if (!nisn) continue;
  if (!dbNisnByNpsn[npsn].has(nisn)) toImport.push(s);
}

console.log(`Import ${toImport.length} siswa...`);

const currentYear = '2025/2026';
const kelasMap = { '1': 'Kelas 1', '2': 'Kelas 2', '3': 'Kelas 3', '4': 'Kelas 4', '5': 'Kelas 5', '6': 'Kelas 6' };

let ok = 0, err = 0;
for (const s of toImport) {
  try {
    const nisn = String(s.nisn).trim();
    const npsn = String(s.npsn).trim();
    const kelas = s.kelas ? String(s.kelas).trim() : '';
    const kelasKelompok = kelasMap[kelas] || ('Kelas ' + kelas);
    
    await turso.execute(
      `INSERT OR IGNORE INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel, status_siswa, tahun_pelajaran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SD', ?, ?, 'aktif', ?)`,
      [
        `${npsn}_${nisn}`,
        npsn,
        s.nama || '',
        nisn,
        s.nik || '',
        s.jk || '',
        s.tempat_lahir || '',
        s.tanggal_lahir || '',
        kelasKelompok,
        s.rombel || kelasKelompok,
        currentYear
      ]
    );
    ok++;
  } catch (e) {
    err++;
    if (err <= 3) console.error(`  Error: ${s.nama}`, e.message);
  }
}

const final = await turso.execute("SELECT COUNT(*) FROM students WHERE school_npsn IN (SELECT npsn FROM schools WHERE level='SD')");
console.log(`\nOK: ${ok}, Error: ${err}`);
console.log(`Total SD: ${final.rows[0]['COUNT(*)']}`);

turso.close();
