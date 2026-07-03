import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  console.log('=== DUPLICATE ANALYSIS ===\n');

  // 1. Duplicate by NISN
  const dupNisn = await tgt.execute(
    "SELECT nisn, count(1) as cnt, group_concat(id) as ids FROM students WHERE nisn IS NOT NULL AND nisn != '' GROUP BY nisn HAVING cnt > 1 ORDER BY cnt DESC LIMIT 20"
  );
  console.log('Duplicates by NISN (>1):');
  for (const r of dupNisn.rows) {
    const ids = r.ids.split(',');
    console.log('  NISN ' + r.nisn + ': ' + r.cnt + 'x [' + ids.join(', ') + ']');
  }

  // Count total duplicate NISN
  const cntDupNisn = await tgt.execute(
    "SELECT sum(cnt) as total FROM (SELECT count(1) as cnt FROM students WHERE nisn IS NOT NULL AND nisn != '' GROUP BY nisn HAVING cnt > 1)"
  );
  const totalDupNisn = cntDupNisn.rows[0]?.total || 0;
  console.log('\nTotal duplicate NISN records: ' + totalDupNisn);
  const uniqNisn = await tgt.execute("SELECT count(DISTINCT nisn) as cnt FROM students WHERE nisn IS NOT NULL AND nisn != ''");
  console.log('Unique NISN: ' + uniqNisn.rows[0].cnt);

  // 2. Duplicate by NIK
  const dupNik = await tgt.execute(
    "SELECT nik, count(1) as cnt, group_concat(id) as ids FROM students WHERE nik IS NOT NULL AND nik != '' GROUP BY nik HAVING cnt > 1 ORDER BY cnt DESC LIMIT 10"
  );
  console.log('\nDuplicates by NIK (>1):');
  for (const r of dupNik.rows) {
    const ids = r.ids.split(',');
    console.log('  NIK ' + r.nik + ': ' + r.cnt + 'x [' + ids.join(', ') + ']');
  }
  const cntDupNik = await tgt.execute(
    "SELECT sum(cnt) as total FROM (SELECT count(1) as cnt FROM students WHERE nik IS NOT NULL AND nik != '' GROUP BY nik HAVING cnt > 1)"
  );
  const totalDupNik = cntDupNik.rows[0]?.total || 0;
  console.log('Total duplicate NIK records: ' + totalDupNik);

  // 3. Duplicate by (nama + school_npsn)
  const dupName = await tgt.execute(
    "SELECT nama, school_npsn, count(1) as cnt, group_concat(id) as ids FROM students GROUP BY nama, school_npsn HAVING cnt > 1 ORDER BY cnt DESC LIMIT 20"
  );
  console.log('\nDuplicates by (nama + npsn) (>1, top 20):');
  let totalDupName = 0;
  for (const r of dupName.rows) {
    const ids = r.ids.split(',');
    console.log('  ' + r.nama + ' @ ' + r.school_npsn + ': ' + r.cnt + 'x [' + ids.join(', ') + ']');
    totalDupName += parseInt(r.cnt);
  }
  console.log('Total duplicate (nama + npsn): ' + totalDupName);

  // 4. Total unique students estimate (by NISN or NIK or nama+npsn)
  console.log('\n=== SUMMARY ===');
  const total = await tgt.execute('SELECT count(1) as cnt FROM students');
  console.log('Total records: ' + total.rows[0].cnt);

  // NISN coverage
  const withNisn = await tgt.execute("SELECT count(1) as cnt, count(DISTINCT nisn) as uniq FROM students WHERE nisn IS NOT NULL AND nisn != ''");
  console.log('With NISN: ' + withNisn.rows[0].cnt + ' (unique: ' + withNisn.rows[0].uniq + ')');

  // Check per-school duplicate counts
  console.log('\nPer-school estimated duplicates (records - unique nama):');
  const perSekolah = await tgt.execute(
    "SELECT s.npsn, s.name, count(st.id) as records, count(DISTINCT st.nama) as uniq_names, (count(st.id) - count(DISTINCT st.nama)) as est_dup FROM students st JOIN schools s ON st.school_npsn = s.npsn GROUP BY s.npsn HAVING est_dup > 0 ORDER BY est_dup DESC LIMIT 15"
  );
  for (const r of perSekolah.rows) {
    console.log('  ' + r.npsn + ' ' + r.name + ': ' + r.records + ' records, ' + r.uniq_names + ' unique names = ~' + r.est_dup + ' dup');
  }
}

main().catch(console.error);
