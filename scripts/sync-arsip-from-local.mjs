/**
 * Sync document archives from local BIODATA SIMPEG folder to database + Drive.
 *
 * Scans files in:
 *   C:\Users\Bank Yan\OneDrive\Documents\BIODATA SIMPEG PNS-ASN P3K
 *
 * Matches files to employees by NIK, or by name+school extracted from filename/folder.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ROOT = 'C:\\Users\\Bank Yan\\OneDrive\\Documents\\BIODATA SIMPEG PNS-ASN P3K';
const DRIVE_FOLDER_NAME = 'Arsip SIMPEG Lemahabang';

const NIK_RE = /\b(\d{15,})\b/;

const CATEGORY_MAP = {
  'DATA KELUARGA': 'DATA_KELUARGA',
  'IDENTITAS DIRI': 'IDENTITAS_DIRI',
  'ID_DIRI': 'IDENTITAS_DIRI',
  'IDENTIAS': 'IDENTITAS_DIRI',
  'PASS FOTO': 'PASS_FOTO',
  'FOTO': 'PASS_FOTO',
  'SCAN IJAZAH': 'IJAZAH',
  'IJAZAH': 'IJAZAH',
  'IJAZAH_TRANSKIP': 'IJAZAH',
  'SK PNS-P3K': 'SK_PNS_PPPK',
  'SK_PPPK': 'SK_PNS_PPPK',
  'SK PPPK': 'SK_PNS_PPPK',
  'SK_PNS': 'SK_PNS_PPPK',
  'SK CPNS': 'SK_CPNS',
  'SK PANGKAT': 'SK_PANGKAT',
  'SK JABATAN': 'SK_JABATAN',
  'SK KGB': 'SK_KGB',
  'SERTIFIKAT': 'SERTIFIKAT',
  'SERDIK': 'SERTIFIKAT',
  'DOKUMEN KOMPETENSI': 'KOMPETENSI',
  'DOKUMEN LAINNYA': 'LAINNYA',
  'LAINNYA': 'LAINNYA',
  'SKP-DP3': 'SKP_DP3',
  'SCAN DPE': 'DPE',
  'SPMT': 'SPMT',
  'DATA_KELUARGA': 'DATA_KELUARGA',
};

function detectCategory(fileName, parentFolder) {
  const upper = fileName.toUpperCase();
  const folderUpper = parentFolder.toUpperCase();

  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (upper.startsWith(key) || folderUpper.includes(key)) return cat;
  }

  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (folderUpper.includes(key)) return cat;
  }

  return 'LAINNYA';
}

function extractNIK(fileName) {
  const match = fileName.match(NIK_RE);
  return match ? match[1] : null;
}

function cleanName(raw) {
  return raw
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeSchoolName(name) {
  let n = cleanName(name)
    .replace(/^sdn\b/, 'sd negeri')
    .replace(/\bsd\b/, 'sd')
    .replace(/\btk\b/, 'tk')
    .replace(/\bkb\b/, 'kb');
  // Handle spelling variants
  n = n.replace(/cipeujueh/g, 'cipeujeuh');
  n = n.replace(/cipeujuejh/g, 'cipeujeuh');
  n = n.replace(/cipeujeh/g, 'cipeujeuh');
  n = n.replace(/leuwidingding/g, 'leuwidingding');
  n = n.replace(/picungpugur/g, 'picungpugur');
  return n;
}

function stripTitle(name) {
  return name
    .replace(/\b[Ss][,.\s]*[Pp][Dd](?:\.I)?\b/g, '')
    .replace(/\b[Ss]\.Ag\b/g, '')
    .replace(/\.[SDsd][A-Za-z]*/g, '')
    .replace(/[,().]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── DB Setup ──
const dbUrl = process.env.TURSO_DB_URL;
const dbToken = process.env.TURSO_DB_TOKEN;
if (!dbUrl) { console.error('TURSO_DB_URL not set'); process.exit(1); }

const db = createClient({ url: dbUrl, authToken: dbToken });

// ── Google Drive Auth ──
function getDriveAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(keyJson),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }
  return new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

