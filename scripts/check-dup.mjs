import { createClient } from '@libsql/client';
const DB = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// Check NISN overlap between uppercase KELAS and proper Kelas
const grades = ['1','2','3','4','5','6'];
let totalOverlap = 0;
for (const g of grades) {
  const overlap = await DB.execute(`SELECT count(1) as cnt FROM (
    SELECT nisn FROM students WHERE jenjang='SD' AND rombel LIKE 'KELAS ${g}%' AND nisn IS NOT NULL AND nisn != ''
    INTERSECT
    SELECT nisn FROM students WHERE jenjang='SD' AND rombel LIKE 'Kelas ${g}%' AND nisn IS NOT NULL AND nisn != ''
  )`);
  console.log(`NISN overlap KELAS ${g} <-> Kelas ${g}: ${overlap.rows[0].cnt}`);
  totalOverlap += overlap.rows[0].cnt;
}
console.log(`\nTotal NISN overlap (all grades): ${totalOverlap}`);

// Also check by school: how many schools have BOTH uppercase and proper for same grade?
console.log('\nSchools with both KELAS and Kelas for same grade:');
for (const g of grades) {
  const schools = await DB.execute(`SELECT school_npsn FROM (
    SELECT school_npsn FROM students WHERE jenjang='SD' AND rombel LIKE 'KELAS ${g}%'
    INTERSECT
    SELECT school_npsn FROM students WHERE jenjang='SD' AND rombel LIKE 'Kelas ${g}%'
  ) ORDER BY school_npsn`);
  console.log(`Grade ${g}: ${schools.rows.length} schools`);
}

// Check distinct rombel counts for "1" / "1A" format
console.log('\nShort-form rombel counts:');
const shorts = ['1','1A','1B','2','2A','2B','3','3A','3B','4','4A','4B','5','5A','5B','6','6A','6B','6C'];
for (const s of shorts) {
  const res = await DB.execute(`SELECT count(1) as cnt FROM students WHERE jenjang='SD' AND rombel = ?`, [s]);
  if (res.rows[0].cnt > 0) console.log(`  "${s}": ${res.rows[0].cnt}`);
}
