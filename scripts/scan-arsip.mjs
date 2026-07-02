import { createClient } from '@libsql/client';
import 'dotenv/config';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

const ROOT = 'C:\\Users\\Bank Yan\\OneDrive\\Documents\\BIODATA SIMPEG PNS-ASN P3K';

const url = process.env.TURSO_DB_URL;
const token = process.env.TURSO_DB_TOKEN;
if (!url || !token) { console.error('Missing TURSO_DB_URL/TURSO_DB_TOKEN'); process.exit(1); }
const db = createClient({ url, authToken: token });

function detectJenisDokumen(fileName, topDir, relPath) {
  const f = fileName.toUpperCase().replace(/\.(PDF|JPG|JPEG|PNG)$/, '');
  const p = relPath.toUpperCase();
  const full = f + ' ' + p;

  // Priority: check key document types in filename prefix patterns
  if (/^1\.?\s*SK\s*(P3K|PPPK)/i.test(fileName) || f.includes('SK_P3K') || f.includes('SK_PPPK') || /^SK[_\s]*(P3K|PPPK)/.test(f)) return 'SK P3K/PPPK';
  if (/^2\.?\s*SPMT/i.test(fileName) || f.startsWith('SPMT') || /^SPMT[_\s-]/.test(f)) return 'SPMT';
  if (/^3\.?\s*(IJAZAH|IJASAH)/i.test(fileName) || f.includes('IJAZAH') || f.includes('IJASAH') || f.includes('TRANSKIP') || f.includes('TRANSKRIP') || f.includes('IJASAH')) return 'Ijazah & Transkrip';
  if (/^4\.?\s*(KTP|ID_DIRI)/i.test(fileName) || f.includes('ID_DIRI') || f.includes('IDENTITAS')) return 'KTP/Identitas Diri';
  if (/^5\.?\s*(KK|KARTU)/i.test(fileName) || f.includes('KELUARGA') || (f.includes('KK') && !f.includes('KTP') && !f.includes('NPWP'))) return 'Kartu Keluarga';
  if (/^6\.?\s*SK\s*(TUGAS|PEMBAGIAN|MENGAJAR)/i.test(fileName) || f.includes('SKBM') || f.includes('SK KBM') || f.includes('SK PEMBAGIAN TUGAS') || f.includes('SK TUGAS')) return 'SK Tugas Mengajar';
  if (/^7\.?\s*(SERTIFIKAT|SERDIK)/i.test(fileName) || f.includes('SERTIFIKAT') || f.includes('SERDIK')) return 'Sertifikat';
  if (/^8\.?\s*SKBM/i.test(fileName)) return 'SKBM';
  if (/^9\.?\s*(FOTO|PAS\s*FOTO)/i.test(fileName) || /\.(JPG|JPEG|PNG)$/i.test(fileName)) return 'Pas Foto';

  // PPPK Paruh Waktu naming convention: "DOC_TYPE - NAME.pdf" or "DOC_TYPE_NAME.pdf"
  if (f.startsWith('SK P3K PW') || f.startsWith('SK_P3K_PW') || f.startsWith('SK PPPK PW') || f.startsWith('SK_PPPK_PW') || f.includes('SK PARUH WAKTU') || f.includes('SK PENGANKATAN P3KPW') || f.includes('SK PPK PARUH WAKTU') || f.includes('SK PW')) return 'SK P3K/PPPK';
  if (f.startsWith('NPWP') && !f.includes('SK')) return 'NPWP';
  if (f.startsWith('KTP') || f.includes('KTP_') || f.startsWith('KTP,')) return 'KTP/Identitas Diri';
  if (f.startsWith('KK') || f.startsWith('KARTU KELUARGA') || f.startsWith('KARTU KELUARGA')) return 'Kartu Keluarga';
  if (f.startsWith('BPJS') || f.startsWith('KIS') || f.startsWith('BUKU REKENING') || f.startsWith('BUREK')) return 'Dokumen Pendukung';
  if (f.startsWith('SKBM') || f.startsWith('SK KBM') || f.startsWith('SK.')) return 'SKBM';
  if (f.startsWith('SK PEMBAGIAN TUGAS') || f.startsWith('SK PENUGASAN') || f.startsWith('SK. PEMBAGIAN')) return 'SK Tugas Mengajar';
  if (f.includes('IJAZAH') || f.includes('IJASAH')) return 'Ijazah & Transkrip';
  if (f.startsWith('SERDIK') || f.startsWith('SERTIFIKAT')) return 'Sertifikat';
  if (f.includes('SERTIFIKAT PENDIDIK') || f.includes('PPG')) return 'Sertifikat';
  if (f.includes('FOTO') || /\.(JPG|JPEG|PNG)$/i.test(fileName) || f.startsWith('PAS PHOTO') || f.startsWith('PHOTO')) return 'Pas Foto';
  if (f.startsWith('DATA_KELUARGA') || f.startsWith('DATA KELUARGA')) return 'Data Keluarga';
  if (f.startsWith('ID_DIRI') || f.startsWith('IDENTITAS')) return 'Identitas Diri';
  if (f.includes('DOKUMEN LAINNYA') || f.includes('LAINNYA_') || f.startsWith('LAINNYA')) return 'Dokumen Lainnya';

  // By folder category
  if (topDir.includes('IDENTITAS DIRI')) return 'Identitas Diri';
  if (topDir.includes('PASS FOTO')) return 'Pas Foto';
  if (topDir.includes('IJAZAH')) return 'Ijazah & Transkrip';
  if (topDir.includes('SK CPNS')) return 'SK CPNS';
  if (topDir.includes('SK PANGKAT')) return 'SK Pangkat';
  if (topDir.includes('SK JABATAN')) return 'SK Jabatan';
  if (topDir.includes('SK PNS') || topDir.includes('SK P3K')) return 'SK PNS-P3K';
  if (topDir.includes('SK KGB')) return 'SK KGB';
  if (topDir.includes('SKP') || topDir.includes('DP3')) return 'SKP-DP3';
  if (topDir.includes('SERTIFIKAT')) return 'Sertifikat';
  if (topDir.includes('DATA KELUARGA')) return 'Data Keluarga';
  if (topDir.includes('DOKUMEN LAINNYA')) return 'Dokumen Lainnya';
  if (topDir.includes('DPE')) return 'DPE';
  if (topDir.includes('PPPK')) return 'PPPK';

  return 'Lainnya';
}

