# Summary — TimKer Bidik Lemahabang

## Current State
- **1,465 documents** in DB with drive links (1,453 + 12 baru dari TK/KB)
- **394 employees** (was 282 — +112 from TK/KB)
- **6,501 students** total (5,339 SD + 605 TK + 557 KB)
- **44 schools**: 21 SD Negeri, 8 TK (1 Negeri + 7 Swasta), 15 KB Swasta

## What's Been Done
### Data Migration (TK/KB dari laporan-pendidikan)
- Script `scripts/migrate-tk-kb.mjs` — migrasi 17 sekolah baru + 89 pegawai + 769 siswa + 12 dokumen dari source DB `laporan-pendidikan` ke `timker-bidik`
- Skipped 6 sekolah (5 KB + 1 TK yang sudah ada dari seed mock data)
- Mapping: UUID `school_id` → `npsn` (target uses NPSN as PK for employees.sekolah_id & students.school_npsn)
- Gender values normalized (L/P → Laki-laki/Perempuan)

### Google Sheets (5 sheets) - 647 records synced
- Sheet 1 (PPPK PW, 52 rows): 567 dokumen (IJAZAH, SK PPPK, KTP, KK, NPWP, BPJS, etc.)
- Sheet 2 (PPPK Foto, 54 rows): 80 PASS FOTO inserted
- Sheet 3 (PNS Folder, 65 rows): All 65 folder links scanned — **all empty**
- Sheet 4 (Biodata): All columns empty — skipped
- Sheet 5 (PNS Detail, 37 rows): 8 doc types per employee

### Local File Uploads - ~722 files uploaded
- Batch 1 (upload-to-drive.mjs): Original upload
- Batch 2 (upload-batch2.mjs): 346 files
- upload-all-remaining.mjs: 12 net new files
- upload-final.mjs: **63 files** (52 + 11) in final cleanup

### Matching Improvements
- NAME_MAP for device names: Purple Grey → DIYAN HIDAYAT, OppoA16 → CARWINAH, Fiona Anastasya → SUPRIHATIN, etc.
- SCAN DPE: 6 retired employees (OYAH HUNAYAH, MULYA SUSIAWAN, SHOFIAH, SYAHRUDIN, UMI SUMIRAH, Wagiran) → skip 79 files
- Data Scan P3K: HARTI at SDN 2 BELAWA → Eni Suhartini
- All 65 PNS folder links confirmed empty via Drive API

## Remaining 8 Unmatched Files (Generic — no employee name)
- Data Scan P3K/SDN 2 BELAWA: `ijazah sri dan transkif.pdf`
- Data Scan P3K/SDN 2 CIPEUJEUH WETAN: generic numbered files (SK P3K, IJAZAH, KTP, SPMT, PENUGASAN)  
- Data Scan P3K/SDN 4 CIPEUJEUH WETAN: `SK KEPSEK SKBM.pdf`
- PASS FOTO: generic WhatsApp image

## Remaining Issues
- 112 employees with 0 docs — mostly PNS (69), honorer (34)
- "mamnuah ali" (10 files) — person not in DB
- "atikotun"/"ATI KOTUN" — exists in DB but PASS FOTO needs matching

## Key Scripts
- `scripts/migrate-tk-kb.mjs` — Migrate TK/KB data from laporan-pendidikan to timker-bidik DB
- `scripts/sync-from-sheets.mjs` — Process 5 Google Sheets CSVs → sync Drive links to DB
- `scripts/scan-pns-folders.mjs` — Verify PNS folder links via Drive API
- `scripts/upload-final.mjs` — Final comprehensive match + upload
