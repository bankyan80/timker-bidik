import { createClient } from '@libsql/client';
const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});
const r = await db.execute("SELECT DISTINCT jenjang, kelas_kelompok, rombel, COUNT(*) as cnt FROM students WHERE jenjang IN ('TK', 'KB') GROUP BY jenjang, kelas_kelompok, rombel ORDER BY jenjang, kelas_kelompok");
for (const row of r.rows) {
  console.log(String(row.jenjang).padEnd(5), String(row.kelas_kelompok).padEnd(22), String(row.rombel || '(null)').padEnd(22), String(row.cnt));
}
