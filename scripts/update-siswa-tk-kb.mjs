import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const simdawaFile = 'C:/Users/Bank Yan/simdawa/data/data-siswa.json';
const all = JSON.parse(readFileSync(simdawaFile, 'utf-8'));

function mapJK(jk) {
  if (!jk) return null;
  const low = jk.toLowerCase();
  if (low === 'l' || low === 'laki-laki') return 'Laki-laki';
  if (low === 'p' || low === 'perempuan') return 'Perempuan';
  return jk;
}

function mapJenjang(j) {
  if (j === 'PAUD') return 'KB';
  return j;
}

function cleanNisn(v) {
  if (!v) return null;
  const s = v.toString().trim();
  return s || null;
}

async function main() {
  // Filter TK/KB/PAUD
  const tk = all.filter(s => {
    const j = s.jenjang?.toUpperCase();
    return j === 'TK' || j === 'KB' || j === 'PAUD';
  });

  console.log('Siswa TK/KB dari SIMDAWA: ' + tk.length);
  console.log('  TK: ' + tk.filter(s => s.jenjang === 'TK').length);
  console.log('  KB: ' + tk.filter(s => s.jenjang === 'KB').length);
  console.log('  PAUD (→KB): ' + tk.filter(s => s.jenjang === 'PAUD').length);

  let updated = 0;
  let inserted = 0;
  let skippedNoNik = 0;
  let skippedNotFound = 0;

  for (const s of tk) {
    const nik = s.nik?.toString().trim() || null;
    const nisn = cleanNisn(s.nisn);
    const nama = s.nama?.trim();
    const jk = mapJK(s.jk);
    const tempatLahir = s.tempat_lahir?.trim() || null;
    const tanggalLahir = s.tanggal_lahir?.trim() || null;
    const jenjang = mapJenjang(s.jenjang);
    const rombel = s.rombel?.trim() || null;
    const npsn = s.npsn?.toString().trim();
    const desa = s.desa?.trim() || null;

    if (!nik && !nisn) { skippedNoNik++; continue; }

    let existing = null;

    // Try match by NIK
    if (nik) {
      const r = await tgt.execute({
        sql: "SELECT id, nisn, rombel, nama FROM students WHERE nik = ? AND jenjang IN ('TK','KB')",
        args: [nik]
      });
      if (r.rows.length > 0) existing = r.rows[0];
    }

    // Try match by NISN
    if (!existing && nisn) {
      const r = await tgt.execute({
        sql: "SELECT id, nisn, rombel, nama FROM students WHERE nisn = ? AND jenjang IN ('TK','KB')",
        args: [nisn]
      });
      if (r.rows.length > 0) existing = r.rows[0];
    }

    if (existing) {
      // Update NISN if missing
      const updates = [];
      const args = [];

      if (!existing.nisn && nisn) {
        updates.push('nisn = ?');
        args.push(nisn);
      }
      if (jk) {
        updates.push('jenis_kelamin = ?');
        args.push(jk);
      }
      if (tempatLahir) {
        updates.push('tempat_lahir = ?');
        args.push(tempatLahir);
      }
      if (tanggalLahir) {
        updates.push('tanggal_lahir = ?');
        args.push(tanggalLahir);
      }
      if (rombel && !existing.rombel) {
        updates.push('rombel = ?');
        args.push(rombel);
      }
      if (desa) {
        // We don't have desa in students table, skip
      }

      if (updates.length > 0) {
        args.push(existing.id);
        await tgt.execute({
          sql: `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
          args
        });
        updated++;
        if (updated <= 5 || updated % 100 === 0) {
          console.log(`  UPDATE [${updated}] ${nama} (${nik}) → NISN: ${nisn || '-'}`);
        }
      }
    } else {
      // Insert new student
      if (!nik) { skippedNotFound++; continue; }

      const id = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const tp = '2025/2026';
      // Determine kelas_kelompok from rombel
      let kelompok = 'Kelompok A';
      if (rombel) {
        const rLow = rombel.toLowerCase();
        if (rLow.includes('b') && !rLow.includes('a')) kelompok = 'Kelompok B';
        else if (rLow.includes('a')) kelompok = 'Kelompok A';
      }
      if (jenjang === 'KB') kelompok = 'Kelompok Bermain';

      try {
        await tgt.execute({
          sql: `INSERT INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel, status_siswa, tahun_pelajaran)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?)`,
          args: [id, npsn, nama, nisn, nik, jk, tempatLahir, tanggalLahir, jenjang, kelompok, rombel, tp]
        });
        inserted++;
        console.log(`  INSERT [${inserted}] ${nama} (${nik}) → ${npsn} ${jenjang}/${kelompok}`);
      } catch (e) {
        console.log(`  FAIL insert ${nama}: ${e.message}`);
      }
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log('  Updated (NISN + data): ' + updated);
  console.log('  Inserted (new): ' + inserted);
  console.log('  Skipped (no NIK/NISN): ' + skippedNoNik);
  console.log('  Not found (no match): ' + skippedNotFound);

  // Final counts
  const tgtCnt = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB')");
  console.log('\nTotal TK/KB di target: ' + tgtCnt.rows[0].cnt);
  const tgtNisn = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB') AND nisn IS NOT NULL AND nisn != ''");
  console.log('TK/KB dengan NISN: ' + tgtNisn.rows[0].cnt);
}

main().catch(console.error);
