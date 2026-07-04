# Summary — TimKer Bidik Lemahabang

## Current State
- **6,612 students** total (SD 5,488 + TK 564 + KB 560) — after cleanup: deleted 3,409 case‑sensitive KELAS duplicates, 304 SD IT AL IRSYAD weird entries, 385 short‑form entries; fixed 173 empty‑jenjang students
- **427 employees** (156 Lainnya, 99 Honorer, 80 PPPK, 49 PNS, 31 PPPK PW, 10 ASN, 2 GTY) — 118 "Lainnya" fixed via tursodb cross‑reference
- **2,294 documents** (1,465 existing + 829 from tursodb arsip) with Drive/Blob URLs
- **45 schools** (23 SD: 21N+2S, 8 TK: 1N+7S, 15 KB: 15S)
- **New tables**: `student_parents` (6,434), `student_addresses` (6,434), `student_health` (6,434) — enriched from tursodb
- **320 employees** with 0 docs (from 411 total after re-import)

## Key Changes (This Session)
### Session 2026-07-04 — "fix all" fixes
- **Delete document API + UI**: Added `DELETE /api/documents/:id` endpoint (with Google Drive cleanup) + delete confirmation dialog; `handleDeleteDocument` now calls API; added `dbId`/`driveFileId` to `DocumentItem` interface
- **Student detail API + UI**: Added `GET /api/students/:id/detail` and `PUT /api/students/:id/detail` endpoints; added `student_parents`, `student_addresses`, `student_health` table schemas to `db.ts`; added detail modal (Orang Tua / Alamat / Kesehatan tabs) in `StudentManagement.tsx` with edit/save capability
- **Document category constants**: SKBM, SPMT, TRANSKIP NILAI now properly mapped in `mapCategoryToDBKategori` (upload) and `mapDocToCategory` (display)
- **Roman numeral rombel cleanup script**: `scripts/fix-roman-rombel.mjs` — converts `Kelas II` → `Kelas 2` for remaining entries (0 found — already cleaned)
- **Recalculated employees with 0 docs**: 320 out of 411 employees have 0 documents

### Data Enrichment from tursodb (C:\Users\Bank Yan\Downloads\tursodb)
- **Fixed 118 employee statuses**: Cross‑referenced 164 tursodb pegawai by NIK → updated timker‑bidik employees (Lainnya 274→156, PNS 2→49, PPPK 12→80, PPPK PW 24→31)
- **Imported student detail**: 6,434 records each for parents, addresses, health (matched by NISN, 97% coverage)
- **Merged 829 arsip documents**: All 841 tursodb arsip matched to timker employees; 12 duplicates skipped → total 2,294 docs

### Pegawai Page Fixes (from last session)
- Removed fake "SD NEGERI 3 LEMAHABANG" from mockData.ts (NPSN 20215221 was duplicated)
- API `/api/employees-with-docs` now LEFT JOINs `schools` table → returns school_name/level/status
- Employee rows sorted alphabetically within each school group
- "Lainnya" status gets distinct dark‑grey badge
- `useMemo` for filtered/grouped data
- `scripts/fix-status-from-turso.mjs` — Fix status_pegawai from tursodb reference
- `scripts/import-student-detail-from-turso.mjs` — Import parent/address/health data
- `scripts/import-arsip-to-timker.mjs` — Merge arsip documents

### JWT Auth + Role-Based Access (from 2026-07-03 session)
- JWT auth endpoints (`POST /api/auth/login`, `GET /api/auth/me`) with `authenticateToken` / `requireRole` middleware
- `AuthContext.tsx` + `LoginPage.tsx` + `api.ts` (auto auth header + 401 redirect)
- Role-based menu filtering (`operator_sekolah` sees own school only on all 30+ endpoints)
- Flat employee table with 17-field edit modal + delete

## Remaining Issues
- 320 employees with 0 docs (need more data from portal-dinas or manual upload)
- SD IT AL IRSYAD (20215221): 32 employees with 549 students (previously reported as 0 after cleanup, now restored via reimport)

## Key Scripts
- `scripts/fix-status-from-turso.mjs` — Cross‑reference tursodb pegawai by NIK, fix status_pegawai
- `scripts/import-student-detail-from-turso.mjs` — Import parents/addresses/health from tursodb
- `scripts/import-arsip-to-timker.mjs` — Merge arsip documents from tursodb
- `scripts/emp-status-check.mjs` — Check employee status distribution
- `scripts/sync-from-portal-dinas.mjs` — Full data sync from portal-dinas
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
