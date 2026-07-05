import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const TARGET_URL = 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io';
const TARGET_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw';

const tgt = createClient({ url: TARGET_URL, authToken: TARGET_TOKEN });

const TAHUN_PELAJARAN = '2025/2026';
const NOW = Date.now();

function normGender(v) {
  if (!v) return null;
  const g = v.trim().toLowerCase();
  if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'Laki-laki';
  if (g === 'p' || g === 'perempuan') return 'Perempuan';
  return v;
}

function mapJenjang(j) {
  const jj = (j || '').trim().toUpperCase();
  if (jj === 'PAUD') return 'KB';
  return jj;
}

async function syncStudents() {
  console.log('\n=== SYNC STUDENTS FROM DAPODIK ===');
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/src/data/data-siswa.json', 'utf-8'));
  console.log('Raw student records from Dapodik: ' + raw.length);

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 100;

  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH);
    const tasks = batch.map(async (s) => {
      const nisn = (s.nisn || '').trim();
      const nik = (s.nik || '').trim();
      const nama = (s.nama || '').trim().toUpperCase();
      const school_npsn = s.npsn || '';
      const jenjang = mapJenjang(s.jenjang || '');

      if (!nama || !school_npsn) { skipped++; return; }

      const jenis_kelamin = normGender(s.jk || '');
      const tempat_lahir = (s.tempat_lahir || '').trim().toUpperCase();
      const tanggal_lahir = s.tanggal_lahir || '';

      let kelas_kelompok = '';
      let rombel = '';

      if (jenjang === 'SD') {
        const kls = s.kelas != null ? String(s.kelas) : '';
        kelas_kelompok = kls ? 'Kelas ' + kls : '';
        rombel = (s.rombel || '').trim();
        if (!rombel) rombel = kelas_kelompok;
      } else {
        rombel = (s.rombel || '').trim();
        if (/^kelompok\s/i.test(rombel) || /^KELAS\s/i.test(rombel)) {
          // Normalize: KELAS B.3 → Kelompok B, Kelompok A1 → Kelompok A
          let match = rombel.match(/[A-Z]\s*\.?\s*(\d+)/i);
          if (match) {
            const letter = rombel.replace(/[.\s\d]/g, '').toUpperCase();
            const num = match[1];
            kelas_kelompok = 'Kelompok ' + letter;
            rombel = 'Kelompok ' + letter + ' ' + num;
          } else {
            kelas_kelompok = rombel.replace(/^(KELAS|Kelompok)\s*/i, 'Kelompok ');
            rombel = kelas_kelompok;
          }
        } else if (/^[A-Z]\d*$/i.test(rombel)) {
          // e.g. "B1", "A", "B2"
          const letter = rombel.replace(/\d/g, '').toUpperCase();
          const num = rombel.replace(/[A-Z]/gi, '');
          kelas_kelompok = 'Kelompok ' + letter;
          rombel = num ? 'Kelompok ' + letter + ' ' + num : kelas_kelompok;
        } else if (rombel) {
          kelas_kelompok = 'Kelompok ' + rombel;
          rombel = kelas_kelompok;
        } else {
          kelas_kelompok = 'Kelompok A';
          rombel = 'Kelompok A';
        }
      }

      // Lookup by NISN first, then NIK
      let existing = null;
      if (nisn) {
        existing = await tgt.execute({
          sql: 'SELECT id FROM students WHERE nisn = ?',
          args: [nisn]
        });
      }
      if ((!existing || existing.rows.length === 0) && nik) {
        existing = await tgt.execute({
          sql: 'SELECT id FROM students WHERE nik = ?',
          args: [nik]
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
  console.log('\nStudents: ' + count.rows[0].cnt + ' total (inserted=' + inserted + ', updated=' + updated + ', skipped=' + skipped + ')');

  const perJenjang = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang');
  console.log('Per jenjang:');
  for (const r of perJenjang.rows) console.log('  ' + r.jenjang + ': ' + r.cnt);

  // Per school
  const perSchool = await tgt.execute(`
    SELECT sc.npsn, sc.name, s.jenjang, count(1) as cnt
    FROM students s JOIN schools sc ON sc.npsn = s.school_npsn
    GROUP BY s.school_npsn, s.jenjang ORDER BY sc.name, s.jenjang
  `);
  console.log('\nPer sekolah:');
  for (const r of perSchool.rows) console.log('  ' + r.npsn + ' ' + r.name + ' (' + r.jenjang + '): ' + r.cnt);
}

async function main() {
  console.log('Starting full student sync from Dapodik...\n');
  await syncStudents();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
