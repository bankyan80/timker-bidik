/**
 * Check Guru PAI detail from xlsx files directly
 * The Dapodik export may have PAI info in Tugas Tambahan or other columns
 */
import { createClient } from '@libsql/client';
import XLSX from 'xlsx';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const c = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

const PEGAWAI_DIR = 'C:/Users/Bank Yan/portal-dinas/data-pegawai';

function extractSchoolName(rows) {
  if (!rows || rows.length < 2) return null;
  if (rows[0] && rows[0][0] && String(rows[0][0]).match(/^Daftar\s+(Guru|Tenaga\s+Kependidikan|Tendik)/i)) {
    return rows[1] && rows[1][0] ? String(rows[1][0]).trim() : null;
  }
  return null;
}

async function main() {
  console.log('=== SCAN GURU PAI LANGSUNG DARI XLSX ===\n');
  
  const items = readdirSync(PEGAWAI_DIR);
  let totalGuru = 0;
  let totalPai = 0;
  const paiRecords = [];
  const perSekolah = {};
  
  for (const item of items) {
    const itemPath = join(PEGAWAI_DIR, item);
    let files = [];
    
    if (item.endsWith('.xlsx')) {
      files = [itemPath];
    } else if (statSync(itemPath).isDirectory()) {
      files = readdirSync(itemPath).filter(f => f.endsWith('.xlsx')).map(f => join(itemPath, f));
    }
    
    for (const file of files) {
      const wb = XLSX.readFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (rows.length < 5) continue;
      
      const schoolName = extractSchoolName(rows);
      if (!schoolName) continue;
      
      // Skip tendik files for PAI check
      const fileName = file.split('/').pop().split('\\').pop().toLowerCase();
      if (fileName.includes('tendik')) continue;
      
      if (!perSekolah[schoolName]) {
        perSekolah[schoolName] = { total: 0, pai: [] };
      }
      
      for (let i = 5; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;
        const no = parseInt(row[0]);
        if (isNaN(no)) continue;
        
        const nama = row[1] ? String(row[1]).trim() : '';
        if (!nama) continue;
        
        const jenis_ptk = row[8] ? String(row[8]).trim() : '';
        const tugas_tambahan = row[20] ? String(row[20]).trim() : '';
        const nik = row[44] ? String(row[44]).trim() : '';
        
        perSekolah[schoolName].total++;
        totalGuru++;
        
        // Check if this is a PAI/Agama teacher
        const isPai = 
          tugas_tambahan.toLowerCase().includes('pai') ||
          tugas_tambahan.toLowerCase().includes('agama') ||
          tugas_tambahan.toLowerCase().includes('pendidikan agama') ||
          jenis_ptk.toLowerCase().includes('pai') ||
          jenis_ptk.toLowerCase().includes('agama');
        
        if (isPai) {
          perSekolah[schoolName].pai.push({ nama, jenis_ptk, tugas_tambahan, nik });
          paiRecords.push({ schoolName, nama, jenis_ptk, tugas_tambahan, nik });
          totalPai++;
        }
      }
    }
  }
  
  console.log(`Total guru di semua file: ${totalGuru}`);
  console.log(`Guru PAI/Agama ditemukan: ${totalPai}\n`);
  
  if (paiRecords.length > 0) {
    console.log('DAFTAR GURU PAI:');
    console.log(''.padEnd(120, '='));
    for (const r of paiRecords) {
      console.log(`  ${r.schoolName.padEnd(50)} | ${r.nama.padEnd(30)} | ${r.jenis_ptk.padEnd(20)} | ${r.tugas_tambahan.padEnd(30)}`);
    }
  } else {
    console.log('TIDAK ADA GURU PAI TERDETEKSI DI XLSX\n');
    console.log('Penjelasan: Dapodik export standard tidak memiliki kolom khusus');
    console.log('untuk Guru PAI. Kolom "Jenis PTK" hanya berisi "Guru" untuk semua');
    console.log('guru mata pelajaran. Informasi Guru PAI biasanya ada di:');
    console.log('  1. Kolom "Tugas Tambahan" (column 20) — tapi tidak diisi untuk PAI');
    console.log('  2. Data dari portal-dinas API yang lebih detail');
    console.log('  3. Data dari sumber lain (tursodb)');
    
    // Show sample of tugas_tambahan values
    console.log('\n\nSAMPLE TUGAS TAMBAHAN (column 20) dari beberapa file:');
    let count = 0;
    for (const item of items) {
      if (count > 5) break;
      const itemPath = join(PEGAWAI_DIR, item);
      let files = [];
      if (item.endsWith('.xlsx')) {
        files = [itemPath];
      } else if (statSync(itemPath).isDirectory()) {
        files = readdirSync(itemPath).filter(f => f.endsWith('.xlsx')).map(f => join(itemPath, f));
      }
      for (const file of files) {
        if (count > 5) break;
        const wb = XLSX.readFile(file);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 6) continue;
        const schoolName = extractSchoolName(rows);
        const fileName = file.split('/').pop().split('\\').pop().toLowerCase();
        if (fileName.includes('tendik')) continue;
        console.log(`\n  ${schoolName}:`);
        for (let i = 5; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const nama = row[1] ? String(row[1]).trim() : '';
          const tugas = row[20] ? String(row[20]).trim() : '-';
          const jenis = row[8] ? String(row[8]).trim() : '-';
          console.log(`    ${nama.padEnd(30)} | Jenis: ${jenis.padEnd(20)} | Tugas: ${tugas}`);
        }
        count++;
      }
    }
  }
}

main().catch(console.error);