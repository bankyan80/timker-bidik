import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let envVars = {};
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
      }
    }
  }
} catch {}

const DB = createClient({ url: envVars.TURSO_DB_URL, authToken: envVars.TURSO_DB_TOKEN });

// Get all unfixed students
const unfixed = await DB.execute(
  `SELECT id, nisn, nama, jenjang, tanggal_lahir, kelas_kelompok, rombel
   FROM students WHERE kelas_kelompok IN ('SD','TK','KB')`
);
console.log('Unfixed students: ' + unfixed.rows.length);

const curYear = 2025; // academic year 2025/2026

const statements = [];
let skipped = 0;

for (const stu of unfixed.rows) {
  let kk = '';
  let rombel = '';

  if (stu.jenjang === 'SD') {
    // Estimate grade from birth year
    if (stu.tanggal_lahir) {
      const birthYear = parseInt(stu.tanggal_lahir.substring(0, 4));
      if (!isNaN(birthYear) && birthYear > 2000) {
        let grade = curYear - birthYear - 5; // 7 = kelas 1
        grade = Math.max(1, Math.min(6, grade));
        kk = 'Kelas ' + grade;
        rombel = kk;
      }
    }
    if (!kk) {
      kk = 'Kelas 1';
      rombel = kk;
    }
  } else if (stu.jenjang === 'TK') {
    // Estimate kelompok from birth year
    if (stu.tanggal_lahir) {
      const birthYear = parseInt(stu.tanggal_lahir.substring(0, 4));
      if (!isNaN(birthYear) && birthYear > 2015) {
        const age = curYear - birthYear;
        kk = age >= 5 ? 'Kelompok B' : 'Kelompok A';
        rombel = kk;
      }
    }
    if (!kk) {
      kk = 'Kelompok A';
      rombel = kk;
    }
  } else if (stu.jenjang === 'KB') {
    kk = 'Kelompok Bermain';
    rombel = kk;
  }

  statements.push({
    sql: 'UPDATE students SET kelas_kelompok = ?, rombel = ? WHERE id = ?',
    args: [kk, rombel, stu.id]
  });
}

console.log('Statements to execute: ' + statements.length);

const BATCH = 100;
for (let i = 0; i < statements.length; i += BATCH) {
  const batch = statements.slice(i, i + BATCH);
  await DB.batch(batch);
  if ((i + batch.length) % 500 === 0 || i + batch.length === statements.length) {
    console.log('  ' + (i + batch.length) + ' / ' + statements.length);
  }
}

console.log('\nDone. Verifying...');

const result = await DB.execute(
  "SELECT jenjang, kelas_kelompok, COUNT(*) as cnt FROM students GROUP BY jenjang, kelas_kelompok ORDER BY jenjang, kelas_kelompok"
);
console.log('Distribusi setelah fix final:');
for (const r of result.rows) {
  console.log('  ' + r.jenjang + ' | ' + r.kelas_kelompok + ' = ' + r.cnt);
}

const remaining = await DB.execute(
  "SELECT COUNT(*) as cnt FROM students WHERE kelas_kelompok IN ('SD','TK','KB')"
);
console.log('\nMasih unfixed: ' + remaining.rows[0].cnt);

const total = await DB.execute("SELECT COUNT(*) as cnt FROM students");
console.log('Total siswa: ' + total.rows[0].cnt);

DB.close();
