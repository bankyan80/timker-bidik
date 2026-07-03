import { createClient } from '@libsql/client';

// ── Source DB (laporan-pendidikan) ──
const src = createClient({
  url: 'libsql://laporan-pendidikan-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIwMzk3MTMsImlkIjoiMDE5ZWU5ZDctZjcwMS03NDYxLWI2YTQtMzIyNTM3YjY0ZGI3IiwicmlkIjoiMGU2NDhiZTAtY2FlNy00NjEwLWEyODMtZDA4YzEzZGQ4MjllIn0.ZPMXTMXMKUO5s9Wv_NGdg0gcKv4PYcbjxOciF9wEVVlDKIodVqA_WhtzSVdZIOTyx_GEIYa_tVGx9TCKK31oAQ'
});

// ── Target DB (timker-bidik) ──
const tgt = createClient({
  url: 'libsql://timker-bidik-bankyan80.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI5NzYxMzQsImlkIjoiMDE5ZjIxYTgtOTIwMS03NjJmLTlmNzYtMzg5MmM0ZTlmYzAzIiwia2lkIjoiNVl0TUVIQzd6Q2cxZjF5bl9rZmYzMzdPbjAzRG1BdDlwNGZqYXFNMjNBVSIsInJpZCI6ImFhMjk0ZWY5LWM4YmUtNDFlZC1iZWY0LTE2NGFlMTFjZjVhMiJ9.Rja-XP61MWRvLGvkbZFz8MoNpmQMt9_vaMfVQROYZ8bRRKzPNbafQ_K-s5ggXk8kP_7kcNHpnJ4qfZCqfvfxCw'
});

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapJenjang(j) {
  if (j === 'sd') return 'SD';
  if (j === 'tk') return 'TK';
  if (j === 'kb') return 'KB';
  return j;
}

function mapStatus(s) {
  if (!s) return 'Swasta';
  return capitalize(s);
}

function mapGender(g) {
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower.includes('laki')) return 'Laki-laki';
  if (lower === 'l') return 'Laki-laki';
  if (lower.includes('perempuan')) return 'Perempuan';
  if (lower === 'p') return 'Perempuan';
  return g;
}

// Validate gender value
function validateGender(g) {
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower === 'laki-laki' || lower === 'perempuan' || lower === 'l' || lower === 'p') {
    return mapGender(g);
  }
  return null;
}

