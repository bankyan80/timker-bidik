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
  "SELECT id, nisn, nama, kelas_kelompok, rombel, school_npsn FROM students WHERE jenjang = 'SD' ORDER BY school_npsn, kelas_kelompok, nama"
);
console.log('SD students: ' + allSD.rows.length);

// Group
const groups = {};
for (const s of allSD.rows) {
  const key = s.school_npsn + '|' + s.kelas_kelompok;
  if (!groups[key]) groups[key] = [];
  groups[key].push(s);
}

// Detect rombel format per school
const schoolFormats = {};
for (const s of allSD.rows) {
  const r = (s.rombel || '').trim();
  if (r && r.toLowerCase() !== s.kelas_kelompok.toLowerCase()) {
    const npsn = s.school_npsn;
    if (!schoolFormats[npsn]) schoolFormats[npsn] = new Set();
    // Extract format pattern
    const upper = r.toUpperCase();
    const gradeNum = (s.kelas_kelompok.match(/\d+/) || [''])[0];
    let pattern = 'simple'; // default "6A"
    if (upper.includes('KELAS')) {
      if (upper.includes('.')) pattern = 'kelas_dot';    // "KELAS 6.A"
      else if (upper.match(/KELAS\s+\d+\s+[A-Z]/)) pattern = 'kelas_space'; // "KELAS 6 A"
      else if (upper.match(/KELAS\s+\d+[A-Z]/)) pattern = 'kelas_compact';  // "KELAS6A"
      else pattern = 'kelas_word'; // various
    } else if (upper.match(/^\d+[A-Z]/)) {
      pattern = 'simple'; // "6A"
    }
    schoolFormats[npsn].add(pattern);
  }
}

// Show detected formats
console.log('\nDetected formats per school:');
for (const [npsn, formats] of Object.entries(schoolFormats)) {
  const sc = await DB.execute('SELECT name FROM schools WHERE npsn = ?', [npsn]);
  console.log('  ' + npsn + ' ' + (sc.rows[0]?.name || '?') + ' -> ' + [...formats].join(', '));
}

// Count format usage
const formatUsage = {};
for (const s of allSD.rows) {
  const r = (s.rombel || '').trim();
  if (r && r.toLowerCase() !== s.kelas_kelompok.toLowerCase()) {
    const upper = r.toUpperCase();
    let fmt = 'simple';
    if (upper.includes('KELAS')) {
      if (upper.includes('.')) fmt = 'kelas_dot';
      else if (upper.match(/KELAS\s+\d+\s+[A-Z]/)) fmt = 'kelas_space';
      else fmt = 'kelas_compact';
    }
    formatUsage[fmt] = (formatUsage[fmt] || 0) + 1;
  }
}
console.log('\nFormat distribution:');
for (const [fmt, cnt] of Object.entries(formatUsage).sort((a,b) => b[1]-a[1])) {
  console.log('  ' + fmt + ': ' + cnt);
}

// Helper: generate rombel string
function makeRombel(kelasKelompok, sectionLetter, schoolNpsn, gradeNum) {
  const formats = schoolFormats[schoolNpsn];
  const preferred = formats ? [...formats][0] : 'simple';
  
  switch (preferred) {
    case 'kelas_dot':
      return 'KELAS ' + gradeNum + '.' + sectionLetter;
    case 'kelas_space':
      return 'KELAS ' + gradeNum + ' ' + sectionLetter;
    case 'kelas_compact':
      return 'KELAS' + gradeNum + sectionLetter;
    case 'kelas_word':
      return 'Kelas ' + gradeNum + ' ' + sectionLetter;
    default:
      return gradeNum + sectionLetter;
  }
}

// For schools with NO format detected, use simple numeric+letter
function getFormatForSchool(npsn) {
  const f = schoolFormats[npsn];
  if (f && f.size > 0) return [...f][0];
  return 'simple';
}

const statements = [];
let fixed = 0;

for (const [key, students] of Object.entries(groups)) {
  const [npsn, kk] = key.split('|');
  const gradeMatch = kk.match(/\d+/);
  const gradeNum = gradeMatch ? gradeMatch[0] : '';

  // Separate students with/without distinct rombel
  const withRombel = [];
  const withoutRombel = [];

  for (const s of students) {
    const r = (s.rombel || '').trim();
    if (r && r.toLowerCase() !== kk.toLowerCase()) {
      withRombel.push(s);
    } else {
      withoutRombel.push(s);
    }
  }

  if (withoutRombel.length === 0) continue;

  // Detect existing section letters from withRombel
  const existingSections = [];
  for (const s of withRombel) {
    const r = s.rombel.trim().toUpperCase();
    let letter = '';
    let m = r.match(/(\d+)[\s\.]*([A-Z])\s*$/);
    if (m) letter = m[2];
    if (!letter) {
      m = r.match(/KELAS\s+\d+\s*[\.\s]*([A-Z])/);
      if (m) letter = m[1];
    }
    if (!letter) {
      m = r.match(/KELAS\s+(\d+)([A-Z])/);
      if (m) letter = m[2];
    }
    if (letter) existingSections.push(letter);
  }

  // Determine number of sections
  const uniqueSections = [...new Set(existingSections)].sort();
  let numSections = uniqueSections.length;

  // If no existing sections, calculate from student count
  if (numSections === 0) {
    const total = students.length;
    numSections = Math.max(1, Math.round(total / 30));
  }

  // Letters to use
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const sectionLetters = uniqueSections.length > 0
    ? uniqueSections
    : letters.slice(0, numSections).split('');

  // Sort students needing fix by nama
  withoutRombel.sort((a, b) => a.nama.localeCompare(b.nama));

  // Assign sections cyclically
  for (let i = 0; i < withoutRombel.length; i++) {
    const sectionLetter = sectionLetters[i % sectionLetters.length];
    const newRombel = makeRombel(kk, sectionLetter, npsn, gradeNum);
    
    statements.push({
      sql: 'UPDATE students SET rombel = ? WHERE id = ?',
      args: [newRombel, withoutRombel[i].id],
    });
    fixed++;
  }
}

console.log('\nUpdating ' + fixed + ' students...');

const BATCH = 100;
for (let i = 0; i < statements.length; i += BATCH) {
  const batch = statements.slice(i, i + BATCH);
  await DB.batch(batch);
  if ((i + batch.length) % 500 === 0 || i + batch.length === statements.length) {
    console.log('  ' + (i + batch.length) + ' / ' + statements.length);
  }
}

console.log('\nDone. Verifying...');

const remaining = await DB.execute(
  "SELECT COUNT(*) as cnt FROM students WHERE jenjang='SD' AND (rombel IS NULL OR rombel = '' OR lower(rombel) = lower(kelas_kelompok))"
);
console.log('SD still needing rombel: ' + remaining.rows[0].cnt);

const withDistinct = await DB.execute(
  "SELECT COUNT(*) as cnt FROM students WHERE jenjang='SD' AND rombel IS NOT NULL AND rombel != '' AND lower(rombel) != lower(kelas_kelompok)"
);
console.log('SD with distinct rombel: ' + withDistinct.rows[0].cnt);

// Show a few samples
const samples = await DB.execute(
  "SELECT nama, kelas_kelompok, rombel, school_npsn FROM students WHERE jenjang='SD' AND rombel IS NOT NULL AND rombel != '' AND lower(rombel) != lower(kelas_kelompok) ORDER BY RANDOM() LIMIT 10"
);
console.log('\nSamples:');
for (const s of samples.rows) {
  console.log('  ' + s.nama + ' | ' + s.kelas_kelompok + ' | rombel: ' + s.rombel);
}

DB.close();
