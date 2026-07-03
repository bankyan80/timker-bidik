import { createClient } from '@libsql/client';

const src = createClient({
  url: 'libsql://laporan-pendidikan-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIwMzk3MTMsImlkIjoiMDE5ZWU5ZDctZjcwMS03NDYxLWI2YTQtMzIyNTM3YjY0ZGI3IiwicmlkIjoiMGU2NDhiZTAtY2FlNy00NjEwLWEyODMtZDA4YzEzZGQ4MjllIn0.ZPMXTMXMKUO5s9Wv_NGdg0gcKv4PYcbjxOciF9wEVVlDKIodVqA_WhtzSVdZIOTyx_GEIYa_tVGx9TCKK31oAQ'
});

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  console.log('=== NIK TK/KB DI SOURCE DB ===');
  const srcNull = await src.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('tk','kb') AND (nik IS NULL OR nik = '')");
  const srcHave = await src.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('tk','kb') AND nik IS NOT NULL AND nik != ''");
  console.log('  Tanpa NIK: ' + srcNull.rows[0].cnt);
  console.log('  Dengan NIK: ' + srcHave.rows[0].cnt);

  const srcSample = await src.execute("SELECT nik, nama, jenjang, kelas_kelompok FROM students WHERE jenjang IN ('tk','kb') AND nik IS NOT NULL AND nik != '' ORDER BY nama LIMIT 10");
  console.log('\nSample dengan NIK:');
  srcSample.rows.forEach(s => console.log('  ' + s.nama + '\tNIK: ' + s.nik + '\t' + s.jenjang + '/' + s.kelas_kelompok));

  const srcDup = await src.execute("SELECT nik, count(1) as cnt FROM students WHERE jenjang IN ('tk','kb') AND nik IS NOT NULL AND nik != '' GROUP BY nik HAVING count(1) > 1");
  console.log('\nDuplikat NIK di source: ' + srcDup.rows.length);

  console.log('\n=== NIK TK/KB DI TARGET DB ===');
  const tgtNull = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB') AND (nik IS NULL OR nik = '')");
  const tgtHave = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang IN ('TK','KB') AND nik IS NOT NULL AND nik != ''");
  console.log('  Tanpa NIK: ' + tgtNull.rows[0].cnt);
  console.log('  Dengan NIK: ' + tgtHave.rows[0].cnt);

  // Fokus TK NEGERI PEMBINA LEMAHABANG (20270605)
  console.log('\n=== DETAIL TK NEGERI PEMBINA LEMAHABANG (20270605) ===');
  
  // Source
  const srcSn = await src.execute("SELECT s.nik, s.nisn, s.nama, s.kelas_kelompok FROM students s JOIN schools sc ON sc.id = s.school_id WHERE sc.npsn = '20270605' ORDER BY s.nama");
  console.log('Source (' + srcSn.rows.length + ' siswa):');
  srcSn.rows.forEach(s => console.log('  ' + s.nama + '\tNIK: ' + (s.nik || '-') + '\tNISN: ' + (s.nisn || '-') + '\t' + s.kelas_kelompok));

  // Target
  const tgtSn = await tgt.execute("SELECT id, nik, nisn, nama, kelas_kelompok, rombel FROM students WHERE school_npsn = '20270605' ORDER BY nama");
  console.log('\nTarget (' + tgtSn.rows.length + ' siswa):');
  tgtSn.rows.forEach(s => console.log('  ' + s.id + '\t' + s.nama + '\tNIK: ' + (s.nik || '-') + '\tNISN: ' + (s.nisn || '-') + '\t' + s.kelas_kelompok + '\trombel: ' + (s.rombel || '-')));

  // Duplikat NISN di target untuk sekolah ini
  const tgtDup = await tgt.execute("SELECT nisn, count(1) as cnt FROM students WHERE school_npsn = '20270605' AND nisn IS NOT NULL AND nisn != '' GROUP BY nisn HAVING count(1) > 1");
  console.log('\nDuplikat NISN di target (20270605): ' + tgtDup.rows.length);
  tgtDup.rows.forEach(s => console.log('  NISN ' + s.nisn + ' muncul ' + s.cnt + ' kali'));

  // Total duplicate NISN entries count
  const tgtAll = await tgt.execute("SELECT count(1) as cnt FROM students WHERE school_npsn = '20270605' AND nisn IS NOT NULL AND nisn != ''");
  console.log('Total entry dengan NISN: ' + tgtAll.rows[0].cnt);
  
  const tgtDupTotal = await tgt.execute("SELECT sum(cnt) - count(1) as dup_count FROM (SELECT nisn, count(1) as cnt FROM students WHERE school_npsn = '20270605' AND nisn IS NOT NULL AND nisn != '' GROUP BY nisn HAVING count(1) > 1)");
  console.log('Jumlah duplikat (NISN): ' + tgtDupTotal.rows[0].dup_count);

  // Cek NIK duplikat juga
  const tgtNikDup = await tgt.execute("SELECT nik, count(1) as cnt, group_concat(id) as ids FROM students WHERE school_npsn = '20270605' AND nik IS NOT NULL AND nik != '' GROUP BY nik HAVING count(1) > 1");
  console.log('\nDuplikat NIK di target (20270605): ' + tgtNikDup.rows.length);
  tgtNikDup.rows.forEach(s => console.log('  NIK ' + s.nik + ' muncul ' + s.cnt + ' kali - ids: ' + s.ids));
}

main().catch(console.error);
