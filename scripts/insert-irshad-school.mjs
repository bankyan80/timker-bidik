import { createClient } from '@libsql/client';

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  // Check if already exists
  const existing = await tgt.execute("SELECT * FROM schools WHERE npsn = '20215221'");
  if (existing.rows.length > 0) {
    console.log('Sudah ada di DB:');
    console.log(JSON.stringify(existing.rows[0], null, 2));
  } else {
    const now = Date.now();
    const r = await tgt.execute({
      sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng,
            students, teachers, facilities, health_score, risk_indicators)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?)`,
      args: [
        '20215221', 'SD IT AL IRSYAD AL ISLAMIYYAH', 'SD', 'Swasta', 'Lemahabang Kulon', 'B',
        -6.826944444444444, 108.62833333333332,
        JSON.stringify({ total: 150, male: 80, female: 70, byGrade: {}, growthTrend: [] }),
        JSON.stringify({ total: 8, certified: 3, pns: 0, pppk: 0, honorer: 8, subjects: {}, pendingCertification: 0, retiringSoon: 0 }),
        JSON.stringify({ classroomCondition: { good: 3, lightDamage: 1, heavyDamage: 0 }, hasLibrary: false, hasLab: false, toiletsGood: 2, toiletsDamaged: 0, internetSpeedMbps: 10, internetProvider: '' }),
        80,
        JSON.stringify({ teacherShortage: false, studentOverload: false, infrastructureCritical: false, retirementExposure: false })
      ]
    });
    console.log('Inserted:', r);
  }

  // Verify
  const check = await tgt.execute("SELECT npsn, name, level, status, village FROM schools ORDER BY level, name");
  console.log('\nTotal sekolah: ' + check.rows.length);
  for (const s of check.rows) {
    if (s.npsn === '20215221') console.log('  >>> ' + s.npsn + ' ' + s.name + ' (' + s.level + ', ' + s.status + ', ' + s.village + ')');
  }
}

main().catch(console.error);
