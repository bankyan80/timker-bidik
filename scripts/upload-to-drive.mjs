import { google, Auth } from 'googleapis';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { existsSync, statSync, createReadStream } from 'fs';
import { join, relative } from 'path';
import { readdirSync } from 'fs';
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
  if (d.includes('SK PNS') || d.includes('SK P3K')) return 'SK PNS-P3K';
  if (d.includes('SK KGB')) return 'SK KGB';
  if (d.includes('SKP') || d.includes('DP3')) return 'SKP-DP3';
  if (d.includes('SERTIFIKAT') || d.includes('KOMPETENSI')) return 'SERTIFIKAT';
  if (d.includes('LAINNYA')) return 'DOKUMEN LAINNYA';
  if (d.includes('DPE')) return 'DPE';
  if (d.includes('PPPK')) return 'PPPK';
  return 'LAINNYA';
}

function jenisDoc(fn, topDir, rp) {
  const f = fn.toUpperCase().replace(/\.(PDF|JPG|JPEG|PNG)$/, '');
  if (/^1\.?\s*SK\s*(P3K|PPPK)/i.test(fn) || f.includes('SK_P3K') || f.includes('SK_PPPK')) return 'SK P3K/PPPK';
  if (/^2\.?\s*SPMT/i.test(fn) || f.startsWith('SPMT')) return 'SPMT';
  if (/^3\.?\s*(IJAZAH|IJASAH)/i.test(fn) || f.includes('IJAZAH') || f.includes('IJASAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP')) return 'Ijazah & Transkrip';
  if (/^4\.?\s*(KTP|ID_DIRI)/i.test(fn) || f.includes('ID_DIRI') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (/^5\.?\s*(KK|KARTU)/i.test(fn) || f.includes('KELUARGA')) return 'Kartu Keluarga';
  if (/^6\.?\s*SK\s*(TUGAS|PEMBAGIAN|MENGAJAR)/i.test(fn) || f.includes('SKBM') || f.includes('SK KBM') || f.includes('SK PEMBAGIAN TUGAS')) return 'SK Tugas Mengajar';
  if (/^7\.?\s*(SERTIFIKAT|SERDIK)/i.test(fn) || f.includes('SERTIFIKAT') || f.includes('SERDIK')) return 'Sertifikat';
  if (/^8\.?\s*SKBM/i.test(fn)) return 'SKBM';
  if (/^9\.?\s*(FOTO|PAS\s*FOTO)/i.test(fn) || /\.(JPG|JPEG|PNG)$/i.test(fn)) return 'Pas Foto';
  if (f.includes('DATA_KELUARGA') || f.includes('DATA KELUARGA')) return 'Data Keluarga';
  if (f.includes('ID_DIRI') || f.includes('IDENTITAS')) return 'Identitas Diri';
  if (f.includes('IJAZAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP')) return 'Ijazah & Transkrip';
  if (f.includes('SK_P3K') || f.includes('SK_PPPK') || f.includes('SK TERAKHIR') || f.includes('SK PPPK') || f.includes('SK P3K')) return 'SK P3K/PPPK';
  if (f.includes('SPMT')) return 'SPMT';
  if (f.includes('SKBM') || f.includes('SK KBM') || f.includes('SK PEMBAGIAN TUGAS')) return 'SKBM';
  if (f.includes('SERTIFIKAT') || f.includes('SERDIK')) return 'Sertifikat';
  if (/\.(JPG|JPEG|PNG)$/i.test(fn) || f.includes('FOTO')) return 'Pas Foto';
  if (f.includes('NPWP')) return 'NPWP';
  if (f.includes('BPJS') || f.includes('KIS') || f.includes('BUREK')) return 'Dokumen Pendukung';
  if (f.includes('LAINNYA')) return 'Dokumen Lainnya';
  if (topDir.includes('IDENTITAS')) return 'Identitas Diri';
  if (topDir.includes('FOTO')) return 'Pas Foto';
  if (topDir.includes('IJAZAH')) return 'Ijazah & Transkrip';
  if (topDir.includes('SK')) return 'SK Lainnya';
  if (topDir.includes('KELUARGA')) return 'Data Keluarga';
  if (topDir.includes('SERTIFIKAT')) return 'Sertifikat';
  return 'Lainnya';
}

function nipFromName(fn) { const m = fn.match(/(\d{18})/); return m?.[1]; }
function normName(n) { return n.toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim(); }

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
      results.push({ fp, fn: e.name, td: rp.split(/[\\\/]/)[0], sz: st.size, rp });
    }
  }
  return results;
}

