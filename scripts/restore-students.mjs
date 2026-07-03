import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { randomUUID } from 'crypto';

const TARGET_URL = 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io';
const TARGET_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw';

const tgt = createClient({ url: TARGET_URL, authToken: TARGET_TOKEN });

function normGender(v) {
  if (!v) return null;
  const g = v.trim().toLowerCase();
  if (g === 'l' || g === 'laki-laki' || g === 'laki') return 'Laki-laki';
  if (g === 'p' || g === 'perempuan') return 'Perempuan';
  return v;
}

async function main() {
  console.log('=== RESTORE PORTAL-DINAS STUDENTS ===\n');
  
  const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
  console.log('Total records from portal-dinas: ' + raw.length);

  let inserted = 0, updated = 0, skipped = 0;
  const BATCH = 100;
  const TAHUN_PELAJARAN = '2025/2026';

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

      let kelas_kelompok = '';
      let rombel = '';

      if (jenjang === 'SD') {
        const kls = s.kelas || '';
        kelas_kelompok = 'Kelas ' + kls;
        rombel = s.rombel || '';
        if (!rombel) rombel = kelas_kelompok;
      } else {
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

      // Try to find existing by NISN
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
      console.log('  Progress: ' + Math.min(i + BATCH, raw.length) + '/' + raw.length);
    }
  }

  console.log('\nResults: inserted=' + inserted + ', updated=' + updated + ', skipped=' + skipped);

  const total = await tgt.execute('SELECT count(1) as cnt FROM students');
  const byJenjang = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  console.log('\nTotal: ' + total.rows[0].cnt);
  for (const r of byJenjang.rows) console.log('  ' + (r.jenjang || '?') + ': ' + r.cnt);
}

main().catch(e => { console.error(e); process.exit(1); });
