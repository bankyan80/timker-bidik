import { createClient } from '@libsql/client';
import { School, VillageStats, Recommendation, AlertMessage, DocumentMeta } from './types';
import { VILLAGES, ALL_SCHOOLS, GET_VILLAGE_STATS } from './data/mockData';

export type StudentRow = {
  id: string;
  school_npsn: string;
  nama: string;
  nisn: string | null;
  nik: string | null;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jenjang: string;
  kelas_kelompok: string;
  rombel: string | null;
  status_siswa: string;
  tahun_pelajaran: string;
};

export type SchoolStudentAggregate = {
  npsn: string;
  total: number;
  male: number;
  female: number;
  byGrade: Record<string, number>;
};

export type SchoolTeacherAggregate = {
  npsn: string;
  total: number;
  certified: number;
  pns: number;
  pppk: number;
  honorer: number;
};

export type EmployeeRow = {
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
  jurusan: string | null;
  sertifikasi: string | null;
  tmt_kerja: string | null;
  tanggal_bup: string | null;
  foto_url: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
};

export type EmployeeDocumentRow = {
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
  uploaded_by: string | null;
  verified_by: string | null;
  uploaded_at: number | null;
  verified_at: number | null;
  created_at: number;
  updated_at: number;
};

let db: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (db) return db;
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_TOKEN;
  if (!url || !token) return null;
  db = createClient({ url, authToken: token });
  return db;
}

export async function initSchema() {
  const client = getDb();
  if (!client) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schools (
      npsn TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      status TEXT NOT NULL,
      village TEXT NOT NULL,
      accreditation TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      students TEXT NOT NULL,
      teachers TEXT NOT NULL,
      facilities TEXT NOT NULL,
      health_score INTEGER NOT NULL,
      risk_indicators TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      school_name TEXT,
      school_npsn TEXT,
      last_updated TEXT NOT NULL,
      status TEXT NOT NULL,
      ocr_content_sample TEXT NOT NULL DEFAULT '',
      anomalies TEXT NOT NULL DEFAULT '[]'
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL,
      impact_score INTEGER NOT NULL,
      estimated_cost_miliar REAL NOT NULL,
      timeline_months INTEGER NOT NULL,
      target_school_npsn TEXT,
      category TEXT NOT NULL,
      applied INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      school_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL
    )
  `);

  // ── Employees (from source project schema) ──
  await client.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      sekolah_id TEXT NOT NULL,
      nama TEXT NOT NULL,
      nik TEXT NOT NULL UNIQUE,
      nip TEXT,
      nuptk TEXT,
      email TEXT,
      no_hp TEXT,
      tempat_lahir TEXT,
      tanggal_lahir TEXT,
      jenis_kelamin TEXT,
      jabatan TEXT,
      status_pegawai TEXT,
      pangkat_golongan TEXT,
      pendidikan_terakhir TEXT,
      jurusan TEXT,
      sertifikasi TEXT,
      tmt_kerja TEXT,
      tanggal_bup TEXT,
      foto_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      school_id TEXT NOT NULL,
      kategori TEXT NOT NULL,
      jenis_dokumen TEXT NOT NULL,
      nama_file TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      drive_file_id TEXT NOT NULL,
      drive_url TEXT NOT NULL,
      status_upload TEXT NOT NULL DEFAULT 'belum_upload',
      status_verifikasi TEXT NOT NULL DEFAULT 'belum_diverifikasi',
      status_kelengkapan TEXT NOT NULL DEFAULT 'belum_lengkap',
      catatan_revisi TEXT,
      uploaded_by TEXT,
      verified_by TEXT,
      uploaded_at INTEGER,
      verified_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      school_npsn TEXT NOT NULL,
      nama TEXT NOT NULL,
      nisn TEXT,
      nik TEXT,
      jenis_kelamin TEXT,
      tempat_lahir TEXT,
      tanggal_lahir TEXT,
      jenjang TEXT NOT NULL,
      kelas_kelompok TEXT NOT NULL,
      rombel TEXT,
      status_siswa TEXT NOT NULL DEFAULT 'aktif',
      tahun_pelajaran TEXT NOT NULL
    )
  `);
}

