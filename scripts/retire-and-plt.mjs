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

const retiredIds = [];

// 1. Soft-delete retired employees (BUP < today)
const retired = await DB.execute(
  "SELECT id, nama, jabatan, tanggal_bup FROM employees WHERE tanggal_bup < date('now')"
);
console.log('=== RETIRED EMPLOYEES ===');
for (const x of retired.rows) {
  await DB.execute({
    sql: 'UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?',
    args: [Date.now(), x.id],
  });
  retiredIds.push(x.id);
  console.log('  [DEL] ' + x.nama + ' (' + x.jabatan + ', BUP: ' + x.tanggal_bup + ')');
}
if (retired.rows.length === 0) console.log('  (none)');

// 2. PLT assignments
const pltUpdates = [
  { nama: 'JAMALUDIN', targetSchool: '20215564', targetJabatan: 'Kepala Sekolah' },
  { nama: 'DEDI JUNAEDI', targetSchool: '20215161', targetJabatan: 'Kepala Sekolah' },
];

console.log('\n=== PLT MOVES ===');
for (const plt of pltUpdates) {
  const emp = await DB.execute("SELECT id, nama, sekolah_id, jabatan FROM employees WHERE lower(nama) = ?", [plt.nama.toLowerCase()]);
  if (emp.rows.length === 0) {
    console.log('  [SKIP] ' + plt.nama + ' not found');
    continue;
  }
  const e = emp.rows[0];
  const oldSchool = await DB.execute('SELECT name FROM schools WHERE npsn = ?', [e.sekolah_id]);
  const newSchool = await DB.execute('SELECT name FROM schools WHERE npsn = ?', [plt.targetSchool]);
  const oldName = oldSchool.rows[0]?.name || e.sekolah_id;
  const newName = newSchool.rows[0]?.name || plt.targetSchool;

  await DB.execute({
    sql: 'UPDATE employees SET sekolah_id = ?, jabatan = ?, updated_at = ? WHERE id = ?',
    args: [plt.targetSchool, plt.targetJabatan, Date.now(), e.id],
  });
  console.log('  [MOVE] ' + e.nama + ': ' + oldName + ' (' + e.jabatan + ') -> ' + newName + ' (' + plt.targetJabatan + ')');
}

console.log('\nDone.');
DB.close();