const drive = google.drive({ version: 'v3', auth: getDriveAuth() });

async function getOrCreateFolder(name, parentId) {
  let q;
  if (parentId === 'root') {
    q = `name='${name.replace(/'/g, "\\'")}' and 'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  } else {
    q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  }
  const search = await drive.files.list({ q, fields: 'files(id)' });
  if (search.data.files.length > 0) return search.data.files[0].id;
  const reqBody = { name, mimeType: 'application/vnd.google-apps.folder' };
  reqBody.parents = [parentId];
  const res = await drive.files.create({ requestBody: reqBody, fields: 'id' });
  return res.data.id;
}

async function uploadToDrive(readStream, fileName, mimeType, schoolName, employeeName) {
  const rootId = await getOrCreateFolder(DRIVE_FOLDER_NAME, 'root');
  const schoolFolder = await getOrCreateFolder(schoolName, rootId);
  const empFolder = await getOrCreateFolder(employeeName, schoolFolder);
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [empFolder] },
    media: { mimeType, body: readStream },
    fields: 'id,webViewLink',
  });
  const fileId = res.data.id;
  const driveUrl = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  return { fileId, driveUrl };
}

function mimeFromExt(ext) {
  const map = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

const DOC_PREFIXES = [
  'PASS FOTO', 'PAS FOTO', 'FOTO',
  'ID DIRI', 'ID_DIRI', 'IDENTITAS DIRI', 'IDENTITAS', 'IDENTIAS',
  'DATA KELUARGA', 'DATA_KELUARGA', 'KELUARGA', 'KK',
  'IJAZAH+ TRANSKIP NILAI', 'IJAZAH_TRANSKIP NILAI',
  'IJAZAH DAN TRANSKRIP', 'IJAZAH DAN TRANSKIP',
  'IJAZAH TRANSKIP', 'IJAZAH TRNSKIP', 'IJAZAH_TRANSKIP', 'IJAZAH_TRANSKRIP', 'IJAZAH_TRASNKIP',
  'IJAZAH', 'IJAZAH+ TRANSKIP',
  'SK P3K', 'SK_P3K', 'SK PPPK', 'SK_PPPK', 'SK PNS', 'SK_PNS', 'SK CPNS', 'SK_CPNS',
  'SK JABATAN', 'SK_JABATAN', 'SK PANGKAT', 'SK_PANGKAT', 'SK KGB', 'SK_KGB',
  'SK PEMBAGIAN TUGAS', 'SK PENUGASAN', 'SK',
  'SPMT', 'SKBM',
  'SERTIFIKAT PELATIHAN DIKLAT', 'SERTIFIKAT PELATIHAN', 'SERTIFIKAT DIKLAT',
  'SERTIFIKAT PENDIDIK', 'SERTIFIKAT', 'SERDIK', 'SERTI PENDIDIK',
  'KTP', 'NPWP', 'BPJS KESEHATAN', 'BPJS',
  'LAINNYA', 'DOKUMEN LAINNYA',
  'SCAN DPE', 'DPE',
  'KARTU KELUARGA',
  'IJAZAH SMA', 'IJAZAH S1', 'IJAZAH SMP',
  'PELDIKLAT', 'KGB', 'SKP',
  'BUKU NIKAH', 'KARTU', 'KIS',
  'TRANSKIP NILAI', 'TRANSKRIP NILAI', 'TRANSKIP', 'TRANSKRIP',
];

function stripPrefix(name) {
  // Sort prefixes by length (longest first) so e.g. SKBM matches before SK
  const sorted = [...DOC_PREFIXES].sort((a, b) => b.length - a.length);
  const upper = name.toUpperCase();
  for (const p of sorted) {
    if (upper.startsWith(p)) {
      name = name.substring(p.length).trim();
      name = name.replace(/^[+\-:\s]+/, '').trim();
      break;
    }
  }
  return name;
}

// ── Matching Logic ──

function buildEmployeeIndex(employees, schools) {
  const byNik = new Map();
  const byName = new Map();
  const bySchoolName = new Map();

  // Also index school names without "NEGERI" for matching "SDN" patterns
  const schoolShort = new Map();

  for (const s of schools.rows) {
    const normalized = normalizeSchoolName(s.name);
    bySchoolName.set(normalized, s.npsn);
    // e.g., "sd negeri 1 asem" -> also index as "sd 1 asem"
    schoolShort.set(normalized.replace(/negeri\s*/g, ''), s.npsn);
  }

  for (const emp of employees) {
    if (emp.nik) byNik.set(emp.nik.trim(), emp);
    const nameKey = cleanName(emp.nama);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(emp);
  }

  function isSchoolName(name) {
    if (!name) return false;
    const n = normalizeSchoolName(name);
    if (bySchoolName.has(n)) return true;
    return schoolShort.has(n.replace(/negeri\s*/g, ''));
  }

  function findEmployee(nik, nameHint, schoolNameHint) {
    if (nik) {
      const emp = byNik.get(nik);
      if (emp) return emp;
    }

    if (nameHint && schoolNameHint) {
      const n = normalizeSchoolName(schoolNameHint);
      let npsn = bySchoolName.get(n);
      if (!npsn) npsn = schoolShort.get(n.replace(/negeri\s*/g, ''));
      if (npsn) {
        const cleaned = cleanName(stripTitle(nameHint));
        const candidates = byName.get(cleaned) || [];
        const match = candidates.find(e => e.sekolah_id === npsn);
        if (match) return match;
      }
    }

    if (nameHint) {
      const cleaned = cleanName(stripTitle(nameHint));
      const candidates = byName.get(cleaned);
      if (candidates && candidates.length === 1) return candidates[0];
    }

    return null;
  }

  return { findEmployee, byName, isSchoolName };
}

function extractNameFromFileName(fileName) {
  let name = fileName
    .replace(/^\d+[\.\)]\s*/, '')
    .replace(/^[A-Z_ ]+?_/i, '')
    .replace(/[_-]\s*\d{15,}\s*/g, ' ')
    .replace(/\s*-\s*[A-Z].+$/i, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .trim();
  if (!name || name.length < 3) return null;
  // Remove document category prefixes
  name = stripPrefix(name);
  // Remove year prefixes like "2022_" or "2022 "
  name = name.replace(/^\d{4}[\s_]+/, '').trim();
  // Also check for _SEPARATOR pattern (category_NAME)
  const underscoreIdx = name.indexOf('_');
  if (underscoreIdx > 0 && underscoreIdx < 15) {
    const before = name.substring(0, underscoreIdx).toUpperCase();
    if (DOC_PREFIXES.some(p => before === p || before.startsWith(p))) {
      name = name.substring(underscoreIdx + 1).trim();
    }
  }
  name = stripTitle(name);
  // Remove leading NIK (15+ digits at start)
  name = name.replace(/^\d{15,}\s*/, '').trim();
  // Remove leading years/numbers (e.g., "2022 ", "1995...")
  name = name.replace(/^\d{4}\s+/, '').trim();
  // Remove trailing single-letter artifacts like " I", " -"
  name = name.replace(/\s+[-I]$/, '').trim();
  name = name.replace(/[\s.,;:)]+$/, '').trim();
  // Remove trailing "SDN ..." or "SD ..."
  name = name.replace(/\s+(?:SDN?|TK|KB)\s+.*$/i, '').trim();
  if (!name || name.length < 3) return null;
  return name;
}

// ── Main ──
async function main() {
  console.log('Loading employees from database...');
  const emps = await db.execute('SELECT id, nama, nik, sekolah_id FROM employees WHERE is_active = 1');
  const employees = emps.rows;
  console.log('  Found ' + employees.length + ' active employees');

  const schools = await db.execute('SELECT npsn, name FROM schools');
  console.log('  Found ' + schools.rows.length + ' schools');

  const index = buildEmployeeIndex(employees, schools);

  const existingDocs = await db.execute('SELECT employee_id, nama_file FROM employee_documents');
  const docSet = new Set();
  for (const d of existingDocs.rows) {
    docSet.add(d.employee_id + '::' + d.nama_file);
  }
  console.log('  ' + docSet.size + ' existing document records');

  // ── Scan files ──
  const allFiles = [];

  function scanDir(dir, parent, grandparent) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath, entry.name, parent);
      } else if (entry.isFile()) {
        allFiles.push({
          filePath: fullPath,
          parentFolder: parent,
          grandparentFolder: grandparent,
        });
      }
    }
  }

  console.log('\nScanning files...');
  scanDir(ROOT, null, null);
  console.log('  Found ' + allFiles.length + ' files');

  let uploaded = 0;
  let skipped = 0;
  let noMatch = 0;
  let failed = 0;

  for (const { filePath, parentFolder, grandparentFolder } of allFiles) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    if (!['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'].includes(ext.toLowerCase())) {
      skipped++;
      continue;
    }

    const nik = extractNIK(fileName);

    // Determine school hint from path
    let schoolHint = null;
    let nameHint = null;

    if (grandparentFolder) {
      // Three-level deep: category/school/employee/file or category/school/file
      if (index.isSchoolName(parentFolder)) {
        // Files directly in school folder: parent = school
        schoolHint = parentFolder;
        nameHint = extractNameFromFileName(fileName);
      } else if (index.isSchoolName(grandparentFolder)) {
        // Files in employee subfolder: grandparent = school
        schoolHint = grandparentFolder;
        // Employee name from parent folder (before underscore or before school suffix)
        const schoolIdx = parentFolder.search(/[\s-]+\s*(?:SD NEGERI|SDN?|TK|KB)\s+\d/i);
        const underscoreIdx = parentFolder.search(/[_.]\s*(?:SD NEGERI|SDN?|TK|KB)\s+\d/i);
        const parenSchoolIdx = parentFolder.search(/\(\s*(?:SD NEGERI|SDN?|TK|KB)\s+\d/i);
        if (underscoreIdx > 0) {
          nameHint = parentFolder.substring(0, underscoreIdx);
        } else if (schoolIdx > 0) {
          nameHint = parentFolder.substring(0, schoolIdx);
        } else if (parenSchoolIdx > 0) {
          nameHint = parentFolder.substring(0, parenSchoolIdx);
        } else {
          nameHint = parentFolder;
        }
        nameHint = stripTitle(nameHint.replace(/^BERKAS GABUNGAN\s*/i, '').trim());
        // Clean trailing punctuation from folder name
        nameHint = nameHint.replace(/[\s.,;:)]+$/, '').trim();
        // Remove residual title fragments (e.g. "dI" from "S.P.dI")
        nameHint = nameHint.replace(/\s+[dD][iI]\s*$/, '').trim();
        // Remove isolated single-letter initials like "S P" from title remnants
        nameHint = nameHint.replace(/\s+[A-Za-z](?:\s+[A-Za-z])*$/, '').trim();
        if (!nameHint || nameHint.length < 3) {
          nameHint = extractNameFromFileName(fileName);
        }
      } else {
        // Neither looks like school — use parent as potential school
        schoolHint = parentFolder;
        nameHint = extractNameFromFileName(fileName);
      }
    } else if (parentFolder) {
      // Two-level deep: category/file
      schoolHint = parentFolder;
      nameHint = extractNameFromFileName(fileName);
    } else {
      nameHint = extractNameFromFileName(fileName);
    }

    // Find employee
    let emp = index.findEmployee(nik, nameHint, schoolHint);
    let matchMethod = 'none';

    // Try dash suffix matching if no match yet
    if (!emp) {
      // Find the LAST " - " which likely separates name from school
      const lastDashIdx = fileName.lastIndexOf(' - ');
      const firstDashIdx = fileName.indexOf(' - ');
      if (lastDashIdx >= 0) {
        const afterDash = fileName.substring(lastDashIdx + 3).replace(/\.[^.]+$/, '').trim();
        if (afterDash && afterDash.length >= 3) {
          // Try as school name
          if (index.isSchoolName(afterDash)) {
            const beforeDash = fileName.substring(0, lastDashIdx).trim();
            // Strip category prefixes from the part before dash
            let nameFromFile = beforeDash.replace(/\.[^.]+$/, '').trim();
            nameFromFile = stripPrefix(nameFromFile);
            // If there's still " - " inside, take the part after it
            const innerDash = nameFromFile.indexOf(' - ');
            if (innerDash >= 0) {
              nameFromFile = nameFromFile.substring(innerDash + 3).trim();
            }
            nameFromFile = stripTitle(nameFromFile);
            if (nameFromFile && nameFromFile.length >= 3) {
              emp = index.findEmployee(null, nameFromFile, afterDash);
              if (emp) matchMethod = 'dash-school';
            }
          }
        }
      }
      // Try first dash as employee name fallback
      if (!emp && firstDashIdx >= 0 && firstDashIdx !== lastDashIdx) {
        const afterFirst = fileName.substring(firstDashIdx + 3).replace(/\.[^.]+$/, '').trim();
        if (afterFirst && afterFirst.length >= 3) {
          const cleaned = cleanName(stripTitle(afterFirst));
          const candidates = index.byName.get(cleaned);
          if (candidates && candidates.length === 1) {
            emp = candidates[0];
            matchMethod = 'dash-name';
          }
        }
      }
    }

    if (emp) {
      if (nik && emp.nik && nik === emp.nik.trim()) matchMethod = 'nik';
      else if (!matchMethod || matchMethod === 'none') matchMethod = 'name+school';
    }

    if (!emp) {
      noMatch++;
      if (noMatch <= 20) {
        console.log('  NO MATCH: ' + fileName + ' (school=' + (schoolHint || '') + ', name=' + (nameHint || '') + ')');
      }
      continue;
    }

    // Check if document already exists
    const docKey = emp.id + '::' + fileName;
    if (docSet.has(docKey)) {
      skipped++;
      continue;
    }

    // Detect category
    const category = detectCategory(fileName, parentFolder || '');

    // Determine school name
    let schoolName = 'Unknown';
    const schoolRow = schools.rows.find(s => s.npsn === emp.sekolah_id);
    if (schoolRow) schoolName = schoolRow.name;

    // Read and upload file
    try {
      const readStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      const mimeType = mimeFromExt(ext);
      const { fileId, driveUrl } = await uploadToDrive(readStream, fileName, mimeType, schoolName, emp.nama);

      await db.execute({
        sql: "INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sudah_upload', 'sudah_diverifikasi', 'lengkap', ?, ?)",
        args: [
          'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          emp.id,
          emp.sekolah_id,
          category,
          category,
          fileName,
          mimeType,
          stats.size,
          fileId,
          driveUrl,
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        ]
      });

      uploaded++;
      docSet.add(docKey);
      console.log('  [' + matchMethod + '] ' + fileName + ' -> ' + emp.nama + ' (' + category + ')');
    } catch (err) {
      console.error('  FAILED: ' + fileName + ' -> ' + emp.nama + ': ' + err.message);
      failed++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Total files:     ' + allFiles.length);
  console.log('No match:        ' + noMatch);
  console.log('Uploaded:        ' + uploaded);
  console.log('Skipped:         ' + skipped);
  console.log('Failed:          ' + failed);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
