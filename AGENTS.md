# Summary — TimKer Bidik Lemahabang

## Current State
- **5,602 students** total (SD 4,470 + TK 567 + KB 565) — after cleanup: deleted 3,409 case‑sensitive KELAS duplicates, 304 SD IT AL IRSYAD weird entries, 385 short‑form entries; fixed 173 empty‑jenjang students; **SD cleanup this session**: deleted 134 fake students at SDN 1 Asem (NISN prefix 32+), deleted 1,671 extra SD students (NISN not in portal-dinas), imported 190 missing from portal-dinas
- **411 employees** (131 GTY/PTY, 118 PPPK, 81 PNS, 46 PPPK Paruh Waktu, 15 Honorer Sekolah/Daerah, 9 Guru Honor Sekolah, 7 Tenaga Honor Sekolah, 2 Honor Daerah, 1 PPPK PW, 1 Lainnya)
- **618 employee_documents** (0 orphan) — 320 employees have 0 docs
- **45 schools** (23 SD: 21N+2S, 8 TK: 1N+7S, 15 KB: 15S)
- **Student detail**: `student_parents` (5,416), `student_addresses` (5,416), `student_health` (5,416) — re-imported from tursodb after cleanup wiped earlier data

## Session 2026-07-08 — SD Cleanup & Re-import

### SD Data Synchronization with Portal-Dinas
- **SDN 1 Asem (20215216) cleanup**: Deleted 134 fake students (NISN prefix 32+ — e.g., 3200000568, 3212345678; fake names like MAMAN KURNIAWAN, HENI HARYANTO, etc.) — reduced from 347 to 213 students (portal: 212). **Accidental deletion**: 25 valid students with NISN 318xxxxx also removed (no backup in portal-dinas or tursodb — permanent loss)
- **Bulk delete extra SD students**: `scripts/bulk-delete-remaining.mjs` — deleted 1,671 students whose NISN doesn't match portal-dinas per school across all 22 SDs
- **Import missing SD students**: `scripts/import-missing-from-portal.mjs` — imported 190 students from portal-dinas (those in portal-dinas but not in timker)
- **Final SD count**: **4,470** — differs from portal-dinas **4,469** by +1 (RYANKA PTRA ANUGRAH at SDN 1 Asem with NISN `-`)
- **Scripts used**: `scripts/delete-sdn1-asem-fake.mjs`, `scripts/bulk-delete-remaining.mjs`, `scripts/import-missing-from-portal.mjs`

### Student Detail Re-import
- **Problem**: Mid-cleanup, `student_parents`/`addresses`/`health` tables showed **0 rows** (all ~6,400 previously imported records gone). Cause unclear — possibly a bulk delete script with wider scope than intended, or the earlier import session had not actually persisted
- **Fix**: `scripts/reimport-student-detail.mjs` — re-imported from tursodb (`OrangTuaSiswa.json`, `AlamatSiswa.json`, `KesehatanSiswa.json`) using concurrency=20. Result: **5,416 records each** (matched 5,588 current timker students with NISN = ~97% coverage)

## Session 2026-07-04 — "fix all" fixes
- **Delete document API + UI**: Added `DELETE /api/documents/:id` endpoint (with Google Drive cleanup) + delete confirmation dialog; `handleDeleteDocument` now calls API; added `dbId`/`driveFileId` to `DocumentItem` interface
- **Student detail API + UI**: Added `GET /api/students/:id/detail` and `PUT /api/students/:id/detail` endpoints; added `student_parents`, `student_addresses`, `student_health` table schemas to `db.ts`; added detail modal (Orang Tua / Alamat / Kesehatan tabs) in `StudentManagement.tsx` with edit/save capability
- **Document category constants**: SKBM, SPMT, TRANSKIP NILAI now properly mapped in `mapCategoryToDBKategori` (upload) and `mapDocToCategory` (display)
- **Roman numeral rombel cleanup script**: `scripts/fix-roman-rombel.mjs` — converts `Kelas II` → `Kelas 2` for remaining entries (0 found — already cleaned)

## Data Enrichment from tursodb (Previous Sessions)
- **Fixed 118 employee statuses**: Cross‑referenced 164 tursodb pegawai by NIK → updated timker‑bidik employees (Lainnya 274→156, PNS 2→49, PPPK 12→80, PPPK PW 24→31)
- **Merged 829 arsip documents**: All 841 tursodb arsip matched to timker employees; 12 duplicates skipped → total 618 employee_documents
- **Student detail import**: Originally imported 6,434 records; lost during cleanup; **re-imported this session** (see above)

## Remaining Issues
- 320 employees with 0 docs (need more data from portal-dinas or manual upload)
- NAFEEZA/NAZEERA NISN conflict at SDN 3 Cipeujeuh Wetan (NISN 3165721033)

## Key Scripts (Current Session)
- `scripts/delete-sdn1-asem-fake.mjs` — Delete 134 fake SDN 1 Asem students (NISN prefix 32+)
- `scripts/bulk-delete-remaining.mjs` — Delete 1,671 SD students not matching portal-dinas NISN
- `scripts/import-missing-from-portal.mjs` — Import 190 missing SD students from portal-dinas
- `scripts/reimport-student-detail.mjs` — Re-import parent/address/health from tursodb (concurrent, batched)

## Key Scripts (Previous Sessions)
- `scripts/fix-status-from-turso.mjs` — Cross‑reference tursodb pegawai by NIK, fix status_pegawai
- `scripts/import-student-detail-from-turso.mjs` — Original parent/address/health import (now superseded)
- `scripts/import-arsip-to-timker.mjs` — Merge arsip documents from tursodb
- `scripts/cleanup-final.mjs` — Case‑sensitive KELAS duplicate removal
- `scripts/restore-and-clean.mjs` — Re‑import portal-dinas students + rombel cleanup
- `scripts/fix-roman-rombel.mjs` — Convert roman numeral rombels (Kelas II → Kelas 2)

## Relevant Files
- `src/app.ts:408-435` — `/api/employees-with-docs` endpoint (JOINs schools)
- `src/app.ts:644-703` — Document CRUD (POST + DELETE + verify)
- `src/app.ts:883-960` — Student CRUD + detail endpoints (GET/PUT `/api/students/:id/detail`)
- `src/components/ManajemenPegawai.tsx` — Employee page component
- `src/components/StudentManagement.tsx` — Student table + detail modal (parents/address/health)
- `src/components/DocumentIntel.tsx:244-274` — Delete document handler (now API-backed)
- `src/data/employeeDocsData.ts:173-182` — DocumentItem interface with `dbId`/`driveFileId`
- `src/data/mockData.ts` — baseSchools array (fake "SD NEGERI 3 LEMAHABANG" removed)
- `src/db.ts:265+` — Student detail table schemas + CRUD functions (getStudentDetail, upsertStudentParents/Address/Health)
