import { google } from 'googleapis';
import { createClient } from '@libsql/client';
import { readdirSync, statSync, createReadStream } from 'fs';
import { join, relative } from 'path';
import crypto from 'crypto';

const ROOT = 'C:\\Users\\Bank Yan\\OneDrive\\Documents\\BIODATA SIMPEG PNS-ASN P3K';
const CONCURRENCY = 3;

const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// ── Helpers ──
function mime(fn) {
  const e = fn.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'application/pdf';
  if (['jpg','jpeg'].includes(e)) return 'image/jpeg';
  if (e === 'png') return 'image/png';
  return 'application/octet-stream';
}

function kategori(topDir) {
  const d = (topDir || '').toUpperCase();
  if (d.includes('FOTO')) return 'PASS FOTO';
  if (d.includes('IJAZAH') || d.includes('IJASAH')) return 'IJAZAH';
  if (d.includes('SK CPNS')) return 'SK CPNS';
  if (d.includes('SK PANGKAT')) return 'SK PANGKAT';
  if (d.includes('SK JABATAN')) return 'SK JABATAN';
  if (d.includes('SK PNS') || d.includes('SK P3K') || d.includes('PPPK')) return 'SK PNS-P3K';
  if (d.includes('SK KGB')) return 'SK KGB';
  if (d.includes('SKP') || d.includes('DP3')) return 'SKP-DP3';
  if (d.includes('SERTIFIKAT') || d.includes('KOMPETENSI')) return 'SERTIFIKAT';
  if (d.includes('IDENTITAS')) return 'IDENTITAS DIRI';
  if (d.includes('KELUARGA')) return 'DATA KELUARGA';
  if (d.includes('KTP')) return 'IDENTITAS DIRI';
  if (d.includes('NPWP')) return 'IDENTITAS DIRI';
  if (d.includes('BPJS')) return 'IDENTITAS DIRI';
  if (d.includes('KARPEG')) return 'IDENTITAS DIRI';
  if (d.includes('KARIS') || d.includes('KARSU')) return 'IDENTITAS DIRI';
  if (d.includes('DPE')) return 'DPE';
  if (d.includes('LAINNYA')) return 'DOKUMEN LAINNYA';
  if (d.includes('PENUGASAN') || d.includes('TUGAS') || d.includes('SKBM')) return 'SK JABATAN';
  return 'LAINNYA';
}

