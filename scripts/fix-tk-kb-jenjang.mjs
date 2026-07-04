import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';

const e = readFileSync('.env.local', 'utf-8').split(/\n/).reduce((a, l) => {
  const m = l.match(/^(\w+)=(.+)/);
  if (m) a[m[1]] = m[2];
  return a;
}, {});
const DB = createClient({ url: e.TURSO_DB_URL, authToken: e.TURSO_DB_TOKEN });

// TK NPSNs
const tkNpsns = ["20254370","20254372","20254373","20254374","20254375","20254376","20254378","20270605"];

// KB NPSNs (jenjang wrongly set to TK)
const kbWrongNpsns = ["70024652","70039880","70044538"];

async function fix() {
  // ── 1. Fix TK students ──
  const tkPlaceholders = tkNpsns.map(() => '?').join(',');
  const tkStudents = await DB.execute(
    `SELECT id, nama, tanggal_lahir, kelas_kelompok, jenjang, school_npsn FROM students WHERE school_npsn IN (${tkPlaceholders}) AND jenjang != 'TK' ORDER BY school_npsn, nama`,
    tkNpsns
  );
  console.log('TK students with wrong jenjang: ' + tkStudents.rows.length);

  const curYear = 2025;
  let tkUpdated = 0;

  for (const s of tkStudents.rows) {
    // Determine kelompok from birth year
    let kelompok = 'Kelompok A';
    if (s.tanggal_lahir) {
      const by = parseInt(s.tanggal_lahir.substring(0, 4));
      if (!isNaN(by)) {
        const age = curYear - by;
        kelompok = age >= 5 ? 'Kelompok B' : 'Kelompok A';
      }
    }

    await DB.execute({
      sql: 'UPDATE students SET jenjang = ?, kelas_kelompok = ?, rombel = NULL WHERE id = ?',
      args: ['TK', kelompok, s.id],
    });
    tkUpdated++;
    if (tkUpdated <= 5 || tkUpdated % 100 === 0) {
      console.log(`  [${tkUpdated}] ${s.nama} -> TK, ${kelompok}`);
    }
  }

  // ── 2. Fix KB students with wrong jenjang (TK->KB) ──
  const kbPlaceholders = kbWrongNpsns.map(() => '?').join(',');
  const kbStudents = await DB.execute(
    `SELECT id, nama, jenjang, school_npsn, kelas_kelompok FROM students WHERE school_npsn IN (${kbPlaceholders}) AND jenjang != 'KB' ORDER BY school_npsn, nama`,
    kbWrongNpsns
  );
  console.log('\nKB students with wrong jenjang: ' + kbStudents.rows.length);

  let kbUpdated = 0;
  for (const s of kbStudents.rows) {
    await DB.execute({
      sql: 'UPDATE students SET jenjang = ?, kelas_kelompok = ?, rombel = NULL WHERE id = ?',
      args: ['KB', 'Kelompok Bermain', s.id],
    });
    kbUpdated++;
  }
  console.log('Updated KB: ' + kbUpdated);

  // ── Verify ──
  console.log('\n=== Verification ===');
  const verifyTk = await DB.execute(
    `SELECT jenjang, COUNT(*) as cnt FROM students WHERE school_npsn IN (${tkPlaceholders}) GROUP BY jenjang`,
    tkNpsns
  );
  for (const x of verifyTk.rows) console.log('TK schools: ' + x.jenjang + ' = ' + x.cnt);

  const verifyKb = await DB.execute(
    `SELECT jenjang, kelas_kelompok, COUNT(*) as cnt FROM students WHERE school_npsn IN (${kbPlaceholders}) GROUP BY jenjang, kelas_kelompok`,
    kbWrongNpsns
  );
  for (const x of verifyKb.rows) console.log('KB schools: ' + x.jenjang + ' | ' + x.kelas_kelompok + ' = ' + x.cnt);

  DB.close();
}

fix();
