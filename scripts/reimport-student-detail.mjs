import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });
const tgt = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

const siswa = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/Siswa.json', 'utf-8'));
const parents = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/OrangTuaSiswa.json', 'utf-8'));
const addr = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/AlamatSiswa.json', 'utf-8'));
const health = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/KesehatanSiswa.json', 'utf-8'));

const siswaIdToNisn = new Map();
for (const s of siswa) if (s.nisn) siswaIdToNisn.set(s.id, String(s.nisn).trim());

const timkerRows = await tgt.execute("SELECT nisn FROM students WHERE nisn IS NOT NULL AND nisn != ''");
const timkerNisnSet = new Set();
for (const s of timkerRows.rows) timkerNisnSet.add(String(s.nisn).trim());

const CONCURRENCY = 20;

async function batchInsert(table, data, cols, valGen) {
  const colList = cols.split(',');
  const placeholders = colList.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO ${table} (siswa_nisn,${cols}) VALUES (?,${placeholders})`;
  let inserted = 0, skipped = 0;
  const pending = [];

  for (const item of data) {
    const nisn = siswaIdToNisn.get(item.siswaId);
    if (!nisn || !timkerNisnSet.has(nisn)) { skipped++; continue; }
    pending.push(tgt.execute({ sql, args: [nisn, ...valGen(item)] }));
    inserted++;
    if (pending.length >= CONCURRENCY) { await Promise.all(pending); pending.length = 0; }
    if (inserted % 1000 === 0) console.log(`${table}: ${inserted}/${data.length}`);
  }
  if (pending.length > 0) await Promise.all(pending);
  console.log(`${table}: done (inserted=${inserted}, skipped=${skipped})`);
}

await batchInsert('student_parents', parents,
  'nama_ayah,nik_ayah,pendidikan_ayah,pekerjaan_ayah,penghasilan_ayah,no_hp_ayah,status_ayah,' +
  'nama_ibu,nik_ibu,pendidikan_ibu,pekerjaan_ibu,penghasilan_ibu,no_hp_ibu,status_ibu,' +
  'nama_wali,nik_wali,hubungan_wali,pendidikan_wali,pekerjaan_wali,penghasilan_wali,no_hp_wali',
  p => [p.namaAyah,p.nikAyah,p.pendidikanAyah,p.pekerjaanAyah,p.penghasilanAyah,p.noHpAyah,p.statusAyah,
        p.namaIbu,p.nikIbu,p.pendidikanIbu,p.pekerjaanIbu,p.penghasilanIbu,p.noHpIbu,p.statusIbu,
        p.namaWali,p.nikWali,p.hubunganWali,p.pendidikanWali,p.pekerjaanWali,p.penghasilanWali,p.noHpWali]
);

await batchInsert('student_addresses', addr,
  'provinsi,kabupaten,kecamatan,desa,dusun,alamat,rt,rw,kode_pos,lat,lng,jarak_sekolah,transportasi,waktu_tempuh',
  a => [a.provinsi,a.kabupaten,a.kecamatan,a.desa,a.dusun,a.alamatLengkap,a.rt,a.rw,a.kodePos,
        a.koordinatLat,a.koordinatLng,a.jarakKeSekolah,a.transportasi,a.waktuTempuh]
);

await batchInsert('student_health', health,
  'golongan_darah,tinggi_badan,berat_badan,riwayat_penyakit,kebutuhan_khusus,catatan',
  h => [h.golonganDarah,h.tinggiBadan,h.beratBadan,h.riwayatPenyakit,h.kebutuhanKhusus,h.catatan]
);

const f1 = (await tgt.execute("SELECT COUNT(*) FROM student_parents")).rows[0]['COUNT(*)'];
const f2 = (await tgt.execute("SELECT COUNT(*) FROM student_addresses")).rows[0]['COUNT(*)'];
const f3 = (await tgt.execute("SELECT COUNT(*) FROM student_health")).rows[0]['COUNT(*)'];
console.log(`\n=== FINAL ===`);
console.log(`Parents:   ${f1}`);
console.log(`Addresses: ${f2}`);
console.log(`Health:    ${f3}`);
tgt.close();