async function migrate() {
  console.log('=== MIGRASI DATA TK & KB ===\n');

  // 1. Fetch TK/KB schools from source
  const srcSchools = await src.execute(
    "SELECT * FROM schools WHERE jenjang IN ('tk', 'kb') AND is_active = 1"
  );
  console.log(`Ditemukan ${srcSchools.rows.length} sekolah TK/KB di source DB\n`);

  // Check existing schools in target
  const tgtSchools = await tgt.execute("SELECT npsn FROM schools");
  const existingNpsn = new Set(tgtSchools.rows.map(r => r.npsn));

  let newSchools = 0;
  let skippedSchools = 0;
  let newEmployees = 0;
  let skippedEmployees = 0;
  let newStudents = 0;
  let skippedStudents = 0;
  let newDocs = 0;
  let skippedDocs = 0;

  for (const school of srcSchools.rows) {
    const npsn = school.npsn;
    const level = mapJenjang(school.jenjang);
    const status = mapStatus(school.status);
    const village = school.desa || 'Lemahabang';
    const name = school.nama;

    if (existingNpsn.has(npsn)) {
      console.log(`  ⏭  SKIP sekolah (already exists): ${name} (${npsn})`);
      skippedSchools++;
    } else {
      // Insert school into target
      console.log(`  ➕ INSERT sekolah: ${name} (${npsn}, ${level}, ${status}, ${village})`);
      await tgt.execute({
        sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng, students, teachers, facilities, health_score, risk_indicators)
              VALUES (?, ?, ?, ?, ?, 'Belum Terakreditasi', ?, ?, '{}', '{}', '{}', 0, '[]')`,
        args: [npsn, name, level, status, village, school.latitude ?? 0, school.longitude ?? 0]
      });
      newSchools++;
    }

    // 2. Migrate employees for this school
    const srcEmployees = await src.execute({
      sql: "SELECT * FROM employees WHERE sekolah_id = ? AND is_active = 1",
      args: [school.id]
    });

    for (const emp of srcEmployees.rows) {
      // Check if already exists by nik
      const existing = await tgt.execute({
        sql: "SELECT id FROM employees WHERE nik = ?",
        args: [emp.nik]
      });

      if (existing.rows.length > 0) {
        skippedEmployees++;
        continue;
      }

      await tgt.execute({
        sql: `INSERT INTO employees (id, sekolah_id, nama, nik, nip, nuptk, email, no_hp, tempat_lahir, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, jurusan, sertifikasi, tmt_kerja, tanggal_bup, foto_url, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          emp.id, npsn, emp.nama, emp.nik, emp.nip ?? null, emp.nuptk ?? null,
          emp.email ?? null, emp.no_hp ?? null, emp.tempat_lahir ?? null,
          emp.tanggal_lahir ?? null, mapGender(emp.jenis_kelamin),
          emp.jabatan ?? null, emp.status_pegawai ?? null,
          emp.pangkat_golongan ?? null, emp.pendidikan_terakhir ?? null,
          emp.jurusan ?? null, emp.sertifikasi ?? null, emp.tmt_kerja ?? null,
          emp.tanggal_bup ?? null, emp.foto_url ?? null,
          Number(emp.created_at) || Date.now(), Number(emp.updated_at) || Date.now()
        ]
      });
      newEmployees++;
    }

    // 3. Migrate students for this school
    const srcStudents = await src.execute({
      sql: "SELECT * FROM students WHERE school_id = ?",
      args: [school.id]
    });

    for (const stu of srcStudents.rows) {
      const gender = validateGender(stu.jenis_kelamin);

      // Check if already exists by nik or nisn
      if (stu.nik) {
        const existing = await tgt.execute({
          sql: "SELECT id FROM students WHERE nik = ?",
          args: [stu.nik]
        });
        if (existing.rows.length > 0) {
          skippedStudents++;
          continue;
        }
      }
      if (stu.nisn) {
        const existing = await tgt.execute({
          sql: "SELECT id FROM students WHERE nisn = ?",
          args: [stu.nisn]
        });
        if (existing.rows.length > 0) {
          skippedStudents++;
          continue;
        }
      }

      const id = `STU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await tgt.execute({
        sql: `INSERT INTO students (id, school_npsn, nama, nisn, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, jenjang, kelas_kelompok, rombel, status_siswa, tahun_pelajaran)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, COALESCE(?, 'aktif'), ?)`,
        args: [
          id, npsn, stu.nama, stu.nisn ?? null, stu.nik ?? null, gender,
          stu.tempat_lahir ?? null, stu.tanggal_lahir ?? null,
          level, stu.kelas_kelompok, stu.status_siswa, stu.tahun_pelajaran
        ]
      });
      newStudents++;
    }

    // 4. Migrate employee documents
    const srcDocs = await src.execute({
      sql: `SELECT ed.* FROM employee_documents ed
            INNER JOIN employees e ON e.id = ed.employee_id
            WHERE e.sekolah_id = ? AND e.is_active = 1`,
      args: [school.id]
    });

    for (const doc of srcDocs.rows) {
      // Check if already exists by drive_file_id
      const existing = await tgt.execute({
        sql: "SELECT id FROM employee_documents WHERE drive_file_id = ?",
        args: [doc.drive_file_id]
      });
      if (existing.rows.length > 0) {
        skippedDocs++;
        continue;
      }

      await tgt.execute({
        sql: `INSERT INTO employee_documents (id, employee_id, school_id, kategori, jenis_dokumen, nama_file, mime_type, file_size, drive_file_id, drive_url, status_upload, status_verifikasi, status_kelengkapan, catatan_revisi, uploaded_by, verified_by, uploaded_at, verified_at, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id, doc.employee_id, npsn, doc.kategori, doc.jenis_dokumen,
          doc.nama_file, doc.mime_type, Number(doc.file_size), doc.drive_file_id,
          doc.drive_url, doc.status_upload, doc.status_verifikasi,
          doc.status_kelengkapan, doc.catatan_revisi ?? null,
          doc.uploaded_by ?? null, doc.verified_by ?? null,
          doc.uploaded_at ? Number(doc.uploaded_at) : null,
          doc.verified_at ? Number(doc.verified_at) : null,
          Number(doc.created_at) || Date.now(), Number(doc.updated_at) || Date.now()
        ]
      });
      newDocs++;
    }
  }

  console.log(`\n=== RINGKASAN ===`);
  console.log(`  Sekolah: ${newSchools} baru + ${skippedSchools} sudah ada`);
  console.log(`  Pegawai: ${newEmployees} baru + ${skippedEmployees} sudah ada`);
  console.log(`  Siswa:   ${newStudents} baru + ${skippedStudents} sudah ada`);
  console.log(`  Dokumen: ${newDocs} baru + ${skippedDocs} sudah ada`);
  console.log(`\nSelesai.`);
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
