import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// Normalize rombel to proper case
function normalizeRombel(s) {
  if (!s) return s;
  // Handle uppercase KELAS -> Kelas
  if (s.startsWith('KELAS')) return 'Kelas' + s.slice(5);
  // Handle lowercase kelas -> Kelas
  if (s.startsWith('kelas')) return 'Kelas' + s.slice(5);
  return s;
}

async function main() {
  console.log('=== STEP 1: Normalize existing rombel to proper case ===\n');
  
  // Fix all SD uppercase KELAS -> Kelas
  const fix1 = await DB.execute("UPDATE students SET rombel = 'Kelas' || substr(rombel, 6) WHERE jenjang='SD' AND rombel COLLATE BINARY GLOB 'KELAS *'");
  console.log('KELAS -> Kelas (with space): ' + fix1.rowsAffected);

  const fix2 = await DB.execute("UPDATE students SET rombel = 'Kelas' || substr(rombel, 6) WHERE jenjang='SD' AND (rombel COLLATE BINARY = 'KELAS1' OR rombel COLLATE BINARY = 'KELAS2' OR rombel COLLATE BINARY = 'KELAS3' OR rombel COLLATE BINARY = 'KELAS4' OR rombel COLLATE BINARY = 'KELAS5' OR rombel COLLATE BINARY = 'KELAS6')");
  console.log('KELAS -> Kelas (no space): ' + fix2.rowsAffected);

  // Fix KELAS1A, KELAS1B etc. (5-letter prefix cases)
  const fix3 = await DB.execute("UPDATE students SET rombel = 'Kelas' || substr(rombel, 6) WHERE jenjang='SD' AND rombel COLLATE BINARY GLOB 'KELAS[0-9]*'");
  console.log('KELAS1A type -> Kelas: ' + fix3.rowsAffected);

  console.log('\n=== STEP 2: Re-import portal-dinas students ===\n');
  
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
  console.log('Total records: ' + raw.length);

  const sdRecords = raw.filter(s => (s.jenjang || '').trim().toUpperCase() === 'SD');
  console.log('SD records: ' + sdRecords.length);

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 100;
  const TAHUN_PELAJARAN = '2025/2026';

  for (let i = 0; i < sdRecords.length; i += BATCH) {
    const batch = sdRecords.slice(i, i + BATCH);
    const tasks = batch.map(async (s) => {
      const nisn = (s.nisn || '').trim();
      const nik = (s.nik || '').trim();
      const nama = (s.nama || '').trim().toUpperCase();
      const school_npsn = s.npsn || s.schoolId || '';

      if (!nama || !school_npsn) { skipped++; return; }

      const jenis_kelamin = (() => {
        const g = (s.jk || s.jenisKelamin || '').trim().toLowerCase();
        if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'Laki-laki';
        if (g === 'p' || g === 'perempuan') return 'Perempuan';
        return null;
      })();

      const kls = s.kelas || '';
      const kelas_kelompok = 'Kelas ' + kls;
      let rombel = normalizeRombel(s.rombel || '');
      if (!rombel) rombel = kelas_kelompok;

      // Match by NISN first, then NIK
      let existing = null;
      if (nisn) {
        existing = await DB.execute({ sql: 'SELECT id FROM students WHERE nisn = ?', args: [nisn] });
      }
      if ((!existing || existing.rows.length === 0) && nik) {
        existing = await DB.execute({ sql: 'SELECT id FROM students WHERE nik = ?', args: [nik] });
      }

      if (existing && existing.rows.length > 0) {
        await DB.execute({
          sql: `UPDATE students SET nisn=?, nik=?, jenis_kelamin=?, tempat_lahir=?,
                tanggal_lahir=?, jenjang=?, kelas_kelompok=?, rombel=?, status_siswa=?
                WHERE id=?`,
          args: [nisn, nik, jenis_kelamin, (s.tempat_lahir || s.tempatLahir || ''),
                 (s.tanggal_lahir || s.tanggalLahir || ''), 'SD', kelas_kelompok, rombel, 'aktif', existing.rows[0].id]
        });
        updated++;
      } else {
        const id = randomUUID();
        await DB.execute({
          sql: `INSERT INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin,
                tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel,
                status_siswa, tahun_pelajaran)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [id, school_npsn, nama, nisn, nik, jenis_kelamin,
                 (s.tempat_lahir || s.tempatLahir || ''), (s.tanggal_lahir || s.tanggalLahir || ''),
                 'SD', kelas_kelompok, rombel, 'aktif', TAHUN_PELAJARAN]
        });
        inserted++;
      }
    });
    await Promise.all(tasks);

    if ((i + BATCH) % 1000 === 0) console.log('  Progress: ' + Math.min(i + BATCH, sdRecords.length));
  }

  console.log('\nResults: inserted=' + inserted + ', updated=' + updated);
  
  console.log('\n=== STEP 3: Delete old-format duplicates by NISN ===\n');
  
  // Delete roman-numeral entries whose NISN exists in proper format
  const romans = ['I','II','III','IV','V','VI'];
  const grades = ['1','2','3','4','5','6'];
  let del1 = 0;
  for (let i = 0; i < 6; i++) {
    const r = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY = 'Kelas ${romans[i]}' AND nisn IN (
        SELECT nisn FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY LIKE 'Kelas ${grades[i]}%' AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`
    });
    if (r.rowsAffected > 0) console.log('  Kelas ' + romans[i] + ': ' + r.rowsAffected + ' deleted');
    del1 += r.rowsAffected;
  }
  console.log('Roman deleted: ' + del1);

  // Delete short-form entries whose NISN exists in proper format
  const shorts = ['1','1A','1B','2','2A','2B','3','3A','3B','4','4A','4B','5','5A','5B','6','6A','6B'];
  let del2 = 0;
  for (const s of shorts) {
    const g = s[0];
    const r = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang='SD' AND rombel = ? AND nisn IN (
        SELECT nisn FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY LIKE 'Kelas ${g}%' AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`,
      args: [s]
    });
    if (r.rowsAffected > 0) console.log('  "' + s + '": ' + r.rowsAffected + ' deleted');
    del2 += r.rowsAffected;
  }
  console.log('Short-form deleted: ' + del2);

  // Delete weird SD IT AL IRSYAD entries
  const del3 = await DB.execute({
    sql: `DELETE FROM students WHERE school_npsn = '20215221' AND rombel COLLATE BINARY NOT LIKE 'Kelas%'`
  });
  console.log('SD IT AL IRSYAD weird: ' + del3.rowsAffected + ' deleted');

  // Fix remaining empty jenjang
  const fix4 = await DB.execute({
    sql: `UPDATE students SET jenjang = 'SD' WHERE (jenjang IS NULL OR jenjang = '' OR jenjang = '?') AND school_npsn IN (SELECT npsn FROM schools WHERE level = 'SD')`
  });
  console.log('Empty jenjang fixed to SD: ' + fix4.rowsAffected);

  console.log('\n=== FINAL ===');
  const total = await DB.execute('SELECT count(1) as cnt FROM students');
  const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  console.log('Students: ' + total.rows[0].cnt);
  for (const r of byJenjang.rows) console.log('  "' + (r.jenjang || '?') + '": ' + r.cnt);

  const sdRombels = await DB.execute("SELECT DISTINCT rombel FROM students WHERE jenjang='SD' ORDER BY rombel");
  console.log('\nSD rombel values (' + sdRombels.rows.length + '):');
  for (const r of sdRombels.rows) console.log('  "' + r.rombel + '"');
}

main().catch(e => { console.error(e); process.exit(1); });
