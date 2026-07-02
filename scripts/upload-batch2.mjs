import { google, Auth } from 'googleapis';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { readdirSync, statSync, createReadStream } from 'fs';
import { join, relative } from 'path';
import crypto from 'crypto';

const ROOT = 'C:\\Users\\Bank Yan\\OneDrive\\Documents\\BIODATA SIMPEG PNS-ASN P3K';
const CONCURRENCY = 5;

const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN });

function mime(fn) {
  const e = fn.split('.').pop().toLowerCase();
  if (e === 'pdf') return 'application/pdf';
  if (['jpg','jpeg'].includes(e)) return 'image/jpeg';
  if (e === 'png') return 'image/png';
  return 'application/octet-stream';
}

function kategori(topDir) {
  const d = topDir.toUpperCase();
  if (d.includes('IDENTITAS')) return 'IDENTITAS DIRI';
  if (d.includes('KELUARGA')) return 'DATA KELUARGA';
  if (d.includes('IJAZAH')) return 'IJAZAH';
  if (d.includes('FOTO')) return 'PASS FOTO';
  if (d.includes('SK CPNS')) return 'SK CPNS';
  if (d.includes('SK PANGKAT')) return 'SK PANGKAT';
  if (d.includes('SK JABATAN')) return 'SK JABATAN';
  if (d.includes('SK PNS') || d.includes('SK P3K') || d.includes('PPPK')) return 'SK PNS-P3K';
  if (d.includes('SK KGB')) return 'SK KGB';
  if (d.includes('SKP') || d.includes('DP3')) return 'SKP-DP3';
  if (d.includes('SERTIFIKAT') || d.includes('KOMPETENSI')) return 'SERTIFIKAT';
  if (d.includes('LAINNYA')) return 'DOKUMEN LAINNYA';
  if (d.includes('DPE')) return 'DPE';
  return 'LAINNYA';
}

