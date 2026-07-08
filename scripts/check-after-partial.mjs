import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

const total = await turso.execute("SELECT COUNT(*) AS c FROM students WHERE school_npsn IN (SELECT npsn FROM schools WHERE level = 'SD')");
const bySchool = await turso.execute(`
  SELECT sc.name, COUNT(*) AS cnt
  FROM students s JOIN schools sc ON sc.npsn = s.school_npsn
  WHERE sc.level = 'SD'
  GROUP BY s.school_npsn ORDER BY sc.name
`);
console.log(`Total SD: ${total.rows[0].c}`);
for (const r of bySchool.rows) {
  console.log(`  ${String(r.name).padEnd(40)} ${r.cnt}`);
}

turso.close();
