import { createClient } from '@libsql/client';
const db = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

// All DPE directory/employee names from the folder listing
const dpeNames = [
  'AAN-JASMARA', 'Adang Kartaman', 'Ati Kurniawati', 'Fitri Lestari', 'Jamaludin',
  'Suwardiyono', 'CASDI', 'HERLINA', 'Hj. MASANAH', 'HULASOH', 'IIS YUSRIANAH',
  'JUARIYAH', 'JUHANAH', 'MASIAH', 'MISYAH', 'Nani Sumarni', 'OYAH HUNAYAH',
  'ROKISAH', 'RUKIYAT', 'SETIAWATI', 'SHOFIAH', 'SITI-TRISTIANINGSIH', 'SUHERMAN',
  'SYAHRUDIN', 'UMI SUMIRAH', 'Wagiran', 'Yayah Saerah', 'AAN JASMARA', 'AAN YUNIARTI',
  'ENI SUHARTI', 'NENI KUSTINI', 'Endang Pratiwi', 'Jawahir', 'Marlinah F.', 'Rohilah',
  'Sujono', 'Wiwin Hartini', 'Ahrojani', 'Elis Nurish', 'Muhammad Muti',
  'IYANG SUHERLAN', 'SODIKIN', 'SUDIYANTO', 'ATIKAH', 'HINDUN', 'IIS ISTIQOMAH',
  'IKE SUSIANA H', 'IKIN', 'KOTIAH', 'Nunung Nurhayati', 'OOM KOMARIAH',
  'Eli Laelasari', 'Drs. SENO', 'Eli Laelasari', 'AAN JASMARA'
];

const employees = await db.execute('SELECT id, nama, nip, sekolah_id FROM employees WHERE is_active = 1');
const employeeList = employees.rows;

console.log('Mencocokkan nama DPE dengan database pegawai...\n');
let found = 0;
let notFound = 0;
for (const dpeName of [...new Set(dpeNames)]) {
  const norm = dpeName.toLowerCase().replace(/[^a-z]/g, '');
  let matched = null;
  for (const emp of employeeList) {
    const eNorm = emp.nama.toLowerCase().replace(/[^a-z]/g, '');
    // Check if DPE name is contained in employee name
    if (eNorm.includes(norm) || norm.includes(eNorm)) {
      matched = emp;
      break;
    }
    // Check word-level
    const dWords = norm.split(/\s+/).filter(w => w.length > 2);
    const eWords = eNorm.split(/\s+/).filter(w => w.length > 2);
    const common = dWords.filter(w => eWords.includes(w));
    if (common.length >= 2) {
      matched = emp;
      break;
    }
  }
  if (matched) {
    console.log('  ✅ ' + dpeName + ' → ' + matched.nama + ' (NIP: ' + (matched.nip||'-') + ')');
    found++;
  } else {
    console.log('  ❌ ' + dpeName + ' → TIDAK ADA di database');
    notFound++;
  }
}

console.log('\nTotal DPE folder pegawai: ' + (found+notFound));
console.log('Tercocok: ' + found);
console.log('Tidak cocok: ' + notFound);
process.exit(0);