// ── Main ──
async function main() {
  console.log('Loading data...');

  // Auth
  const auth = new Auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive.file'] });
  const drive = google.drive({ version: 'v3', auth });

  // DB data
  const [sRows, eRows] = await Promise.all([
    db.execute('SELECT npsn, name FROM schools'),
    db.execute('SELECT id, sekolah_id, nama, nip FROM employees WHERE is_active = 1'),
  ]);
  const schools = {}; for (const r of sRows.rows) schools[r.npsn] = r.name;
  const employees = eRows.rows;
  const byNip = {}; for (const e of employees) if (e.nip) byNip[e.nip] = e;
  const byName = {}; for (const e of employees) byName[normName(e.nama)] = e;

  // File → employee matching
  const files = walkDir(ROOT);
  const matches = [];
  for (const f of files) {
    const nip = nipFromName(f.fn);
    let emp = nip && byNip[nip] ? byNip[nip] : null;
    if (!emp && f.td.includes('pppk')) {
      const extracted = f.fn.replace(/\.[^/.]+$/, '').split(' - ').pop()?.trim();
      if (extracted && extracted.length > 3) {
        const n = normName(extracted);
        for (const [key, e] of Object.entries(byName)) {
          if (key.includes(n) || n.includes(key)) { emp = e; break; }
        }
      }
    }
    if (emp) matches.push({ ...f, emp });
  }
  console.log(`Files to upload: ${matches.length}`);

  // Check existing records to skip
  const existing = await db.execute('SELECT DISTINCT employee_id, nama_file FROM employee_documents');
  const existingSet = new Set();
  for (const r of existing.rows) existingSet.add(`${r.employee_id}:${r.nama_file}`);

  // Create Drive folder tree
  async function getOrCreateFolder(name, parentId) {
    const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const search = await drive.files.list({ q, fields: 'files(id)' });
    if (search.data.files.length > 0) return search.data.files[0].id;
    const res = await drive.files.create({ requestBody: { name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' });
    return res.data.id;
  }

  // Root folder
  const rootId = await getOrCreateFolder('Arsip SIMPEG Lemahabang', 'root');
  console.log('Root folder:', rootId);

  // Upload with concurrency
  let uploaded = 0, skipped = 0, failed = 0;

  async function uploadOne(f, emp) {
    const key = `${emp.id}:${f.fn}`;
    if (existingSet.has(key)) { skipped++; return; }

    const schoolFolder = await getOrCreateFolder(schools[emp.sekolah_id] || emp.sekolah_id, rootId);
    const empFolder = await getOrCreateFolder(emp.nama, schoolFolder);

    const media = { mimeType: mime(f.fn), body: createReadStream(f.fp) };
    const res = await drive.files.create({
      requestBody: { name: f.fn, parents: [empFolder] },
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
        kategori(f.td), jenisDoc(f.fn, f.td, f.rp),
        f.fn, mime(f.fn), f.sz,
        fileId, driveUrl,
        Date.now(), Date.now(), Date.now()
      ],
    });

    uploaded++;
    if (uploaded % 10 === 0 || uploaded === matches.length) {
      console.log(`  Progress: ${uploaded}/${matches.length} (skipped: ${skipped}, failed: ${failed})`);
    }
  }

  // Process in batches with concurrency
  for (let i = 0; i < matches.length; i += CONCURRENCY) {
    const batch = matches.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(m => uploadOne(m, m.emp).catch(err => {
      failed++;
      console.error(`  FAILED: ${m.fn}: ${err.message}`);
    })));
  }

  console.log(`\n=== SELESAI ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
