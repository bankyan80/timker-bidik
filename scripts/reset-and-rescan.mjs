/**
 * RESET AND RESCAN from portal-dinas xlsx files
 *
 * Step 1: Delete all student + employee data from Turso
 * Step 2: Parse all student xlsx files from data-siswa/
 * Step 3: Parse all employee xlsx files from data-pegawai/
 * Step 4: Import clean data into Turso
 */

import { createClient } from '@libsql/client';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import XLSX from 'xlsx';

// ── Turso DB ──
const TARGET_URL = 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io';
const TARGET_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw';

const tgt = createClient({ url: TARGET_URL, authToken: TARGET_TOKEN });

// ── Paths ──
const SISWA_DIR = 'C:/Users/Bank Yan/portal-dinas/data-siswa';
const PEGAWAI_DIR = 'C:/Users/Bank Yan/portal-dinas/data-pegawai';

// ── NPSN Map: school name (uppercase normalized) → NPSN ──
const SCHOOL_NPSN_MAP = {
  // SD NEGERI
  'SD NEGERI 1 ASEM': '20215216',
  'SD NEGERI 1 BELAWA': '20215230',
  'SD NEGERI 2 BELAWA': '20215564',
  'SD NEGERI 1 CIPEUJEUH KULON': '20215287',
  'SD NEGERI 2 CIPEUJEUH KULON': '20215381',
  'SD NEGERI 1 CIPEUJEUH WETAN': '20215286',
  'SD NEGERI 2 CIPEUJEUH WETAN': '20215380',
  'SD NEGERI 3 CIPEUJEUH WETAN': '20214479',
  'SD NEGERI 1 LEMAHABANG': '20215162',
  'SD NEGERI 2 LEMAHABANG': '20214656',
  'SD NEGERI 1 LEMAHABANG KULON': '20215161',
  'SD NEGERI 1 LEUWIDINGDING': '20215164',
  'SD NEGERI 1 PICUNGPUGUR': '20246442',
  'SD NEGERI 1 SARAJAYA': '20215517',
  'SD NEGERI 2 SARAJAYA': '20214726',
  'SD NEGERI 1 SIGONG': '20215506',
  'SD NEGERI 3 SIGONG': '20214570',
  'SD NEGERI 4 SIGONG': '20244513',
  'SD NEGERI 1 SINDANGLAUT': '20215464',
  'SD NEGERI 1 TUK KARANGSUWUNG': '20246445',
  'SD NEGERI 1 WANGKELANG': '20215584',
  'SD IT AL IRSYAD AL ISLAMIYYAH': '20215221',
  // TK
  'TK NEGERI LEMAHABANG': '20270605',
  'TK AISYIYAH LEMAHABANG': '20254372',
  'TK AL-AQSO': '20254376',
  'TK AL-IRSYAD AL-ISLAMIYYAH': '20254373',
  'TK BPP KENANGA': '20254374',
  'TK GELATIK': '20254370',
  'TK MELATI': '20254378',
  'TK MUSLIMAT NU': '20254375',
  // KB/PAUD
  'KB A.H. PLUS': '70039880',
  'KB AMALIA SALSABILA': '69804039',
  'KB AZ-ZAHRA': '69804068',
  'KB MUTIARA': '70044538',
  'KB PALAPA': '69870486',
  'KB PERMATA BUNDA': '70024652',
  'PAUD AL HAMBRA': '69947715',
  'PAUD AL-HIDAYAH': '69870488',
  'PAUD AL-HUSNA': '69870479',
  'PAUD AMANAH': '69870482',
  'PAUD AN NAIM': '69870484',
  'PAUD ASY-SYAFIIYAH': '69870485',
  'PAUD BUDGENVIL': '69870489',
  'PAUD TUNAS HARAPAN': '69870490',
  'PAUD SPS MELATI': '69804044',
};

// Additional school name variants for matching
const SCHOOL_VARIANTS = {
  'SD NEGERI 3 SIGONG': 'SDN 3 SIGONG',
  'PAUD ASY-SYAFIIYAH': 'PAUD ASY SYAFIIYAH',
  'PAUD AL-HIDAYAH': 'PAUD AL- HIDAYAH',
  'PAUD ASY-SYAFIIYAH': 'PAUD ASY - SYAFIIYAH',
};

// Also map variant → canonical name
const VARIANT_TO_CANON = {};
for (const [canon, npsn] of Object.entries(SCHOOL_NPSN_MAP)) {
  VARIANT_TO_CANON[canon.toUpperCase()] = canon;
}
// Add variants
for (const [canon, variant] of Object.entries(SCHOOL_VARIANTS)) {
  VARIANT_TO_CANON[variant.toUpperCase()] = canon;
}

