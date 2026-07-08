import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Read portal-dinas & build NISN set per NPSN
const raw = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/students.json', 'utf-8'));
const mapping = JSON.parse(readFileSync('C:/Users/Bank Yan/portal-dinas/temp/mappings.json', 'utf-8'));
const nameToNpsn = {};
for (const m of mapping) {
  const key = m.school_name ? m.school_name.toUpperCase().trim() : '';
  if (key) nameToNpsn[key] = m.npsn;
}
const portalNisnByNpsn = {};
for (const s of raw) {
  const schoolName = (s.sekolah || s.school_name || s.nama_sekolah || '').toUpperCase().trim();
  const npsn = nameToNpsn[schoolName] || s.npsn || s.sekolah_id || '';
  if (!npsn) continue;
  if (!portalNisnByNpsn[npsn]) portalNisnByNpsn[npsn] = new Set();
  if (s.nisn) portalNisnByNpsn[npsn].add(String(s.nisn).trim());
}

// Find remaining extras
const sdSchools = await turso.execute("SELECT npsn, name FROM schools WHERE level = 'SD' ORDER BY name");
const toDelete = [];

for (const sch of sdSchools.rows) {
  const npsn = String(sch.npsn).trim();
  const portalSet = portalNisnByNpsn[npsn] || new Set();
  const dbStudents = await turso.execute("SELECT id, nisn FROM students WHERE school_npsn = ?", [npsn]);
  for (const s of dbStudents.rows) {
    const nisn = s.nisn ? String(s.nisn).trim() : '';
    if (!nisn || !portalSet.has(nisn)) {
      toDelete.push({ id: s.id, nisn });
    }
  }
}

console.log(`Remaining to delete: ${toDelete.length}`);

// Delete in bulk — batch of 100
let deleted = 0;
for (let i = 0; i < toDelete.length; i += 100) {
  const batch = toDelete.slice(i, i + 100);
  
  // Collect NISN and IDs
  const nisnList = batch.filter(s => s.nisn).map(s => s.nisn);
  const idList = batch.map(s => s.id);
  
  // Bulk delete related tables
  for (const nisn of nisnList) {
    await turso.execute("DELETE FROM student_parents WHERE siswa_nisn = ?", [nisn]);
    await turso.execute("DELETE FROM student_addresses WHERE siswa_nisn = ?", [nisn]);
    await turso.execute("DELETE FROM student_health WHERE siswa_nisn = ?", [nisn]);
  }
  
  // Bulk delete students using IN
  const placeholders = idList.map(() => '?').join(',');
  await turso.execute(`DELETE FROM students WHERE id IN (${placeholders})`, idList);
  
  deleted += batch.length;
  console.log(`Deleted ${deleted}/${toDelete.length}`);
}

const final = await turso.execute("SELECT COUNT(*) FROM students WHERE school_npsn IN (SELECT npsn FROM schools WHERE level='SD')");
console.log(`Final SD count: ${final.rows[0]['COUNT(*)']}`);
turso.close();
