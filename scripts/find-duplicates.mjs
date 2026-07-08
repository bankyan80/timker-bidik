import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Find true duplicates: same name, same NISN, different id
console.log('=== TRUE DUPLICATES (same name + same NISN + same school) ===');
const exact = await turso.execute(`
  SELECT s1.id, s1.nama, s1.nisn, s1.school_npsn, s1.jenjang, s1.kelas_kelompok, s1.rombel, sc.name AS school_name
  FROM students s1
  JOIN students s2 ON s1.nisn = s2.nisn AND LOWER(s1.nama) = LOWER(s2.nama) AND s1.school_npsn = s2.school_npsn AND s1.id != s2.id
  LEFT JOIN schools sc ON sc.npsn = s1.school_npsn
  WHERE s1.nisn IS NOT NULL AND s1.nisn != ''
  ORDER BY s1.nisn, s1.id
`);
for (const r of exact.rows) {
  console.log(`  ${r.nama} | NISN:${r.nisn} | ${r.school_name}(${r.school_npsn}) | ${r.jenjang} | ${r.kelas_kelompok} | rombel:${r.rombel} | id:${r.id}`);
}

// Find likely duplicates by name only for schools with no NISN (TK/KB)
console.log('\n=== LIKELY DUPLICATES TK/KB (same name, same school, no NISN) ===');
const tkkb = await turso.execute(`
  SELECT s1.id, s1.nama, s1.nisn, s1.school_npsn, s1.jenjang, s1.kelas_kelompok, s1.rombel, sc.name AS school_name
  FROM students s1
  JOIN students s2 ON LOWER(s1.nama) = LOWER(s2.nama) AND s1.id != s2.id AND s1.school_npsn = s2.school_npsn
  LEFT JOIN schools sc ON sc.npsn = s1.school_npsn
  WHERE (s1.nisn IS NULL OR s1.nisn = '' OR s1.nisn = '-')
  ORDER BY s1.school_npsn, s1.nama, s1.kelas_kelompok
`);
let lastKey = '';
for (const r of tkkb.rows) {
  const key = r.school_name + '|' + r.nama;
  if (key !== lastKey) { console.log(`\n  --- ${r.school_name} / ${r.nama} ---`); lastKey = key; }
  console.log(`  ${r.jenjang} | ${r.kelas_kelompok} | rombel:${r.rombel || '-'} | id:${r.id} | NISN:${r.nisn || '-'}`);
}

// SD Negeri 1 Asem detail
console.log('\n=== SD NEGERI 1 ASEM - DUPLICATE NAMES ===');
const asem = await turso.execute(`
  SELECT s1.id, s1.nama, s1.nisn, s1.kelas_kelompok, s1.rombel
  FROM students s1
  JOIN students s2 ON LOWER(s1.nama) = LOWER(s2.nama) AND s1.id != s2.id AND s1.school_npsn = s2.school_npsn AND s1.school_npsn = '20215216'
  ORDER BY s1.nama, s1.kelas_kelompok
`);
for (const r of asem.rows) {
  console.log(`  ${r.nama} | NISN:${r.nisn || '-'} | ${r.kelas_kelompok} | rombel:${r.rombel || '-'} | id:${r.id}`);
}

turso.close();
