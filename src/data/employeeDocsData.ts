import { ALL_SCHOOLS } from './mockData';

// ── Types matching the DB rows from API ──
interface EmployeeRow {
  id: string;
  sekolah_id: string;
  nama: string;
  nik: string;
  nip: string | null;
  nuptk: string | null;
  email: string | null;
  no_hp: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  jabatan: string | null;
  status_pegawai: string | null;
  pangkat_golongan: string | null;
  pendidikan_terakhir: string | null;
  sertifikasi: string | null;
  tmt_kerja: string | null;
  tanggal_bup: string | null;
  foto_url: string | null;
  is_active: number;
}

interface EmployeeDocumentRow {
  id: string;
  employee_id: string;
  school_id: string;
  kategori: string;
  jenis_dokumen: string;
  nama_file: string;
  mime_type: string;
  file_size: number;
  drive_file_id: string;
  drive_url: string;
  status_upload: string;
  status_verifikasi: string;
  status_kelengkapan: string;
  catatan_revisi: string | null;
  uploaded_at: number | null;
}

// Build NPSN → school name lookup
const npsnToSchool = new Map<string, string>()
ALL_SCHOOLS.forEach(s => npsnToSchool.set(s.npsn, s.name))

function mapStatusPegawai(sp: string | null): 'PNS' | 'PPPK' | 'PPPK_PARUH_WAKTU' | 'Honorer' {
  const s = (sp || '').toLowerCase()
  if (s === 'pns') return 'PNS'
  if (s === 'pppk_paruh_waktu') return 'PPPK_PARUH_WAKTU'
  if (s.includes('pppk')) return 'PPPK'
  return 'Honorer'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function mapDocToCategory(jenisDokumen: string, kategori: string): DocumentItem['category'] {
  const k = kategori.toLowerCase()
  const j = jenisDokumen.toLowerCase()
  if (j.includes('pak') || k.includes('pak') || j.includes('angka kredit') || j.includes('penetapan') && j.includes('kredit')) return 'PAK'
  if (k.includes('identitas') || j.includes('ktp') || j.includes('kk') || j.includes('npwp') || j.includes('foto') || j.includes('ijazah') || j.includes('rekening')) return 'Identitas'
  if (k.includes('pengangkatan') || j.includes('sk') || j.includes('sertifikat') || j.includes('spmt') || j.includes('kontrak') || j.includes('lamaran')) return 'Pengangkatan'
  if (k.includes('kepangkatan') || j.includes('pangkat') || j.includes('jabatan') || j.includes('golongan')) return 'Kepangkatan'
  if (k.includes('kinerja') || j.includes('skp') || j.includes('penilaian') || j.includes('absensi') || j.includes('kehadiran')) return 'Kinerja'
  return 'Keuangan'
}

// ── Async loader from API ──

export async function loadEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch('/api/employees-with-docs')
    if (!res.ok) throw new Error('API not available')
    const rows: any[] = await res.json()

    const employees: Employee[] = []

    for (const row of rows) {
      const docRows: EmployeeDocumentRow[] = row.documents || []
      const status = mapStatusPegawai(row.status_pegawai)
      const requiredDocs = getRequiredDocsForStatus(status)
      const schoolName = npsnToSchool.get(row.sekolah_id) || row.sekolah_id

      const realDocNames = new Map<string, EmployeeDocumentRow>()
      for (const doc of docRows) {
        const key = doc.jenis_dokumen.toLowerCase().replace(/[^a-z0-9]/g, '')
        realDocNames.set(key, doc)
      }

      const documents: DocumentItem[] = requiredDocs.map((req, index) => {
        const reqKey = req.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        const docId = `DOC-${row.id}-${index + 1}`

        let matched: EmployeeDocumentRow | undefined
        for (const [key, doc] of realDocNames) {
          if (reqKey.includes(key) || key.includes(reqKey) ||
              reqKey.split('').every(c => key.includes(c)) && reqKey.length > 3) {
            matched = doc
            break
          }
        }

        if (matched) {
          const isVerified = matched.status_verifikasi === 'sudah_diverifikasi'
          const hasIssue = matched.status_kelengkapan !== 'lengkap' || matched.catatan_revisi
          return {
            id: docId,
            name: matched.nama_file || matched.jenis_dokumen,
            category: mapDocToCategory(matched.jenis_dokumen, matched.kategori),
            status: isVerified && !hasIssue ? 'available' : 'warning',
            uploadDate: matched.uploaded_at ? new Date(matched.uploaded_at).toISOString().slice(0, 10) : undefined,
            fileSize: formatBytes(matched.file_size),
            fileType: matched.mime_type.includes('pdf') ? 'PDF' : matched.mime_type.includes('png') ? 'PNG' : matched.mime_type.includes('jpg') || matched.mime_type.includes('jpeg') ? 'JPG' : 'PDF',
            issue: hasIssue ? (matched.catatan_revisi || 'Menunggu verifikasi') : undefined,
          }
        }

        return { id: docId, name: req.name, category: req.category, status: 'missing' }
      })

      const matchedReqKeys = new Set<string>()
      for (const req of requiredDocs) {
        const reqKey = req.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        for (const [key] of realDocNames) {
          if (reqKey.includes(key) || key.includes(reqKey) ||
              reqKey.split('').every(c => key.includes(c)) && reqKey.length > 3) {
            matchedReqKeys.add(key)
          }
        }
      }
      let extraIndex = 0
      for (const [key, doc] of realDocNames) {
        if (!matchedReqKeys.has(key)) {
          extraIndex++
          documents.push({
            id: `DOC-${row.id}-ext-${extraIndex}`,
            name: doc.jenis_dokumen,
            category: mapDocToCategory(doc.jenis_dokumen, doc.kategori),
            status: doc.status_verifikasi === 'sudah_diverifikasi' ? 'available' : 'warning',
            uploadDate: doc.uploaded_at ? new Date(doc.uploaded_at).toISOString().slice(0, 10) : undefined,
            fileSize: formatBytes(doc.file_size),
            fileType: doc.mime_type.includes('pdf') ? 'PDF' : doc.mime_type.includes('png') ? 'PNG' : 'PDF',
            issue: doc.catatan_revisi || undefined,
          })
        }
      }

      employees.push({
        id: row.id,
        name: row.nama,
        nipNik: row.nip || row.nik,
        status,
        school: schoolName,
        position: row.jabatan || '-',
        documents,
      })
    }

    if (employees.length > 0) return employees
  } catch { /* fallback to mock */ }

  return getInitialEmployees()
}

