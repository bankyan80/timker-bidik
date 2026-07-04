import { readFileSync } from 'fs';
import { createClient } from '@libsql/client';

const env = readFileSync('.env.local', 'utf-8').split(/\n/).reduce((a, l) => {
  const m = l.match(/^(\w+)=(.+)/);
  if (m) a[m[1]] = m[2];
  return a;
}, {});

const DB = createClient({ url: env.TURSO_DB_URL, authToken: env.TURSO_DB_TOKEN });

(async () => {
  let r;

  r = await DB.execute('PRAGMA table_info("alerts")');
  console.log('=== alerts columns ===');
  for (const x of r.rows) console.log(`  ${x.name} (${x.type})`);

  r = await DB.execute('SELECT * FROM alerts LIMIT 3');
  console.log('\n=== alerts data ===');
  for (const x of r.rows) console.log(JSON.stringify(x));

  r = await DB.execute('PRAGMA table_info("recommendations")');
  console.log('\n=== recommendations columns ===');
  for (const x of r.rows) console.log(`  ${x.name} (${x.type})`);

  r = await DB.execute('SELECT * FROM recommendations LIMIT 3');
  console.log('\n=== recommendations data ===');
  for (const x of r.rows) console.log(JSON.stringify(x));

  console.log('\n=== DATA COUNTS ===');
  r = await DB.execute('SELECT COUNT(*) as c FROM students');
  console.log(`Students: ${r.rows[0].c}`);
  r = await DB.execute('SELECT COUNT(*) as c FROM employees WHERE is_active=1');
  console.log(`Active employees: ${r.rows[0].c}`);
  r = await DB.execute('SELECT COUNT(*) as c FROM employee_documents');
  console.log(`Employee docs: ${r.rows[0].c}`);
  r = await DB.execute('SELECT COUNT(*) as c FROM schools');
  console.log(`Schools: ${r.rows[0].c}`);
  r = await DB.execute('SELECT COUNT(*) as c FROM users');
  console.log(`Users: ${r.rows[0].c}`);
  r = await DB.execute("SELECT COUNT(*) as c FROM employees WHERE sertifikasi IS NOT NULL AND sertifikasi != ''");
  console.log(`Employees with sertifikasi: ${r.rows[0].c}`);
  r = await DB.execute("SELECT COUNT(*) as c FROM employees e WHERE e.is_active=1 AND NOT EXISTS (SELECT 1 FROM employee_documents ed WHERE ed.employee_id = e.id)");
  console.log(`Active employees with 0 docs: ${r.rows[0].c}`);
  r = await DB.execute("SELECT COUNT(*) as c FROM employee_documents WHERE drive_url IS NULL OR drive_url = ''");
  console.log(`Employee docs without Drive URL: ${r.rows[0].c}`);

  DB.close();
})();