export async function seedData() {
  const client = getDb();
  if (!client) return;

  const existing = await client.execute('SELECT COUNT(*) as count FROM schools');

  if (Number(existing.rows[0].count) === 0) {
    for (const school of ALL_SCHOOLS) {
      await client.execute({
        sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng, students, teachers, facilities, health_score, risk_indicators)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          school.npsn, school.name, school.level, school.status, school.village,
          school.accreditation, school.coordinates.lat, school.coordinates.lng,
          JSON.stringify(school.students), JSON.stringify(school.teachers),
          JSON.stringify(school.facilities), school.healthScore,
          JSON.stringify(school.riskIndicators)
        ]
      });
    }
  }

  // Seed recommendations (run regardless of schools seeding)
  const existingRecs = await client.execute('SELECT COUNT(*) as count FROM recommendations');
  if (Number(existingRecs.rows[0].count) === 0) {
    const recs = [
      { title: 'Distribusi Ulang Guru PPPK', description: 'Meratakan 8 guru PPPK ke 5 sekolah dengan defisit tenaga pendidik tertinggi di Wangkelang, Picungpugur, dan Sindanglaut', urgency: 'Critical', impactScore: 92, cost: 0.8, timeline: 3, category: 'Staffing' },
      { title: 'Rehabilitasi Ruang Kelas Rusak Berat', description: 'Rehab total 12 ruang kelas rusak berat di 4 sekolah', urgency: 'Critical', impactScore: 88, cost: 4.2, timeline: 8, category: 'Infrastructure' },
      { title: 'Percepatan Sertifikasi Guru', description: 'Mendaftarkan 18 guru honorer ke program PPG dalam tahun berjalan', urgency: 'High', impactScore: 85, cost: 0.3, timeline: 12, category: 'Certification' },
      { title: 'Pengajuan Formasi PPPK 2026', description: 'Mengusulkan 25 formasi PPPK baru untuk mengisi kekosongan akibat pensiun', urgency: 'High', impactScore: 90, cost: 2.1, timeline: 6, category: 'Staffing' },
      { title: 'Digitalisasi Arsip Kepegawaian', description: 'Digitalisasi 841 dokumen kepegawaian lengkap dengan OCR dan verifikasi', urgency: 'Medium', impactScore: 75, cost: 0.5, timeline: 4, category: 'Governance' },
      { title: 'Program Bimbingan Teknis Kurikulum', description: 'Bimtek implementasi kurikulum merdeka untuk 120 guru SD', urgency: 'Medium', impactScore: 70, cost: 0.2, timeline: 2, category: 'Certification' },
      { title: 'Pemasangan Jaringan Internet', description: 'Memasang WiFi/Starlink di 5 sekolah yang belum memiliki akses internet memadai', urgency: 'High', impactScore: 78, cost: 1.5, timeline: 5, category: 'Infrastructure' },
      { title: 'Normalisasi Toilet Sekolah', description: 'Perbaikan 8 toilet rusak di 3 sekolah untuk memenuhi standar WASH', urgency: 'Medium', impactScore: 65, cost: 0.6, timeline: 3, category: 'Infrastructure' },
    ];
    for (const rec of recs) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO recommendations (id, title, description, urgency, impact_score, estimated_cost_miliar, timeline_months, category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`REC-${rec.title.replace(/[^a-zA-Z]/g, '').slice(0, 8).toUpperCase()}-${Date.now()}`, rec.title, rec.description, rec.urgency, rec.impactScore, rec.cost, rec.timeline, rec.category]
      });
    }
  }

  // Seed alerts
  const existingAlerts = await client.execute('SELECT COUNT(*) as count FROM alerts');
  if (Number(existingAlerts.rows[0].count) === 0) {
    const now = new Date();
    const critical = ALL_SCHOOLS.filter(s => s.healthScore < 40);
    for (let i = 0; i < Math.min(critical.length, 5); i++) {
      const s = critical[i];
      const t = new Date(now.getTime() - i * 3600000).toISOString();
      await client.execute({
        sql: `INSERT OR IGNORE INTO alerts (id, timestamp, school_name, severity, message, category)
              VALUES (?, ?, ?, 'CRITICAL', ?, ?)`,
        args: [`alert-crit-${s.npsn}-${Date.now()}`, t, s.name, `Health Score ${s.healthScore}/100 — butuh intervensi segera`, 'Infrastructure']
      });
    }
    const warning = ALL_SCHOOLS.filter(s => s.healthScore >= 40 && s.healthScore < 60);
    for (let i = 0; i < Math.min(warning.length, 4); i++) {
      const s = warning[i];
      const t = new Date(now.getTime() - (i + critical.length) * 7200000).toISOString();
      await client.execute({
        sql: `INSERT OR IGNORE INTO alerts (id, timestamp, school_name, severity, message, category)
              VALUES (?, ?, ?, 'WARNING', ?, ?)`,
        args: [`alert-warn-${s.npsn}-${Date.now()}`, t, s.name, `Rasio siswa-guru ${(s.students.total / (s.teachers.total || 1)).toFixed(1)}:1 — perlu penambahan tenaga`, 'Staffing']
      });
    }
  }

}

