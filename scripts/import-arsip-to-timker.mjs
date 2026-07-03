import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const CONCURRENCY = 20;

const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const arsip = JSON.parse(readFileSync('C:/Users/Bank Yan/Downloads/tursodb/arsip.json', 'utf-8'));
console.log(`Arsip total: ${arsip.length}`);

// Build maps from timker-bidik employees
const emps = await tgt.execute('SELECT id, nik, nama, sekolah_id FROM employees WHERE is_active = 1');
const empById = new Map();
const empByNik = new Map();
for (const e of emps.rows) {
  empById.set(e.id.toString(), e);
  if (e.nik) empByNik.set(e.nik.toString().trim(), e);
}
console.log(`timker employees: ${emps.rows.length}`);

// Check existing docs in timker to avoid duplicates
const existingDocs = await tgt.execute('SELECT drive_url, employee_id FROM employee_documents');
const existingUrls = new Set();
for (const d of existingDocs.rows) {
  if (d.drive_url) existingUrls.add(d.drive_url.toString());
}
console.log(`Existing employee_documents: ${existingDocs.rows.length}`);

// Map each arsip to a timker-bidik document
const KELOMPOK_MAP = {
  'Riwayat Karier': 'SK PNS-P3K',
  'Data Pribadi': 'DATA KELUARGA',
  'Pendidikan': 'IJAZAH',
  'Kinerja': 'LAINNYA'
};

const kategoriMap = new Map([
  ['KTP', 'IDENTITAS DIRI'],
  ['Kartu Keluarga', 'DATA KELUARGA'],
  ['NPWP', 'IDENTITAS DIRI'],
  ['Ijazah', 'IJAZAH'],
  ['Transkrip Nilai', 'IJAZAH'],
  ['Sertifikat Pelatihan/Diklat', 'IJAZAH'],
  ['Sertifikat Pendidik', 'IJAZAH'],
  ['Pass Foto', 'PAS FOTO'],
  ['SK Penempatan', 'SK PNS-P3K'],
  ['SK PPPK', 'SK PNS-P3K'],
  ['SK CPNS/PNS', 'SK PNS-P3K'],
  ['SK Jabatan', 'SK JABATAN'],
  ['SK Kenaikan Pangkat', 'SK PNS-P3K'],
  ['SK Pembagian Tugas', 'SK PEMBAGIAN TUGAS'],
  ['SKP', 'SK PNS-P3K'],
  ['BPJS', 'DATA KELUARGA'],
  ['Akta Anak', 'DATA KELUARGA'],
  ['Surat Nikah', 'DATA KELUARGA'],
  ['Buku Rekening', 'DATA KELUARGA'],
]);

let matched = 0, unmatched = 0, skippedDup = 0, inserted = 0;
const pending = [];

for (const a of arsip) {
  // Try matching by pegawai_id first (PGW_NIK)
  let emp = empById.get(a.pegawai_id);

  // Fallback: try matching by NIP
  if (!emp && a.nip) {
    for (const e of emps.rows) {
      if (e.nip && e.nip.toString().trim() === a.nip.trim()) { emp = e; break; }
    }
  }

  if (!emp) {
    unmatched++;
    continue;
  }
  matched++;

  // Skip if drive_url already exists in employee_documents
  if (existingUrls.has(a.download_url)) {
    skippedDup++;
    continue;
  }

  // Map kategori from jenis_dokumen or kelompok_arsip
  const kategori = kategoriMap.get(a.jenis_dokumen) || KELOMPOK_MAP[a.kelompok_arsip] || 'LAINNYA';

  const id = `ARS_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const now = Date.now();

  const q = {
    sql: `INSERT INTO employee_documents
      (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size,
       drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan,
       uploaded_at, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?)`,
    args: [id, emp.id, emp.sekolah_id, kategori, a.jenis_dokumen, a.nama_dokumen || a.file_name,
           a.file_type || 'application/pdf', a.file_size || 0,
           '', a.download_url, 'sudah_diupload', 'belum_diverifikasi', 'lengkap',
           now, now, now]
  };
  pending.push(tgt.execute(q));
  inserted++;

  if (pending.length >= CONCURRENCY) {
    await Promise.all(pending);
    pending.length = 0;
  }
  if (inserted % 200 === 0) console.log(`${inserted} inserted...`);
}

if (pending.length > 0) await Promise.all(pending);

console.log(`\n=== Arsip Import Summary ===`);
console.log(`Total arsip in tursodb: ${arsip.length}`);
console.log(`Matched to timker employee: ${matched}`);
console.log(`Unmatched: ${unmatched}`);
console.log(`Skipped duplicates: ${skippedDup}`);
console.log(`Inserted: ${inserted}`);

// Final count
const finalCount = await tgt.execute('SELECT count(1) as c FROM employee_documents');
console.log(`\nTotal employee_documents now: ${finalCount.rows[0].c}`);
