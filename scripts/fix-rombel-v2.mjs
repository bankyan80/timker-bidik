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

// Get all SD students grouped by school + kelas
const allSD = await DB.execute(
  "SELECT id, kelas_kelompok, rombel, school_npsn FROM students WHERE jenjang = 'SD' ORDER BY school_npsn, kelas_kelompok, nama"
);
console.log('SD students: ' + allSD.rows.length);

// Group by school + kelas
const groups = {};
for (const s of allSD.rows) {
  const key = s.school_npsn + '|' + s.kelas_kelompok;
  if (!groups[key]) groups[key] = { school: s.school_npsn, kelas: s.kelas_kelompok, students: [] };
  groups[key].students.push(s);
}

// For each (school, kelas) group, determine if single-section or multi-section
// A group is single-section if distinct rombel count = 1 (after our previous fix, all have rombel)
const statements = [];
let stripCount = 0;
let keepCount = 0;

for (const [key, group] of Object.entries(groups)) {
  const { school, kelas, students } = group;
  
  // Count distinct rombel in this group
  const distinctRombel = new Set(students.map(s => s.rombel));
  
  if (distinctRombel.size <= 1) {
    // Single section - set rombel to null (UI shows "-")
    for (const s of students) {
      statements.push({
        sql: 'UPDATE students SET rombel = NULL WHERE id = ?',
        args: [s.id],
      });
      stripCount++;
    }
  } else {
    // Multi-section - keep existing rombel
    keepCount += students.length;
  }
}

// Also handle TK/KB
if (statements.length > 0) {
  console.log('Setting rombel=NULL for ' + stripCount + ' students (single-section groups)');
  console.log('Keeping rombel for ' + keepCount + ' students (multi-section groups)');
  
  const BATCH = 100;
  for (let i = 0; i < statements.length; i += BATCH) {
    const batch = statements.slice(i, i + BATCH);
    await DB.batch(batch);
  }
}

// Verify
const remaining = await DB.execute(
  "SELECT COUNT(*) as cnt FROM students WHERE jenjang = 'SD' AND rombel IS NOT NULL AND rombel != ''"
);
console.log('\nSD with rombel filled: ' + remaining.rows[0].cnt);

const nullRombel = await DB.execute(
  "SELECT COUNT(*) as cnt FROM students WHERE jenjang = 'SD' AND (rombel IS NULL OR rombel = '')"
);
console.log('SD with rombel = NULL: ' + nullRombel.rows[0].cnt);

// Show summary per school
console.log('\n=== Per-school summary ===');
const schools = await DB.execute(`
  SELECT s.school_npsn, sc.name,
    COUNT(*) as total,
    SUM(CASE WHEN s.rombel IS NOT NULL AND s.rombel != '' THEN 1 ELSE 0 END) as filled,
    SUM(CASE WHEN s.rombel IS NULL OR s.rombel = '' THEN 1 ELSE 0 END) as stripped
  FROM students s
  LEFT JOIN schools sc ON s.school_npsn = sc.npsn
  WHERE s.jenjang = 'SD'
  GROUP BY s.school_npsn
  HAVING stripped > 0
  ORDER BY filled DESC
`);
for (const x of schools.rows) {
  console.log('  ' + (x.name || x.school_npsn).padEnd(35) + ' filled=' + String(x.filled).padStart(4) + ' stripped=' + x.stripped);
}

DB.close();