// ── Helpers ──

/** Normalize school name: uppercase, remove "KECAMATAN LEMAHABANG" suffix, normalize spacing */
function normSchoolName(name) {
  if (!name) return '';
  let n = name.toUpperCase().trim();
  n = n.replace(/^DAFTAR (GURU|TENDIK)\s+/, '');
  n = n.replace(/^DATA GURU DAN TENDIK\s+/i, '');
  n = n.replace(/\s*KECAMATAN\s*LEMAHABANG\s*$/i, '');
  n = n.replace(/\s*KEC\.\s*LEMAH\s*ABANG\s*$/i, '');
  n = n.replace(/\s*KEC\.\s*LEMAHABANG\s*$/i, '');
  // Normalize dashes: remove spaces around dashes
  n = n.replace(/\s*-\s*/g, '-');
  n = n.replace(/\s+/g, ' ');
  return n.trim();
}

/** Lookup NPSN from school name */
function lookupNpsn(name) {
  if (!name) return null;
  const n = normSchoolName(name);
  
  // Direct match
  const canon = VARIANT_TO_CANON[n];
  if (canon) return SCHOOL_NPSN_MAP[canon];
  
  // Try prefix match (e.g. "SD NEGERI 1 ASEM KECAMATAN LEMAHABANG")
  for (const [canonName, npsn] of Object.entries(SCHOOL_NPSN_MAP)) {
    if (n.includes(canonName.toUpperCase()) || canonName.toUpperCase().includes(n)) {
      return npsn;
    }
  }
  
  return null;
}

/** Get jenjang from NPSN */
function getJenjang(npsn) {
  if (!npsn) return 'SD';
  if (npsn.startsWith('202')) return 'SD'; // SD NEGERI & SWASTA
  if (npsn.startsWith('7')) return 'TK'; // TK NPSN starts with 7
  // KB/PAUD starts with 6
  return 'KB';
}

/** Normalize gender */
function normGender(v) {
  if (!v) return null;
  const g = v.trim().toLowerCase();
  if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'Laki-laki';
  if (g === 'p' || g === 'perempuan') return 'Perempuan';
  return null;
}

