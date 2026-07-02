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

  // ── Summary ──
  const totalEmps = await db.execute('SELECT COUNT(*) as count FROM employees WHERE is_active = 1')
  const totalDocs = await db.execute('SELECT COUNT(*) as count FROM employee_documents')
  console.log('\n══════════════════════════════════════════')
  console.log('  Seed completed!')
  console.log(`  Employees in DB: ${totalEmps.rows[0].count}`)
  console.log(`  Documents in DB: ${totalDocs.rows[0].count}`)
  console.log('══════════════════════════════════════════')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
