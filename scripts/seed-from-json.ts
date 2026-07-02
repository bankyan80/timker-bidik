import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

dotenv.config({ path: join(import.meta.dirname, '..', '.env.local') })
import { createClient } from '@libsql/client'

const JSON_DIR = join(process.env.HOME || process.env.USERPROFILE || 'C:\\Users\\Bank Yan', 'Downloads', 'tursodb')

const db = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_TOKEN!,
})

interface SekolahJson {
  id: string
  npsn: string
  namaSekolah: string
  jenjang: string
  statusSekolah: string
  alamat: string | null
  desa: string | null
  kecamatan: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface PegawaiJson {
  id: string
  instansi_id: string
  nama_instansi: string
  nama_pegawai: string
  nip: string
  nik: string
  tanggal_lahir: string | null
  jenis_kelamin: string | null
  jabatan: string | null
  status_pegawai: string | null
  pangkat_golongan: string | null
  pendidikan_terakhir: string | null
  nomor_hp: string | null
  email: string | null
  alamat: string | null
  role: string
  status_aktif: number
  password: string
  created_at: string
  updated_at: string
}

interface ArsipJson {
  id: string
  pegawai_id: string
  nip: string
  nik: string
  nama_pegawai: string
  instansi_id: string
  kelompok_arsip: string
  jenis_dokumen: string
  nama_dokumen: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  download_url: string
  status_validasi: string
  catatan_admin: string | null
  deleted: number
  uploaded_at: string
  updated_at: string
}

interface SiswaJson {
  id: string
  sekolahId: string
  rombelId: string
  tahunPelajaran: string
  nisn: string
  nik: string
  namaLengkap: string
  tempatLahir: string
  tanggalLahir: string
  jenisKelamin: string
  jenjang: string
  kelasKelompok: string
  rombel: string
  statusSiswa: string
}

function loadJson<T>(file: string): T[] {
  const raw = readFileSync(join(JSON_DIR, file), 'utf-8')
  return JSON.parse(raw) as T[]
}

function isNegeri(nama: string): boolean {
  return nama.toUpperCase().includes('NEGERI')
}

function mapJenisKelamin(jk: string | null): string | null {
  if (!jk) return null
  const j = jk.toLowerCase()
  if (j.includes('laki')) return 'laki-laki'
  if (j.includes('perempuan')) return 'perempuan'
  return null
}

function mapStatusPegawai(sp: string | null | undefined): string {
  const s = (sp || '').toLowerCase()
  if (s === 'pns') return 'pns'
  if (s.includes('pppk paruh')) return 'pppk_paruh_waktu'
  if (s.includes('pppk')) return 'pppk'
  if (s.includes('honor') || s === 'guru honor sekolah') return 'honorer'
  return 'honorer'
}

function mapPendidikan(p: string | null): string | null {
  if (!p) return null
  const s = p.trim()
  if (s === 'S1') return 'S.1'
  if (s === 'S2') return 'S.2'
  if (s === 'S3') return 'S.3'
  if (s === 'D1') return 'D.1'
  if (s === 'D2') return 'D.2'
  if (s === 'D3') return 'D.3'
  if (s === 'SD') return 'SD Sederajat'
  if (s === 'SMP') return 'SMP Sederajat'
  if (s === 'SMA') return 'SMA Sederajat'
  return s
}

function calculateBup(tanggalLahir: string | null | undefined, jabatan: string | null): string | null {
  if (!tanggalLahir) return null
  const usiaPensiun = jabatan?.toLowerCase().includes('guru') || jabatan?.toLowerCase().includes('kepala') ? 60 : 58
  const tgl = new Date(tanggalLahir)
  if (isNaN(tgl.getTime())) return null
  tgl.setFullYear(tgl.getFullYear() + usiaPensiun)
  tgl.setMonth(tgl.getMonth() + 1)
  tgl.setDate(1)
  return tgl.toISOString().split('T')[0]
}

function parseDateToTimestamp(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d.getTime()
}

async function ensureSchema() {
  console.log('Ensuring schema exists...')
  await db.execute(`
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
  `)
  await db.execute(`
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
  `)
  await db.execute(`
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
  `)
  await db.execute(`
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
  `)
  console.log('  ✓ Schema ready')
}

async function main() {
  await ensureSchema()
  console.log('Loading JSON files...')
  const sekolahList = loadJson<SekolahJson>('Sekolah.json')
  const pegawaiList = loadJson<PegawaiJson>('pegawai.json')
  const arsipList = loadJson<ArsipJson>('arsip.json')

  console.log(`  Schools: ${sekolahList.length}`)
  console.log(`  Employees (JSON): ${pegawaiList.length}`)
  console.log(`  Documents (JSON): ${arsipList.length}`)

  // ── Filter negeri schools ──
  const negeriSekolah = sekolahList.filter(sk => isNegeri(sk.namaSekolah))
  const negeriNpsnSet = new Set(negeriSekolah.map(sk => sk.npsn))
  console.log(`  Negeri schools: ${negeriSekolah.length}`)

  // Build lookup: npsn -> SekolahJson
  const sekolahByNpsn = new Map<string, SekolahJson>()
  for (const sk of sekolahList) {
    sekolahByNpsn.set(sk.npsn, sk)
  }

  // ── Seed schools into timker-bidik format ──
  console.log('\nSeeding schools...')
  let schoolInserted = 0
  let schoolSkipped = 0
  for (const sk of negeriSekolah) {
    const level = sk.jenjang.toUpperCase() === 'SD' ? 'SD' : sk.jenjang.toUpperCase() === 'SMP' ? 'SMP' : sk.jenjang.toUpperCase() === 'SMA' ? 'SMA' : sk.jenjang.toUpperCase()
    const defaultStudents = { total: 0, male: 0, female: 0, byGrade: {}, growthTrend: [0,0,0,0,0] }
    const defaultTeachers = { total: 0, certified: 0, pns: 0, pppk: 0, honorer: 0, subjects: {}, pendingCertification: 0, retiringSoon: 0 }
    const defaultFacilities = { classroomCondition: { good: 0, lightDamage: 0, heavyDamage: 0 }, hasLibrary: false, hasLab: false, toiletsGood: 0, toiletsDamaged: 0, internetSpeedMbps: 0, internetProvider: '' }

    try {
      await db.execute({
        sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng, students, teachers, facilities, health_score, risk_indicators)
              VALUES (?, ?, ?, ?, ?, 'Belum Terakreditasi', 0, 0, ?, ?, ?, 50, ?)`,
        args: [
          sk.npsn,
          sk.namaSekolah,
          level,
          'Negeri',
          sk.desa || sk.kecamatan || '',
          JSON.stringify(defaultStudents),
          JSON.stringify(defaultTeachers),
          JSON.stringify(defaultFacilities),
          JSON.stringify({ teacherShortage: false, studentOverload: false, infrastructureCritical: false, retirementExposure: false }),
        ]
      })
      schoolInserted++
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        schoolSkipped++
      } else {
        console.warn(`  ⚠ Error inserting school ${sk.namaSekolah}: ${err.message}`)
        schoolSkipped++
      }
    }
  }
  console.log(`  ✓ ${schoolInserted} schools inserted (${schoolSkipped} skipped)`)

  // Build set of negeri school NPSNs in DB
  const matchedNpsns = new Set(negeriSekolah.map(sk => sk.npsn))

  const BATCH_SIZE = 50

  // ── Seed employees ──
  console.log('\nSeeding employees...')
  const empStmts: { sql: string; args: any[] }[] = []
  let empSkipped = 0

  for (const pgw of pegawaiList) {
    const npsn = pgw.instansi_id.replace('INST_', '')
    if (!matchedNpsns.has(npsn)) { empSkipped++; continue }
    const now = Date.now()
    empStmts.push({
      sql: `INSERT OR IGNORE INTO employees (id, sekolah_id, nama, nik, nip, email, no_hp, tempat_lahir, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, sertifikasi, tanggal_bup, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        pgw.id, npsn, pgw.nama_pegawai, pgw.nik, pgw.nip || null,
        pgw.email || null, pgw.nomor_hp || null, null,
        pgw.tanggal_lahir || null, mapJenisKelamin(pgw.jenis_kelamin),
        pgw.jabatan || null, mapStatusPegawai(pgw.status_pegawai),
        pgw.pangkat_golongan || null, mapPendidikan(pgw.pendidikan_terakhir),
        null, calculateBup(pgw.tanggal_lahir, pgw.jabatan),
        now, now,
      ]
    })
  }
  for (let i = 0; i < empStmts.length; i += BATCH_SIZE) {
    await db.batch(empStmts.slice(i, i + BATCH_SIZE))
  }
  console.log(`  ✓ ${empStmts.length} employees inserted (${empSkipped} skipped)`)

  // ── Seed employee documents ──
  console.log('\nSeeding employee documents...')
  const docStmts: { sql: string; args: any[] }[] = []
  let docSkipped = 0

  for (const ars of arsipList) {
    const npsn = ars.instansi_id.replace('INST_', '')
    if (!matchedNpsns.has(npsn)) { docSkipped++; continue }
    const now = Date.now()
    const status = ars.status_validasi === 'Valid' ? 'sudah_diverifikasi' : 'belum_diverifikasi'
    docStmts.push({
      sql: `INSERT OR IGNORE INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, catatan_revisi, uploaded_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sudah_diupload', ?, ?, ?, ?, ?, ?)`,
      args: [
        ars.id, ars.pegawai_id, npsn,
        ars.kelompok_arsip.toLowerCase().replace(/\s+/g, '_'),
        ars.jenis_dokumen, ars.file_name, ars.file_type || 'application/pdf',
        ars.file_size || 0, ars.storage_path, ars.download_url,
        status, status === 'sudah_diverifikasi' ? 'lengkap' : 'belum_lengkap',
        ars.catatan_admin, parseDateToTimestamp(ars.uploaded_at),
        now, now,
      ]
    })
  }
  for (let i = 0; i < docStmts.length; i += BATCH_SIZE) {
    await db.batch(docStmts.slice(i, i + BATCH_SIZE))
  }
  console.log(`  ✓ ${docStmts.length} documents inserted (${docSkipped} skipped)`)

  // ── Build CMQ school ID → NPSN map ──
  const cmqToNpsn = new Map<string, string>()
  for (const sk of sekolahList) {
    cmqToNpsn.set(sk.id, sk.npsn)
  }

  // ── Seed students ──
  console.log('\nSeeding students...')
  const siswaList = loadJson<SiswaJson>('Siswa.json')
  const negeriCmqIds = new Set(negeriSekolah.map(sk => sk.id))
  const siswaStmts: { sql: string; args: any[] }[] = []
  let siswaSkipped = 0

  for (const sis of siswaList) {
    if (!negeriCmqIds.has(sis.sekolahId)) { siswaSkipped++; continue }
    const npsn = cmqToNpsn.get(sis.sekolahId) || ''
    if (!npsn) { siswaSkipped++; continue }
    const jk = sis.jenisKelamin?.toLowerCase().includes('laki') ? 'laki-laki' : 'perempuan'
    siswaStmts.push({
      sql: `INSERT OR IGNORE INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel, status_siswa, tahun_pelajaran)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sis.id, npsn, sis.namaLengkap, sis.nisn || null, sis.nik || null,
        jk, sis.tempatLahir || null, sis.tanggalLahir || null,
        sis.jenjang, sis.kelasKelompok, sis.rombel || null,
        sis.statusSiswa || 'Aktif', sis.tahunPelajaran,
      ]
    })
  }
  for (let i = 0; i < siswaStmts.length; i += BATCH_SIZE) {
    await db.batch(siswaStmts.slice(i, i + BATCH_SIZE))
  }
  console.log(`  ✓ ${siswaStmts.length} students inserted (${siswaSkipped} skipped out of ${siswaList.length})`)

  // ── Update schools with real student & teacher stats ──
  console.log('\nUpdating schools with real stats...')

  const studentAgg = await db.execute(`
    SELECT school_npsn,
      COUNT(*) as total,
      SUM(CASE WHEN LOWER(jenis_kelamin) = 'laki-laki' THEN 1 ELSE 0 END) as male,
      SUM(CASE WHEN LOWER(jenis_kelamin) = 'perempuan' THEN 1 ELSE 0 END) as female
    FROM students WHERE LOWER(status_siswa) = 'aktif'
    GROUP BY school_npsn
  `)
  const studentByNpsn = new Map<string, { total: number; male: number; female: number }>()
  for (const row of studentAgg.rows) {
    studentByNpsn.set(row.school_npsn as string, {
      total: Number(row.total),
      male: Number(row.male),
      female: Number(row.female),
    })
  }

  const gradeAgg = await db.execute(`
    SELECT school_npsn, jenjang, COUNT(*) as cnt
    FROM students WHERE LOWER(status_siswa) = 'aktif'
    GROUP BY school_npsn, jenjang
  `)
  const gradeByNpsn = new Map<string, Record<string, number>>()
  for (const row of gradeAgg.rows) {
    const npsn = row.school_npsn as string
    if (!gradeByNpsn.has(npsn)) gradeByNpsn.set(npsn, {})
    gradeByNpsn.get(npsn)![row.jenjang as string] = Number(row.cnt)
  }

  const teacherAgg = await db.execute(`
    SELECT sekolah_id,
      COUNT(*) as total,
      SUM(CASE WHEN sertifikasi IS NOT NULL AND sertifikasi != '' THEN 1 ELSE 0 END) as certified,
      SUM(CASE WHEN LOWER(status_pegawai) = 'pns' THEN 1 ELSE 0 END) as pns,
      SUM(CASE WHEN LOWER(status_pegawai) LIKE '%pppk%' THEN 1 ELSE 0 END) as pppk,
      SUM(CASE WHEN LOWER(status_pegawai) NOT IN ('pns','pppk','pppk_paruh_waktu') THEN 1 ELSE 0 END) as honorer
    FROM employees WHERE is_active = 1
    GROUP BY sekolah_id
  `)
  const teacherByNpsn = new Map<string, { total: number; certified: number; pns: number; pppk: number; honorer: number }>()
  for (const row of teacherAgg.rows) {
    teacherByNpsn.set(row.sekolah_id as string, {
      total: Number(row.total),
      certified: Number(row.certified),
      pns: Number(row.pns),
      pppk: Number(row.pppk),
      honorer: Number(row.honorer),
    })
  }

  const negeriNpsnArray = negeriSekolah.map(sk => sk.npsn)
  let schoolsUpdated = 0
  for (const npsn of negeriNpsnArray) {
    const s = studentByNpsn.get(npsn) || { total: 0, male: 0, female: 0 }
    const t = teacherByNpsn.get(npsn) || { total: 0, certified: 0, pns: 0, pppk: 0, honorer: 0 }
    const byGrade = gradeByNpsn.get(npsn) || {}
    const growthTrend = [0, 0, 0, 0, 0]

    const teacherRatio = s.total > 0 && t.total > 0 ? Math.min(s.total / t.total, 40) : 0
    const certRatio = t.total > 0 ? t.certified / t.total : 0
    const pnsRatio = t.total > 0 ? (t.pns + t.pppk) / t.total : 0
    const healthScore = Math.round(
      (teacherRatio >= 16 && teacherRatio <= 20 ? 30 : teacherRatio > 0 && teacherRatio <= 30 ? 20 : 10)
      + (certRatio >= 0.4 ? 20 : certRatio >= 0.2 ? 15 : 10)
      + (pnsRatio >= 0.3 ? 20 : pnsRatio >= 0.15 ? 15 : 10)
      + (s.total > 150 && s.total < 500 ? 15 : 10)
      + (s.total > 0 && t.total > 0 ? 15 : 5)
    )

    const studentsData = JSON.stringify({ total: s.total, male: s.male, female: s.female, byGrade, growthTrend })
    const teachersData = JSON.stringify({
      total: t.total, certified: t.certified, pns: t.pns, pppk: t.pppk, honorer: t.honorer,
      subjects: {}, pendingCertification: t.total - t.certified, retiringSoon: 0,
    })
    const riskIndicators = JSON.stringify({
      teacherShortage: t.total === 0 || teacherRatio > 25 || t.total < 6,
      studentOverload: s.total > 500,
      infrastructureCritical: false,
      retirementExposure: false,
    })

    await db.execute({
      sql: `UPDATE schools SET
        students = ?, teachers = ?, health_score = ?, risk_indicators = ?
        WHERE npsn = ?`,
      args: [studentsData, teachersData, healthScore, riskIndicators, npsn]
    })
    schoolsUpdated++
  }
  console.log(`  ✓ ${schoolsUpdated} schools updated with real stats`)

  // ── Summary ──
  const totalEmps = await db.execute('SELECT COUNT(*) as count FROM employees WHERE is_active = 1')
  const totalDocs = await db.execute('SELECT COUNT(*) as count FROM employee_documents')
  const totalSis = await db.execute('SELECT COUNT(*) as count FROM students')
  console.log('\n══════════════════════════════════════════')
  console.log('  Seed completed!')
  console.log(`  Employees in DB: ${totalEmps.rows[0].count}`)
  console.log(`  Documents in DB: ${totalDocs.rows[0].count}`)
  console.log(`  Students in DB:  ${totalSis.rows[0].count}`)
  console.log('══════════════════════════════════════════')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