export interface DocumentItem {
  id: string;
  name: string;
  category: 'Identitas' | 'Pengangkatan' | 'Kepangkatan' | 'Kinerja' | 'Keuangan' | 'PAK';
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
  status: 'PNS' | 'PPPK' | 'PPPK_PARUH_WAKTU' | 'Honorer';
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
  statusDistribution: { PNS: number; PPPK: number; PPPK_PARUH_WAKTU: number; Honorer: number };
  schoolCompleteness: { name: string; rate: number; total: number }[];
}

// Automatically generate required documents for each status
export function getRequiredDocsForStatus(status: 'PNS' | 'PPPK' | 'PPPK_PARUH_WAKTU' | 'Honorer'): { name: string; category: DocumentItem['category'] }[] {
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
  } else if (status === 'PPPK_PARUH_WAKTU') {
    return [
      ...commonDocs,
      { name: 'SK PPPK Paruh Waktu', category: 'Pengangkatan' },
      { name: 'Surat Perjanjian Kerja / Kontrak', category: 'Pengangkatan' },
      { name: 'Surat Tugas Kepala Sekolah', category: 'Pengangkatan' },
      { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      { name: 'Slip Honor', category: 'Keuangan' },
      { name: 'Dokumen Tunjangan', category: 'Keuangan' },
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

  const statusDistribution = { PNS: 0, PPPK: 0, PPPK_PARUH_WAKTU: 0, Honorer: 0 };
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