function detectCategory(dirName) {
  const d = dirName.toUpperCase();
  if (d.includes('IDENTITAS DIRI')) return 'IDENTITAS DIRI';
  if (d.includes('DATA KELUARGA')) return 'DATA KELUARGA';
  if (d.includes('IJAZAH')) return 'IJAZAH';
  if (d.includes('SK CPNS')) return 'SK CPNS';
  if (d.includes('SK PANGKAT')) return 'SK PANGKAT';
  if (d.includes('SK JABATAN')) return 'SK JABATAN';
  if (d.includes('SK PNS') || d.includes('SK P3K') || d.includes('SK_PPPK') || d.includes('SK_P3K')) return 'SK PNS-P3K';
  if (d.includes('SK KGB')) return 'SK KGB';
  if (d.includes('SKP') || d.includes('DP3')) return 'SKP-DP3';
  if (d.includes('KOMPETENSI') || d.includes('SERTIFIKAT')) return 'SERTIFIKAT PELATIHAN';
  if (d.includes('PASS FOTO') || d.includes('FOTO')) return 'PASS FOTO';
  if (d.includes('DOKUMEN LAINNYA') || d.includes('LAINNYA')) return 'DOKUMEN LAINNYA';
  if (d.includes('DPE')) return 'DPE';
  if (d.includes('PPPK')) return 'PPPK';
  return 'LAINNYA';
}

function extractNip(fileName) {
  const match = fileName.match(/(\d{18})/);
  return match ? match[1] : null;
}

