import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const CONCURRENCY = 20;
const BATCH = 250;

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

await tgt.execute(`
  CREATE TABLE IF NOT EXISTS student_parents (
    siswa_nisn TEXT PRIMARY KEY,
    nama_ayah TEXT, nik_ayah TEXT, pendidikan_ayah TEXT, pekerjaan_ayah TEXT, penghasilan_ayah TEXT, no_hp_ayah TEXT, status_ayah TEXT,
    nama_ibu TEXT, nik_ibu TEXT, pendidikan_ibu TEXT, pekerjaan_ibu TEXT, penghasilan_ibu TEXT, no_hp_ibu TEXT, status_ibu TEXT,
    nama_wali TEXT, nik_wali TEXT, hubungan_wali TEXT, pendidikan_wali TEXT, pekerjaan_wali TEXT, penghasilan_wali TEXT, no_hp_wali TEXT
  )
`);
await tgt.execute(`
  CREATE TABLE IF NOT EXISTS student_addresses (
    siswa_nisn TEXT PRIMARY KEY,
    provinsi TEXT, kabupaten TEXT, kecamatan TEXT, desa TEXT, dusun TEXT,
    alamat TEXT, rt TEXT, rw TEXT, kode_pos TEXT,
    lat TEXT, lng TEXT, jarak_sekolah TEXT, transportasi TEXT, waktu_tempuh TEXT
  )
`);
await tgt.execute(`
  CREATE TABLE IF NOT EXISTS student_health (
    siswa_nisn TEXT PRIMARY KEY,
    golongan_darah TEXT, tinggi_badan TEXT, berat_badan TEXT,
    riwayat_penyakit TEXT, kebutuhan_khusus TEXT, catatan TEXT
  )
`);
console.log('Tables created/verified');

const siswa = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/Siswa.json', 'utf-8'));
const parents = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/OrangTuaSiswa.json', 'utf-8'));
const addr = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/AlamatSiswa.json', 'utf-8'));
const health = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/KesehatanSiswa.json', 'utf-8'));

const siswaIdToNisn = new Map();
let nisnCount = 0;
for (const s of siswa) {
  if (s.nisn) { siswaIdToNisn.set(s.id, s.nisn.trim()); nisnCount++; }
}
console.log(`tursodb Siswa: ${siswa.length} total, ${nisnCount} with NISN`);

const timkerStudents = await tgt.execute('SELECT id, nisn, nama, jenjang FROM students');
const timkerNisnSet = new Set();
for (const s of timkerStudents.rows) {
  if (s.nisn) timkerNisnSet.add(s.nisn.toString().trim());
}
console.log(`timker-bidik students: ${timkerStudents.rows.length} total, ${timkerNisnSet.size} with NISN`);

const existingParents = new Set((await tgt.execute('SELECT siswa_nisn FROM student_parents')).rows.map(r => r.siswa_nisn.toString()));
const existingAddr = new Set((await tgt.execute('SELECT siswa_nisn FROM student_addresses')).rows.map(r => r.siswa_nisn.toString()));
const existingHealth = new Set((await tgt.execute('SELECT siswa_nisn FROM student_health')).rows.map(r => r.siswa_nisn.toString()));
console.log(`Already imported: parents=${existingParents.size}, addresses=${existingAddr.size}, health=${existingHealth.size}`);

async function insertTable(table, data, cols, valGen) {
  const filterKey = table === 'student_parents' ? existingParents : table === 'student_addresses' ? existingAddr : existingHealth;
  let inserted = 0, skipped = 0, existingCount = 0;
  const pending = [];

  for (const item of data) {
    const n = siswaIdToNisn.get(item.siswaId);
    if (!n || !timkerNisnSet.has(n)) { skipped++; continue; }
    if (filterKey.has(n)) { existingCount++; continue; }
    const args = [n, ...valGen(item)];
    const q = {
      sql: `INSERT OR REPLACE INTO ${table} (siswa_nisn,${cols}) VALUES (?${',?'.repeat(cols.split(',').length)})`,
      args
    };
    pending.push(tgt.execute(q));
    inserted++;
    if (pending.length >= CONCURRENCY) {
      await Promise.all(pending);
      pending.length = 0;
    }
    if (inserted % 1000 === 0) console.log(`${table}: ${inserted} inserted...`);
  }
  if (pending.length > 0) await Promise.all(pending);

  // Update filterKey with newly inserted
  // (the SET will have them in the DB, just not in our local set)

  console.log(`${table}: total new=${inserted}, existing=${existingCount}, skipped=${skipped}`);
}

await insertTable('student_parents', parents,
  'nama_ayah,nik_ayah,pendidikan_ayah,pekerjaan_ayah,penghasilan_ayah,no_hp_ayah,status_ayah,' +
  'nama_ibu,nik_ibu,pendidikan_ibu,pekerjaan_ibu,penghasilan_ibu,no_hp_ibu,status_ibu,' +
  'nama_wali,nik_wali,hubungan_wali,pendidikan_wali,pekerjaan_wali,penghasilan_wali,no_hp_wali',
  p => [p.namaAyah,p.nikAyah,p.pendidikanAyah,p.pekerjaanAyah,p.penghasilanAyah,p.noHpAyah,p.statusAyah,
        p.namaIbu,p.nikIbu,p.pendidikanIbu,p.pekerjaanIbu,p.penghasilanIbu,p.noHpIbu,p.statusIbu,
        p.namaWali,p.nikWali,p.hubunganWali,p.pendidikanWali,p.pekerjaanWali,p.penghasilanWali,p.noHpWali]
);

await insertTable('student_addresses', addr,
  'provinsi,kabupaten,kecamatan,desa,dusun,alamat,rt,rw,kode_pos,lat,lng,jarak_sekolah,transportasi,waktu_tempuh',
  a => [a.provinsi,a.kabupaten,a.kecamatan,a.desa,a.dusun,a.alamatLengkap,a.rt,a.rw,a.kodePos,
        a.koordinatLat,a.koordinatLng,a.jarakKeSekolah,a.transportasi,a.waktuTempuh]
);

await insertTable('student_health', health,
  'golongan_darah,tinggi_badan,berat_badan,riwayat_penyakit,kebutuhan_khusus,catatan',
  h => [h.golonganDarah,h.tinggiBadan,h.beratBadan,h.riwayatPenyakit,h.kebutuhanKhusus,h.catatan]
);

// Final counts
const c1 = (await tgt.execute('SELECT count(1) as c FROM student_parents')).rows[0].c;
const c2 = (await tgt.execute('SELECT count(1) as c FROM student_addresses')).rows[0].c;
const c3 = (await tgt.execute('SELECT count(1) as c FROM student_health')).rows[0].c;
console.log(`\n=== Final ===`);
console.log(`Parents:   ${c1}`);
console.log(`Addresses: ${c2}`);
console.log(`Health:    ${c3}`);