function jenisDoc(fn, topDir) {
  const f = fn.toUpperCase().replace(/\.(PDF|JPG|JPEG|PNG)$/, '');
  const td = (topDir || '').toUpperCase();
  // Photo
  if (td.includes('FOTO') || /\.(JPG|JPEG|PNG)$/i.test(fn)) return 'Pas Foto';
  // Ijazah
  if (td.includes('IJAZAH') || td.includes('IJASAH') || f.includes('IJAZAH') || f.includes('IJASAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP')) return 'Ijazah & Transkrip';
  // SK PPPK/P3K
  if (td.includes('PPPK') || td.includes('P3K') || f.includes('SK_P3K') || f.includes('SK_PPPK') || f.includes('SK P3K') || f.includes('SK PPPK')) return 'SK P3K/PPPK';
  // SK CPNS
  if (td.includes('SK CPNS') || f.includes('SK CPNS') || f.includes('SKCPNS') || (f.includes('CPNS') && f.includes('SK'))) return 'SK CPNS';
  // SK Pangkat
  if (td.includes('SK PANGKAT') || f.includes('SK PANGKAT') || f.includes('SKPANGKAT') || (f.includes('PANGKAT') && f.includes('SK'))) return 'SK Pangkat';
  // SK Jabatan
  if (td.includes('SK JABATAN') || f.includes('SK JABATAN') || f.includes('SKJABATAN') || f.includes('JAFUNG') || f.includes('JABATAN') || f.includes('JAFUNG')) return 'SK Jabatan';
  // SK KGB
  if (td.includes('SK KGB') || f.includes('SK KGB') || f.includes('SKKGB') || f.includes('KGB')) return 'SK KGB';
  // SKP/DP3
  if (td.includes('SKP') || td.includes('DP3') || f.includes('SKP') || f.includes('DP3')) return 'SKP-DP3';
  // Sertifikat
  if (td.includes('SERTIFIKAT') || td.includes('KOMPETENSI') || f.includes('SERTIFIKAT') || f.includes('SERDIK') || f.includes('PPG')) return 'Sertifikat';
  // IDENTITAS
  if (td.includes('IDENTITAS') || f.includes('KTP') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  // KELUARGA
  if (td.includes('KELUARGA') || f.includes('KK') || f.includes('KELUARGA') || f.includes('NIKAH') || f.includes('AKTA')) return 'Kartu Keluarga';
  // NPWP
  if (td.includes('NPWP') || f.includes('NPWP')) return 'NPWP';
  // BPJS
  if (td.includes('BPJS') || f.includes('BPJS') || f.includes('KIS')) return 'BPJS';
  // KARPEG
  if (td.includes('KARPEG') || f.includes('KARPEG') || f.includes('KARIS') || f.includes('KARSU')) return 'KARPEG';
  // DPE
  if (td.includes('DPE')) return 'DPE';
  // PENUGASAN / SKBM
  if (td.includes('PENUGASAN') || td.includes('TUGAS') || td.includes('SKBM') || f.includes('SKBM') || f.includes('SK TUGAS') || f.includes('SK PEMBAGIAN') || f.includes('PENUGASAN')) return 'SK Tugas Mengajar';
  // Konversi NIP
  if (f.includes('KONVERSI') || f.includes('NIP BARU')) return 'SK P3K/PPPK';
  return 'Lainnya';
}

function normName(n) {
  if (!n) return '';
  return n.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanNameForMatch(raw) {
  let name = raw;
  // Remove phone model / device names
  const junk = ['oppoa16', 'purple grey', 'ran haircut', 'fiona anastasya', 'foto', 'kia', 'pdf', 'compressed', 'page-001', 'page-002', 'page-003', 'beasiswa', 'depan', 'belakang', 'terbaru', 'baru', 'semester', 'tugas', 'mengajar', 'sd', 'negeri', 'fix', 'fi x', 'tahun', 'kk', 'ktp', 'npwp', 'sk', 'p3k', 'pppk', 'pw', 'ijazah', 'ijasah', 'transkrip', 'transkip', 'bpjs', 'kis', 'sertifikat', 'pendidik', 'serdik', 'ppg', 'skbm', 'penugasan', 'pembagian', 'surat', 'aktif', 'melaksanakan', 'karpeg', 'karis', 'karsu', 'cpns', 'pangkat', 'jafung', 'konversi', 'mutasi', 'pns', 'tristianingsih', 'nursyahri', 'pernikahan', 'keluarga', 'lampiran', 'akta', 'mengajar', 'nilai', 'terakhir', 'baru', '2024', '2025', '2026', '2022', '2023', 'depan', 'belakang'];
  for (const j of junk) {
    name = name.replace(new RegExp(j.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
  }
  // Remove parenthetical device names like (1), (2)
  name = name.replace(/\(\d+\)/g, ' ');
  // Remove file extension remnants
  name = name.replace(/\.(pdf|jpg|jpeg|png)$/i, '');
  // Clean up
  name = name.replace(/[_-]/g, ' ');
  name = name.replace(/'/g, ' ');
  return name.replace(/\s+/g, ' ').trim();
}

function extractNameFromFilename(fn) {
  let base = fn.replace(/\.[^.]+$/, '');
  // Pattern: "DocType - EmployeeName - extra" or "DocType - EmployeeName"
  // Remove leading doc type
  const docTypes = [
    'SK P3K PW', 'SK PPPK PW', 'SK PARUH WAKTU', 'SK PW', 'SK P3K', 'SK PPPK',
    'BPJS KESEHATAN', 'BPJS', 'KIS', 'KARTU BPJS',
    'IJAZAH S1', 'IJAZAH', 'IJASAH',
    'KARTU KELUARGA', 'KK',
    'KTP',
    'NPWP',
    'PAS FOTO', 'PAS PHOTO', 'FOTO',
    'SERTIFIKAT PENDIDIK', 'SERTIFIKAT PENDIDIKAN', 'SERTIFIKAT PPG', 'SERDIK', 'SERTIFIKAT',
    'SK PENUGASAN', 'SK PEMBAGIAN TUGAS', 'SKBM', 'SK TUGAS', 'SURAT TUGAS',
    'SK PPPK PW', 'SK P3K PW', 'SK PARUH WAKTU',
    'SK PW', 'SK PPPK Karyati', 'SK PENGANKATAN P3KPW',
    'SK', 'Scan', 'CAMSCANNER',
  ];
  for (const dt of docTypes) {
    const re = new RegExp('^' + dt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s_-]+', 'i');
    base = base.replace(re, '');
  }
  // Also handle EmailFromat pattern: "docType (DeviceName) - EmployeeName"
  base = base.replace(/\([^)]*\)/g, '');
  // If there's " - " separator, the right part is likely the name
  if (base.includes(' - ')) {
    const parts = base.split(' - ').filter(p => p.trim());
    // Take the last part or find the one that looks like a name
    for (let i = parts.length - 1; i >= 0; i--) {
      const cleaned = cleanNameForMatch(parts[i]).trim();
      if (cleaned.length > 3) return cleaned;
    }
  }
  // If there's "_" separator (like "NIP_Name"), take the second part
  if (base.includes('_')) {
    const parts = base.split('_').filter(p => p.trim());
    const p0 = parts[0].replace(/[^0-9]/g, '');
    if (p0.length >= 15 && parts.length >= 2) return parts.slice(1).join(' ');
  }
  return cleanNameForMatch(base);
}

// ── Load DB data ──
const [sRows, eRows, dRows] = await Promise.all([
  db.execute('SELECT npsn, name FROM schools'),
  db.execute('SELECT id, sekolah_id, nama, nip, nik, status_pegawai FROM employees WHERE is_active = 1'),
  db.execute("SELECT employee_id, nama_file, drive_file_id FROM employee_documents"),
]);

const schools = {}, schoolNameToNpsn = {};
for (const r of sRows.rows) { schools[r.npsn] = r.name; schoolNameToNpsn[r.name.toLowerCase()] = r.npsn; }

const employees = eRows.rows;
const byNip = {}, byName = {}, byNameNorm = {};
for (const e of employees) {
  if (e.nip) byNip[e.nip] = e;
  const n = normName(e.nama);
  byName[e.nama] = e;
  byNameNorm[n] = e;
}

const existingDocs = new Set(dRows.rows.map(d => `${d.employee_id}:${d.nama_file}`));
const existingDriveIds = new Set(dRows.rows.map(d => d.drive_file_id).filter(Boolean));

function findEmployee(nameStr, nipStr, schoolNpsn) {
  // 1) NIP
  if (nipStr && nipStr.length >= 15 && byNip[nipStr]) return byNip[nipStr];
  
  const norm = normName(nameStr);
  if (!norm) return null;
  
  // 2) Exact by norm
  if (byNameNorm[norm]) return byNameNorm[norm];
  
  // 3) Get candidates
  let candidates = schoolNpsn && bySchoolEmps ? (bySchoolEmps[schoolNpsn] || employees) : employees;
  
  // 4) Word matching
  const words = norm.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  
  let best = null, bestScore = 0;
  for (const emp of candidates) {
    const eNorm = normName(emp.nama);
    const eWords = eNorm.split(/\s+/).filter(w => w.length > 2);
    const common = words.filter(w => eWords.includes(w)).length;
    if (common > bestScore) { bestScore = common; best = emp; }
  }
  if (bestScore >= 2) return best;
  if (bestScore === 1 && best) {
    // Check single-word uniqueness
    const matchCount = employees.filter(e => normName(e.nama).includes(words[0])).length;
    if (matchCount === 1) return best;
  }
  return null;
}

// Build school-indexed employees
const bySchoolEmps = {};
for (const e of employees) {
  if (!bySchoolEmps[e.sekolah_id]) bySchoolEmps[e.sekolah_id] = [];
  bySchoolEmps[e.sekolah_id].push(e);
}

// ── Scan all files ──
function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) {
      results = results.concat(walkDir(fp));
    } else if (e.isFile() && /\.(pdf|jpg|jpeg|png)$/i.test(e.name)) {
      const st = statSync(fp);
      const rp = relative(ROOT, fp);
      const parts = rp.split(/[\\\/]/);
      results.push({ fp, fn: e.name, td: parts[0], sz: st.size, rp, parts });
    }
  }
  return results;
}

console.log('Scanning files...');
const files = walkDir(ROOT);
console.log(`Total files: ${files.length}`);

// ── Match ──
const matches = [];
const unmatched = [];

for (const f of files) {
  const dedupKey = `:${f.fn}`;
  if (existingDocs.has(dedupKey)) continue;
  
  // Extract NIP from filename
  let nip = f.fn.match(/(\d{18})/)?.[1] || null;
  // Check more patterns (16-18 digit in path)
  if (!nip) nip = f.rp.match(/(\d{16,18})/)?.[1] || null;
  
  let emp = null;
  
  // --- Matching strategies ---
  
  // 1) NIP in filename
  if (!emp && nip && byNip[nip]) emp = byNip[nip];
  
  // 2) Extract name from filename (for PPPK PW files with " - " pattern)
  if (!emp) {
    const extractedName = extractNameFromFilename(f.fn);
    if (extractedName) {
      // Try exact match in DB
      emp = findEmployee(extractedName, null, null);
    }
  }
  
  // 3) Path-based matching (folder structure)
  if (!emp) {
    const pathJoined = f.rp.toLowerCase();
    let schoolNpsn = null;
    for (const [sname, npsn] of Object.entries(schoolNameToNpsn)) {
      if (pathJoined.includes(sname)) { schoolNpsn = npsn; break; }
    }
    if (schoolNpsn) {
      for (const part of f.parts) {
        const cleaned = cleanNameForMatch(part);
        if (cleaned.length > 4) {
          emp = findEmployee(cleaned, null, schoolNpsn);
          if (emp) break;
        }
      }
    }
  }
  
  // 4) Employee folder name in path
  if (!emp && f.parts.length >= 2) {
    for (let i = 1; i < f.parts.length - 1; i++) {
      const cleaned = cleanNameForMatch(f.parts[i]);
      if (cleaned.length > 4) {
        emp = findEmployee(cleaned, null, null);
        if (emp) break;
      }
    }
  }
  
  // 5) SCAN DPE folder - special handling
  if (!emp && f.td === 'SCAN DPE') {
    // Get the subfolder name (employee name)
    const subfolder = f.parts[1] || '';
    const cleaned = cleanNameForMatch(subfolder);
    // For SCAN DPE, the parent folder name IS the employee name
    if (cleaned.length > 3) {
      emp = findEmployee(cleaned, null, null);
      if (!emp) {
        // Try with "Nani" -> "Neni"
        if (cleaned.toLowerCase().startsWith('nani')) {
          emp = findEmployee(cleaned.replace(/^nani/i, 'Neni'), null, null);
        }
        // Try with just the first name
        const firstWord = cleaned.split(/\s+/)[0];
        if (firstWord && firstWord.length > 3) {
          emp = findEmployee(firstWord, null, null);
        }
      }
    }
  }
  
  if (emp) {
    matches.push({ file: f, emp });
  } else {
    unmatched.push(f);
  }
}

console.log(`\nMatched: ${matches.length}`);
console.log(`Unmatched: ${unmatched.length}`);

// Log unmatched files grouped by folder
console.log(`\n=== UNMATCHED FILES BY FOLDER ===`);
const unmatchedByFolder = {};
for (const f of unmatched) {
  const key = f.parts.length >= 2 ? f.parts.slice(0, 2).join('/') : f.td;
  if (!unmatchedByFolder[key]) unmatchedByFolder[key] = [];
  unmatchedByFolder[key].push(f);
}
for (const [folder, uf] of Object.entries(unmatchedByFolder).sort()) {
  console.log(`\n${folder} (${uf.length} files):`);
  for (const f of uf.slice(0, 5)) console.log(`  ${f.fn}`);
  if (uf.length > 5) console.log(`  ... and ${uf.length - 5} more`);
}

// ── Upload matched files ──
if (matches.length === 0) {
  console.log('\nNothing to upload.');
  process.exit(0);
}

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
  clientOptions: {},
});
const drive = google.drive({ version: 'v3', auth });