function normalizeName(n) {
  return n.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

function extractNameFromPppkWay(fileName) {
  // Pattern: "DOC TYPE - EMPLOYEE NAME.pdf" or "DOC_TYPE_EMPLOYEE NAME.pdf" or "DOC TYPE_EMPLOYEE NAME.pdf"
  let name = fileName.replace(/\.[^/.]+$/, '');
  
  // Remove leading numbering
  name = name.replace(/^\d+\.\s*/, '');
  
  // Try pattern: "TEXT - NAME" (separator " - ")
  let parts = name.split(' - ');
  if (parts.length >= 2) {
    // The last part after the last " - " is likely the name
    return parts[parts.length - 1].trim();
  }
  
  // Try pattern: "TEXT_NAME" where TEXT is known prefix
  const knownPrefixes = [
    'SK P3K PW', 'SK PPPK PW', 'SK PW', 'SK PARUH WAKTU', 'SK PENGANKATAN P3KPW',
    'SK PPK PARUH WAKTU', 'KTP', 'KK', 'NPWP', 'BPJS', 'KIS', 'KARTU KELUARGA',
    'IJAZAH', 'SERDIK', 'SERTIFIKAT', 'FOTO', 'PAS PHOTO', 'PHOTO',
    'SKBM', 'SK PEMBAGIAN TUGAS', 'SK PENUGASAN', 'A_01-DOC001-TIN_Card_in_V1-fo-xsl_DN',
    'SK. PEMBAGIAN TUGAS MENGAJAR', 'SUPRIHATIN', 'CamScanner', 'WhatsApp Image',
    'IMG_', 'DSC_', '6AS260OI0OOC', 'Pendidikan Guru Sekolah Dasar (PGSD)',
    'Serdik', 'buka', 'ijasah', 'ijaza', 'Izazah', 'ijazaj',
    'M SYAHRUL EFENDI', 'MARATUN SOLEHAH', 'pdf ijazah', 'Scan Ijazah',
    'LUKMAN-1', '07856bec', '1000484274', '1000814055', '1766491630747',
    '1766560850399747', '730e7cb7', '1000584446', 'kk20241004'
  ];
  
  for (const prefix of knownPrefixes) {
    if (name.startsWith(prefix)) {
      let rest = name.slice(prefix.length).replace(/^[_\s-]+/, '');
      // Remove parenthetical like (1), (2)
      rest = rest.replace(/\(\d+\)/g, '').trim();
      // Remove file type suffixes like -removebg-preview
      rest = rest.replace(/-removebg-preview.*$/, '').trim();
      // Remove strings like _SD NEGERI
      rest = rest.replace(/SD\s*NEGERI.*$/i, '').trim();
      // Remove _SDN
      rest = rest.replace(/_SDN.*$/i, '').trim();
      // Remove _merged
      rest = rest.replace(/_merged.*$/i, '').trim();
      // Remove trailing date patterns
      rest = rest.replace(/_\d{8}$/, '').trim();
      if (rest && rest.length > 2) return rest;
    }
  }
  
  // Try removing all-caps prefix pattern: WORD_WORD_WORD_RestOfName
  // Where RestOfName contains lowercase letters
  const matchAllCaps = name.match(/^([A-Z_]+?[A-Z])[_\s]+(.+)$/);
  if (matchAllCaps) {
    let rest = matchAllCaps[2].trim();
    rest = rest.replace(/\(\d+\)/g, '').trim();
    if (rest.length > 3) return rest;
  }
  
  return null;
}

async function main() {
  // Load schools
  const sRows = await db.execute('SELECT npsn, name FROM schools');
  const schools = {}, schoolNameToNpsn = {};
  for (const r of sRows.rows) {
    schools[r.npsn] = r.name;
    schoolNameToNpsn[normalizeName(r.name)] = r.npsn;
  }
  // Add typo variants
  schoolNameToNpsn['sd negeri 1 cipuejueh wetan'] = schoolNameToNpsn['sd negeri 1 cip eujeuh wetan'] || '20215286';
  schoolNameToNpsn['sd negeri 2 belawa'] = schoolNameToNpsn['sd negeri 2 belawa'] || '20215564';

  // Load employees
  const eRows = await db.execute('SELECT id, sekolah_id, nama, nip, nik, status_pegawai FROM employees WHERE is_active = 1');
  const employees = eRows.rows;
  console.log('📋 Total pegawai aktif di DB: ' + employees.length + '\n');

  const byNip = {}, byNik = {};
  const bySchoolEmps = {};
  // For name matching: index employee names
  const empByNameWords = {}; // word -> [employee]
  
  for (const e of employees) {
    if (e.nip) byNip[e.nip] = e;
    if (e.nik) byNik[e.nik] = e;
    const sid = e.sekolah_id;
    if (!bySchoolEmps[sid]) bySchoolEmps[sid] = [];
    bySchoolEmps[sid].push(e);
    // Index name words
    const words = normalizeName(e.nama).split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (!empByNameWords[w]) empByNameWords[w] = [];
      empByNameWords[w].push(e);
    }
  }

  function findEmployeeByName(nameStr, schoolNpsn) {
    const norm = normalizeName(nameStr);
    const words = norm.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return null;
    
    let candidates = schoolNpsn && bySchoolEmps[schoolNpsn] ? bySchoolEmps[schoolNpsn] : employees;
    let best = null, bestScore = 0;
    
    for (const emp of candidates) {
      const eWords = normalizeName(emp.nama).split(/\s+/).filter(w => w.length > 2);
      const common = words.filter(w => eWords.includes(w)).length;
      if (common > bestScore) {
        bestScore = common;
        best = emp;
      }
    }
    
    if (bestScore >= 2) return best;
    // If only 1 word matched but it's very unique (last name), return it
    if (bestScore === 1 && words.length <= 2) {
      for (const emp of candidates) {
        const eWords = normalizeName(emp.nama).split(/\s+/).filter(w => w.length > 2);
        if (words.some(w => eWords.includes(w) && eWords.length <= 3)) return emp;
      }
    }
    return null;
  }

  // Walk files
  function walkDir(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    let results = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(walkDir(fullPath));
      } else if (entry.isFile() && /\.(pdf|jpg|jpeg|png)$/i.test(entry.name)) {
        const st = statSync(fullPath);
        const relPath = relative(ROOT, fullPath);
        results.push({ fullPath, fileName: entry.name, topDir: relPath.split(/[\\\/]/)[0], size: st.size, relPath, parts: relPath.split(/[\\\/]/) });
      }
    }
    return results;
  }

  console.log('🔍 Scanning files...');
  const files = walkDir(ROOT);
  console.log('📄 Total file ditemukan: ' + files.length + '\n');

  let matched = 0, unmatched = 0, matchByNip = 0, matchByPppkName = 0, matchByPath = 0, matchByTopDir = 0;
  const unmatchedFiles = [], byNpsn = {}, byCategory = {};

  for (const f of files) {
    const nip = extractNip(f.fileName);
    let emp = null, matchMethod = '';

    // 1) Try NIP
    if (nip && byNip[nip]) {
      emp = byNip[nip];
      matchMethod = 'NIP';
      matchByNip++;
    }

    // 2) Try by path: find school in path
    if (!emp) {
      const pathJoined = normalizeName(f.relPath);
      let schoolNpsn = null;
      for (const [key, npsn] of Object.entries(schoolNameToNpsn)) {
        if (pathJoined.includes(key)) {
          schoolNpsn = npsn;
          break;
        }
      }

      // 2a) Try candidate names from path parts (employee folder names under school dirs)
      if (schoolNpsn) {
        for (const part of f.parts) {
          const norm = normalizeName(part);
          if (norm.length > 5 && !['scan p3k lemahabang','data scan p3k lemahabang','file responses','maks 2mb','maks 1mb','pass foto','identitas diri','dokumen kompetensi','dokumen lainnya','skp dp3'].includes(norm)) {
            emp = findEmployeeByName(norm, schoolNpsn);
            if (emp) { matchMethod = 'path+school'; matchByPath++; break; }
          }
        }
      }

      // 2b) If in "dokumen pppk paruh waktu" folder, try extracting name from filename
      if (!emp && f.topDir.includes('pppk')) {
        const extractedName = extractNameFromPppkWay(f.fileName);
        if (extractedName) {
          emp = findEmployeeByName(extractedName, schoolNpsn);
          if (emp) { matchMethod = 'pppk_name'; matchByPppkName++; }
        }
      }
    }

    // 3) Try by top-level dirs (IDENTITAS DIRI, PASS FOTO, etc.) using NIP in filename
    if (!emp) {
      const nip2 = extractNip(f.fileName);
      if (nip2 && byNip[nip2]) {
        emp = byNip[nip2];
        matchMethod = 'NIP (top dir)';
        matchByTopDir++;
      }
    }

    const category = detectCategory(f.topDir);
    const jenisDokumen = detectJenisDokumen(f.fileName, f.topDir, f.relPath);

    if (emp) {
      matched++;
      const npsn = emp.sekolah_id;
      if (!byNpsn[npsn]) byNpsn[npsn] = { count: 0, employees: {} };
      byNpsn[npsn].count++;
      byNpsn[npsn].employees[emp.nama] = (byNpsn[npsn].employees[emp.nama] || 0) + 1;
    } else {
      unmatched++;
      unmatchedFiles.push({ file: f.fileName, path: f.relPath, size: f.size, category, jenisDokumen });
    }

    if (!byCategory[category]) byCategory[category] = 0;
    byCategory[category]++;
  }

  // Report
  console.log('═══════════════════════════════════════');
  console.log('LAPORAN SCAN ARSIP');
  console.log('═══════════════════════════════════════\n');
  console.log('Total file: ' + files.length);
  console.log('Tercocokkan: ' + matched + ' (' + (matched/files.length*100).toFixed(1) + '%)');
  console.log('   - via NIP: ' + matchByNip);
  console.log('   - via path+school: ' + matchByPath);
  console.log('   - via PPPK name: ' + matchByPppkName);
  console.log('   - via NIP (top dir): ' + matchByTopDir);
  console.log('Tidak cocok: ' + unmatched + ' (' + (unmatched/files.length*100).toFixed(1) + '%)\n');

  // Per school
  console.log('Per Sekolah (matched):');
  const sorted = Object.entries(byNpsn).sort((a,b) => b[1].count - a[1].count);
  for (const [npsn, info] of sorted) {
    const empCount = Object.keys(info.employees).length;
    console.log('  ' + (schools[npsn]||npsn) + ': ' + info.count + ' file, ' + empCount + ' pegawai');
    // Show employees
    const empSorted = Object.entries(info.employees).sort((a,b) => b[1] - a[1]);
    for (const [nama, cnt] of empSorted) console.log('      - ' + nama + ': ' + cnt + ' file');
  }

  console.log('\nPer Kategori:');
  const catSorted = Object.entries(byCategory).sort((a,b) => b[1] - a[1]);
  for (const [cat, count] of catSorted) console.log('  ' + cat + ': ' + count + ' file');

  if (unmatchedFiles.length > 0) {
    console.log('\nFile Tidak Cocok (' + unmatchedFiles.length + '):');
    const unmatchedDirs = {};
    for (const f of unmatchedFiles) {
      const d = f.path.split(/[\\\/]/)[0];
      if (!unmatchedDirs[d]) unmatchedDirs[d] = [];
      unmatchedDirs[d].push(f);
    }
    for (const [dir, ufs] of Object.entries(unmatchedDirs)) {
      console.log('  ' + dir + ': ' + ufs.length + ' file');
      for (const f of ufs.slice(0, 5)) console.log('     ' + f.file);
      if (ufs.length > 5) console.log('     ... dan ' + (ufs.length-5) + ' lainnya');
    }
  }

  console.log('\n=== RINGKASAN ===');
  console.log('File siap insert: ' + matched);
  console.log('File perlu dicek manual: ' + unmatched);
  console.log('\nCatatan: Kolom drive_file_id & drive_url di employee_documents bersifat NOT NULL.');
  console.log('File fisik perlu diupload ke Google Drive atau storage lain sebelum insert record.');

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
