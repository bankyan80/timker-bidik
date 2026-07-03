import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  console.log('=== CASE-SENSITIVE CLEANUP ===\n');

  // 1. Delete uppercase KELAS entries where NISN exists in proper Kelas (BINARY match)
  console.log('1. Uppercase KELAS duplicates:');
  const grades = ['1','2','3','4','5','6'];
  let upDel = 0;
  for (const g of grades) {
    const result = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang = 'SD' AND rombel COLLATE BINARY LIKE 'KELAS ${g}%' AND nisn IN (
        SELECT nisn FROM students WHERE jenjang = 'SD' AND rombel COLLATE BINARY LIKE 'Kelas ${g}%' AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`
    });
    if (result.rowsAffected > 0) console.log('  Grade ' + g + ': ' + result.rowsAffected);
    upDel += result.rowsAffected;
  }
  console.log('  Total uppercase deleted: ' + upDel);

  // 2. Delete roman-numeral entries where NISN exists in proper format
  console.log('\n2. Roman numeral duplicates:');
  const romans = ['I','II','III','IV','V','VI'];
  let romanDel = 0;
  for (let i = 0; i < 6; i++) {
    const arabic = grades[i];
    const roman = romans[i];
    const result = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang = 'SD' AND rombel COLLATE BINARY = 'Kelas ${roman}' AND nisn IN (
        SELECT nisn FROM students WHERE jenjang = 'SD' AND (rombel COLLATE BINARY LIKE 'Kelas ${arabic}%' OR rombel COLLATE BINARY LIKE 'KELAS ${arabic}%') AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`
    });
    if (result.rowsAffected > 0) console.log('  Kelas ' + roman + ': ' + result.rowsAffected);
    romanDel += result.rowsAffected;
  }
  console.log('  Total roman deleted: ' + romanDel);

  // 3. Delete short-form entries ("1", "1A", "2", "2B" etc.) where NISN exists in proper format
  console.log('\n3. Short-form entries:');
  const shorts = ['1','1A','1B','2','2A','2B','3','3A','3B','4','4A','4B','5','5A','5B','6','6A','6B'];
  let shortDel = 0;
  for (const s of shorts) {
    const g = s[0]; // grade number
    const result = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang = 'SD' AND rombel = ? AND nisn IN (
        SELECT nisn FROM students WHERE jenjang = 'SD' AND (rombel COLLATE BINARY LIKE 'Kelas ${g}%' OR rombel COLLATE BINARY LIKE 'KELAS ${g}%') AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`,
      args: [s]
    });
    if (result.rowsAffected > 0) console.log('  "' + s + '": ' + result.rowsAffected);
    shortDel += result.rowsAffected;
  }
  console.log('  Total short-form deleted: ' + shortDel);

  // 4. Delete SD IT AL IRSYAD weird entries (single-letter rombel like "I A", "II A")
  console.log('\n4. SD IT AL IRSYAD weird entries:');
  const weird = await DB.execute({
    sql: `DELETE FROM students WHERE school_npsn = '20215221' AND (rombel GLOB '[A-Z] [A-Z]' OR rombel GLOB '[A-Z][A-Z] [A-Z]' OR rombel GLOB '[A-Z] [A-Z][A-Z]')`
  });
  console.log('  Deleted: ' + weird.rowsAffected);

  // 5. Fix empty jenjang (183 students)
  console.log('\n5. Fix empty jenjang:');
  const fixJenjang = await DB.execute({
    sql: `UPDATE students SET jenjang = 'SD' WHERE (jenjang IS NULL OR jenjang = '' OR jenjang = '?') AND school_npsn IN (SELECT npsn FROM schools WHERE level = 'SD')`
  });
  console.log('  Fixed (SD): ' + fixJenjang.rowsAffected);

  // 6. Normalize PAUD -> KB
  const fixPaud = await DB.execute({
    sql: `UPDATE students SET jenjang = 'KB' WHERE jenjang = 'PAUD'`
  });
  console.log('  Fixed PAUD->KB: ' + fixPaud.rowsAffected);

  // Final summary
  console.log('\n=== FINAL ===');
  const total = await DB.execute('SELECT count(1) as cnt FROM students');
  const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  console.log('Students: ' + total.rows[0].cnt);
  for (const r of byJenjang.rows) console.log('  "' + (r.jenjang || '?') + '": ' + r.cnt);
  
  const sdRombels = await DB.execute("SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY NOT LIKE 'Kelas %' AND rombel COLLATE BINARY NOT LIKE 'KELAS %'");
  console.log('\nNon-Kelas SD entries remaining: ' + sdRombels.rows[0].cnt);
  
  // Show remaining weird entries if any
  const weirdRemaining = await DB.execute("SELECT rombel, count(1) as cnt FROM students WHERE jenjang='SD' AND rombel COLLATE BINARY NOT LIKE 'Kelas %' AND rombel COLLATE BINARY NOT LIKE 'KELAS %' GROUP BY rombel ORDER BY cnt DESC LIMIT 10");
  console.log('Top non-Kelas rombels:');
  for (const r of weirdRemaining.rows) console.log('  "' + r.rombel + '": ' + r.cnt);
}

main().catch(console.error);
