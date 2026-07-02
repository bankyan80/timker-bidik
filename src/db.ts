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
  if (Number(existing.rows[0].count) > 0) return;

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
    SELECT school_npsn, jenjang, COUNT(*) as cnt
    FROM students WHERE LOWER(status_siswa) = 'aktif'
    GROUP BY school_npsn, jenjang
  `);
  for (const row of byGrade.rows) {
    const npsn = row.school_npsn as string;
    if (agg[npsn]) {
      agg[npsn].byGrade[row.jenjang as string] = Number(row.cnt);
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
      SUM(CASE WHEN status_pegawai = 'PNS' THEN 1 ELSE 0 END) as pns,
      SUM(CASE WHEN status_pegawai = 'PPPK' THEN 1 ELSE 0 END) as pppk,
      SUM(CASE WHEN status_pegawai = 'Honorer' THEN 1 ELSE 0 END) as honorer
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
