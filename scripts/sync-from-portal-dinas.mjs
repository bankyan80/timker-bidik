import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const TARGET_URL = 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io';
const TARGET_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw';

const tgt = createClient({ url: TARGET_URL, authToken: TARGET_TOKEN });

// ── Gender normalization ──
function normGender(v) {
  if (!v) return null;
  const g = v.trim().toLowerCase();
  if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'Laki-laki';
  if (g === 'p' || g === 'perempuan') return 'Perempuan';
  return v;
}

// ── Jahr now ──
const TAHUN_PELAJARAN = '2025/2026';
const NOW = Date.now();

// ========================================================================
// 1. SYNC SCHOOLS
// ========================================================================
async function syncSchools() {
  console.log('\n=== SYNC SCHOOLS ===');
  // Hardcode from portal-dinas sekolah.ts
  const portalSchools = [
    // SD NEGERI
    { npsn: '20215216', name: 'SD NEGERI 1 ASEM', level: 'SD', status: 'NEGERI', village: 'ASEM', accreditation: 'B' },
    { npsn: '20215230', name: 'SD NEGERI 1 BELAWA', level: 'SD', status: 'NEGERI', village: 'BELAWA', accreditation: 'B' },
    { npsn: '20215564', name: 'SD NEGERI 2 BELAWA', level: 'SD', status: 'NEGERI', village: 'BELAWA', accreditation: 'A' },
    { npsn: '20215287', name: 'SD NEGERI 1 CIPEUJEUH KULON', level: 'SD', status: 'NEGERI', village: 'CIPEUJEUH KULON', accreditation: 'B' },
    { npsn: '20215381', name: 'SD NEGERI 2 CIPEUJEUH KULON', level: 'SD', status: 'NEGERI', village: 'CIPEUJEUH KULON', accreditation: 'A' },
    { npsn: '20215286', name: 'SD NEGERI 1 CIPEUJEUH WETAN', level: 'SD', status: 'NEGERI', village: 'CIPEUJEUH WETAN', accreditation: 'A' },
    { npsn: '20215380', name: 'SD NEGERI 2 CIPEUJEUH WETAN', level: 'SD', status: 'NEGERI', village: 'CIPEUJEUH WETAN', accreditation: 'A' },
    { npsn: '20214479', name: 'SD NEGERI 3 CIPEUJEUH WETAN', level: 'SD', status: 'NEGERI', village: 'CIPEUJEUH WETAN', accreditation: 'B' },
    { npsn: '20215162', name: 'SD NEGERI 1 LEMAHABANG', level: 'SD', status: 'NEGERI', village: 'LEMAHABANG', accreditation: 'B' },
    { npsn: '20214656', name: 'SD NEGERI 2 LEMAHABANG', level: 'SD', status: 'NEGERI', village: 'LEMAHABANG', accreditation: 'A' },
    { npsn: '20215161', name: 'SD NEGERI 1 LEMAHABANG KULON', level: 'SD', status: 'NEGERI', village: 'LEMAHABANG KULON', accreditation: 'B' },
    { npsn: '20215164', name: 'SD NEGERI 1 LEUWIDINGDING', level: 'SD', status: 'NEGERI', village: 'LEUWIDINGDING', accreditation: 'A' },
    { npsn: '20246442', name: 'SD NEGERI 1 PICUNGPUGUR', level: 'SD', status: 'NEGERI', village: 'PICUNGPUGUR', accreditation: 'A' },
    { npsn: '20215517', name: 'SD NEGERI 1 SARAJAYA', level: 'SD', status: 'NEGERI', village: 'SARAJAYA', accreditation: 'B' },
    { npsn: '20214726', name: 'SD NEGERI 2 SARAJAYA', level: 'SD', status: 'NEGERI', village: 'SARAJAYA', accreditation: 'B' },
    { npsn: '20215506', name: 'SD NEGERI 1 SIGONG', level: 'SD', status: 'NEGERI', village: 'SIGONG', accreditation: 'A' },
    { npsn: '20214570', name: 'SD NEGERI 3 SIGONG', level: 'SD', status: 'NEGERI', village: 'SIGONG', accreditation: 'B' },
    { npsn: '20244513', name: 'SD NEGERI 4 SIGONG', level: 'SD', status: 'NEGERI', village: 'SIGONG', accreditation: 'B' },
    { npsn: '20215464', name: 'SD NEGERI 1 SINDANGLAUT', level: 'SD', status: 'NEGERI', village: 'SINDANGLAUT', accreditation: 'A' },
    { npsn: '20246445', name: 'SD NEGERI 1 TUK KARANGSUWUNG', level: 'SD', status: 'NEGERI', village: 'TUK KARANGSUWUNG', accreditation: 'A' },
    { npsn: '20215584', name: 'SD NEGERI 1 WANGKELANG', level: 'SD', status: 'NEGERI', village: 'WANGKELANG', accreditation: 'A' },
    { npsn: '20215221', name: 'SD IT AL IRSYAD AL ISLAMIYYAH', level: 'SD', status: 'SWASTA', village: 'LEMAHABANG KULON', accreditation: 'A' },
    // TK
    { npsn: '20270605', name: 'TK NEGERI LEMAHABANG', level: 'TK', status: 'NEGERI', village: 'CIPEUJEUH WETAN', accreditation: 'B' },
    { npsn: '20254372', name: 'TK AISYIYAH LEMAHABANG', level: 'TK', status: 'SWASTA', village: 'LEMAHABANG', accreditation: 'B' },
    { npsn: '20254376', name: 'TK AL-AQSO', level: 'TK', status: 'SWASTA', village: 'TUK KARANGSUWUNG', accreditation: 'A' },
    { npsn: '20254373', name: 'TK AL-IRSYAD AL-ISLAMIYYAH', level: 'TK', status: 'SWASTA', village: 'LEMAHABANG KULON', accreditation: 'B' },
    { npsn: '20254374', name: 'TK BPP KENANGA', level: 'TK', status: 'SWASTA', village: 'ASEM', accreditation: 'B' },
    { npsn: '20254370', name: 'TK GELATIK', level: 'TK', status: 'SWASTA', village: 'CIPEUJEUH WETAN', accreditation: 'B' },
    { npsn: '20254378', name: 'TK MELATI', level: 'TK', status: 'SWASTA', village: 'WANGKELANG', accreditation: 'B' },
    { npsn: '20254375', name: 'TK MUSLIMAT NU', level: 'TK', status: 'SWASTA', village: 'LEMAHABANG', accreditation: 'B' },
    // KB
    { npsn: '70039880', name: 'KB A.H. PLUS', level: 'KB', status: 'SWASTA', village: 'SIGONG', accreditation: '-' },
    { npsn: '69804039', name: 'KB AMALIA SALSABILA', level: 'KB', status: 'SWASTA', village: 'CIPEUJEUH KULON', accreditation: 'B' },
    { npsn: '69804068', name: 'KB AZ-ZAHRA', level: 'KB', status: 'SWASTA', village: 'SIGONG', accreditation: 'B' },
    { npsn: '70044538', name: 'KB MUTIARA', level: 'KB', status: 'SWASTA', village: 'CIPEUJEUH WETAN', accreditation: '-' },
    { npsn: '69870486', name: 'KB PALAPA', level: 'KB', status: 'SWASTA', village: 'LEMAHABANG KULON', accreditation: '-' },
    { npsn: '70024652', name: 'KB PERMATA BUNDA', level: 'KB', status: 'SWASTA', village: 'PICUNGPUGUR', accreditation: 'C' },
    { npsn: '69947715', name: 'PAUD AL HAMBRA', level: 'KB', status: 'SWASTA', village: 'LEMAHABANG', accreditation: 'C' },
    { npsn: '69870488', name: 'PAUD AL-HIDAYAH', level: 'KB', status: 'SWASTA', village: 'SIGONG', accreditation: 'C' },
    { npsn: '69870479', name: 'PAUD AL-HUSNA', level: 'KB', status: 'SWASTA', village: 'ASEM', accreditation: 'B' },
    { npsn: '69870482', name: 'PAUD AMANAH', level: 'KB', status: 'SWASTA', village: 'LEMAHABANG KULON', accreditation: 'B' },
    { npsn: '69870484', name: 'PAUD AN NAIM', level: 'KB', status: 'SWASTA', village: 'SINDANGLAUT', accreditation: 'C' },
    { npsn: '69870485', name: 'PAUD ASY-SYAFIIYAH', level: 'KB', status: 'SWASTA', village: 'LEMAHABANG KULON', accreditation: 'C' },
    { npsn: '69870489', name: 'PAUD BUDGENVIL', level: 'KB', status: 'SWASTA', village: 'BELAWA', accreditation: 'B' },
    { npsn: '69870490', name: 'PAUD TUNAS HARAPAN', level: 'KB', status: 'SWASTA', village: 'WANGKELANG', accreditation: 'C' },
    { npsn: '69804044', name: 'PAUD SPS MELATI', level: 'KB', status: 'SWASTA', village: 'SARAJAYA', accreditation: 'C' },
  ];

  // Update each school in target DB — keep existing mock data fields, just update metadata
  for (const s of portalSchools) {
    const existing = await tgt.execute({ sql: 'SELECT * FROM schools WHERE npsn = ?', args: [s.npsn] });
    if (existing.rows.length > 0) {
      const old = existing.rows[0];
      // Only update metadata fields, keep mock data (students, teachers, facilities, health_score, risk_indicators)
      await tgt.execute({
        sql: `UPDATE schools SET name = ?, level = ?, status = ?, village = ?, accreditation = ? WHERE npsn = ?`,
        args: [s.name, s.level, s.status, s.village, s.accreditation, s.npsn]
      });
    } else {
      // Insert with minimal default data
      await tgt.execute({
        sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng,
              students, teachers, facilities, health_score, risk_indicators)
              VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}', '{}', '{}', 0, '{}')`,
        args: [s.npsn, s.name, s.level, s.status, s.village, s.accreditation]
      });
    }
  }

  const count = await tgt.execute('SELECT count(1) as cnt FROM schools');
  console.log('Schools: ' + count.rows[0].cnt + ' total');
}