function jenisDoc(fn, topDir, rp) {
  const f = fn.toUpperCase().replace(/\.(PDF|JPG|JPEG|PNG)$/, '');
  if (/^1\.?\s*SK\s*(P3K|PPPK)/i.test(fn) || f.includes('SK_P3K') || f.includes('SK_PPPK') || /^SK[_\s]*(P3K|PPPK)/.test(f)) return 'SK P3K/PPPK';
  if (/^2\.?\s*SPMT/i.test(fn) || f.startsWith('SPMT') || /^SPMT[_\s-]/.test(f)) return 'SPMT';
  if (/^3\.?\s*(IJAZAH|IJASAH)/i.test(fn) || f.includes('IJAZAH') || f.includes('IJASAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP')) return 'Ijazah & Transkrip';
  if (/^4\.?\s*(KTP|ID_DIRI)/i.test(fn) || f.includes('ID_DIRI') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (/^5\.?\s*(KK|KARTU)/i.test(fn) || f.includes('KELUARGA') || (f.includes('KK') && !f.includes('KTP') && !f.includes('NPWP'))) return 'Kartu Keluarga';
  if (/^6\.?\s*SK\s*(TUGAS|PEMBAGIAN|MENGAJAR)/i.test(fn) || f.includes('SKBM') || f.includes('SK KBM') || f.includes('SK PEMBAGIAN TUGAS') || f.includes('SK TUGAS')) return 'SK Tugas Mengajar';
  if (/^7\.?\s*(SERTIFIKAT|SERDIK)/i.test(fn) || f.includes('SERTIFIKAT') || f.includes('SERDIK')) return 'Sertifikat';
  if (/^8\.?\s*SKBM/i.test(fn)) return 'SKBM';
  if (/^9\.?\s*(FOTO|PAS\s*FOTO)/i.test(fn) || /\.(JPG|JPEG|PNG)$/i.test(fn)) return 'Pas Foto';
  if (f.includes('BPJS') || f.includes('KIS') || f.includes('BUREK')) return 'Dokumen Pendukung';
  if (f.includes('NPWP')) return 'NPWP';
  if (f.includes('KARPEG')) return 'KARPEG';
  if (f.includes('DATA_KELUARGA') || f.includes('DATA KELUARGA') || f.includes('KELUARGA')) return 'Kartu Keluarga';
  if (f.includes('ID_DIRI') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (f.includes('IJAZAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP')) return 'Ijazah & Transkrip';
  if (f.includes('SK_P3K') || f.includes('SK_PPPK') || f.includes('SK TERAKHIR') || f.includes('SK PPPK') || f.includes('SK P3K')) return 'SK P3K/PPPK';
  if (f.includes('SPMT')) return 'SPMT';
  if (f.includes('SKBM') || f.includes('SK KBM') || f.includes('SK PEMBAGIAN TUGAS')) return 'SKBM';
  if (f.includes('SERTIFIKAT') || f.includes('SERDIK') || f.includes('SER')) return 'Sertifikat';
  if (/\.(JPG|JPEG|PNG)$/i.test(fn) || f.includes('FOTO')) return 'Pas Foto';
  if (topDir.includes('IJAZAH') || topDir.includes('IJASAH')) return 'Ijazah & Transkrip';
  if (topDir.includes('KARTU KELUARGA')) return 'Kartu Keluarga';
  if (topDir.includes('BPJS')) return 'Dokumen Pendukung';
  if (topDir.includes('NPWP')) return 'NPWP';
  if (topDir.includes('SK PENUGASAN')) return 'SK Tugas Mengajar';
  if (topDir.includes('SK PPPK PW') || topDir.includes('SK PPPK')) return 'SK P3K/PPPK';
  if (topDir.includes('PAS FOTO') || topDir.includes('FOTO')) return 'Pas Foto';
  if (topDir.includes('SERTIFIKAT') || topDir.includes('KOMPETENSI')) return 'Sertifikat';
  if (topDir.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (topDir.includes('DPE')) return 'DPE';
  if (topDir.includes('LAINNYA')) return 'Dokumen Lainnya';
  if (topDir.includes('SKP') || topDir.includes('DP3')) return 'SKP-DP3';
  if (topDir.includes('SK KGB')) return 'SK KGB';
  if (topDir.includes('SK JABATAN')) return 'SK Jabatan';
  if (topDir.includes('SK PANGKAT')) return 'SK Pangkat';
  if (topDir.includes('SK CPNS')) return 'SK CPNS';
  if (topDir.includes('SK PNS') || topDir.includes('SK P3K')) return 'SK PNS-P3K';
  return 'Lainnya';
}

function normName(n) {
  return n.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Load data ──
const [sRows, eRows] = await Promise.all([
  db.execute('SELECT npsn, name FROM schools'),
  db.execute('SELECT id, sekolah_id, nama, nip, nik, status_pegawai FROM employees WHERE is_active = 1'),
]);

const schools = {}, schoolNameToNpsn = {};
for (const r of sRows.rows) { schools[r.npsn] = r.name; schoolNameToNpsn[r.name.toLowerCase()] = r.npsn; }

const employees = eRows.rows;
const byNip = {}, bySchoolEmps = {};
for (const e of employees) {
  if (e.nip) byNip[e.nip] = e;
  if (!bySchoolEmps[e.sekolah_id]) bySchoolEmps[e.sekolah_id] = [];
  bySchoolEmps[e.sekolah_id].push(e);
}

function findEmployeeByName(nameStr, schoolNpsn) {
  const norm = normName(nameStr);
  const words = norm.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  let candidates = schoolNpsn && bySchoolEmps[schoolNpsn] ? bySchoolEmps[schoolNpsn] : employees;
  let best = null, bestScore = 0;
  for (const emp of candidates) {
    const eWords = normName(emp.nama).split(/\s+/).filter(w => w.length > 2);
    const common = words.filter(w => eWords.includes(w)).length;
    if (common > bestScore) { bestScore = common; best = emp; }
  }
  if (bestScore >= 2) return best;
  if (bestScore === 1 && words.length <= 2) {
    for (const emp of candidates) {
      const eWords = normName(emp.nama).split(/\s+/).filter(w => w.length > 2);
      if (words.some(w => eWords.includes(w) && eWords.length <= 3)) return best;
    }
  }
  return null;
}

// ── Walk files ──
function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory()) results = results.concat(walkDir(fp));
    else if (e.isFile() && /\.(pdf|jpg|jpeg|png)$/i.test(e.name)) {
      const st = statSync(fp);
      const rp = relative(ROOT, fp);
      results.push({ fp, fn: e.name, td: rp.split(/[\\\/]/)[0], sz: st.size, rp, parts: rp.split(/[\\\/]/) });
    }
  }
  return results;
}

console.log('Scanning files...');
const files = walkDir(ROOT);
console.log(`Total files: ${files.length}`);

// Load existing to skip
const existing = await db.execute("SELECT employee_id, nama_file FROM employee_documents");
const existingSet = new Set();
for (const r of existing.rows) existingSet.add(r.nama_file);

// ── Match files not yet in DB ──
const toUpload = [];
for (const f of files) {
  if (existingSet.has(f.fn)) continue;

  const nip = f.fn.match(/(\d{18})/)?.[1];
  let emp = null;

  // 1) NIP
  if (nip && byNip[nip]) { emp = byNip[nip]; }

  // 2) Path-based
  if (!emp) {
    const pathJoined = f.rp.toLowerCase();
    let schoolNpsn = null;
    for (const [sname, npsn] of Object.entries(schoolNameToNpsn)) {
      if (pathJoined.includes(sname)) { schoolNpsn = npsn; break; }
    }
    if (schoolNpsn) {
      for (const part of f.parts) {
        const norm = normName(part);
        if (norm.length > 5 && !['scan p3k lemahabang','data scan p3k lemahabang','file responses','maks 2mb','maks 1mb','pass foto','identitas diri','dokumen kompetensi','dokumen lainnya','skp dp3','bpjs kesehatan','kartu keluarga','sertifikat pendidik','sk penugasan','sk pppk pw','pas foto'].includes(norm)) {
          emp = findEmployeeByName(norm, schoolNpsn);
          if (emp) break;
        }
      }
    }
  }

  // 3) Employee folder name
  if (!emp && f.parts.length >= 2) {
    const firstSubDir = f.parts[1];
    const norm = normName(firstSubDir);
    if (norm.length > 5) {
      emp = findEmployeeByName(norm, null);
    }
  }

  // 4) PPPK " - " separator
  if (!emp && f.td.includes('pppk')) {
    const base = f.fn.replace(/\.[^/.]+$/, '');
    if (base.includes(' - ')) {
      const namePart = base.split(' - ').pop().trim();
      if (namePart.length > 3) emp = findEmployeeByName(namePart, null);
    }
    if (!emp) {
      const parts = f.fn.replace(/\.[^/.]+$/, '').split('_');
      if (parts.length >= 2) {
        const namePart = parts[parts.length - 1].trim();
        if (namePart.length > 3) emp = findEmployeeByName(namePart, null);
      }
    }
  }

  // 5) File responses dash
  if (!emp && (f.td.includes('File responses') || f.td.includes('SCAN'))) {
    const base = f.fn.replace(/\.[^/.]+$/, '');
    if (base.includes(' - ')) {
      const parts = base.split(' - ');
      for (const p of parts) {
        const candidate = p.replace(/^[0-9._\s]+/, '').trim();
        if (candidate.length > 5 && !candidate.includes('SK ') && !candidate.includes('IJAZAH') && !candidate.includes('KTP') && !candidate.includes('NPWP') && !candidate.includes('SERTIFIKAT') && !candidate.includes('PAS FOTO') && !candidate.includes('FOTO')) {
          emp = findEmployeeByName(candidate, null);
          if (emp) break;
        }
      }
    }
  }

  // 6) Deep name search
  if (!emp) {
    const base = f.fn.replace(/\.[^/.]+$/, '');
    const fullLower = (base + ' ' + f.rp).toLowerCase();
    for (const candidate of employees) {
      const nameParts = normName(candidate.nama).split(/\s+/).filter(w => w.length > 2);
      const matchedParts = nameParts.filter(w => fullLower.includes(w));
      if (matchedParts.length >= Math.min(3, nameParts.length)) {
        emp = candidate;
        break;
      }
    }
  }

  if (emp) toUpload.push({ file: f, emp });
}

console.log(`Files to upload: ${toUpload.length}`);
console.log(`Skipped (already in DB): ${files.length - toUpload.length - (files.length - existingSet.size - toUpload.length)}`); // rough

// ── Upload to Drive ──
const auth = new Auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.file'] });
const drive = google.drive({ version: 'v3', auth });

async function getOrCreateFolder(name, parentId) {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const search = await drive.files.list({ q, fields: 'files(id)' });
  if (search.data.files.length > 0) return search.data.files[0].id;
  const res = await drive.files.create({ requestBody: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' });
  return res.data.id;
}

const rootId = await getOrCreateFolder('Arsip SIMPEG Lemahabang', 'root');
console.log('Root folder:', rootId);

let uploaded = 0, skipped = 0, failed = 0;

async function uploadOne(match) {
  const { file, emp } = match;
  const key = `${emp.id}:${file.fn}`;
  if (existingSet.has(key)) { skipped++; return; }

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

    await db.execute({
      sql: `INSERT INTO employee_documents
            (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, uploaded_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sudah_diupload', 'belum_diverifikasi', 'lengkap', ?, ?, ?)`,
      args: [
        crypto.randomUUID(), emp.id, emp.sekolah_id,
        kategori(file.td), jenisDoc(file.fn, file.td, file.rp),
        file.fn, mime(file.fn), file.sz,
        fileId, driveUrl,
        Date.now(), Date.now(), Date.now()
      ],
    });

    uploaded++;
    if (uploaded % 10 === 0 || uploaded === toUpload.length) {
      console.log(`  Progress: ${uploaded}/${toUpload.length} (skipped: ${skipped}, failed: ${failed})`);
    }
    existingSet.add(key);
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${file.fn} -> ${emp.nama}: ${err.message}`);
  }
}

console.log('Starting upload...');
for (let i = 0; i < toUpload.length; i += CONCURRENCY) {
  const batch = toUpload.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(m => uploadOne(m)));
}

console.log(`\n=== SELESAI BATCH 2 ===`);
console.log(`Uploaded: ${uploaded}`);
console.log(`Skipped: ${skipped}`);
console.log(`Failed: ${failed}`);
console.log(`Total in DB now: ${existing.rows.length + uploaded}`);

process.exit(0);
