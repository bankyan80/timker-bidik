/**
 * Reset students & employees tables and re-import from portal-dinas
 * 
 * Reads:
 *   - portal-dinas/src/data/data-siswa.json  (7010 students, mapped by school name → NPSN)
 *   - portal-dinas/temp/employees.json        (421 employees, with schoolId)
 *   - portal-dinas/temp/mappings.json         (school name → NPSN lookup)
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const TARGET_URL = 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io';
const TARGET_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw';

const db = createClient({ url: TARGET_URL, authToken: TARGET_TOKEN });

const TAHUN_PELAJARAN = '2025/2026';
const NOW = Date.now();

function normGender(v) {
  if (!v) return null;
  const g = v.trim().toLowerCase();
  if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'L';
  if (g === 'p' || g === 'perempuan') return 'P';
  return v;
}

// Build school name → NPSN lookup map from mappings.json
function buildSchoolMap() {
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/mappings.json', 'utf-8'));
  const map = new Map();
  for (const m of raw) {
    const name = m.namaSekolah || '';
    const npsn = m.npsn || m.schoolId || '';
    if (name && npsn) {
      // Exact key
      map.set(normalize(name), npsn);
    }
  }
  return map;
}

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/kecamatanlemahabang/g, '');
}

function findNpsn(schoolMap, schoolName) {
  if (!schoolName) return '';
  const key = normalize(schoolName);
  if (schoolMap.has(key)) return schoolMap.get(key);
  // Try partial match
  for (const [k, v] of schoolMap) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return '';
}

async function main() {
  console.log('=== RESET & REIMPORT ===\n');

  // 1. Clear tables
  console.log('Clearing students and employees...');
  await db.execute('DELETE FROM student_parents');
  await db.execute('DELETE FROM student_addresses');
  await db.execute('DELETE FROM student_health');
  await db.execute('DELETE FROM students');
  await db.execute('DELETE FROM employee_periods');
  await db.execute('DELETE FROM employee_documents');
  await db.execute('DELETE FROM employees');
  console.log('  Done.\n');

  // 2. Build school name → NPSN map
  const schoolMap = buildSchoolMap();
  console.log('School map entries: ' + schoolMap.size + '\n');

  // 3. Import students
  console.log('=== IMPORT STUDENTS ===');
  const siswaData = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/src/data/data-siswa.json', 'utf-8'));
  console.log('Total student records: ' + siswaData.length);

  let inserted = 0, skipped = 0, noNpsn = 0;

  // Map school names in data-siswa.json to our NPSN-based school names
  // The data-siswa.json uses names like "NEGERI 1 ASEM KECAMATAN LEMAHABANG"
  // but our DB uses "SD NEGERI 1 ASEM"
  const sdBareToFull = {
    'NEGERI 1 ASEM': 'SD NEGERI 1 ASEM',
    'NEGERI 1 BELAWA': 'SD NEGERI 1 BELAWA',
    'NEGERI 1 CIPEUJEUH KULON': 'SD NEGERI 1 CIPEUJEUH KULON',
    'NEGERI 1 CIPEUJEUH WETAN': 'SD NEGERI 1 CIPEUJEUH WETAN',
    'NEGERI 1 LEMAHABANG': 'SD NEGERI 1 LEMAHABANG',
    'NEGERI 1 LEMAHABANG KULON': 'SD NEGERI 1 LEMAHABANG KULON',
    'NEGERI 1 LEUWIDINGDING': 'SD NEGERI 1 LEUWIDINGDING',
    'NEGERI 1 PICUNGPUGUR': 'SD NEGERI 1 PICUNGPUGUR',
    'NEGERI 1 SARAJAYA': 'SD NEGERI 1 SARAJAYA',
    'NEGERI 1 SIGONG': 'SD NEGERI 1 SIGONG',
    'NEGERI 1 SINDANGLAUT': 'SD NEGERI 1 SINDANGLAUT',
    'NEGERI 1 TUK KARANGSUWUNG': 'SD NEGERI 1 TUK KARANGSUWUNG',
    'NEGERI 1 WANGKELANG': 'SD NEGERI 1 WANGKELANG',
    'NEGERI 2 BELAWA': 'SD NEGERI 2 BELAWA',
    'NEGERI 2 CIPEUJEUH KULON': 'SD NEGERI 2 CIPEUJEUH KULON',
    'NEGERI 2 CIPEUJEUH WETAN': 'SD NEGERI 2 CIPEUJEUH WETAN',
    'NEGERI 2 LEMAHABANG': 'SD NEGERI 2 LEMAHABANG',
    'NEGERI 2 SARAJAYA': 'SD NEGERI 2 SARAJAYA',
    'NEGERI 3 CIPEUJEUH WETAN': 'SD NEGERI 3 CIPEUJEUH WETAN',
    'NEGERI 3 SIGONG': 'SD NEGERI 3 SIGONG',
    'NEGERI 4 SIGONG': 'SD NEGERI 4 SIGONG',
    'IT AL IRSYAD AL ISLAMIYYAH': 'SD IT AL IRSYAD AL ISLAMIYYAH',
    'SDN 3 SIGONG': 'SD NEGERI 3 SIGONG',
  };

  // Pre-process all student records into batch statements
  const stmts = [];
  for (const s of siswaData) {
    let schoolName = s.sekolah || '';
    if (sdBareToFull[schoolName]) {
      schoolName = sdBareToFull[schoolName];
    }

    const npsn = findNpsn(schoolMap, schoolName);
    if (!npsn) { noNpsn++; continue; }

    const nama = (s.nama || '').trim().toUpperCase();
    if (!nama) { skipped++; continue; }
    const nisn = (s.nisn || '').trim();
    const nik = (s.nik || '').trim() || nisn;
    const jenjang = s.jenjang || '';
    const jk = normGender(s.jk);

    let kelas_kelompok = '';
    let rombel = '';

    if (jenjang === 'SD') {
      kelas_kelompok = 'Kelas 1';
      rombel = '';
    } else {
      rombel = s.rombel || '';
      if (rombel) {
        kelas_kelompok = rombel;
      } else {
        kelas_kelompok = '-';
        rombel = '-';
      }
    }

    const id = `STU-${NOW}-${Math.random().toString(36).slice(2, 8)}`;

    stmts.push({
      sql: `INSERT OR IGNORE INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin,
            tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel,
            status_siswa, tahun_pelajaran)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?)`,
      args: [id, npsn, nama, nisn, nik || null, jk,
             (s.tempat_lahir || '').toUpperCase(), s.tanggal_lahir || '',
             jenjang, kelas_kelompok, rombel, TAHUN_PELAJARAN]
    });
  }

  // Batch insert in chunks of 200
  const BATCH = 200;
  for (let i = 0; i < stmts.length; i += BATCH) {
    const chunk = stmts.slice(i, i + BATCH);
    await db.batch(chunk);
    inserted += chunk.length;
    if ((i + BATCH) % 1000 === 0 || (i + BATCH) >= stmts.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, stmts.length)}/${stmts.length} students`);
    }
  }

  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, No NPSN: ${noNpsn}`);
  const stCount = await db.execute('SELECT count(1) as cnt FROM students');
  console.log('Students in DB: ' + stCount.rows[0].cnt);

  const perJenjang = await db.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');
  for (const r of perJenjang.rows) console.log('  ' + r.jenjang + ': ' + r.cnt);

  // 4. Import employees
  console.log('\n=== IMPORT EMPLOYEES ===');
  const empData = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/employees.json', 'utf-8'));
  console.log('Total employee records: ' + empData.length);

  let eInserted = 0, eSkipped = 0, eNoNpsn = 0;
  const empStmts = [];

  for (const e of empData) {
    const nik = (e.nik || '').trim();
    if (!nik) { eSkipped++; continue; }

    const npsn = e.schoolId || findNpsn(schoolMap, e.sekolah || '');
    if (!npsn) { eNoNpsn++; eSkipped++; continue; }

    const nama = (e.nama || '').trim().toUpperCase();
    const nip = e.nip || '';
    const nuptk = e.nuptk || '';
    const jk = normGender(e.jk);
    const jabatan = e.jabatan || e.role || '';
    const status_pegawai = e.jenisKepegawaian || e.status_kepegawaian || e.status || '';
    const tanggal_lahir = e.tanggal_lahir || '';
    const sertifikasi = e.sertifikasi || '';

    const id = `PGW_${nik}`;

    empStmts.push({
      sql: `INSERT OR IGNORE INTO employees (id, sekolah_id, nama, nik, nip, nuptk, jenis_kelamin,
            tanggal_lahir, jabatan, status_pegawai, sertifikasi,
            is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [id, npsn, nama, nik, nip || null, nuptk || null, jk,
             tanggal_lahir || null, jabatan, status_pegawai, sertifikasi || null,
             NOW, NOW]
    });
  }

  const EMP_BATCH = 100;
  for (let i = 0; i < empStmts.length; i += EMP_BATCH) {
    const chunk = empStmts.slice(i, i + EMP_BATCH);
    await db.batch(chunk);
    eInserted += chunk.length;
    console.log(`  Progress: ${Math.min(i + EMP_BATCH, empStmts.length)}/${empStmts.length} employees`);
  }

  console.log(`Inserted: ${eInserted}, Skipped: ${eSkipped}, No NPSN: ${eNoNpsn}`);
  const eCount = await db.execute('SELECT count(1) as cnt FROM employees');
  console.log('Employees in DB: ' + eCount.rows[0].cnt);

  console.log('\n=== DONE ===');
}

main().catch(e => { console.error(e); process.exit(1); });
