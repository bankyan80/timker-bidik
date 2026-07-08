import { createClient } from '@libsql/client';
import { config } from 'dotenv';
config({ path: '.env.local' });
const t = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

// Check current principals at the affected schools
const schools = ['20215161','20215506','20215287','20215564','20215230'];
for (const npsn of schools) {
  const r = await t.execute("SELECT nama, jabatan, status_pegawai FROM employees WHERE sekolah_id = ? AND (jabatan LIKE '%Kepala%' OR jabatan LIKE '%Plt%') ORDER BY nama", [npsn]);
  const r2 = await t.execute("SELECT name FROM schools WHERE npsn = ?", [npsn]);
  const schoolName = r2.rows[0]?.name || npsn;
  console.log(`\n=== ${schoolName} (${npsn}) ===`);
  if (r.rows.length === 0) console.log('  No kepala sekolah found');
  else for (const row of r.rows) console.log(`  ${row.nama} - ${row.jabatan} (${row.status_pegawai})`);
}

t.close();
