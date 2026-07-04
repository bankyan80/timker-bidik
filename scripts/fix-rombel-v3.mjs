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

const allSD = await DB.execute(
  "SELECT id, nama, kelas_kelompok, rombel, school_npsn FROM students WHERE jenjang = 'SD' ORDER BY school_npsn, kelas_kelompok, nama"
);
console.log('SD students: ' + allSD.rows.length);

// Detect school-level format preferences
const schoolFormats = {};
for (const s of allSD.rows) {
  const r = (s.rombel || '').trim();
  if (!r) continue;
  const kk = s.kelas_kelompok;
  if (r.toLowerCase() === kk.toLowerCase()) continue;
  // Validates it looks like a section (has a letter after the number)
  const upper = r.toUpperCase();
  let fmt = 'simple';
  if (upper.includes('KELAS')) {
    if (upper.includes('.')) fmt = 'kelas_dot';
    else if (upper.match(/KELAS\s+\d+\s+[A-Z]/)) fmt = 'kelas_space';
    else if (upper.match(/KELAS\s+(\d+)([A-Z])/)) fmt = 'kelas_compact';
    else fmt = 'simple';
  }
  if (!schoolFormats[s.school_npsn]) schoolFormats[s.school_npsn] = {};
  schoolFormats[s.school_npsn][fmt] = (schoolFormats[s.school_npsn][fmt] || 0) + 1;
}

function getBestFormat(npsn) {
  const counts = schoolFormats[npsn];
  if (!counts) return 'simple';
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function makeRombel(kk, sectionLetter, npsn) {
  const gradeNum = (kk.match(/\d+/) || [''])[0];
  const fmt = getBestFormat(npsn);
  switch (fmt) {
    case 'kelas_dot': return 'KELAS ' + gradeNum + '.' + sectionLetter;
    case 'kelas_space': return 'KELAS ' + gradeNum + ' ' + sectionLetter;
    case 'kelas_compact': return 'KELAS' + gradeNum + sectionLetter;
    default: return gradeNum + sectionLetter;
  }
}

// Group by school + kelas
const groups = {};
for (const s of allSD.rows) {
  const key = s.school_npsn + '|' + s.kelas_kelompok;
  if (!groups[key]) groups[key] = [];
  groups[key].push(s);
}

const SECTIONS_PER_BATCH = 28;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const statements = [];
let stripped = 0, filled = 0;

for (const [key, students] of Object.entries(groups)) {
  const [npsn, kk] = key.split('|');

  // Collect valid section letters from existing rombel
  const validSectionSet = new Set();
  let hasInvalidRombel = false;

  for (const s of students) {
    const r = (s.rombel || '').trim();
    if (!r || r.toLowerCase() === kk.toLowerCase()) { hasInvalidRombel = true; continue; }
    const upper = r.toUpperCase();
    let letter = '';
    let m = upper.match(/(\d+)[\s.]*([A-Z])\s*$/);
    if (m) letter = m[2];
    if (!letter) { m = upper.match(/KELAS\s+\d+\s*[.\s]*([A-Z])/); if (m) letter = m[1]; }
    if (!letter) { m = upper.match(/KELAS\s+(\d+)([A-Z])/); if (m) letter = m[2]; }
    if (!letter && /^\d+$/.test(r)) { hasInvalidRombel = true; continue; } // bare number like "1", "2"
    if (letter && letter >= 'A' && letter <= 'Z') validSectionSet.add(letter);
  }

  const total = students.length;
  const expectedSections = Math.max(1, Math.ceil(total / SECTIONS_PER_BATCH));
  const detectedSections = Math.max(validSectionSet.size, expectedSections);

  if (detectedSections <= 1) {
    // Single section → NULL
    for (const s of students) {
      statements.push({ sql: 'UPDATE students SET rombel = NULL WHERE id = ?', args: [s.id] });
      stripped++;
    }
  } else {
    // Multi-section → assign proper letters
    const sections = letters.slice(0, detectedSections).split('');
    // Also add any existing valid letters not in the range
    for (const l of validSectionSet) if (!sections.includes(l)) sections.push(l);
    sections.sort();

    // Sort students by nama and assign cyclically
    students.sort((a, b) => a.nama.localeCompare(b.nama));
    for (let i = 0; i < students.length; i++) {
      const sec = sections[i % sections.length];
      const newRombel = makeRombel(kk, sec, npsn);
      statements.push({ sql: 'UPDATE students SET rombel = ? WHERE id = ?', args: [newRombel, students[i].id] });
      filled++;
    }
  }
}

console.log('Stripped (NULL): ' + stripped);
console.log('Filled: ' + filled);

const BATCH = 100;
for (let i = 0; i < statements.length; i += BATCH) {
  const batch = statements.slice(i, i + BATCH);
  await DB.batch(batch);
}

// Verify
console.log('\n=== Verification ===');
const byKelas = await DB.execute(
  "SELECT school_npsn, kelas_kelompok, rombel, COUNT(*) as cnt FROM students WHERE jenjang = 'SD' GROUP BY school_npsn, kelas_kelompok, rombel ORDER BY school_npsn, kelas_kelompok"
);

let prevSchool = '';
for (const x of byKelas.rows) {
  if (x.school_npsn !== prevSchool) {
    const sc = await DB.execute('SELECT name FROM schools WHERE npsn = ?', [x.school_npsn]);
    console.log('\n' + (sc.rows[0]?.name || x.school_npsn) + ' (' + x.school_npsn + '):');
    prevSchool = x.school_npsn;
  }
  const rombel = x.rombel || '(NULL)';
  console.log('  ' + x.kelas_kelompok + ' | ' + rombel + ' = ' + x.cnt);
}

const nullCount = await DB.execute("SELECT COUNT(*) as cnt FROM students WHERE jenjang='SD' AND (rombel IS NULL OR rombel='')");
const okCount = await DB.execute("SELECT COUNT(*) as cnt FROM students WHERE jenjang='SD' AND rombel IS NOT NULL AND rombel!=''");
console.log('\nFinal: NULL=' + nullCount.rows[0].cnt + ' Filled=' + okCount.rows[0].cnt);

DB.close();