export async function getAllSchools(): Promise<School[]> {
  const client = getDb();
  if (!client) return ALL_SCHOOLS;
  const result = await client.execute('SELECT * FROM schools');
  return result.rows.map(row => ({
    npsn: row.npsn as string,
    name: row.name as string,
    level: row.level as School['level'],
    status: row.status as School['status'],
    village: row.village as string,
    accreditation: row.accreditation as School['accreditation'],
    coordinates: { lat: row.lat as number, lng: row.lng as number },
    students: JSON.parse(row.students as string),
    teachers: JSON.parse(row.teachers as string),
    facilities: JSON.parse(row.facilities as string),
    healthScore: row.health_score as number,
    riskIndicators: JSON.parse(row.risk_indicators as string),
  }));
}

export async function getVillageStats(): Promise<VillageStats[]> {
  return GET_VILLAGE_STATS();
}

export async function getAlerts(): Promise<AlertMessage[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute('SELECT * FROM alerts ORDER BY timestamp DESC');
  return result.rows.map(row => ({
    id: row.id as string,
    timestamp: row.timestamp as string,
    schoolName: row.school_name as string,
    severity: row.severity as AlertMessage['severity'],
    message: row.message as string,
    category: row.category as AlertMessage['category'],
  }));
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute('SELECT * FROM recommendations ORDER BY impact_score DESC');
  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    urgency: row.urgency as Recommendation['urgency'],
    impactScore: row.impact_score as number,
    estimatedCostMiliar: row.estimated_cost_miliar as number,
    timelineMonths: row.timeline_months as number,
    targetSchoolNpsn: (row.target_school_npsn as string) ?? undefined,
    category: row.category as Recommendation['category'],
    applied: (row.applied as number) === 1,
  }));
}

export async function getDocuments(): Promise<DocumentMeta[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute('SELECT * FROM documents');
  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    category: row.category as DocumentMeta['category'],
    schoolName: (row.school_name as string) ?? undefined,
    schoolNpsn: (row.school_npsn as string) ?? undefined,
    lastUpdated: row.last_updated as string,
    status: row.status as DocumentMeta['status'],
    ocrContentSample: row.ocr_content_sample as string,
    anomaliesDetected: JSON.parse(row.anomalies as string),
  }));
}

export async function searchDocuments(query: string): Promise<DocumentMeta[]> {
  const docs = await getDocuments();
  const q = query.toLowerCase();
  return docs.filter(doc =>
    doc.title.toLowerCase().includes(q) ||
    doc.category.toLowerCase().includes(q) ||
    (doc.schoolName && doc.schoolName.toLowerCase().includes(q)) ||
    doc.ocrContentSample.toLowerCase().includes(q)
  );
}

// ── Employee queries ──

export async function getEmployees(): Promise<EmployeeRow[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute('SELECT * FROM employees WHERE is_active = 1 ORDER BY nama ASC');
  return result.rows as unknown as EmployeeRow[];
}

export async function getEmployeesBySchool(npsn: string): Promise<EmployeeRow[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute({
    sql: 'SELECT * FROM employees WHERE sekolah_id = ? AND is_active = 1 ORDER BY nama ASC',
    args: [npsn]
  });
  return result.rows as unknown as EmployeeRow[];
}

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocumentRow[]> {
  const client = getDb();
  if (!client) return [];
  const result = await client.execute({
    sql: 'SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY kategori ASC',
    args: [employeeId]
  });
  return result.rows as unknown as EmployeeDocumentRow[];
}

