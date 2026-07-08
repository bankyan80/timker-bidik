import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const turso = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

const r = await turso.execute('SELECT npsn, name, level, status, village FROM schools ORDER BY level, name');
for (const s of r.rows) {
  console.log(`{ npsn: '${s.npsn}', name: '${s.name}'.replace(/'/g, "\\'"), level: '${s.level}', status: '${s.status}', village: '${s.village}' },`);
}
turso.close();