/** Parse date to YYYY-MM-DD */
function parseDate(val) {
  if (!val) return '';
  const v = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  if (typeof val === 'number' && val > 40000) {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return v;
}

/** Extract school name from xlsx rows */
function extractSchoolName(rows) {
  if (!rows || rows.length < 2) return null;
  
  // Standard format: row 0 = "Daftar ..." header, row 1 = school name
  if (rows[0] && rows[0][0] && String(rows[0][0]).match(/^Daftar\s+(Peserta\s+Didik|Guru|Tenaga\s+Kependidikan|Tendik)/i)) {
    return rows[1] && rows[1][0] ? String(rows[1][0]).trim() : null;
  }
  
  // Alternative format: row 0 = header directly (no school name row)
  // Try to infer school name from filename or return null
  return null;
}

// ========================================================================
// STEP 1: RESET DATA
// ========================================================================
async function resetData() {
  console.log('\n=== STEP 1: RESETTING DATA ===');
  
  const tables = [
    'students',
    'employees',
    'student_parents',
    'student_addresses',
    'student_health',
    'employee_documents',
    'employee_periods',
  ];
  
  for (const table of tables) {
    try {
      const result = await tgt.execute(`DELETE FROM ${table}`);
      console.log(`  ${table}: DELETED (${result.rowsAffected} rows)`);
    } catch (e) {
      // Table may not exist
      const r = await tgt.execute(`SELECT count(1) as cnt FROM ${table}`);
      console.log(`  ${table}: ${r.rows[0].cnt} rows (delete failed: ${e.message})`);
    }
  }
  
  console.log('  Done resetting data.\n');
}

// ========================================================================
// STEP 2: SCAN STUDENTS from xlsx
// ========================================================================
async function scanStudents() {
  console.log('\n=== STEP 2: SCANNING STUDENTS ===');
  
  const files = readdirSync(SISWA_DIR).filter(f => f.endsWith('.xlsx'));
  console.log(`  Found ${files.length} student xlsx files`);
  
  let totalStudents = 0;
  let unmappedSchools = {};
  let allStudents = [];
  
  for (const file of files) {
    const filePath = join(SISWA_DIR, file);
    try {
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (rows.length < 6) {
        console.log(`  ${file}: too few rows (${rows.length}), skipping`);
        continue;
      }
      
      let schoolName = extractSchoolName(rows);
      
      // If school name not found in xlsx, try to extract from filename
      if (!schoolName) {
        // Extract school name from filename like "daftar_pd-KB AMALIA SALSABILA-2026-04-25..."
        const fnMatch = file.match(/daftar_pd-(.+?)-\d{4}/);
        if (fnMatch) {
          schoolName = fnMatch[1].trim();
        }
      }
      
      const npsn = lookupNpsn(schoolName);
      
      if (!npsn) {
        unmappedSchools[schoolName || file] = (unmappedSchools[schoolName || file] || 0) + 1;
        console.log(`  ${file}: UNMAPPED school "${schoolName}"`);
        continue;
      }
      
      // Determine data start row based on format
      let dataStart = 6; // Default: standard format with "Daftar Peserta Didik" header
      
      // Check if this is alternative format (no "Daftar" header, header at row 0)
      if (rows[0] && rows[0][0] && String(rows[0][0]) === 'No') {
        dataStart = 2; // Header at row 0, sub-header at row 1, data at row 2
      }
      
      let schoolStudents = 0;
      
      for (let i = dataStart; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const no = parseInt(row[0]);
        if (isNaN(no)) continue;
        
        const nama = row[1] ? String(row[1]).trim().toUpperCase() : '';
        const jk = row[3] ? String(row[3]).trim() : '';
        const nisn = row[4] ? String(row[4]).trim() : '';
        const tempat_lahir = row[5] ? String(row[5]).trim() : '';
        const tanggal_lahir = parseDate(row[6]);
        const nik = row[7] ? String(row[7]).trim() : '';
        const rombel = row[43] ? String(row[43]).trim() : '';
        
        if (!nama) continue;
        
        // Determine jenjang from NPSN
        let jenjang = '';
        if (npsn.startsWith('202')) jenjang = 'SD';
        else if (npsn.startsWith('7')) jenjang = 'TK';
        else jenjang = 'KB';
        
        // Determine kelas_kelompok and rombel properly
        let kelas_kelompok = '';
        let rombelFinal = '';
        
        if (jenjang === 'SD') {
          // Parse rombel like "Kelas 1", "Kelas 2", etc.
          const kelasMatch = rombel.match(/Kelas\s*(\d+)/i);
          if (kelasMatch) {
            const kls = kelasMatch[1];
            kelas_kelompok = 'Kelas ' + kls;
            rombelFinal = rombel;
          } else {
            kelas_kelompok = rombel || '-';
            rombelFinal = rombel || '-';
          }
        } else {
          // TK/KB — use rombel as-is
          kelas_kelompok = rombel || '-';
          rombelFinal = rombel || '-';
        }
        
        allStudents.push({
          nama,
          nisn,
          nik,
          jenis_kelamin: normGender(jk),
          tempat_lahir,
          tanggal_lahir,
          jenjang,
          kelas_kelompok,
          rombel: rombelFinal,
          school_npsn: npsn,
        });
        schoolStudents++;
      }
      
      totalStudents += schoolStudents;
      console.log(`  ${file}: ${schoolStudents} students (${schoolName || '?'})`);
    } catch (e) {
      console.error(`  ERROR ${file}: ${e.message}`);
    }
  }
  
  console.log(`\n  Total students scanned: ${totalStudents}`);
  
  const unmappedKeys = Object.keys(unmappedSchools);
  if (unmappedKeys.length > 0) {
    console.log(`  WARNING: ${unmappedKeys.length} unmapped school(s):`);
    for (const k of unmappedKeys) {
      console.log(`    "${k}"`);
    }
  }
  
  return allStudents;
}

// ========================================================================
// STEP 3: SCAN EMPLOYEES from xlsx  
// ========================================================================
async function scanEmployees() {
  console.log('\n=== STEP 3: SCANNING EMPLOYEES ===');
  
  let allEmployees = [];
  let totalFiles = 0;
  let unmappedSchools = {};
  
  // Process root files AND subdirectories
  const items = readdirSync(PEGAWAI_DIR);
  
  for (const item of items) {
    const itemPath = join(PEGAWAI_DIR, item);
    
    if (item.endsWith('.xlsx')) {
      // Root-level xlsx file
      totalFiles++;
      const emps = parseEmployeeXlsx(itemPath);
      for (const e of emps) {
        const npsn = lookupNpsn(e.schoolName);
        if (npsn) {
          e.school_npsn = npsn;
          allEmployees.push(e);
        } else {
          unmappedSchools[e.schoolName || item] = (unmappedSchools[e.schoolName || item] || 0) + 1;
        }
      }
    } else if (statSync(itemPath).isDirectory()) {
      // Subdirectory — scan for xlsx files
      const subFiles = readdirSync(itemPath).filter(f => f.endsWith('.xlsx'));
      for (const subFile of subFiles) {
        totalFiles++;
        const subPath = join(itemPath, subFile);
        const emps = parseEmployeeXlsx(subPath);
        for (const e of emps) {
          const npsn = lookupNpsn(e.schoolName);
          if (npsn) {
            e.school_npsn = npsn;
            allEmployees.push(e);
          } else {
            unmappedSchools[e.schoolName || subFile] = (unmappedSchools[e.schoolName || subFile] || 0) + 1;
          }
        }
      }
    }
  }
  
  console.log(`  Processed ${totalFiles} employee xlsx files`);
  console.log(`  Total employees scanned: ${allEmployees.length}`);
  
  const unmappedKeys = Object.keys(unmappedSchools);
  if (unmappedKeys.length > 0) {
    console.log(`  WARNING: ${unmappedKeys.length} unmapped school(s):`);
    for (const k of unmappedKeys) {
      console.log(`    "${k}": ${unmappedSchools[k]} employees`);
    }
  }
  
  // Deduplicate by NIK
  const byNik = new Map();
  for (const e of allEmployees) {
    const key = e.nik || `no-nik-${e.nama}-${e.school_npsn}`;
    if (!byNik.has(key)) {
      byNik.set(key, e);
    }
  }
  
  const deduped = [...byNik.values()];
  console.log(`  After NIK dedup: ${deduped.length} employees`);
  
  return deduped;
}

function parseEmployeeXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  if (rows.length < 5) return [];
  
  const schoolName = extractSchoolName(rows);
  const records = [];
  
  // Data starts at row 5 (0-indexed), header at row 4
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const no = parseInt(row[0]);
    if (isNaN(no)) continue;
    
    const nama = row[1] ? String(row[1]).trim() : '';
    if (!nama) continue;
    
    const nuptk = row[2] ? String(row[2]).trim() : '';
    const jk = row[3] ? String(row[3]).trim() : '';
    const tempat_lahir = row[4] ? String(row[4]).trim() : '';
    const tanggal_lahir = parseDate(row[5]);
    const nip = row[6] ? String(row[6]).trim() : '';
    const status_kepegawaian = row[7] ? String(row[7]).trim() : '';
    const jenis_ptk = row[8] ? String(row[8]).trim() : '';
    const tugas_tambahan = row[20] ? String(row[20]).trim() : '';
    
    // NIK is at column 44 (0-indexed)
    const nik = row[44] ? String(row[44]).trim() : '';
    
    if (!nik) {
      // Skip employees without NIK
      continue;
    }
    
    // Determine role: if file name contains "tendik" then tendik, otherwise guru
    const fileName = filePath.split('/').pop().split('\\').pop().toLowerCase();
    const role = fileName.includes('tendik') ? 'tendik' : 'guru';
    
    records.push({
      nik,
      nama: nama.toUpperCase(),
      nip,
      nuptk,
      jenis_kelamin: normGender(jk),
      tempat_lahir,
      tanggal_lahir,
      jabatan: jenis_ptk,
      status_pegawai: status_kepegawaian,
      tugas_tambahan,
      role,
      schoolName,
      school_npsn: null, // will be filled by caller
    });
  }
  
  return records;
}

