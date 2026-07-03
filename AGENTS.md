# Summary — TimKer Bidik Lemahabang

## Current State
- **6,612 students** total (SD 5,488 + TK 564 + KB 560) — after cleanup: deleted 3,409 case‑sensitive KELAS duplicates, 304 SD IT AL IRSYAD weird entries, 385 short‑form entries; fixed 173 empty‑jenjang students
- **427 employees** (274 Lainnya, 90 Honorer, 24 PPPK PW, 23 ASN, 12 PPPK, 2 PNS, 2 GTY)
- **1,465 documents** with Drive links
- **45 schools** (23 SD: 21N+2S, 8 TK: 1N+7S, 15 KB: 15S)

## Key Changes (Last 2 Sessions)
### DB Cleanup
- Case‑sensitive duplicate deletion: 3,409 uppercase KELAS rows removed via COLLATE BINARY
- 304 SD IT AL IRSYAD weird short‑form + 385 properly short‑form entries deleted
- Re‑imported 3,704 portal-dinas SD records, updated 1,104 (case‑normalized rombel)
- Fixed 173 empty‑jenjang students (1 moved to KB), 1 remaining `?` → TK

### Pegawai Page Fixes
- Removed fake "SD NEGERI 3 LEMAHABANG" entry from mockData.ts (NPSN 20215221 was duplicated — real school is SD IT AL IRSYAD AL ISLAMIYYAH)
- API `/api/employees-with-docs` now LEFT JOINs `schools` table → returns `school_name`, `school_level`, `school_status` directly (no mock data fallback needed)
- Employee rows sorted alphabetically within each school group
- "Lainnya" status gets distinct dark‑grey badge (was falsely amber)
- `useMemo` for filtered/grouped data (performance)
- **Blocked: "Lainnya" (274 emp)** — portal-dinas source had empty status field; no way to recover without re‑scraping

### Infrastructure
- `GOOGLE_SERVICE_ACCOUNT_KEY` set as encrypted Production env var on Vercel
- Build succeeds, deployed to `timker-bidik.online`

## Remaining Issues
- 257 employees with 0 docs (170 have docs)
- Delete document web UI not integrated with backend API
- Roman‑numeral rombels (Kelas II etc.) co‑exist with proper Kelas 2 form — 882 entries, 0 NISN overlap (genuinely different students)
- SD IT AL IRSYAD (20215221): 32 employees but 0 students after cleanup

## Key Scripts
- `scripts/cleanup-final.mjs` — Case‑sensitive KELAS duplicate removal
- `scripts/restore-and-clean.mjs` — Re‑import portal-dinas students + rombel cleanup
- `scripts/fix-remaining.mjs` — Fix last empty‑jenjang student
- `scripts/norm-status.mjs` — Normalize `honorer`/`pns`/`gty` casing, empty→Lainnya
- `scripts/sync-from-portal-dinas.mjs` — Full data sync from portal-dinas (schools, employees, students)
- `scripts/sync-from-sheets.mjs` — Process Google Sheets CSVs
- `scripts/migrate-tk-kb.mjs` — Migrate TK/KB from laporan-pendidikan

## Relevant Files
- `src/app.ts:408-435` — `/api/employees-with-docs` endpoint (JOINs schools)
- `src/components/ManajemenPegawai.tsx` — Employee page component
- `src/data/mockData.ts` — baseSchools array (fake "SD NEGERI 3 LEMAHABANG" removed)