export async function getEmployeeCount(): Promise<number> {
  const client = getDb();
  if (!client) return 0;
  const result = await client.execute('SELECT COUNT(*) as count FROM employees WHERE is_active = 1');
  return Number(result.rows[0].count);
}

export async function getStudentAggregates(): Promise<Record<string, SchoolStudentAggregate>> {
  const client = getDb();
  if (!client) return {};
  const result = await client.execute(`
    SELECT school_npsn,
      COUNT(*) as total,
      SUM(CASE WHEN LOWER(jenis_kelamin) LIKE '%laki%' THEN 1 ELSE 0 END) as male,
      SUM(CASE WHEN LOWER(jenis_kelamin) LIKE '%perempuan%' THEN 1 ELSE 0 END) as female
    FROM students WHERE LOWER(status_siswa) = 'aktif'
    GROUP BY school_npsn
  `);
  const agg: Record<string, SchoolStudentAggregate> = {};
  for (const row of result.rows) {
    agg[row.school_npsn as string] = {
      npsn: row.school_npsn as string,
      total: Number(row.total),
      male: Number(row.male),
      female: Number(row.female),
      byGrade: {},
    };
  }
  // per-grade breakdown
  const byGrade = await client.execute(`
    SELECT school_npsn, kelas_kelompok, COUNT(*) as cnt
    FROM students WHERE LOWER(status_siswa) = 'aktif'
    GROUP BY school_npsn, kelas_kelompok
  `);
  for (const row of byGrade.rows) {
    const npsn = row.school_npsn as string;
    if (agg[npsn]) {
      agg[npsn].byGrade[row.kelas_kelompok as string] = Number(row.cnt);
    }
  }
  return agg;
}

export async function getTeacherAggregates(): Promise<Record<string, SchoolTeacherAggregate>> {
  const client = getDb();
  if (!client) return {};
  const result = await client.execute(`
    SELECT sekolah_id,
      COUNT(*) as total,
      SUM(CASE WHEN sertifikasi IS NOT NULL AND sertifikasi != '' THEN 1 ELSE 0 END) as certified,
      SUM(CASE WHEN LOWER(status_pegawai) = 'pns' THEN 1 ELSE 0 END) as pns,
      SUM(CASE WHEN LOWER(status_pegawai) LIKE '%pppk%' THEN 1 ELSE 0 END) as pppk,
      SUM(CASE WHEN LOWER(status_pegawai) NOT IN ('pns','pppk','pppk_paruh_waktu') THEN 1 ELSE 0 END) as honorer
    FROM employees WHERE is_active = 1
    GROUP BY sekolah_id
  `);
  const agg: Record<string, SchoolTeacherAggregate> = {};
  for (const row of result.rows) {
    agg[row.sekolah_id as string] = {
      npsn: row.sekolah_id as string,
      total: Number(row.total),
      certified: Number(row.certified),
      pns: Number(row.pns),
      pppk: Number(row.pppk),
      honorer: Number(row.honorer),
    };
  }
  return agg;
}

// ── Employee CRUD ──

export async function insertEmployee(data: {
  sekolah_id: string; nama: string; nik: string; nip?: string | null;
  email?: string | null; no_hp?: string | null; tempat_lahir?: string | null;
  tanggal_lahir?: string | null; jenis_kelamin?: string | null;
  jabatan?: string | null; status_pegawai?: string | null;
  pangkat_golongan?: string | null; pendidikan_terakhir?: string | null;
  sertifikasi?: string | null;
}): Promise<EmployeeRow | null> {
  const client = getDb();
  if (!client) return null;
  const now = Date.now();
  const id = `EMP-${now}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await client.execute({
      sql: `INSERT INTO employees (id, sekolah_id, nama, nik, nip, email, no_hp, tempat_lahir, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, sertifikasi, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [id, data.sekolah_id, data.nama, data.nik, data.nip ?? null,
             data.email ?? null, data.no_hp ?? null, data.tempat_lahir ?? null,
             data.tanggal_lahir ?? null, data.jenis_kelamin ?? null,
             data.jabatan ?? null, data.status_pegawai ?? null,
             data.pangkat_golongan ?? null, data.pendidikan_terakhir ?? null,
             data.sertifikasi ?? null, now, now]
    });
    const result = await client.execute({ sql: 'SELECT * FROM employees WHERE id = ?', args: [id] });
    return result.rows[0] as unknown as EmployeeRow;
  } catch {
    return null;
  }
}

