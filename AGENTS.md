# Summary — TimKer Bidik Lemahabang

## Current State
- **6,612 students** total (SD 5,488 + TK 564 + KB 560) — after cleanup: deleted 3,409 case‑sensitive KELAS duplicates, 304 SD IT AL IRSYAD weird entries, 385 short‑form entries; fixed 173 empty‑jenjang students
- **427 employees** (156 Lainnya, 99 Honorer, 80 PPPK, 49 PNS, 31 PPPK PW, 10 ASN, 2 GTY) — 118 "Lainnya" fixed via tursodb cross‑reference
- **2,294 documents** (1,465 existing + 829 from tursodb arsip) with Drive/Blob URLs
- **45 schools** (23 SD: 21N+2S, 8 TK: 1N+7S, 15 KB: 15S)
- **New tables**: `student_parents` (6,434), `student_addresses` (6,434), `student_health` (6,434) — enriched from tursodb

## Key Changes (This Session)
### Data Enrichment from tursodb (C:\Users\Bank Yan\Downloads\tursodb)
- **Fixed 118 employee statuses**: Cross‑referenced 164 tursodb pegawai by NIK → updated timker‑bidik employees (Lainnya 274→156, PNS 2→49, PPPK 12→80, PPPK PW 24→31)
- **Imported student detail**: 6,434 records each for parents, addresses, health (matched by NISN, 97% coverage)
- **Merged 829 arsip documents**: All 841 tursodb arsip matched to timker employees; 12 duplicates skipped → total 2,294 docs
- New tables created in DB but no UI yet

### Pegawai Page Fixes (from last session)
- Removed fake "SD NEGERI 3 LEMAHABANG" from mockData.ts (NPSN 20215221 was duplicated)
- API `/api/employees-with-docs` now LEFT JOINs `schools` table → returns school_name/level/status
- Employee rows sorted alphabetically within each school group
- "Lainnya" status gets distinct dark‑grey badge
- `useMemo` for filtered/grouped data
- `scripts/fix-status-from-turso.mjs` — Fix status_pegawai from tursodb reference
- `scripts/import-student-detail-from-turso.mjs` — Import parent/address/health data
- `scripts/import-arsip-to-timker.mjs` — Merge arsip documents

## Remaining Issues
- 257 employees with 0 docs (down from 427 before arsip merge — need recalc)
- Delete document web UI not integrated with backend API
- Roman‑numeral rombels (Kelas II etc.) co‑exist with proper Kelas 2 form — 882 entries
- SD IT AL IRSYAD (20215221): 32 employees with 549 students (previously reported as 0 after cleanup, now restored via reimport)
- New tables (student_parents/addresses/health) have no API endpoints or UI yet

## Key Scripts
- `scripts/fix-status-from-turso.mjs` — Cross‑reference tursodb pegawai by NIK, fix status_pegawai
- `scripts/import-student-detail-from-turso.mjs` — Import parents/addresses/health from tursodb
- `scripts/import-arsip-to-timker.mjs` — Merge arsip documents from tursodb
- `scripts/emp-status-check.mjs` — Check employee status distribution
- `scripts/sync-from-portal-dinas.mjs` — Full data sync from portal-dinas
- `scripts/cleanup-final.mjs` — Case‑sensitive KELAS duplicate removal
- `scripts/restore-and-clean.mjs` — Re‑import portal-dinas students + rombel cleanup

## Relevant Files
- `src/app.ts:408-435` — `/api/employees-with-docs` endpoint (JOINs schools)
- `src/components/ManajemenPegawai.tsx` — Employee page component
- `src/data/mockData.ts` — baseSchools array (fake "SD NEGERI 3 LEMAHABANG" removed)