// ========================================================================
// STEP 4: IMPORT TO TURSO
// ========================================================================
async function importStudents(students) {
  console.log('\n=== STEP 4: IMPORTING STUDENTS ===');
  
  const TAHUN_PELAJARAN = '2025/2026';
  const NOW = Date.now();
  
  let inserted = 0;
  const BATCH = 100;
  
  for (let i = 0; i < students.length; i += BATCH) {
    const batch = students.slice(i, i + BATCH);
    const tasks = batch.map(async (s) => {
      const id = randomUUID();
      try {
        await tgt.execute({
          sql: `INSERT INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin,
                tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel,
                status_siswa, tahun_pelajaran)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,'aktif',?)`,
          args: [id, s.school_npsn, s.nama, s.nisn || null, s.nik || null,
                 s.jenis_kelamin, s.tempat_lahir || null, s.tanggal_lahir || null,
                 s.jenjang, s.kelas_kelompok, s.rombel, TAHUN_PELAJARAN]
        });
        return true;
      } catch (e) {
        console.error(`    ERROR inserting student ${s.nama}: ${e.message}`);
        return false;
      }
    });
    const results = await Promise.all(tasks);
    inserted += results.filter(Boolean).length;
    
    if ((i + BATCH) % 1000 === 0 || (i + BATCH) >= students.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, students.length)}/${students.length} (${inserted} inserted)`);
    }
  }
  
  const count = await tgt.execute('SELECT count(1) as cnt FROM students');
  console.log(`  Students in DB: ${count.rows[0].cnt}`);
  
  // Summary per jenjang
  const perJenjang = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');
  console.log('  Per jenjang:');
  for (const r of perJenjang.rows) console.log(`    ${r.jenjang}: ${r.cnt}`);
}

async function importEmployees(employees) {
  console.log('\n=== STEP 5: IMPORTING EMPLOYEES ===');
  
  const NOW = Date.now();
  
  let inserted = 0;
  let skipped = 0;
  const BATCH = 50;
  
  for (let i = 0; i < employees.length; i += BATCH) {
    const batch = employees.slice(i, i + BATCH);
    const tasks = batch.map(async (e) => {
      if (!e.nik) { skipped++; return false; }
      
      const id = randomUUID();
      try {
        await tgt.execute({
          sql: `INSERT INTO employees (id, sekolah_id, nama, nik, nip, nuptk, jenis_kelamin,
                tempat_lahir, tanggal_lahir, jabatan, status_pegawai,
                is_active, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
          args: [id, e.school_npsn, e.nama, e.nik, e.nip || null, e.nuptk || null,
                 e.jenis_kelamin, e.tempat_lahir || null, e.tanggal_lahir || null,
                 e.jabatan || null, e.status_pegawai || null,
                 NOW, NOW]
        });
        return true;
      } catch (err) {
        // NIK might conflict (UNIQUE constraint)
        if (err.message && err.message.includes('UNIQUE')) {
          // Update existing
          try {
            await tgt.execute({
              sql: `UPDATE employees SET sekolah_id=?, nama=?, nip=?, nuptk=?, jenis_kelamin=?,
                    tempat_lahir=?, tanggal_lahir=?, jabatan=?, status_pegawai=?, updated_at=?
                    WHERE nik=?`,
              args: [e.school_npsn, e.nama, e.nip || null, e.nuptk || null,
                     e.jenis_kelamin, e.tempat_lahir || null, e.tanggal_lahir || null,
                     e.jabatan || null, e.status_pegawai || null, NOW, e.nik]
            });
            return true;
          } catch {
            return false;
          }
        }
        console.error(`    ERROR inserting employee ${e.nama}: ${err.message}`);
        return false;
      }
    });
    const results = await Promise.all(tasks);
    inserted += results.filter(Boolean).length;
    
    if ((i + BATCH) % 500 === 0 || (i + BATCH) >= employees.length) {
      console.log(`  Progress: ${Math.min(i + BATCH, employees.length)}/${employees.length} (${inserted} inserted)`);
    }
  }
  
  const count = await tgt.execute('SELECT count(1) as cnt FROM employees');
  console.log(`  Employees in DB: ${count.rows[0].cnt}`);
  
  // Summary per status
  const perStatus = await tgt.execute('SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai');
  console.log('  Per status:');
  for (const r of perStatus.rows) console.log(`    ${r.status_pegawai || '(empty)'}: ${r.cnt}`);
}

// ========================================================================
// MAIN
// ========================================================================
async function main() {
  console.log('========================================');
  console.log('  RESET & RESCAN PORTAL-DINAS DATA');
  console.log('========================================\n');
  
  // Step 1: Reset
  await resetData();
  
  // Step 2: Scan students
  const students = await scanStudents();
  
  // Step 3: Scan employees
  const employees = await scanEmployees();
  
  // Step 4: Import students
  await importStudents(students);
  
  // Step 5: Import employees
  await importEmployees(employees);
  
  // Final summary
  console.log('\n=== FINAL SUMMARY ===');
  const sc = await tgt.execute('SELECT count(1) as cnt FROM schools');
  const stc = await tgt.execute('SELECT count(1) as cnt FROM students');
  const ec = await tgt.execute('SELECT count(1) as cnt FROM employees');
  const pj = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');
  
  console.log(`  Schools: ${sc.rows[0].cnt}`);
  console.log(`  Students: ${stc.rows[0].cnt}`);
  console.log('    by level:');
  for (const r of pj.rows) console.log(`      ${r.jenjang}: ${r.cnt}`);
  console.log(`  Employees: ${ec.rows[0].cnt}`);
  
  console.log('\n========================================');
  console.log('  DONE');
  console.log('========================================');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });