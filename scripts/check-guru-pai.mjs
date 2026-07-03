/**
 * Check Guru PAI (Pendidikan Agama Islam) di setiap SD
 * dan cek progres mapping per SD
 */
import { createClient } from '@libsql/client';

const c = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  console.log('========================================');
  console.log('  GURU PAI / AGAMA DI SD');
  console.log('========================================\n');

  // Cari guru dengan jabatan mengandung PAI/Agama
  const r = await c.execute(`
    SELECT e.nama, e.nik, e.jabatan, e.status_pegawai, s.name as school_name, s.npsn
    FROM employees e
    JOIN schools s ON e.sekolah_id = s.npsn
    WHERE s.level = 'SD'
      AND (
        LOWER(e.jabatan) LIKE '%pai%'
        OR LOWER(e.jabatan) LIKE '%agama%'
        OR LOWER(e.jabatan) LIKE '%pendidikan agama%'
        OR LOWER(e.jabatan) LIKE '%guru agama%'
      )
    ORDER BY s.name, e.nama
  `);
  
  console.log(`Total Guru PAI/Agama di SD: ${r.rows.length}\n`);
  console.log('DAFTAR GURU PAI:');
  console.log('================'.padEnd(90, '='));
  for (const row of r.rows) {
    console.log(`  ${row.school_name.padEnd(45)} | ${row.nama.padEnd(30)} | ${(row.jabatan || '').padEnd(25)} | ${row.status_pegawai || '-'}`);
  }

  // Per sekolaht
  console.log('\n\nPER SEKOLAH:');
  console.log('========================================\n');
  
  const perSekolah = await c.execute(`
    SELECT 
      s.name, 
      s.npsn,
      (SELECT count(1) FROM employees e WHERE e.sekolah_id = s.npsn AND (
        LOWER(e.jabatan) LIKE '%pai%' 
        OR LOWER(e.jabatan) LIKE '%agama%'
        OR LOWER(e.jabatan) LIKE '%pendidikan agama%'
        OR LOWER(e.jabatan) LIKE '%guru agama%'
      )) as guru_pai,
      (SELECT count(1) FROM employees e WHERE e.sekolah_id = s.npsn) as total_pegawai,
      (SELECT count(1) FROM students st WHERE st.school_npsn = s.npsn) as total_siswa
    FROM schools s
    WHERE s.level = 'SD'
    ORDER BY s.name
  `);

  console.log(''.padEnd(100, '-'));
  console.log('SEKOLAH'.padEnd(45) + 'GURU PAI'.padEnd(12) + 'TOTAL PEGAWAI'.padEnd(18) + 'SISWA'.padEnd(10) + 'RASIO PAI:SISWA');
  console.log(''.padEnd(100, '-'));
  
  let totalPai = 0;
  for (const row of perSekolah.rows) {
    const rasio = row.total_siswa > 0 ? (row.total_siswa / Math.max(row.guru_pai, 1)).toFixed(0) : '-';
    console.log(
      String(row.name).padEnd(45) + 
      String(row.guru_pai).padEnd(12) + 
      String(row.total_pegawai).padEnd(18) + 
      String(row.total_siswa).padEnd(10) + 
      (row.guru_pai > 0 ? `1:${rasio}` : 'TIDAK ADA')
    );
    totalPai += Number(row.guru_pai);
  }
  console.log(''.padEnd(100, '-'));
  console.log(`\nTotal: ${totalPai} Guru PAI dari ${perSekolah.rows.length} SD`);
  
  // Sekolah tanpa Guru PAI
  console.log('\n\nSEKOLAH TANPA GURU PAI:');
  console.log('========================');
  const tanpaPai = perSekolah.rows.filter(r => Number(r.guru_pai) === 0);
  if (tanpaPai.length === 0) {
    console.log('  Semua SD sudah memiliki Guru PAI ✓');
  } else {
    for (const row of tanpaPai) {
      console.log(`  ${row.name} (${row.total_siswa} siswa, ${row.total_pegawai} pegawai)`);
    }
  }
}

main().catch(console.error);