async function getOrCreateFolder(name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const search = await drive.files.list({ q, fields: 'files(id)' });
  if (search.data.files.length > 0) return search.data.files[0].id;
  const res = await drive.files.create({
    requestBody: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id'
  });
  return res.data.id;
}

const rootId = await getOrCreateFolder('Arsip SIMPEG Lemahabang', 'root');
console.log(`\nRoot folder: ${rootId}`);

let uploaded = 0, skipped = 0, failed = 0;

async function uploadOne(match) {
  const { file, emp } = match;
  const key = `${emp.id}:${file.fn}`;
  if (existingDocs.has(key)) { skipped++; return; }

  try {
    const schoolFolder = await getOrCreateFolder(schools[emp.sekolah_id] || emp.sekolah_id, rootId);
    const empFolder = await getOrCreateFolder(emp.nama, schoolFolder);

    const media = { mimeType: mime(file.fn), body: createReadStream(file.fp) };
    const res = await drive.files.create({
      requestBody: { name: file.fn, parents: [empFolder] },
      media,
      fields: 'id,webViewLink',
    });

    const fileId = res.data.id;
    const driveUrl = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    const kat = kategori(file.td);
    const jen = jenisDoc(file.fn, file.td);

    await db.execute({
      sql: `INSERT INTO employee_documents
            (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, uploaded_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sudah_diupload', 'belum_diverifikasi', 'lengkap', ?, ?, ?)`,
      args: [
        crypto.randomUUID(), emp.id, emp.sekolah_id,
        kat, jen,
        file.fn, mime(file.fn), file.sz,
        fileId, driveUrl,
        Date.now(), Date.now(), Date.now()
      ],
    });

    uploaded++;
    existingDocs.add(key);
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${file.fn} -> ${emp.nama}: ${err.message.substring(0, 100)}`);
  }
}

console.log(`\n=== UPLOADING ${matches.length} files ===`);
for (let i = 0; i < matches.length; i += CONCURRENCY) {
  const batch = matches.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(m => uploadOne(m)));
  if ((i + CONCURRENCY) % 30 === 0 || i + CONCURRENCY >= matches.length) {
    console.log(`  Progress: ${Math.min(i+CONCURRENCY, matches.length)}/${matches.length} (OK: ${uploaded}, skip: ${skipped}, fail: ${failed})`);
  }
}

console.log(`\n=== DONE ===`);
console.log(`Uploaded: ${uploaded}`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed: ${failed}`);
console.log(`Still unmatched: ${unmatched.length}`);

process.exit(0);
