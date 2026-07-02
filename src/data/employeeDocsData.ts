import { ALL_SCHOOLS } from './mockData';

export interface DocumentItem {
  id: string;
  name: string;
  category: 'Identitas' | 'Pengangkatan' | 'Kepangkatan' | 'Kinerja' | 'Keuangan';
  status: 'available' | 'missing' | 'warning';
  uploadDate?: string;
  fileSize?: string;
  fileType?: 'PDF' | 'JPG' | 'JPEG' | 'PNG';
  issue?: string; // Reason for warning (corrupt, empty, invalid format, outdated, etc.)
}

export interface Employee {
  id: string;
  name: string;
  nipNik: string;
  status: 'PNS' | 'PPPK' | 'Honorer';
  school: string;
  position: string;
  documents: DocumentItem[];
}

export interface GlobalStats {
  totalEmployees: number;
  totalArchives: number;
  completedCount: number;
  almostCompletedCount: number;
  incompleteCount: number;
  totalMissingDocs: number;
  globalCompleteness: number;
  statusDistribution: { PNS: number; PPPK: number; Honorer: number };
  schoolCompleteness: { name: string; rate: number; total: number }[];
}

// Automatically generate required documents for each status
export function getRequiredDocsForStatus(status: 'PNS' | 'PPPK' | 'Honorer'): { name: string; category: DocumentItem['category'] }[] {
  const commonDocs: { name: string; category: DocumentItem['category'] }[] = [
    { name: 'KTP', category: 'Identitas' },
    { name: 'Kartu Keluarga (KK)', category: 'Identitas' },
    { name: 'NPWP', category: 'Identitas' },
    { name: 'Pas Foto Terbaru', category: 'Identitas' },
    { name: 'Ijazah Terakhir', category: 'Identitas' },
    { name: 'Buku Rekening Bank', category: 'Identitas' }
  ];

  if (status === 'PNS') {
    return [
      ...commonDocs,
      // Pengangkatan
      { name: 'SK CPNS', category: 'Pengangkatan' },
      { name: 'SK PNS', category: 'Pengangkatan' },
      { name: 'Surat Pernyataan Melaksanakan Tugas (SPMT)', category: 'Pengangkatan' },
      { name: 'Sertifikat Latsar / Prajab', category: 'Pengangkatan' },
      // Kepangkatan
      { name: 'SK Pangkat Terakhir', category: 'Kepangkatan' },
      { name: 'SK Kenaikan Pangkat', category: 'Kepangkatan' },
      { name: 'SK Jabatan', category: 'Kepangkatan' },
      // Kinerja
      { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      // Keuangan
      { name: 'Kenaikan Gaji Berkala (KGB)', category: 'Keuangan' },
      { name: 'Dokumen TPG / Sertifikasi', category: 'Keuangan' }
    ];
  } else if (status === 'PPPK') {
    return [
      ...commonDocs,
      // Pengangkatan
      { name: 'SK PPPK', category: 'Pengangkatan' },
      { name: 'Surat Perjanjian Kerja / Kontrak', category: 'Pengangkatan' },
      { name: 'Surat Pernyataan Melaksanakan Tugas (SPMT)', category: 'Pengangkatan' },
      // Kinerja
      { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      // Keuangan
      { name: 'Slip Gaji', category: 'Keuangan' },
      { name: 'Dokumen Tunjangan', category: 'Keuangan' }
    ];
  } else {
    // Honorer
    return [
      ...commonDocs,
      // Pengangkatan
      { name: 'Surat Lamaran Kerja', category: 'Pengangkatan' },
      { name: 'SK Honorer', category: 'Pengangkatan' },
      { name: 'Surat Tugas Kepala Sekolah', category: 'Pengangkatan' },
      // Kinerja
      { name: 'Absensi Kehadiran', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      // Keuangan
      { name: 'Slip Honor', category: 'Keuangan' }
    ];
  }
}

// Calculate individual employee document intelligence
export function calculateEmployeeStats(employee: Employee) {
  const totalRequired = employee.documents.length;
  const uploaded = employee.documents.filter(d => d.status === 'available' || d.status === 'warning').length;
  const missing = employee.documents.filter(d => d.status === 'missing').length;
  const completionPercent = totalRequired > 0 ? Math.round((uploaded / totalRequired) * 100) : 0;
  const warnings = employee.documents.filter(d => d.status === 'warning' && d.issue);

  let statusText: 'Lengkap' | 'Hampir Lengkap' | 'Belum Lengkap' = 'Belum Lengkap';
  if (completionPercent === 100) {
    statusText = 'Lengkap';
  } else if (completionPercent >= 75) {
    statusText = 'Hampir Lengkap';
  }

  return {
    totalRequired,
    uploaded,
    missing,
    completionPercent,
    statusText,
    warningsCount: warnings.length,
    warningsList: warnings
  };
}

// Compile global analytics
export function getGlobalStats(employees: Employee[]): GlobalStats {
  let totalArchives = 0;
  let completedCount = 0;
  let almostCompletedCount = 0;
  let incompleteCount = 0;
  let totalMissingDocs = 0;
  let totalPctSum = 0;

  const statusDistribution = { PNS: 0, PPPK: 0, Honorer: 0 };
  const schoolAccumulator: Record<string, { totalPct: number; count: number; schoolName: string }> = {};

  // Initialize schools
  ALL_SCHOOLS.forEach(s => {
    schoolAccumulator[s.name] = { totalPct: 0, count: 0, schoolName: s.name };
  });

  employees.forEach(emp => {
    const stats = calculateEmployeeStats(emp);
    totalArchives += stats.uploaded;
    totalMissingDocs += stats.missing;
    totalPctSum += stats.completionPercent;

    if (stats.statusText === 'Lengkap') completedCount++;
    else if (stats.statusText === 'Hampir Lengkap') almostCompletedCount++;
    else incompleteCount++;

    statusDistribution[emp.status]++;

    if (!schoolAccumulator[emp.school]) {
      schoolAccumulator[emp.school] = { totalPct: 0, count: 0, schoolName: emp.school };
    }
    schoolAccumulator[emp.school].totalPct += stats.completionPercent;
    schoolAccumulator[emp.school].count++;
  });

  const schoolCompleteness = Object.values(schoolAccumulator)
    .map(s => ({
      name: s.schoolName,
      rate: s.count > 0 ? Math.round(s.totalPct / s.count) : 0,
      total: s.count
    }))
    .sort((a, b) => b.rate - a.rate);

  return {
    totalEmployees: employees.length,
    totalArchives,
    completedCount,
    almostCompletedCount,
    incompleteCount,
    totalMissingDocs,
    globalCompleteness: employees.length > 0 ? Math.round(totalPctSum / employees.length) : 0,
    statusDistribution,
    schoolCompleteness
  };
}

// Generate the initial list of 15 employees with pre-configured documents
export function getInitialEmployees(): Employee[] {
  const employeesList: Omit<Employee, 'documents'>[] = [
    {
      id: 'EMP-001',
      name: 'Drs. H. Mulyono, M.Pd.',
      nipNik: '196805121992031005',
      status: 'PNS',
      school: 'SD NEGERI 1 LEMAHABANG',
      position: 'Kepala Sekolah'
    },
    {
      id: 'EMP-002',
      name: 'Siti Rahmawati, S.Pd.',
      nipNik: '198203152009042003',
      status: 'PNS',
      school: 'SD NEGERI 1 BELAWA',
      position: 'Guru Kelas III'
    },
    {
      id: 'EMP-003',
      name: 'Ahmad Fauzi, S.Pd.I.',
      nipNik: '197508222005011002',
      status: 'PNS',
      school: 'SD NEGERI 1 PICUNGPUGUR',
      position: 'Guru Agama Islam'
    },
    {
      id: 'EMP-004',
      name: 'Budi Santoso, S.Pd.',
      nipNik: '198811052021211004',
      status: 'PPPK',
      school: 'SD NEGERI 3 CIPEUJEUH WETAN',
      position: 'Guru Kelas V'
    },
    {
      id: 'EMP-005',
      name: 'Dedi Hermawan, S.Pd.',
      nipNik: '199304182023211008',
      status: 'PPPK',
      school: 'SD NEGERI 1 WANGKELANG',
      position: 'Guru PJOK'
    },
    {
      id: 'EMP-006',
      name: 'Ika Lestari, S.Pd.',
      nipNik: '199109302022212005',
      status: 'PPPK',
      school: 'SD NEGERI 1 CIPEUJEUH KULON',
      position: 'Guru Kelas II'
    },
    {
      id: 'EMP-007',
      name: 'Yayan Sopian',
      nipNik: '3209121804950002',
      status: 'Honorer',
      school: 'SD NEGERI 1 BELAWA',
      position: 'Tenaga Administrasi (OPS)'
    },
    {
      id: 'EMP-008',
      name: 'Dewi Kartika, S.Pd.',
      nipNik: '3209124508960003',
      status: 'Honorer',
      school: 'SD NEGERI 1 WANGKELANG',
      position: 'Guru Kelas I'
    },
    {
      id: 'EMP-009',
      name: 'Eko Prasetyo, S.Pd.',
      nipNik: '3209121201940001',
      status: 'Honorer',
      school: 'SD NEGERI 2 LEMAHABANG',
      position: 'Guru PJOK'
    },
    {
      id: 'EMP-010',
      name: 'Diana Putri, A.Md.',
      nipNik: '3209125506970004',
      status: 'Honorer',
      school: 'SD NEGERI 1 SINDANGLAUT',
      position: 'Tenaga Perpustakaan'
    },
    {
      id: 'EMP-011',
      name: 'Hendra Wijaya, S.Pd.',
      nipNik: '197812102008011003',
      status: 'PNS',
      school: 'SD NEGERI 1 LEMAHABANG KULON',
      position: 'Guru Kelas VI'
    },
    {
      id: 'EMP-012',
      name: 'Nining Yuningsih, S.Ag.',
      nipNik: '198005242014022001',
      status: 'PNS',
      school: 'SD NEGERI 3 LEMAHABANG',
      position: 'Guru Agama Islam'
    },
    {
      id: 'EMP-013',
      name: 'Roni Ardiansyah, S.Pd.',
      nipNik: '199506152024211002',
      status: 'PPPK',
      school: 'SD NEGERI 2 CIPEUJEUH KULON',
      position: 'Guru Kelas IV'
    },
    {
      id: 'EMP-014',
      name: 'Sari Wulandari, S.Pd.',
      nipNik: '3209126210980005',
      status: 'Honorer',
      school: 'SD NEGERI 1 SARAJAYA',
      position: 'Guru Kelas II'
    },
    {
      id: 'EMP-015',
      name: 'H. Ahmad Sobirin, S.Pd.I.',
      nipNik: '197210141998031002',
      status: 'PNS',
      school: 'SD NEGERI 1 SARAJAYA',
      position: 'Kepala Sekolah'
    }
  ];

  return employeesList.map(emp => {
    const required = getRequiredDocsForStatus(emp.status);
    
    const documents: DocumentItem[] = required.map((reqDoc, index) => {
      const docId = `DOC-${emp.id}-${index + 1}`;
      
      // Determine document status deterministically to create realistic variation
      let status: DocumentItem['status'] = 'available';
      let issue: string | undefined = undefined;
      let uploadDate = '2025-08-15';
      let fileSize = '1.4 MB';
      let fileType: DocumentItem['fileType'] = 'PDF';

      // 1. Employee 1 (Mulyono): 100% complete, clean
      if (emp.id === 'EMP-001') {
        status = 'available';
      }
      // 2. Employee 2 (Siti Rahmawati - PNS): 82% complete (missing SK CPNS, SK Jabatan, KGB with Outdated warning)
      else if (emp.id === 'EMP-002') {
        if (reqDoc.name === 'SK CPNS' || reqDoc.name === 'SK Jabatan') {
          status = 'missing';
        } else if (reqDoc.name === 'Kenaikan Gaji Berkala (KGB)') {
          status = 'warning';
          issue = 'Dokumen lama (Perlu perbaruan KGB tahun 2026)';
        }
      }
      // 3. Employee 3 (Ahmad Fauzi - PNS): 94% complete (warning: SKP corrupt)
      else if (emp.id === 'EMP-003') {
        if (reqDoc.name === 'Sasaran Kinerja Pegawai (SKP)') {
          status = 'warning';
          issue = 'Berkas corrupt / tidak terbaca oleh AI scan';
        }
      }
      // 4. Employee 4 (Budi Santoso - PPPK): 100% complete
      else if (emp.id === 'EMP-004') {
        status = 'available';
      }
      // 5. Employee 5 (Dedi Hermawan - PPPK): 61% complete (missing Kontrak Kerja, SKP, Penilaian Kinerja, warning: Slip Gaji empty)
      else if (emp.id === 'EMP-005') {
        if (reqDoc.name === 'Surat Perjanjian Kerja / Kontrak' || reqDoc.name === 'Sasaran Kinerja Pegawai (SKP)' || reqDoc.name === 'Penilaian Kinerja') {
          status = 'missing';
        } else if (reqDoc.name === 'Slip Gaji') {
          status = 'warning';
          issue = 'Berkas kosong (0 KB) terdeteksi';
        }
      }
      // 6. Employee 8 (Dewi Kartika - Honorer): 50% complete (missing Surat Lamaran, Absensi, Penilaian Kinerja, KTP, warning: NPWP invalid format)
      else if (emp.id === 'EMP-008') {
        if (reqDoc.name === 'Surat Lamaran Kerja' || reqDoc.name === 'Absensi Kehadiran' || reqDoc.name === 'Penilaian Kinerja' || reqDoc.name === 'KTP' || reqDoc.name === 'Kartu Keluarga (KK)') {
          status = 'missing';
        } else if (reqDoc.name === 'NPWP') {
          status = 'warning';
          issue = 'Format file tidak valid (.HEIC tidak didukung)';
        }
      }
      // 7. General missing/warning variation for others
      else {
        const isMissing = (index % 5 === 0) && index > 0;
        const isWarning = (index === 3) && (emp.id === 'EMP-014' || emp.id === 'EMP-011');
        
        if (isMissing) {
          status = 'missing';
        } else if (isWarning) {
          status = 'warning';
          issue = 'Tanda tangan pejabat penanggung jawab tidak valid / terpotong';
        }
      }

      if (status === 'available') {
        const fileExt = reqDoc.name === 'Pas Foto Terbaru' ? 'JPG' : 'PDF';
        return {
          id: docId,
          name: `${reqDoc.name}_${emp.name.split(' ')[0].replace(/[^a-zA-Z]/g, '')}.${fileExt.toLowerCase()}`,
          category: reqDoc.category,
          status,
          uploadDate,
          fileSize,
          fileType: fileExt
        };
      } else if (status === 'warning') {
        const fileExt = reqDoc.name === 'Pas Foto Terbaru' ? 'PNG' : 'PDF';
        return {
          id: docId,
          name: `${reqDoc.name}_${emp.name.split(' ')[0].replace(/[^a-zA-Z]/g, '')}.${fileExt.toLowerCase()}`,
          category: reqDoc.category,
          status,
          uploadDate,
          fileSize: '450 KB',
          fileType: fileExt,
          issue
        };
      } else {
        return {
          id: docId,
          name: reqDoc.name,
          category: reqDoc.category,
          status
        };
      }
    });

    return {
      ...emp,
      documents
    };
  });
}
