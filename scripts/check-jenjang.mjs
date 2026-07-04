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

const DB = createClient({ url: envVars.TURSO_DB_URL, authToken: envVars.TURSO_DB_TOKEN });

const r = await DB.execute("SELECT DISTINCT jenjang, kelas_kelompok, rombel FROM students ORDER BY jenjang, kelas_kelompok");
for (const row of r.rows) {
  console.log(row.jenjang + ' | ' + row.kelas_kelompok + ' | ' + (row.rombel || '-'));
}

const counts = await DB.execute("SELECT jenjang, COUNT(*) as cnt FROM students GROUP BY jenjang");
console.log('\nCounts:');
for (const row of counts.rows) {
  console.log(row.jenjang + ': ' + row.cnt);
}

DB.close();
