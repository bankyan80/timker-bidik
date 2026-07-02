import { createClient } from '@libsql/client';
import crypto from 'crypto';

const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

function parseCSV(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { fields.push(cur); cur = ''; }
      else cur += c;
    }
    fields.push(cur);
    return fields;
  });
}

function extractFileId(url) {
  if (!url || url.trim() === '') return null;
  let m = url.match(/[?&]id=([^&]+)/);
  if (m) return m[1];
  m = url.match(/\/d\/([^/?]+)/);
  if (m) return m[1];
  m = url.match(/\/folders\/([^/?]+)/);
  if (m) return m[1];
  return null;
}

function normName(n) {
  return (n || '').toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function stripTitle(name) {
  return name.replace(/,?\s*(S\.Pd[^,]*|S\.Kom[^,]*|S\.IP[^,]*|S\.Ag[^,]*|S\.Sos[^,]*|A\.Md[^,]*|S\.E[^,]*|M\.Pd[^,]*|M\.Si[^,]*|[A-Z]\.\w+)/gi, '').replace(/["]/g, '').trim();
}

function findEmployee(name, nip, employees, byNip, byName) {
  if (nip && nip.length >= 15 && byNip[nip]) return byNip[nip];
  const n = normName(name);
  if (byName[n]) return byName[n];
  const words = n.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  let best = null, bestScore = 0;
  for (const [en, e] of Object.entries(byName)) {
    const eWords = en.split(/\s+/).filter(w => w.length > 2);
    const common = words.filter(w => eWords.includes(w)).length;
    if (common > bestScore) { bestScore = common; best = e; }
  }
  return bestScore >= 2 ? best : null;
}

async function fetchCSV(url) {
  const id = url.match(/\/d\/([^/?]+)/)?.[1];
  if (!id) throw new Error('Could not extract sheet ID from ' + url);
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  const resp = await fetch(exportUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return parseCSV(await resp.text());
}

// ── Load DB data ──
const [sRows, eRows, docRows] = await Promise.all([
  db.execute('SELECT npsn, name FROM schools'),
  db.execute('SELECT id, sekolah_id, nama, nip, nik, status_pegawai FROM employees WHERE is_active = 1'),
  db.execute('SELECT employee_id, drive_file_id, nama_file, jenis_dokumen, kategori FROM employee_documents'),
]);

for (const r of sRows.rows) {}
const employees = eRows.rows;
const byNip = {}, byName = {};
for (const e of employees) {
  if (e.nip) byNip[e.nip] = e;
  byName[normName(e.nama)] = e;
}

const existingByFileId = new Set();
const existingByEmpDoc = new Set();
for (const d of docRows.rows) {
  if (d.drive_file_id) existingByFileId.add(d.drive_file_id);
  existingByEmpDoc.add(`${d.employee_id}:${d.kategori}:${d.jenis_dokumen}`);
}

console.log(`DB: ${employees.length} employees, ${docRows.rows.length} documents`);

function sheetUrl(id) { return `https://docs.google.com/spreadsheets/d/${id}/edit?usp=sharing`; }

const SHEET_CONFIGS = [
  {
    name: '1-PPPK_PARUH_WAKTU',
    url: sheetUrl('1DpFCTLvRnfSw2asb8DZNY2TglveUsmYK_oJBZAPHwow'),
    nameCol: 2, nipCol: 3,
    photoCol: null,
    docs: [
      { col: 41, kategori: 'IJAZAH', jenis: 'Ijazah & Transkrip', nama_file_suffix: 'IJAZAH TERAKHIR' },
      { col: 42, kategori: 'PPPK', jenis: 'SK P3K/PPPK', nama_file_suffix: 'SK PPPK' },
      { col: 43, kategori: 'SK KGB', jenis: 'SK KGB', nama_file_suffix: 'SK KGB' },
      { col: 44, kategori: 'IDENTITAS DIRI', jenis: 'KARPEG', nama_file_suffix: 'KARPEG' },
      { col: 45, kategori: 'IDENTITAS DIRI', jenis: 'KARIS/KARSU', nama_file_suffix: 'KARIS KARSU' },
      { col: 46, kategori: 'IDENTITAS DIRI', jenis: 'KTP', nama_file_suffix: 'KTP' },
      { col: 47, kategori: 'DATA KELUARGA', jenis: 'Kartu Keluarga', nama_file_suffix: 'KARTU KELUARGA' },
      { col: 48, kategori: 'DATA KELUARGA', jenis: 'Akta Nikah', nama_file_suffix: 'AKTA NIKAH' },
      { col: 49, kategori: 'SK JABATAN', jenis: 'SK Tugas Mengajar', nama_file_suffix: 'SURAT TUGAS' },
      { col: 50, kategori: 'SERTIFIKAT', jenis: 'Sertifikat', nama_file_suffix: 'SERTIFIKAT PENDIDIK' },
      { col: 51, kategori: 'SK JABATAN', jenis: 'SK Kepala Sekolah', nama_file_suffix: 'SK KEPSEK' },
      { col: 52, kategori: 'DOKUMEN LAINNYA', jenis: 'Dokumen Lainnya', nama_file_suffix: 'DOKUMEN LAINNYA' },
    ]
  },
  {
    name: '2-PPPK_FOTO',
    url: sheetUrl('1kCqaWFolPToH-Y7c_wJd-HPJnwHG5x7vdHSbMfvbKqM'),
    nameCol: 2, nipCol: null,
    photoCol: 4,
    docs: []
  },
  {
    name: '3-PNS_FOLDER',
    url: sheetUrl('1MUAng-gw62IfrptbjndRx4cweHYJpgs-04vd792oAgI'),
    nameCol: 2, nipCol: 3,
    photoCol: null,
    folderCol: 5,
    docs: []
  },
  {
    name: '5-PNS_DETAIL',
    url: sheetUrl('1m2U8kRg0homsTCWB_qMN-j3cn6UB6AcDxoVh5jjWdLE'),
    nameCol: 3, nipCol: 4,
    photoCol: 2,
    docs: [
      { col: 36, kategori: 'IJAZAH', jenis: 'Ijazah & Transkrip', nama_file_suffix: 'IJAZAH' },
      { col: 37, kategori: 'PPPK', jenis: 'SK P3K/PPPK', nama_file_suffix: 'SK PPPK PW' },
      { col: 38, kategori: 'IDENTITAS DIRI', jenis: 'KTP', nama_file_suffix: 'KTP' },
      { col: 39, kategori: 'DATA KELUARGA', jenis: 'Kartu Keluarga', nama_file_suffix: 'KARTU KELUARGA' },
      { col: 40, kategori: 'IDENTITAS DIRI', jenis: 'NPWP', nama_file_suffix: 'NPWP' },
      { col: 41, kategori: 'IDENTITAS DIRI', jenis: 'BPJS', nama_file_suffix: 'BPJS KESEHATAN' },
      { col: 42, kategori: 'SERTIFIKAT', jenis: 'Sertifikat', nama_file_suffix: 'SERTIFIKAT PENDIDIK' },
      { col: 43, kategori: 'SK JABATAN', jenis: 'SK Tugas Mengajar', nama_file_suffix: 'SK PENUGASAN' },
    ]
  },
];

let totalDocs = 0, totalPhotos = 0, totalFolders = 0, skipped = 0;
const unmatched = [];

for (const cfg of SHEET_CONFIGS) {
  console.log(`\n=== ${cfg.name} ===`);
  const rows = await fetchCSV(cfg.url);
  const data = rows.slice(1).filter(r => r[cfg.nameCol] && r[cfg.nameCol].trim());
  console.log(`  ${data.length} data rows`);

  for (const row of data) {
    const rawName = row[cfg.nameCol].trim();
    const cleanName = stripTitle(rawName);
    const nipStr = cfg.nipCol ? (row[cfg.nipCol] || '').replace(/[^0-9]/g, '') : null;
    const nip = nipStr && nipStr.length >= 15 ? nipStr : null;

    const emp = findEmployee(cleanName, nip, employees, byNip, byName);
    if (!emp) {
      unmatched.push({ sheet: cfg.name, name: rawName, nip: nip || '-' });
      continue;
    }

    // ── Photo column ──
    if (cfg.photoCol !== null) {
      const photoUrl = (row[cfg.photoCol] || '').trim();
      if (photoUrl) {
        const fileId = extractFileId(photoUrl);
        if (fileId && !existingByFileId.has(fileId)) {
          const key = `${emp.id}:PASS FOTO:Pas Foto`;
          if (!existingByEmpDoc.has(key)) {
            await db.execute({
              sql: `INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, uploaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terupload', 'belum_diverifikasi', 'lengkap', ?, ?, ?)`,
              args: [crypto.randomUUID(), emp.id, emp.sekolah_id, 'PASS FOTO', 'Pas Foto', `PAS FOTO - ${cleanName}.jpg`, 'image/jpeg', 0, fileId, photoUrl, Date.now(), Date.now(), Date.now()],
            });
            totalPhotos++;
            existingByFileId.add(fileId);
            existingByEmpDoc.add(key);
          } else skipped++;
        } else if (fileId) skipped++;
      }
    }

    // ── Folder link ──
    if (cfg.folderCol !== undefined) {
      const folderUrl = (row[cfg.folderCol] || '').trim();
      if (folderUrl) {
        totalFolders++;
        const fid = extractFileId(folderUrl);
        console.log(`  FOLDER: ${cleanName} (${emp.nama}) -> ${fid || folderUrl}`);
      }
    }

    // ── Document columns ──
    for (const dc of cfg.docs) {
      const rawVal = (row[dc.col] || '').trim();
      if (!rawVal) continue;
      const fileId = extractFileId(rawVal);
      if (!fileId) continue;
      if (existingByFileId.has(fileId)) { skipped++; continue; }

      const dedupKey = `${emp.id}:${dc.kategori}:${dc.jenis}`;
      if (existingByEmpDoc.has(dedupKey)) { skipped++; continue; }

      const fileName = `${dc.nama_file_suffix} - ${cleanName}.pdf`;
      const driveUrl = rawVal.startsWith('http') ? rawVal : `https://drive.google.com/file/d/${fileId}/view`;
      const mimeType = rawVal.match(/\.(jpg|jpeg|png)$/i) ? 'image/jpeg' : 'application/pdf';

      await db.execute({
        sql: `INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, uploaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'terupload', 'belum_diverifikasi', 'lengkap', ?, ?, ?)`,
        args: [crypto.randomUUID(), emp.id, emp.sekolah_id, dc.kategori, dc.jenis, fileName, mimeType, 0, fileId, driveUrl, Date.now(), Date.now(), Date.now()],
      });

      existingByFileId.add(fileId);
      existingByEmpDoc.add(dedupKey);
      totalDocs++;
    }
  }
}

console.log(`\n=== SYNC COMPLETE ===`);
console.log(`New documents: ${totalDocs}`);
console.log(`New photos: ${totalPhotos}`);
console.log(`Folder links (logged): ${totalFolders}`);
console.log(`Skipped (duplicates): ${skipped}`);
console.log(`Unmatched employees: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log(`\n--- Unmatched employees ---`);
  for (const u of unmatched) console.log(`  [${u.sheet}] ${u.name} (NIP: ${u.nip})`);
}
process.exit(0);
