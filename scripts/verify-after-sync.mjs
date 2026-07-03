import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // 1. Fix empty jenjang — infer from school level
  const emptyJenjang = await tgt.execute("SELECT s.id, s.nama, s.school_npsn, sc.level as school_level FROM students s LEFT JOIN schools sc ON s.school_npsn = sc.npsn WHERE (s.jenjang IS NULL OR s.jenjang = '')");
  console.log('Students with empty jenjang: ' + emptyJenjang.rows.length);

  for (const s of emptyJenjang.rows) {
    if (s.school_level) {
      await tgt.execute({
        sql: "UPDATE students SET jenjang = ? WHERE id = ?",
        args: [s.school_level, s.id]
      });
    }
  }
  console.log('  Fixed empty jenjang');

  // 2. Normalize PAUD → KB
  const paud = await tgt.execute("SELECT count(1) as cnt FROM students WHERE jenjang = 'PAUD'");
  if (paud.rows[0].cnt > 0) {
    await tgt.execute("UPDATE students SET jenjang = 'KB' WHERE jenjang = 'PAUD'");
    console.log('  Normalized PAUD → KB: ' + paud.rows[0].cnt + ' rows');
  }

  // 3. Check students with orphan NPSN (not in schools)
  const orphan = await tgt.execute(
    "SELECT count(1) as cnt FROM students s LEFT JOIN schools sc ON s.school_npsn = sc.npsn WHERE sc.npsn IS NULL"
  );
  console.log('Orphan students (NPSN not in schools): ' + orphan.rows[0].cnt);
  if (orphan.rows[0].cnt > 0) {
    const orphans = await tgt.execute(
      "SELECT s.id, s.nama, s.school_npsn, s.jenjang FROM students s LEFT JOIN schools sc ON s.school_npsn = sc.npsn WHERE sc.npsn IS NULL LIMIT 50"
    );
    for (const o of orphans.rows) {
      console.log('  Orphan: id=' + o.id + ' nama=' + o.nama + ' npsn=' + o.school_npsn + ' jenjang=' + o.jenjang);
    }
  }

  // 4. Check employees with orphan sekolah_id
  const orphanEmp = await tgt.execute(
    "SELECT count(1) as cnt FROM employees e LEFT JOIN schools s ON e.sekolah_id = s.npsn WHERE s.npsn IS NULL"
  );
  console.log('Orphan employees (sekolah_id not in schools): ' + orphanEmp.rows[0].cnt);
  if (orphanEmp.rows[0].cnt > 0) {
    const emps = await tgt.execute(
      "SELECT e.id, e.nama, e.sekolah_id FROM employees e LEFT JOIN schools s ON e.sekolah_id = s.npsn WHERE s.npsn IS NULL LIMIT 20"
    );
    for (const e of emps.rows) {
      console.log('  Orphan emp: id=' + e.id + ' nama=' + e.nama + ' sekolah_id=' + e.sekolah_id);
    }
  }

  // 5. Final counts
  console.log('\n=== FINAL COUNTS ===');
  const sc = await tgt.execute('SELECT count(1) as cnt FROM schools');
  const ec = await tgt.execute('SELECT count(1) as cnt FROM employees');
  const stc = await tgt.execute('SELECT count(1) as cnt FROM students');
  const pj = await tgt.execute('SELECT jenjang, count(1) as cnt FROM students GROUP BY jenjang ORDER BY jenjang');
  const stat = await tgt.execute("SELECT status_pegawai, count(1) as cnt FROM employees GROUP BY status_pegawai ORDER BY cnt DESC");

  console.log('Schools: ' + sc.rows[0].cnt);
  console.log('Employees: ' + ec.rows[0].cnt);
  console.log('Students: ' + stc.rows[0].cnt);
  console.log('  Students by level:');
  for (const r of pj.rows) console.log('    ' + (r.jenjang || '(empty)') + ': ' + r.cnt);
  console.log('  Employees by status:');
  for (const r of stat.rows) console.log('    ' + (r.status_pegawai || '-') + ': ' + r.cnt);
}

main().catch(console.error);
