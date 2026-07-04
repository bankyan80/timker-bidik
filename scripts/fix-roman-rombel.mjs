import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading .env.local
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

async function main() {
  console.log('=== ROMAN NUMERAL ROMBEL CLEANUP ===\n');

  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const arabics = ['1', '2', '3', '4', '5', '6'];
  let totalUpdated = 0;

  for (let i = 0; i < 6; i++) {
    const roman = romans[i];
    const arabic = arabics[i];

    // Count entries with this roman numeral rombel
    const countResult = await DB.execute({
      sql: `SELECT COUNT(*) as cnt FROM students WHERE jenjang = 'SD' AND rombel COLLATE BINARY = 'Kelas ${roman}'`
    });
    const count = Number(countResult.rows[0].cnt);

    if (count > 0) {
      console.log(`Kelas ${roman} -> Kelas ${arabic}: ${count} entries`);

      // Update all roman numeral entries to arabic numeral
      const result = await DB.execute({
        sql: `UPDATE students SET rombel = 'Kelas ${arabic}' WHERE jenjang = 'SD' AND rombel COLLATE BINARY = 'Kelas ${roman}'`
      });
      console.log('  Updated: ' + result.rowsAffected);
      totalUpdated += result.rowsAffected;
    }
  }

  console.log('\nTotal updated: ' + totalUpdated);
}

main().catch(console.error).finally(() => DB.close());
