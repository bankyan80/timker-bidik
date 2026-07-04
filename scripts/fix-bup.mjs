import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
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

const DB_URL = process.env.TURSO_DB_URL || envVars.TURSO_DB_URL;
const DB_TOKEN = process.env.TURSO_DB_TOKEN || envVars.TURSO_DB_TOKEN;

if (!DB_URL || !DB_TOKEN) {
  console.error('Error: TURSO_DB_URL and TURSO_DB_TOKEN required');
  process.exit(1);
}

const DB = createClient({ url: DB_URL, authToken: DB_TOKEN });

function getRetirementAge(jabatan) {
  return jabatan === 'Tenaga Kependidikan' ? 58 : 60;
}

function calculateBUP(tanggalLahir, jabatan) {
  const parts = tanggalLahir.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]); // 1-12
  if (isNaN(year) || isNaN(month)) return null;
  const retirementAge = getRetirementAge(jabatan);
  const retYear = year + retirementAge;
  const bupMonth = month + 1;
  const bupYear = bupMonth > 12 ? retYear + 1 : retYear;
  const bupMonthNormalized = bupMonth > 12 ? bupMonth - 12 : bupMonth;
  return `${bupYear}-${String(bupMonthNormalized).padStart(2, '0')}-01`;
}

async function main() {
  console.log('=== BUP AUTO-CALCULATION ===\n');

  const employees = await DB.execute("SELECT id, nama, tanggal_lahir, tanggal_bup, status_pegawai, jabatan FROM employees WHERE tanggal_lahir IS NOT NULL AND tanggal_lahir != ''");
  console.log('Employees with tanggal_lahir: ' + employees.rows.length);

  let updated = 0;
  let skipped = 0;

  for (const emp of employees.rows) {
    const bup = calculateBUP(emp.tanggal_lahir, emp.jabatan);
    if (!bup) { skipped++; continue; }
    // Only update if different or empty
    if (emp.tanggal_bup !== bup) {
      await DB.execute({
        sql: 'UPDATE employees SET tanggal_bup = ? WHERE id = ?',
        args: [bup, emp.id]
      });
      const age = emp.jabatan === 'Tenaga Kependidikan' ? 58 : 60;
      console.log('  ' + emp.nama + ' (' + emp.jabatan + ', ' + emp.tanggal_lahir + ') -> BUP: ' + bup + ' (age ' + age + ')' + (emp.tanggal_bup ? ' was: ' + emp.tanggal_bup : ''));
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('\nUpdated: ' + updated + ', Already correct: ' + skipped);
}

main().catch(console.error).finally(() => DB.close());
