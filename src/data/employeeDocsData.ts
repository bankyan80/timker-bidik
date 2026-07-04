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

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function mapDocToCategory(jenisDokumen: string, kategori: string): DocumentItem['category'] {
  const k = (kategori || '').toLowerCase()
  const j = (jenisDokumen || '').toLowerCase()
  if (j.includes('pak') || k.includes('pak') || j.includes('angka kredit') || j.includes('penetapan') && j.includes('kredit')) return 'PAK'
  if (k.includes('identitas') || j.includes('ktp') || j.includes('kk') || j.includes('npwp') || j.includes('foto') || j.includes('ijazah') || j.includes('rekening')) return 'Identitas'
  if (k.includes('pengangkatan') || j.includes('sk') || j.includes('sertifikat') || j.includes('spmt') || j.includes('skbm') || j.includes('kontrak') || j.includes('lamaran')) return 'Pengangkatan'
  if (k.includes('kepangkatan') || j.includes('pangkat') || j.includes('jabatan') || j.includes('golongan')) return 'Kepangkatan'
  if (k.includes('kinerja') || j.includes('skp') || j.includes('penilaian') || j.includes('absensi') || j.includes('kehadiran')) return 'Kinerja'
  if (k.includes('transkip') || k.includes('transkrip') || j.includes('transkip') || j.includes('transkrip')) return 'Identitas'
  return 'Keuangan'
}

// ── Async loader from API ──

export async function loadEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch('/api/employees-with-docs')
    if (!res.ok) return []
    const rows: any[] = await res.json()
    const employees: Employee[] = []

    for (const row of rows) {
    const docRows: EmployeeDocumentRow[] = row.documents || []
    const status = mapStatusPegawai(row.status_pegawai)
    const schoolStatus: 'Negeri' | 'Swasta' = (row.school_status || 'Negeri') === 'Swasta' ? 'Swasta' : 'Negeri'
    const requiredDocs = getRequiredDocsForStatus(status, schoolStatus)
    const schoolName = row.school_name || npsnToSchool.get(row.sekolah_id) || row.sekolah_id

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
          fileType: (matched.mime_type || '').includes('pdf') ? 'PDF' : (matched.mime_type || '').includes('png') ? 'PNG' : (matched.mime_type || '').includes('jpg') || (matched.mime_type || '').includes('jpeg') ? 'JPG' : 'PDF',
          issue: hasIssue ? (matched.catatan_revisi || 'Menunggu verifikasi') : undefined,
          driveUrl: matched.drive_url || undefined,
          dbId: matched.id,
          driveFileId: matched.drive_file_id || undefined,
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
          fileType: (doc.mime_type || '').includes('pdf') ? 'PDF' : (doc.mime_type || '').includes('png') ? 'PNG' : 'PDF',
          issue: doc.catatan_revisi || undefined,
          driveUrl: doc.drive_url || undefined,
          dbId: doc.id,
          driveFileId: doc.drive_file_id || undefined,
        })
      }
    }

    employees.push({
      id: row.id,
      name: row.nama,
      nipNik: row.nip || row.nik,
      status,
      school: schoolName,
      schoolStatus,
      position: row.jabatan || '-',
      documents,
    })
  }

  return employees
  } catch (e) {
    console.error('loadEmployees error:', e)
    return []
  }
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
  driveUrl?: string; // Google Drive URL to the actual uploaded file
  dbId?: string; // Real database ID from employee_documents table
  driveFileId?: string; // Google Drive file ID for deletion
}

