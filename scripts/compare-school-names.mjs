import { createClient } from '@libsql/client';

const src = createClient({
  url: 'libsql://laporan-pendidikan-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIwMzk3MTMsImlkIjoiMDE5ZWU5ZDctZjcwMS03NDYxLWI2YTQtMzIyNTM3YjY0ZGI3IiwicmlkIjoiMGU2NDhiZTAtY2FlNy00NjEwLWEyODMtZDA4YzEzZGQ4MjllIn0.ZPMXTMXMKUO5s9Wv_NGdg0gcKv4PYcbjxOciF9wEVVlDKIodVqA_WhtzSVdZIOTyx_GEIYa_tVGx9TCKK31oAQ'
});

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

async function main() {
  const srcSchools = await src.execute("SELECT npsn, nama, jenjang, status, desa FROM schools WHERE is_active = 1 ORDER BY jenjang, nama");
  const tgtSchools = await tgt.execute('SELECT npsn, name, level, status, village FROM schools ORDER BY level, name');

  const srcMap = new Map(srcSchools.rows.map(s => [s.npsn, s]));

  console.log('=== PERBANDINGAN NAMA SEKOLAH ===\n');
  let beda = 0;
  let cocok = 0;
  let hanyaTgt = 0;
  let hanyaSrc = 0;

  for (const s of tgtSchools.rows) {
    const src = srcMap.get(s.npsn);
    if (!src) {
      console.log('[HANYA TARGET] ' + s.npsn + ' ' + s.name + ' (' + s.level + ')');
      hanyaTgt++;
      continue;
    }

    // Compare nama
    const tNama = s.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const sNama = src.nama.trim().toLowerCase().replace(/\s+/g, ' ');
    // Normalize SD/SDN prefix
    const tNorm = tNama.replace('sd negeri', 'sdn').replace('tk negeri', 'tkn');
    const sNorm = sNama.replace('sd negeri', 'sdn').replace('tk negeri', 'tkn');

    if (tNorm !== sNorm) {
      console.log('[NAMA] ' + s.npsn + ' | target: "' + s.name + '" | source: "' + src.nama + '"');
      beda++;
    } else {
      cocok++;
    }

    // Compare desa
    const tDesa = (s.village || '').trim().toLowerCase();
    const sDesa = (src.desa || '').trim().toLowerCase();
    if (tDesa !== sDesa) {
      console.log('[DESA] ' + s.npsn + ' ' + s.name + ' | target: "' + s.village + '" | source: "' + src.desa + '"');
    }
  }

  // Schools in source but not in target
  for (const s of srcSchools.rows) {
    if (!tgtSchools.rows.find(t => t.npsn === s.npsn)) {
      console.log('[HANYA SOURCE] ' + s.npsn + ' ' + s.nama + ' (' + s.jenjang + ')');
      hanyaSrc++;
    }
  }

  console.log('\n---');
  console.log('Nama cocok: ' + cocok);
  console.log('Nama beda: ' + beda);
  console.log('Hanya di target: ' + hanyaTgt);
  console.log('Hanya di source: ' + hanyaSrc);
  console.log('Total target: ' + tgtSchools.rows.length + ' | Total source: ' + srcSchools.rows.length);
}

main().catch(console.error);