export async function updateEmployee(id: string, data: Partial<{
  nama: string; nik: string; nip: string | null; email: string | null;
  no_hp: string | null; jabatan: string | null; status_pegawai: string | null;
  pangkat_golongan: string | null; pendidikan_terakhir: string | null;
  sertifikasi: string | null; is_active: number;
}>): Promise<boolean> {
  const client = getDb();
  if (!client) return false;
  const sets: string[] = [];
  const args: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      args.push(val);
    }
  }
  if (sets.length === 0) return false;
  sets.push('updated_at = ?');
  args.push(Date.now());
  args.push(id);
  try {
    await client.execute({
      sql: `UPDATE employees SET ${sets.join(', ')} WHERE id = ?`,
      args
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const client = getDb();
  if (!client) return false;
  try {
    await client.execute({
      sql: 'UPDATE employees SET is_active = 0, updated_at = ? WHERE id = ?',
      args: [Date.now(), id]
    });
    return true;
  } catch {
    return false;
  }
}

// ── Document CRUD ──

export async function upsertEmployeeDocument(data: {
  id?: string; employee_id: string; school_id: string; kategori: string;
  jenis_dokumen: string; nama_file: string; mime_type: string;
  file_size: number; drive_file_id: string; drive_url: string;
  status_verifikasi?: string; catatan_revisi?: string | null;
}): Promise<boolean> {
  const client = getDb();
  if (!client) return false;
  const now = Date.now();
  const id = data.id || `DOC-${now}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await client.execute({
      sql: `INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, catatan_revisi, uploaded_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sudah_diupload', COALESCE(?, 'belum_diverifikasi'), 'belum_lengkap', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              kategori = COALESCE(?, kategori),
              jenis_dokumen = COALESCE(?, jenis_dokumen),
              nama_file = COALESCE(?, nama_file),
              mime_type = COALESCE(?, mime_type),
              file_size = COALESCE(?, file_size),
              drive_file_id = COALESCE(?, drive_file_id),
              drive_url = COALESCE(?, drive_url),
              catatan_revisi = COALESCE(?, catatan_revisi),
              updated_at = COALESCE(?, updated_at)`,
      args: [id, data.employee_id, data.school_id, data.kategori, data.jenis_dokumen,
             data.nama_file, data.mime_type, data.file_size, data.drive_file_id,
             data.drive_url, data.status_verifikasi ?? null, data.catatan_revisi ?? null,
             now, now,
             data.kategori, data.jenis_dokumen, data.nama_file, data.mime_type,
             data.file_size, data.drive_file_id, data.drive_url, data.catatan_revisi ?? null, now]
    });
    return true;
  } catch {
    return false;
  }
}

export async function verifyEmployeeDocument(id: string, status: 'verified' | 'rejected', catatan?: string): Promise<boolean> {
  const client = getDb();
  if (!client) return false;
  const now = Date.now();
  const statusVerifikasi = status === 'verified' ? 'sudah_diverifikasi' : 'ditolak';
  const statusKelengkapan = status === 'verified' ? 'lengkap' : 'belum_lengkap';
  try {
    await client.execute({
      sql: `UPDATE employee_documents SET status_verifikasi = ?, status_kelengkapan = ?, catatan_revisi = ?, verified_at = ?, updated_at = ? WHERE id = ?`,
      args: [statusVerifikasi, statusKelengkapan, catatan ?? null, now, now, id]
    });
    return true;
  } catch {
    return false;
  }
}

export async function upsertSchool(npsn: string, data: Partial<School> & { name: string; level: string; status: string; village: string }) {
  const client = getDb();
  if (!client) return;
  await client.execute({
    sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng, students, teachers, facilities, health_score, risk_indicators)
          VALUES (?, ?, ?, ?, ?, COALESCE(?, 'Belum'), 0, 0, '{}', '{}', '{}', 0, '[]')
          ON CONFLICT(npsn) DO UPDATE SET
            name = COALESCE(?, name),
            level = COALESCE(?, level),
            status = COALESCE(?, status),
            village = COALESCE(?, village)`,
    args: [npsn, data.name, data.level, data.status, data.village,
           data.accreditation ?? null,
           data.name, data.level, data.status, data.village]
  });
}

export { ALL_SCHOOLS as FALLBACK_SCHOOLS };
