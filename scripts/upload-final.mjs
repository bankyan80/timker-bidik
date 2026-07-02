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

// ── KNOWN NAME MAPPINGS (device names → employee names) ──
const NAME_MAP = {
  'purple grey': 'DIYAN HIDAYAT',
  'oppoa16': 'CARWINAH',
  'fiona anastasya': 'SUPRIHATIN',
  'ran haircut': 'FAJAR DEDI MIFTAKHUDDIN',
  'ima ras_ahs': 'ISMAWATI',
  'yuli an': 'YULIAN SABITNI AMANAH',
  'tk n pembina lemahabang': 'MERTYANI RAHAYU',
  'fatma wati': 'FATMAWATI',
  'atikotun': 'ATI KOTUN',
  'junaedi': 'JUNAEDI',
  'bu mega': 'MEGASARI PURNAMA',
};

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
  if (d.includes('DPE')) return 'DPE';
  if (d.includes('LAINNYA')) return 'DOKUMEN LAINNYA';
  if (d.includes('PENUGASAN') || d.includes('TUGAS') || d.includes('SKBM')) return 'SK JABATAN';
  return 'LAINNYA';
}

function jenisDoc(fn, topDir) {
  const f = fn.toUpperCase().replace(/\.(PDF|JPG|JPEG|PNG)$/, '');
  const td = (topDir || '').toUpperCase();
  if (td.includes('FOTO') || /\.(JPG|JPEG|PNG)$/i.test(fn)) return 'Pas Foto';
  if (td.includes('IJAZAH') || f.includes('IJAZAH') || f.includes('TRANSKIP')) return 'Ijazah & Transkrip';
  if (td.includes('PPPK') || td.includes('P3K') || f.includes('SK_P3K') || f.includes('SK_PPPK')) return 'SK P3K/PPPK';
  if (td.includes('SK CPNS') || f.includes('SK CPNS') || (f.includes('CPNS') && f.includes('SK'))) return 'SK CPNS';
  if (td.includes('SK PANGKAT') || f.includes('SK PANGKAT')) return 'SK Pangkat';
  if (td.includes('SK JABATAN') || f.includes('JAFUNG') || f.includes('JABATAN')) return 'SK Jabatan';
  if (td.includes('SK KGB') || f.includes('KGB')) return 'SK KGB';
  if (td.includes('SKP') || td.includes('DP3') || f.includes('SKP') || f.includes('DP3')) return 'SKP-DP3';
  if (td.includes('SERTIFIKAT') || f.includes('SERTIFIKAT') || f.includes('SERDIK') || f.includes('PPG')) return 'Sertifikat';
  if (td.includes('IDENTITAS') || f.includes('KTP') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (td.includes('KELUARGA') || f.includes('KK') || f.includes('KELUARGA') || f.includes('NIKAH') || f.includes('AKTA')) return 'Kartu Keluarga';
  if (td.includes('NPWP') || f.includes('NPWP')) return 'NPWP';
  if (td.includes('BPJS') || f.includes('BPJS') || f.includes('KIS')) return 'BPJS';
  if (td.includes('KARPEG') || f.includes('KARPEG') || f.includes('KARIS') || f.includes('KARSU')) return 'KARPEG';
  if (td.includes('DPE')) return 'DPE';
  if (td.includes('PENUGASAN') || td.includes('TUGAS') || td.includes('SKBM') || f.includes('SKBM') || f.includes('SK TUGAS')) return 'SK Tugas Mengajar';
  return 'Lainnya';
}

function normName(n) {
  if (!n) return '';
  return n.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
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
const byNip = {}, byName = {}, byNameNorm = {}, bySchoolEmps = {};
for (const e of employees) {
  if (e.nip) byNip[e.nip] = e;
  const n = normName(e.nama);
  byName[e.nama] = e;
  byNameNorm[n] = e;
  if (!bySchoolEmps[e.sekolah_id]) bySchoolEmps[e.sekolah_id] = [];
  bySchoolEmps[e.sekolah_id].push(e);
}

const existingDocs = new Set(dRows.rows.map(d => `${d.employee_id}:${d.nama_file}`));
const existingDriveIds = new Set(dRows.rows.map(d => d.drive_file_id).filter(Boolean));

function findEmployee(nameStr, nipStr, schoolNpsn) {
  if (nipStr && nipStr.length >= 15 && byNip[nipStr]) return byNip[nipStr];
  const norm = normName(nameStr);
  if (!norm) return null;
  if (byNameNorm[norm]) return byNameNorm[norm];
  
  // Check name map
  const mapped = NAME_MAP[norm];
  if (mapped && byNameNorm[normName(mapped)]) return byNameNorm[normName(mapped)];
  
  let candidates = schoolNpsn && bySchoolEmps[schoolNpsn] ? bySchoolEmps[schoolNpsn] : employees;
  const words = norm.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  
  let best = null, bestScore = 0;
  for (const emp of candidates) {
    const eNorm = normName(emp.nama);
    const eWords = eNorm.split(/\s+/).filter(w => w.length > 2);
    const common = words.filter(w => eWords.includes(w)).length;
    if (common > bestScore) { bestScore = common; best = emp; }
  }
  // Lower threshold to 1 for small words
  if (bestScore >= 2) return best;
  if (bestScore === 1 && best) {
    const matchCount = employees.filter(e => normName(e.nama).includes(words[0])).length;
    if (matchCount === 1) return best;
  }
  return null;
}

// Extract possible employee name from filename — returns array of candidates
function extractNameFromPath(fn, parts) {
  let base = fn.replace(/\.[^.]+$/, '');
  
  // Known mappings first
  const lower = base.toLowerCase();
  for (const [key, val] of Object.entries(NAME_MAP)) {
    if (lower.includes(key)) return [val];
  }
  
  // Clean common noise
  function cleanName(s) {
    return s
      .replace(/\s*\(\d+\)\s*/g, '')
      .replace(/[_-]/g, ' ')
      .replace(/\.(pdf|jpg|jpeg|png)$/i, '')
      .replace(/,?\s*(S\.Pd\.?I?|S\.Pd|S\.IP|S\.Kom|S\.E|M\.Pd|S\.Ag|A\.Ma|A\.Md)/gi, '')
      .replace(/[,.]/g, ' ')
      .replace(/\b\d{10,}\b/g, '')
      .replace(/(\D)\d{2,3}\b/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  const candidates = [];
  
  // Pattern: "DocType - Name" or "DocType_Name" or "Name - Device"
  if (base.includes(' - ')) {
    const segs = base.split(' - ').filter(s => s.trim());
    for (const seg of segs) {
      const cleaned = cleanName(seg);
      if (cleaned.length > 2 && !cleaned.toLowerCase().includes('sd negeri') && !cleaned.toLowerCase().includes('tk n') && !cleaned.toLowerCase().includes('pas foto') && !cleaned.toLowerCase().includes('whatsapp')) {
        candidates.push(cleaned);
      }
    }
  }
  
  // Remove leading numbers and common doc prefixes
  base = base.replace(/^\d+[\s._-]+/, '');
  const docPrefixes = ['SK P3K', 'SK PPPK', 'SK PW', 'BPJS', 'KIS', 'KARTU', 'IJAZAH', 'KK', 'KTP', 'NPWP', 'FOTO', 'PAS FOTO', 'SERTIFIKAT', 'SERDIK', 'PENUGASAN', 'SKBM', 'SPMT', 'DATA KELUARGA', 'DOKUMEN DIRI', 'IJAZAH TRASKRIP', 'SK KEPSEK'];
  for (const dp of docPrefixes) {
    if (base.toUpperCase().startsWith(dp.toUpperCase())) {
      base = base.substring(dp.length).replace(/^[\s_-]+/, '');
    }
  }
  
  // Remove trailing device/generic strings
  const trailing = ['_compressed', ' (1)', ' (2)', ' (3)', ' - Copy', '-removebg-preview', ' baru', ' 2024', ' 2025', ' 2026'];
  for (const t of trailing) {
    base = base.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '');
  }
  
  const cleaned = cleanName(base);
  if (cleaned.length > 2) candidates.push(cleaned);
  
  return [...new Set(candidates)];
}

// ── Scan files ──
function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const e of entries) {
    const fp = join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.')) results = results.concat(walkDir(fp));
    else if (e.isFile() && /\.(pdf|jpg|jpeg|png)$/i.test(e.name)) {
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

// ── Load existing docs from DB ──
const existingRows = await db.execute("SELECT employee_id, nama_file FROM employee_documents");
const existingSet = new Set();
for (const r of existingRows.rows) existingSet.add(`${r.employee_id}:${r.nama_file}`);

const toUpload = [];
const unmatched = [];

for (const f of files) {
  if (existingSet.has(`:${f.fn}`)) continue; // skip any file
  
  // Skip SCAN DPE retired employees (6 people + butitintkgelatik)
  if (f.td === 'SCAN DPE') {
    const subfolder = f.parts[1] || '';
    const retired = ['oyah hunayah', 'pak mulya susiawan', 'shofiah', 'syahrudin', 'umi sumirah', 'wagiran', 'scanbutitintkgelatik', 'nani sumarni'];
    if (retired.some(r => subfolder.toLowerCase().includes(r))) continue;
  }

  // Skip "mamnuah ali" — not in DB
  if (f.fn.toLowerCase().includes('mamnuah ali')) continue;

  // Skip school-batch files (named after school, not employee)
  if (f.fn.toLowerCase().includes('sd negeri')) continue;
  
  // Skip generic Data Scan files — no employee name
  if (f.td === 'Data Scan P3K Lemahabang') {
    const base = f.fn.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '');
    const genericNames = ['kartu keluarga', 'buku nikah', 'akte anak', 'foto suami', 'sk pembagian tugas', 'ktp npwp', 'spmt', 'ijazah traskrip', 'data keluarga', 'dokumen diri', 'dokumen lain'];
    if (genericNames.some(g => base.toLowerCase().includes(g))) continue;
  }

  // Skip "JUNAEDI" files — person not in DB
  if (f.fn.toLowerCase().includes('junaedi')) continue;

  let nip = f.fn.match(/(\d{18})/)?.[1] || f.rp.match(/(\d{16,18})/)?.[1] || null;
  let emp = null;

  // Strategy 1: NIP in filename
  if (!emp && nip && byNip[nip]) emp = byNip[nip];

  // Strategy 2: Extract name from filename + path
  if (!emp) {
    const candidates = extractNameFromPath(f.fn, f.parts);
    for (const c of candidates) {
      emp = findEmployee(c, null, null);
      if (emp) break;
    }
  }

  // Strategy 3: Subfolder/employee folder name
  if (!emp && f.parts.length >= 2) {
    for (let i = 1; i < f.parts.length - 1; i++) {
      const cleaned = f.parts[i].replace(/[_-]/g, ' ').replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 4) {
        emp = findEmployee(cleaned, null, null);
        if (emp) break;
      }
    }
  }

  // Strategy 4: Data Scan P3K - check "HARTI" → Eni Suhartini
  if (!emp && f.td === 'Data Scan P3K Lemahabang') {
    const base = f.fn.replace(/\.[^.]+$/, '').toUpperCase();
    const schoolPart = f.parts[1] || '';
    // Map school folder name to school npsn
    const schoolMap = {
      'sdn 1 asem': '20215216',
      'sdn 2 belawa': '20215230',
      'sdn 2 cipeujeuh wetan': '20215380',
      'sdn 4 cipeujeuh wetan': '20214479',
    };
    let schoolNpsn = null;
    for (const [key, npsn] of Object.entries(schoolMap)) {
      if (schoolPart.toLowerCase().includes(key)) { schoolNpsn = npsn; break; }
    }
    
    // Try to match by partial name within the school
    if (schoolNpsn && bySchoolEmps[schoolNpsn]) {
      for (const e of bySchoolEmps[schoolNpsn]) {
        const eName = normName(e.nama);
        // Check if any significant word from file matches employee name
        const nameWords = eName.split(/\s+/).filter(w => w.length > 3);
        const fileWord = base.replace(/[^A-Z]/g, ' ').trim();
        for (const w of nameWords) {
          if (fileWord.includes(w.toUpperCase()) || w.includes(fileWord.toLowerCase())) {
            emp = e; break;
          }
        }
        if (emp) break;
      }
    }
    
    // Special: HARTI → Eni Suhartini (has "HARTINI" which contains "HARTI")
    if (!emp && schoolNpsn === '20215230') {
      const eni = bySchoolEmps['20215230'].find(e => normName(e.nama).includes('suhartini'));
      if (eni && (base.includes('HARTI') || base.includes('ENI'))) emp = eni;
    }
  }

  // Strategy 5: Map known device names
  if (!emp) {
    const lower = f.fn.toLowerCase();
    for (const [deviceName, empName] of Object.entries(NAME_MAP)) {
      if (lower.includes(deviceName)) {
        emp = findEmployee(empName, null, null);
        if (emp) break;
      }
    }
  }

  if (emp && !existingSet.has(`${emp.id}:${f.fn}`)) {
    toUpload.push({ file: f, emp });
  } else if (!emp) {
    unmatched.push(f);
  }
}

console.log(`\nTo upload: ${toUpload.length}`);
console.log(`Unmatched: ${unmatched.length}`);

if (unmatched.length > 0) {
  console.log(`\n=== STILL UNMATCHED ===`);
  const groups = {};
  for (const f of unmatched) {
    const key = f.parts.length >= 2 ? f.parts.slice(0, 2).join('/') : f.td;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  for (const [g, uf] of Object.entries(groups).sort()) {
    console.log(`\n${g} (${uf.length}):`);
    for (const f of uf.slice(0, 3)) console.log(`  ${f.fn}`);
    if (uf.length > 3) console.log(`  ... and ${uf.length - 3} more`);
  }
  const lastCount = unmatched.length;
  console.log(`\nSkipped ${lastCount} files — device names, anonymous uploads`);
}

// ── Upload ──
if (toUpload.length === 0) {
  console.log('Nothing to upload.');
  process.exit(0);
}

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.file'],
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
        kategori(file.td), jenisDoc(file.fn, file.td),
        file.fn, mime(file.fn), file.sz,
        fileId, driveUrl,
        Date.now(), Date.now(), Date.now()
      ],
    });

    uploaded++;
    existingSet.add(key);
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${file.fn} -> ${emp.nama}: ${err.message.substring(0, 100)}`);
  }
}

console.log(`\n=== UPLOADING ${toUpload.length} files ===`);
for (let i = 0; i < toUpload.length; i += CONCURRENCY) {
  const batch = toUpload.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(m => uploadOne(m)));
  if ((i + CONCURRENCY) % 20 === 0 || i + CONCURRENCY >= toUpload.length) {
    console.log(`  Progress: ${Math.min(i+CONCURRENCY, toUpload.length)}/${toUpload.length} (OK: ${uploaded}, skip: ${skipped}, fail: ${failed})`);
  }
}

console.log(`\n=== FINAL DONE ===`);
console.log(`Uploaded: ${uploaded}`);
console.log(`Skipped (already in DB): ${skipped}`);
console.log(`Failed: ${failed}`);
console.log(`Remaining unmatched (device/anonymous): ${unmatched.length}`);

// Final count
const finalCount = await db.execute("SELECT COUNT(*) as c FROM employee_documents");
console.log(`Total documents in DB: ${finalCount.rows[0].c}`);

process.exit(0);