export interface Employee {
  id: string;
  name: string;
  nipNik: string;
  status: 'PNS' | 'PPPK' | 'PPPK_PARUH_WAKTU' | 'Honorer';
  school: string;
  schoolStatus: 'Negeri' | 'Swasta';
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

// Automatically generate required documents for each status and school type
export function getRequiredDocsForStatus(
  status: 'PNS' | 'PPPK' | 'PPPK_PARUH_WAKTU' | 'Honorer',
  schoolStatus: 'Negeri' | 'Swasta' = 'Negeri'
): { name: string; category: DocumentItem['category'] }[] {
  const commonDocs: { name: string; category: DocumentItem['category'] }[] = [
    { name: 'KTP', category: 'Identitas' },
    { name: 'Kartu Keluarga (KK)', category: 'Identitas' },
    { name: 'NPWP', category: 'Identitas' },
    { name: 'Pas Foto Terbaru', category: 'Identitas' },
    { name: 'Ijazah Terakhir', category: 'Identitas' },
    { name: 'Buku Rekening Bank', category: 'Identitas' }
  ];

  if (status === 'PNS') {
    if (schoolStatus === 'Swasta') {
      return [
        ...commonDocs,
        { name: 'SK Pengangkatan CPNS', category: 'Pengangkatan' },
        { name: 'SK Pengangkatan PNS', category: 'Pengangkatan' },
        { name: 'SK Penempatan dari Yayasan', category: 'Pengangkatan' },
        { name: 'Sertifikat Latsar / Prajab', category: 'Pengangkatan' },
        { name: 'SK Jabatan Fungsional', category: 'Kepangkatan' },
        { name: 'SK Kenaikan Jabatan', category: 'Kepangkatan' },
        { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
        { name: 'Penilaian Kinerja', category: 'Kinerja' },
        { name: 'Kenaikan Gaji Berkala (KGB)', category: 'Keuangan' },
        { name: 'Dokumen TPG / Sertifikasi', category: 'Keuangan' },
        { name: 'Penetapan Angka Kredit (PAK)', category: 'PAK' },
      ];
    }
    return [
      ...commonDocs,
      { name: 'SK CPNS', category: 'Pengangkatan' },
      { name: 'SK PNS', category: 'Pengangkatan' },
      { name: 'Surat Pernyataan Melaksanakan Tugas (SPMT)', category: 'Pengangkatan' },
      { name: 'Sertifikat Latsar / Prajab', category: 'Pengangkatan' },
      { name: 'SK Pangkat Terakhir', category: 'Kepangkatan' },
      { name: 'SK Kenaikan Pangkat', category: 'Kepangkatan' },
      { name: 'SK Jabatan', category: 'Kepangkatan' },
      { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      { name: 'Kenaikan Gaji Berkala (KGB)', category: 'Keuangan' },
      { name: 'Dokumen TPG / Sertifikasi', category: 'Keuangan' },
      { name: 'Penetapan Angka Kredit (PAK)', category: 'PAK' },
    ];
  }

  if (status === 'PPPK') {
    return [
      ...commonDocs,
      { name: 'SK PPPK', category: 'Pengangkatan' },
      { name: 'Surat Perjanjian Kerja / Kontrak', category: 'Pengangkatan' },
      { name: 'Surat Pernyataan Melaksanakan Tugas (SPMT)', category: 'Pengangkatan' },
      { name: 'Sasaran Kinerja Pegawai (SKP)', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      { name: 'Slip Gaji', category: 'Keuangan' },
      { name: 'Dokumen Tunjangan', category: 'Keuangan' },
    ];
  }

  if (status === 'PPPK_PARUH_WAKTU') {
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
  }

  // Honorer
  if (schoolStatus === 'Swasta') {
    return [
      ...commonDocs,
      { name: 'Surat Lamaran Kerja', category: 'Pengangkatan' },
      { name: 'SK Pengangkatan dari Yayasan', category: 'Pengangkatan' },
      { name: 'SK Penugasan dari Yayasan', category: 'Pengangkatan' },
      { name: 'Perjanjian Kontrak Kerja', category: 'Pengangkatan' },
      { name: 'Absensi Kehadiran', category: 'Kinerja' },
      { name: 'Penilaian Kinerja', category: 'Kinerja' },
      { name: 'Slip Honor', category: 'Keuangan' },
    ];
  }
  return [
    ...commonDocs,
    { name: 'Surat Lamaran Kerja', category: 'Pengangkatan' },
    { name: 'SK Honorer', category: 'Pengangkatan' },
    { name: 'Surat Tugas Kepala Sekolah', category: 'Pengangkatan' },
    { name: 'Absensi Kehadiran', category: 'Kinerja' },
    { name: 'Penilaian Kinerja', category: 'Kinerja' },
    { name: 'Slip Honor', category: 'Keuangan' },
  ];
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


