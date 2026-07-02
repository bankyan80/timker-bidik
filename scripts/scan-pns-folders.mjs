import { google } from 'googleapis';
import { createClient } from '@libsql/client';
import crypto from 'crypto';

const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

function normName(n) {
  return (n || '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Load employees ──
const [eRows, dRows] = await Promise.all([
  db.execute('SELECT id, sekolah_id, nama, nip FROM employees WHERE is_active = 1'),
  db.execute('SELECT employee_id, drive_file_id FROM employee_documents'),
]);

const employees = eRows.rows;
const byNip = {}, byName = {};
for (const e of employees) {
  if (e.nip) byNip[e.nip] = e;
  byName[normName(e.nama)] = e;
}

const existingDriveIds = new Set(dRows.rows.map(d => d.drive_file_id));

function findEmployee(name, nip) {
  if (nip && nip.length >= 15 && byNip[nip]) return byNip[nip];
  const n = normName(name);
  if (byName[n]) return byName[n];
  const words = n.split(/\s+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [en, e] of Object.entries(byName)) {
    const eWords = en.split(/\s+/).filter(w => w.length > 2);
    const common = words.filter(w => eWords.includes(w)).length;
    if (common > bestScore) { bestScore = common; best = e; }
  }
  return bestScore >= 2 ? best : null;
}

function kategoriFromFileName(fn) {
  const u = fn.toUpperCase();
  if (u.includes('FOTO')) return 'PASS FOTO';
  if (u.includes('IJAZAH') || u.includes('IJASAH') || u.includes('TRANSKIP')) return 'IJAZAH';
  if (u.includes('SK CPNS')) return 'SK CPNS';
  if (u.includes('SK PANGKAT')) return 'SK PANGKAT';
  if (u.includes('SK JABATAN')) return 'SK JABATAN';
  if (u.includes('SK PNS') || u.includes('PPPK') || u.includes('P3K')) return 'SK PNS-P3K';
  if (u.includes('KGB')) return 'SK KGB';
  if (u.includes('SKP') || u.includes('DP3')) return 'SKP-DP3';
  if (u.includes('SERTIFIKAT') || u.includes('KOMPETENSI')) return 'SERTIFIKAT';
  if (u.includes('KTP') || u.includes('IDENTITAS')) return 'IDENTITAS DIRI';
  if (u.includes('KK') || u.includes('KELUARGA')) return 'DATA KELUARGA';
  if (u.includes('NPWP')) return 'IDENTITAS DIRI';
  if (u.includes('BPJS')) return 'IDENTITAS DIRI';
  if (u.includes('KARPEG')) return 'IDENTITAS DIRI';
  if (u.includes('KARIS') || u.includes('KARSU')) return 'IDENTITAS DIRI';
  if (u.includes('NIKAH')) return 'DATA KELUARGA';
  if (u.includes('DPE')) return 'DPE';
  return 'LAINNYA';
}

function jenisFromFileName(fn, kategori) {
  const u = fn.toUpperCase();
  if (kategori === 'PASS FOTO') return 'Pas Foto';
  if (kategori === 'IJAZAH') return 'Ijazah & Transkrip';
  if (kategori === 'SK CPNS') return 'SK CPNS';
  if (kategori === 'SK PANGKAT') return 'SK Pangkat';
  if (kategori === 'SK JABATAN') return 'SK Jabatan';
  if (kategori === 'SK PNS-P3K') return 'SK P3K/PPPK';
  if (kategori === 'SK KGB') return 'SK KGB';
  if (kategori === 'SKP-DP3') return 'SKP-DP3';
  if (kategori === 'SERTIFIKAT') return 'Sertifikat';
  if (kategori === 'IDENTITAS DIRI') {
    if (u.includes('KTP')) return 'KTP/Identitas Diri';
    if (u.includes('NPWP')) return 'NPWP';
    if (u.includes('BPJS')) return 'BPJS';
    if (u.includes('KARPEG')) return 'KARPEG';
    if (u.includes('KARIS') || u.includes('KARSU')) return 'KARIS/KARSU';
    return 'KTP/Identitas Diri';
  }
  if (kategori === 'DATA KELUARGA') {
    if (u.includes('NIKAH')) return 'Akta Nikah';
    return 'Kartu Keluarga';
  }
  if (kategori === 'DPE') return 'DPE';
  return 'Lainnya';
}

function mimeFromName(fn) {
  const e = fn.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'application/pdf';
  if (['jpg','jpeg'].includes(e)) return 'image/jpeg';
  if (e === 'png') return 'image/png';
  return 'application/octet-stream';
}

// ── Auth ──
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

// ── Sheet 3 folder data (from earlier sync) ──
const FOLDERS = [
  { name: 'NURLAILAH', nip: '199310222019032011', fid: '1g1xF9-yQe9JogkXTtZ1Yh7UFaSr_QAov' },
  { name: 'AAN YUNINGSIH', nip: '196802111992022001', fid: '1loJ5LZBge6GLKAjm4YbXodf5uf-D407h' },
  { name: 'ONIH ONINGSIH', nip: '196804122007012022', fid: '1_J-GBA4Af0NFrHlLn7tU0CFzQ_f8VZEG' },
  { name: 'NENI SUMARNI', nip: '198604262019032006', fid: '1kKrvXAv9EIsKFSxx-s85TOxfr1druvOH' },
  { name: 'ETIN ROHAYATIN', nip: '198007212014062003', fid: '1AdCIa8iYLZZJh-cmWHiqc5O2K-4opD2c' },
  { name: 'TSAQILLAH MUMTAJH', nip: '199603282019032005', fid: '1O0uHHZUl9o6XclCzJ3rXzWNZPnbi4hf2' },
  { name: 'MUHAMMAD NAIM', nip: '196803092007011010', fid: '14-ZeeZHb73GdRinUWJcXhB01oUUDl7eZ' },
  { name: 'CUCU SUHATI', nip: '196804092007012010', fid: '1sBUSP4lxJOsUADm06JDsLIXL6DsIBKA6' },
  { name: 'ERI ERNAWATI', nip: '198301182014092002', fid: '1HmsW9a-7r6iCuHpSuVY3-bL1q-LADJhx' },
  { name: 'MUHAMMAD MUTI', nip: '196807151990091001', fid: '1k2UlMcFRueQPREtJO6ZFaCmmXJjoV2vw' },
  { name: 'JAMALUDIN', nip: '198408252009021002', fid: '1Du_lkEZWgKhm6MTsYOf2d35IUqFNgp0j' },
  { name: 'SYAMSURI', nip: '196910101990031009', fid: '1qzg6RCIm5ryxMAlTwLzzWHmEdaSGSN2e' },
  { name: 'GUFRON', nip: '196607121986101002', fid: '197piCp2PzgLldu227Vh7TsrGBfnaun1c' },
  { name: 'DWI HATI EKA', nip: '197710202010012004', fid: '1yJUg3hdh8kIouJ4JyD0k9plIy5qltLxL' },
  { name: 'SITI PATIMAH', nip: '199502072019032006', fid: '1BQ5BV0FjrIWUPfcnSlFoTIbKwRF0kqVV' },
  { name: 'MULUS', nip: '196610141991031006', fid: '1066qHS3tMNYBGlI0mBFWI7vxxp1bQMjL' },
  { name: 'WIWIN DIANTI', nip: '197112102001122003', fid: '1Y09p0pL4CnVu7a3D1WjEf-H-4oS9BHrA' },
  { name: 'MUADHIM AL GHANIE', nip: '197208102014061001', fid: '1N0VYfGk1_y4zxxl-w9iWVDDPa_C7hNEX' },
  { name: 'JAENUDIN', nip: '197103092008011002', fid: '1Knvg3Mo4_CUezOrgjQPcIWsMfHUM2zFY' },
  { name: 'KUSNAENI', nip: '196704202008012004', fid: '1UsFUbDBBM5atd8QgZG3fEAtHXSx1QNwW' },
  { name: 'ITA RUHAYATI', nip: '198708242019032003', fid: '1LVIIPg9sC9FAnD1l2TXoZUeWKNPFH1Pl' },
  { name: 'ELIS NURSIAH', nip: '198202052008012003', fid: '1IYf6sBuJIi1oIC_b6ekINb8CCbJiUAlL' },
  { name: 'SURTIKAH', nip: '196711302007012006', fid: '1xH0yiEAYDAjclNvIBJ0MtmyqKK6oXxpT' },
  { name: 'DEDI JUNAEDI', nip: '196811021992121001', fid: '1dZMi_SQDwu1PD24Qv6CmJHNx1mMHqYMC' },
  { name: 'JUMINAH', nip: '197212042001122001', fid: '1pUs6SNBJ7ilbjZ_gP4BmmhmTQfTwG2P_' },
  { name: 'SUTINI', nip: '196911122008012015', fid: '1SveRMMoL2D9q-DrueM85Ss_mI-UmTjff' },
  { name: 'MAKHFUD ALMA\'ARIF', nip: '199110102019031008', fid: '1EPZl8Rg3OOvwCsl-CE-qGhfBxoU_V82U' },
  { name: 'SITI TRISTIANINGSIH', nip: '198611052009022001', fid: '1GBF4zP5UKvNbjt2yGEnIM03XAZxoJbgb' },
  { name: 'TITI MULYATI', nip: '198612052009022001', fid: '1k_v3TntNPXqkXTeV3jL9ECICbyKqRvCW' },
  { name: 'YEPI YULINAR KUSTIARA', nip: '199506222019032013', fid: '1ne38X76Z7kKkRXr0aYOJ3QGq-YXSO8We' },
  { name: 'SITI NURSYAHRI', nip: '197002142005012008', fid: '1LUaw1mpp-jGGeuMjSiMOjjOsRrqZjgy8' },
  { name: 'SRI WAHYUNI', nip: '198601172019032004', fid: '1ss0Db-yT63nX2wdJgv9sPpHx2WuuZoYy' },
  { name: 'SETIAWATI', nip: '196801082008012008', fid: '14rTbxEipJpdD-fzXs9gVgOEYRtw5oJun' },
  { name: 'SUKRA', nip: '196701091988031003', fid: '16P5uJTt9SQy-smx2phUjl5jhg4_Qd39r' },
  { name: 'NONI SUNTINI', nip: '197002212007012007', fid: '1fp1jrTr8Ijh-EWdgkEXs_RWKmnBnOwrI' },
  { name: 'ANAH TASRINAH', nip: '196604131988032010', fid: '1DaOGVXcoDnlE4RxDTA-oUc6u5A8Al0rQ' },
  { name: 'ESAH WASTRILAESAH', nip: '198012202005012011', fid: '12VI3ZEPa-NY3mW3aSD4eybdwRtO6DctR' },
  { name: 'YATI SUNARTI', nip: '197005012007012010', fid: '1xgC5qE1mTzd9EBYVR-JHwxdQHBS0OWmC' },
  { name: 'NUNUNG ANUGRAWATI', nip: '196801021989022001', fid: '1fjgXEAmJ9jDh2awjsmrZoaIqItwq6RKe' },
  { name: 'ELIA CAHYANI', nip: '199504182019032011', fid: '1M9Hvbiges3ngkfgHbHwjeXSjJDE4ktFG' },
  { name: 'YAYAH MARYATI', nip: '198003232009022001', fid: '1P2u5czM7aUfuIxW1R6VMM6l5ENZCEeEV' },
  { name: 'ASEP MAULANA', nip: '198612092009021001', fid: '1zqLRFdiEvGIk3qvbWqY8YpdlJIoiZ30t' },
  { name: 'SRI MELINA', nip: '196609291990032006', fid: '1e7b2rVTZITX_LlpvQ3ZsVvNl6abKmtN_' },
  { name: 'ROHILAH', nip: '196805171992032009', fid: '115Dqf5ftaysKxO0WDx5JTaBCzryUgL74' },
  { name: 'ANDI AGGASI', nip: '198207272014061002', fid: '14jF4shGjscWgPGtCSGWvhngiDLdII7UC' },
  { name: 'SITI RATIH', nip: '198502062014092001', fid: '1WkKykKfoKkTWQBzij0i1y55O3qIDX5Q5' },
  { name: 'MARLINAH FEBRIASARI', nip: '197002222000032003', fid: '1HUVzVyX-P0drXyPZ8f_BzNKh_0t3vEF9' },
  { name: 'SRIWATI SETIANAH', nip: '197301171998032004', fid: '1WdNJcQBjr7bMggSiHGNIWoW5Vo4sc80t' },
  { name: 'WATIAH', nip: '196608031988092001', fid: '1MVrSTBXW3Lzg27-RweZZm3Y4DZ6aPDwt' },
  { name: 'ROKISAH', nip: '196903032007012014', fid: '1ebGW8QXg_wH8-SjZY0eWIPa818VhLMaP' },
  { name: 'SAEFUDIN ALFARISI', nip: '198412172011011007', fid: '1MbZtzX5AwG3kTu8JwhpJTE5HH85zH8ik' },
  { name: 'APUD SYIHABUDIN', nip: '197704222009021002', fid: '1ULHE04sdyzDJgo8lb8nDIruGIchrDIu4' },
  { name: 'MANISAH', nip: '196908171990052003', fid: '1IluBA9dmyyGcc6KE1538T3SUgJHSzLkt' },
  { name: 'NINING TRININGSIH', nip: '197108172000122002', fid: '1EkczXNcOiPbWtUkDe9vw_29CuwRG3jQS' },
  { name: 'DEDE DIANA', nip: '197806022008012014', fid: '1-cvlN5OoKlQ9m6ZVEKLzFqN8bzIF-1lQ' },
  { name: 'SODIKIN', nip: '196806152008011010', fid: '12OPKirk4pbIB9_V-ms6C9BXpOUay1BOF' },
  { name: 'UNI MAUNI', nip: '197108172000122003', fid: '1VoU_Ualatlxxw_cfUVhseZY1X-G8t0aG' },
  { name: 'ADE ACHMAD YASSER', nip: '198803232009021001', fid: '1J9GYgt6_4brRRw7pZz7wEJ1RAaTeC1qu' },
  { name: 'JAMHURI', nip: '196708152007011017', fid: '1ha3FIh--Sq6kk3l-rWhuIPpFM9-nZLFH' },
  { name: 'ENDANG PRATIWI', nip: '197106122007012014', fid: '1SlHf1_pMnIBJP-_r9PuU8X5UyiQtadN8' },
  { name: 'SUKIRAH', nip: '196709062007012012', fid: '1gHDNJvrv81hrIzQ_YnRRAlxniwGYP6Gv' },
  { name: 'KOTI\'AH', nip: '197206152005012009', fid: '13aSufkKeldyc8VbMwT9phQtWHInfR-rX' },
  { name: 'IIS ISTIQOMAH', nip: '196902141991032005', fid: '16KpxlH8rNfr85qBTpt-AOIsKgd-zG9Cy' },
  { name: 'FITRI LESTARI', nip: '198710012009022001', fid: '1fcIEm7sbv8h05N3zII6tSA99tAg9pEvX' },
  { name: 'CASDI', nip: '196711071994031005', fid: '1Rm-ftV_rkb5d8_ON15AkPZw6M5dY_ojV' },
];

let totalFiles = 0, totalInserted = 0, totalSkipped = 0, accessible = 0, inaccessible = 0;

for (const folder of FOLDERS) {
  const emp = findEmployee(folder.name, folder.nip);
  if (!emp) {
    console.log(`  [SKIP] ${folder.name} — not found in DB`);
    inaccessible++;
    continue;
  }

  try {
    // List files in folder
    const res = await drive.files.list({
      q: `'${folder.fid}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, webViewLink)',
      pageSize: 100,
    });

    const files = res.data.files || [];
    accessible++;
    totalFiles += files.length;

    if (files.length === 0) {
      console.log(`  [EMPTY] ${emp.nama} — folder kosong`);
      continue;
    }

    let inserted = 0, skipped = 0;
    for (const file of files) {
      if (existingDriveIds.has(file.id)) { skipped++; continue; }

      const kategori = kategoriFromFileName(file.name);
      const jenis = jenisFromFileName(file.name, kategori);
      const mime = file.mimeType || mimeFromName(file.name);
      const size = parseInt(file.size) || 0;
      const url = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

      await db.execute({
        sql: `INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, uploaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terupload', 'belum_diverifikasi', 'lengkap', ?, ?, ?)`,
        args: [crypto.randomUUID(), emp.id, emp.sekolah_id, kategori, jenis, file.name, mime, size, file.id, url, Date.now(), Date.now(), Date.now()],
      });

      existingDriveIds.add(file.id);
      inserted++;
    }

    totalInserted += inserted;
    totalSkipped += skipped;

    console.log(`  [OK] ${emp.nama} — ${files.length} files (inserted: ${inserted}, skipped: ${skipped})`);
  } catch (err) {
    inaccessible++;
    console.log(`  [FAIL] ${folder.name} — ${err.message.substring(0, 100)}`);
  }
}

console.log(`\n=== SCAN COMPLETE ===`);
console.log(`Accessible folders: ${accessible}/${FOLDERS.length}`);
console.log(`Total files found: ${totalFiles}`);
console.log(`Inserted: ${totalInserted}`);
console.log(`Skipped (already in DB): ${totalSkipped}`);

process.exit(0);
