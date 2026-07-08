import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const turso = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

const ROMAN_MAP = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };

async function main() {
  const rows = await turso.execute(
    "SELECT id, nama, rombel FROM students WHERE jenjang = 'SD' AND (kelas_kelompok IS NULL OR kelas_kelompok = '')"
  );
  console.log(`Found ${rows.rows.length} SD students with empty kelas_kelompok`);

  const groups = {};
  for (const row of rows.rows) {
    const rombel = row.rombel?.trim();
    if (!rombel) continue;
    const prefix = rombel.split(/\s+/)[0];
    const angka = ROMAN_MAP[prefix];
    if (!angka) continue;
    if (!groups[angka]) groups[angka] = [];
    groups[angka].push(row.id);
  }

  let updated = 0;
  for (const [angka, ids] of Object.entries(groups)) {
    const placeholders = ids.map(() => '?').join(',');
    await turso.execute({
      sql: `UPDATE students SET kelas_kelompok = ? WHERE id IN (${placeholders})`,
      args: [`Kelas ${angka}`, ...ids],
    });
    updated += ids.length;
    console.log(`  Kelas ${angka}: ${ids.length} students`);
  }

  console.log(`\nUpdated ${updated} students`);
}

main().catch(console.error).finally(() => turso.close());