// ========================================================================
// 2. SYNC EMPLOYEES
// ========================================================================
async function syncEmployees() {
  console.log('\n=== SYNC EMPLOYEES ===');
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/employees.json', 'utf-8'));
  console.log('Raw employee records from portal-dinas: ' + raw.length);

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 50;

  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH);
    const tasks = batch.map(async (e) => {
      if (!e.nik) { skipped++; return; }

      // Map fields
      const nik = e.nik.trim();
      const nama = (e.nama || '').trim().toUpperCase();
      const sekolah_id = e.schoolId || '';
      const nip = e.nip || '';
      const nuptk = e.nuptk || '';
      const jenis_kelamin = normGender(e.jk || e.jenisKelamin || '');
      const tanggal_lahir = e.tanggal_lahir || e.tanggalLahir || '';
      const tempat_lahir = e.tempat_lahir || e.tempatLahir || '';
      const jabatan = e.jabatan || e.role || '';
      const status_pegawai = e.jenisKepegawaian || e.statusKepegawaian || e.statusPegawai || e.status || '';
      const tmt_kerja = e.tmt || e.tmtKerja || '';
      const sertifikasi = e.sertifikasi || '';
      const pendidikan_terakhir = e.pendidikanTerakhir || '';

      // Check existence
      const existing = await tgt.execute({
        sql: 'SELECT id FROM employees WHERE nik = ?',
        args: [nik]
      });

      if (existing.rows.length > 0) {
        await tgt.execute({
          sql: `UPDATE employees SET nama=?,sekolah_id=?,nip=?,nuptk=?,jenis_kelamin=?,
                tanggal_lahir=?,tempat_lahir=?,jabatan=?,status_pegawai=?,tmt_kerja=?,
                sertifikasi=?,pendidikan_terakhir=?,updated_at=?
                WHERE nik=?`,
          args: [nama, sekolah_id, nip, nuptk, jenis_kelamin, tanggal_lahir, tempat_lahir,
                 jabatan, status_pegawai, tmt_kerja, sertifikasi, pendidikan_terakhir, NOW, nik]
        });
        updated++;
      } else {
        const id = randomUUID();
        await tgt.execute({
          sql: `INSERT INTO employees (id, sekolah_id, nama, nik, nip, nuptk, jenis_kelamin,
                tanggal_lahir, tempat_lahir, jabatan, status_pegawai, sertifikasi,
                tmt_kerja, pendidikan_terakhir, is_active, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
          args: [id, sekolah_id, nama, nik, nip, nuptk, jenis_kelamin,
                 tanggal_lahir, tempat_lahir, jabatan, status_pegawai, sertifikasi,
                 tmt_kerja, pendidikan_terakhir, NOW, NOW]
        });
        inserted++;
      }
    });
    await Promise.all(tasks);
  }

  const count = await tgt.execute('SELECT count(1) as cnt FROM employees');
  console.log('Employees: ' + count.rows[0].cnt + ' total (inserted=' + inserted + ', updated=' + updated + ', skipped=' + skipped + ')');
}

// ========================================================================
// 3. SYNC STUDENTS
// ========================================================================
async function syncStudents() {
  console.log('\n=== SYNC STUDENTS ===');
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
  console.log('Raw student records from portal-dinas: ' + raw.length);

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 100;

  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH);
    const tasks = batch.map(async (s) => {
      const nisn = (s.nisn || '').trim();
      const nik = (s.nik || '').trim();
      const nama = (s.nama || '').trim().toUpperCase();
      const school_npsn = s.npsn || s.schoolId || '';
      const jenjang = (s.jenjang || '').trim().toUpperCase();

      if (!nama || !school_npsn) { skipped++; return; }

      const jenis_kelamin = normGender(s.jk || s.jenisKelamin || '');
      const tempat_lahir = s.tempat_lahir || s.tempatLahir || '';
      const tanggal_lahir = s.tanggal_lahir || s.tanggalLahir || '';

      // Determine kelas_kelompok and rombel
      let kelas_kelompok = '';
      let rombel = '';

      if (jenjang === 'SD') {
        const kls = s.kelas || '';
        kelas_kelompok = 'Kelas ' + kls;
        rombel = s.rombel || '';
        if (!rombel) rombel = kelas_kelompok;
      } else {
        // TK/KB — use rombel or kelompok
        rombel = s.rombel || '';
        const kelompok = s.kelompok || '';
        if (rombel) {
          kelas_kelompok = rombel;
        } else if (kelompok) {
          kelas_kelompok = 'Kelompok ' + kelompok;
          rombel = kelas_kelompok;
        } else {
          kelas_kelompok = '-';
          rombel = '-';
        }
      }

      // Determine student ID: try NISN first, or nik, or generate
      const studentId = nisn || nik || ('sync-' + i + '-' + Math.random().toString(36).slice(2, 6));

      // Try to find existing by NISN, then by NIK, then by (nama + school + rombel)
      let existing = null;
      if (nisn) {
        existing = await tgt.execute({
          sql: 'SELECT id FROM students WHERE nisn = ?',
          args: [nisn]
        });
      }
      if (!existing || existing.rows.length === 0) {
        if (nik) {
          existing = await tgt.execute({
            sql: 'SELECT id FROM students WHERE nik = ?',
            args: [nik]
          });
        }
      }
      if (!existing || existing.rows.length === 0) {
        existing = await tgt.execute({
          sql: "SELECT id FROM students WHERE nama = ? AND school_npsn = ? AND rombel = ? LIMIT 1",
          args: [nama, school_npsn, rombel]
        });
      }

      if (existing && existing.rows.length > 0) {
        const existingId = existing.rows[0].id;
        await tgt.execute({
          sql: `UPDATE students SET nisn=?, nik=?, jenis_kelamin=?, tempat_lahir=?,
                tanggal_lahir=?, jenjang=?, kelas_kelompok=?, rombel=?, status_siswa=?
                WHERE id=?`,
          args: [nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir,
                 jenjang, kelas_kelompok, rombel, 'aktif', existingId]
        });
        updated++;
      } else {
        const id = randomUUID();
        await tgt.execute({
          sql: `INSERT INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin,
                tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel,
                status_siswa, tahun_pelajaran)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [id, school_npsn, nama, nisn, nik, jenis_kelamin,
                 tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel,
                 'aktif', TAHUN_PELAJARAN]
        });
        inserted++;
      }
    });
    await Promise.all(tasks);

    if ((i + BATCH) % 1000 === 0 || (i + BATCH) >= raw.length) {
      console.log('  Progress: ' + Math.min(i + BATCH, raw.length) + '/' + raw.length + ' students');
    }
  }

  const count = await tgt.execute('SELECT count(1) as cnt FROM students');
  console.log('Students: ' + count.rows[0].cnt + ' total (inserted=' + inserted + ', updated=' + updated + ', skipped=' + skipped + ')');

  // Summary per jenjang
  const perJenjang = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');
  console.log('Per jenjang:');
  for (const r of perJenjang.rows) console.log('  ' + r.jenjang + ': ' + r.cnt);
}

// ========================================================================
// MAIN
// ========================================================================
async function main() {
  console.log('Starting full sync from portal-dinas...\n');

  // School sync first
  await syncSchools();

  // Then employees
  await syncEmployees();

  // Then students (largest dataset)
  await syncStudents();

  // Final summary
  console.log('\n=== FINAL SUMMARY ===');
  const sc = await tgt.execute('SELECT count(1) as cnt FROM schools');
  const ec = await tgt.execute('SELECT count(1) as cnt FROM employees');
  const stc = await tgt.execute('SELECT count(1) as cnt FROM students');
  const pj = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');

  console.log('Schools: ' + sc.rows[0].cnt);
  console.log('Employees: ' + ec.rows[0].cnt);
  console.log('Students: ' + stc.rows[0].cnt);
  console.log('  by level:');
  for (const r of pj.rows) console.log('    ' + r.jenjang + ': ' + r.cnt);

  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
