import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  console.log('=== CLEANUP: Remove uppercase KELAS duplicates ===\n');
  
  const grades = ['1','2','3','4','5','6'];
  let totalDel = 0;

  for (const g of grades) {
    // Delete uppercase KELAS entries where same NISN exists in proper Kelas format
    const result = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang = 'SD' AND rombel LIKE 'KELAS ${g}%' AND nisn IN (
        SELECT nisn FROM students WHERE jenjang = 'SD' AND rombel LIKE 'Kelas ${g}%' AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`
    });
    console.log(`Grade ${g}: ${result.rowsAffected} deleted`);
    totalDel += result.rowsAffected;
  }

  console.log(`\nTotal uppercase KELAS duplicates deleted: ${totalDel}`);

  // Now clean up short-form entries (just "1", "1A", etc.)
  console.log('\n=== Clean short-form entries ===');
  
  // First check which schools have them
  const shorts = ['1','1A','1B','2','2A','2B','3','3A','3B','4','4A','4B','5','5A','5B','6','6A','6B','6C'];
  let shortDel = 0;
  for (const s of shorts) {
    const entries = await DB.execute({
      sql: "SELECT school_npsn, count(1) as cnt FROM students WHERE jenjang='SD' AND rombel = ? GROUP BY school_npsn",
      args: [s]
    });
    for (const e of entries.rows) {
      // Check if these students have NISN that also exists in proper format
      const overlap = await DB.execute({
        sql: `SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND school_npsn = ? AND rombel = ? AND nisn IN (
          SELECT nisn FROM students WHERE jenjang='SD' AND school_npsn = ? AND rombel LIKE 'Kelas ${s[0]}%' AND nisn IS NOT NULL AND nisn != ''
        ) AND nisn IS NOT NULL AND nisn != ''`,
        args: [e.school_npsn, s, e.school_npsn]
      });
      if (overlap.rows[0].cnt > 0) {
        // Delete the short-form entries that have matching NISN in proper format
        const del = await DB.execute({
          sql: `DELETE FROM students WHERE jenjang='SD' AND school_npsn = ? AND rombel = ? AND nisn IN (
            SELECT nisn FROM students WHERE jenjang='SD' AND school_npsn = ? AND rombel LIKE 'Kelas ${s[0]}%' AND nisn IS NOT NULL AND nisn != ''
          )`,
          args: [e.school_npsn, s, e.school_npsn]
        });
        console.log(`  "${s}" at ${e.school_npsn}: ${del.rowsAffected} deleted (from ${e.cnt})`);
        shortDel += del.rowsAffected;
      }
    }
  }
  console.log(`\nShort-form deleted: ${shortDel}`);

  // Also delete the roman-numeral entries that have NISN matching proper format
  console.log('\n=== Clean roman-numeral duplicates ===');
  const romans = ['I','II','III','IV','V','VI'];
  let romanDel = 0;
  for (let i = 0; i < 6; i++) {
    const g = grades[i];
    const r = romans[i];
    const result = await DB.execute({
      sql: `DELETE FROM students WHERE jenjang = 'SD' AND rombel = 'Kelas ${r}' AND nisn IN (
        SELECT nisn FROM students WHERE jenjang = 'SD' AND (rombel LIKE 'Kelas ${g}%' OR rombel LIKE 'KELAS ${g}%') AND nisn IS NOT NULL AND nisn != ''
      ) AND nisn IS NOT NULL AND nisn != ''`
    });
    if (result.rowsAffected > 0) {
      console.log(`Kelas ${r}: ${result.rowsAffected} deleted`);
      romanDel += result.rowsAffected;
    }
  }
  console.log(`Roman-numeral deleted: ${romanDel}`);

  // Summary
  console.log('\n=== FINAL ===');
  const total = await DB.execute('SELECT count(1) as cnt FROM students');
  const byJenjang = await DB.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  console.log('Students: ' + total.rows[0].cnt);
  for (const r of byJenjang.rows) console.log('  ' + (r.jenjang || '?') + ': ' + r.cnt);

  // Check distinct SD rombel values
  const rombels = await DB.execute("SELECT DISTINCT rombel FROM students WHERE jenjang='SD' ORDER BY rombel");
  console.log('\nRemaining SD rombel values:');
  for (const r of rombels.rows) console.log('  "' + r.rombel + '"');
}

main().catch(console.error);
