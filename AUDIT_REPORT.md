# Audit Report — TIMKER BIDIK 360

**Project**: `timker-bidik` — Manajemen Pendidikan Kecamatan Lemahabang  
**Audit Date**: 2026-07-05  
**Scope**: Full system: API, Database, Frontend, Security, Role-Based Access  
**Tech Stack**: React 19 + Vite 6 + Express 4 + TypeScript 5.8 + Tailwind 4 + libSQL/Turso + JWT + Google Gemini AI + Google Drive API

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [API Endpoint Audit](#2-api-endpoint-audit)
3. [Database Schema Audit](#3-database-schema-audit)
4. [Frontend Component Audit](#4-frontend-component-audit)
5. [Role-Based Access Control Audit](#5-role-based-access-control-audit)
6. [Security Audit](#6-security-audit)
7. [Performance Audit](#7-performance-audit)
8. [Data Integrity Audit](#8-data-integrity-audit)
9. [Feature Completeness Checklist](#9-feature-completeness-checklist)
10. [Recommendations](#10-recommendations)

---

## 1. Executive Summary

**Overall Score: 68/100 (Needs Improvement)**

| Category | Score | Status |
|---|---|---|
| API Completeness | 85/100 | ✅ Good |
| Database Design | 55/100 | ⚠️ Needs Work |
| Frontend Completeness | 90/100 | ✅ Good |
| Security | 35/100 | ❌ Critical |
| Role Enforcement | 75/100 | ⚠️ Needs Work |
| Data Integrity | 50/100 | ⚠️ Needs Work |
| Error Handling | 60/100 | ⚠️ Needs Work |

### Strengths
- Comprehensive feature set: 17 modules covering education management
- Strong role-based menu filtering in Sidebar
- Google Drive document upload/delete with API-keyless auth
- Batch employee+document query avoids N+1
- Gemini AI integration for chat and simulations
- Monthly report generation with student/employee/infrastructure data

### Critical Issues
1. **Plaintext passwords** — no bcrypt/argon2 anywhere
2. **No SQL injection protection** — string interpolation in db.ts (update functions) and app.ts (row key iteration)
3. **Hardcoded JWT secret** in source code
4. **No CSRF, no rate limiting, no security headers**
5. **No foreign key constraints** — all relationships enforced only in application code
6. **No database indexes** beyond PRIMARY KEY
7. **Empty catch blocks** swallowing errors across all CRUD operations
8. **No input sanitization** for XSS in any API endpoint
9. **`DELETE FROM students`** without cascade — orphaned student_parents/addresses/health records
10. **No pagination** on student/employee/document list endpoints (LIMIT 200 only on document-search)

---

## 2. API Endpoint Audit

### 2.1 Auth Endpoints

| Endpoint | Method | Auth | Role Check | Parameters | Issues |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | None | None | username, password | Plaintext comparison, hardcoded fallback creds, no rate limiting |
| `/api/auth/me` | GET | JWT | None | — | Returns user from token only |
| `/api/auth/change-password` | PUT | JWT | None | currentPassword, newPassword | Plaintext storage, min 6 char only |

### 2.2 Core Data Endpoints

| Endpoint | Method | Auth | Scope | Issues |
|---|---|---|---|---|
| `/api/schools` | GET | JWT | ✅ | Status mapping inconsistent (NEGERI→Negeri, SWASTA→Swasta) |
| `/api/schools/stats` | GET | JWT | ✅ | Falls back to mock teacher data if DB aggregate empty |
| `/api/schools/:npsn` | GET | JWT | ✅ | Returns school with student+teacher aggregates |
| `/api/students` | GET | JWT | ✅ | No pagination — could return 6000+ rows |
| `/api/students/aggregate` | GET | JWT | ✅ | No scoping bug (filters correctly) |
| `/api/students/rombels` | GET | JWT | ✅ | — |
| `/api/students/:id/detail` | GET | JWT | ✅ | Returns null detail if no NISN |
| `/api/employees` | GET | JWT | ✅ | No pagination |
| `/api/employees-with-docs` | GET | JWT | ✅ | Batch query; scoping works |
| `/api/employees/school/:npsn` | GET | JWT | ✅ | — |
| `/api/employees/:id/documents` | GET | JWT | None | No scope check (!) |
| `/api/documents` | POST | JWT | ✅ | — |
| `/api/upload-file` | POST | JWT | ✅ | File as base64 in JSON body (10mb limit) |
| `/api/document-search` | GET | JWT | ⚠️ | LIMIT 200 hardcoded; no full-text search |

### 2.3 CRUD Endpoints — Employee

| Operation | Endpoint | Scope Check | Error Handling |
|---|---|---|---|
| CREATE | `POST /api/employees` | ✅ | Returns 400 on failure |
| READ | `GET /api/employees` | ✅ | Empty array on DB fail |
| UPDATE | `PUT /api/employees/:id` | ✅ | Returns 400 on failure |
| DELETE | `DELETE /api/employees/:id` | ✅ | Soft-delete (is_active=0) |

### 2.4 CRUD Endpoints — Student

| Operation | Endpoint | Scope Check | Error Handling |
|---|---|---|---|
| CREATE | `POST /api/students` | ✅ | Returns 400 on failure |
| READ | `GET /api/students` | ✅ | No pagination |
| UPDATE | `PUT /api/students/:id` | ✅ | Returns 400 on failure |
| DELETE | `DELETE /api/students/:id` | ✅ | **HARD DELETE** — no cascade to parents/addresses/health |

### 2.5 CRUD Endpoints — Calendar

| Operation | Endpoint | Scope Check | Error Handling |
|---|---|---|---|
| CREATE | `POST /api/calendar` | None | Returns 400 on failure |
| READ | `GET /api/calendar` | None | Filter by query params |
| READ (single) | `GET /api/calendar/:id` | None | 404 if not found |
| UPDATE | `PUT /api/calendar/:id` | None | Returns 400 on failure |
| DELETE | `DELETE /api/calendar/:id` | None | Returns 400 on failure |

**Note**: Calendar has NO school scope check. Any role can access all events. Acceptable since calendar is district-wide, but no `created_by` filtering exists.

### 2.6 Analytics & AI Endpoints

| Endpoint | Method | Issue |
|---|---|---|
| `/api/predict` | POST | Uses hardcoded growth rate (2.4%), static calculations |
| `/api/simulate` | POST | Gemini integration optional; good fallback |
| `/api/chat` | POST | Full intent-matching system; Gemini fallback |
| `/api/reports/monthly` | GET | Comprehensive; scoped |
| `/api/reports/mutations/:npsn` | GET | ✅ |
| `/api/reports/employees/:npsn` | GET | ✅ |
| `/api/alerts` | GET | No scoping (admin-only anyway via menu) |
| `/api/recommendations` | GET | No scoping |
| `/api/recommendations/:id/apply` | POST | No ownership check |

### 2.7 Debug Endpoints

| Endpoint | Method | Role | Issue |
|---|---|---|---|
| `/api/debug/seed` | POST | admin | Duplicates seedData logic; exposes DB state |

### 2.8 Missing Error Handling Patterns

- All `getDb()` returning `null` sends empty `[]` or `{}` — no 503 status
- `catch {}` (empty) used in: `app.ts:94`, `db.ts:746,778,792,833,859,868,933,955,964,1038,1055,1072,1161,1181,1190,1278,1287` — 18 empty catch blocks
- `catch { return false/null }` without logging — errors silently disappear

---

## 3. Database Schema Audit

### 3.1 Tables Overview

| Table | Rows (approx) | PK | Foreign Keys | Indexes (non-PK) |
|---|---|---|---|---|
| `schools` | 45 | npsn (TEXT) | None | None |
| `students` | 6,612 | id (TEXT) | None on school_npsn | None |
| `employees` | 427 | id (TEXT) | None on sekolah_id | None |
| `employee_documents` | 2,294 | id (TEXT) | None on employee_id | None |
| `employee_periods` | ~200 | id (TEXT) | None on employee_id | None |
| `student_parents` | 6,434 | siswa_nisn (TEXT) | None | None |
| `student_addresses` | 6,434 | siswa_nisn (TEXT) | None | None |
| `student_health` | 6,434 | siswa_nisn (TEXT) | None | None |
| `student_mutations` | ~100 | id (TEXT) | None on siswa_nisn | None |
| `academic_calendar` | 14 (seed) | id (TEXT) | None | None |
| `calendar_notifications` | 0 | id (TEXT) | None on calendar_id | None |
| `users` | ~47 | id (TEXT) | None on school_npsn | None (UNIQUE on username) |
| `documents` | 0 | id (TEXT) | None | None |
| `recommendations` | 7 | id (TEXT) | None on target_school_npsn | None |
| `alerts` | ~9 | id (TEXT) | None | None |

### 3.2 Schema Issues

1. **No FOREIGN KEY constraints anywhere** — all relationships are logical only (e.g. `employees.sekolah_id` references `schools.npsp` but no FK)
2. **No indexes on foreign key columns** — `school_npsn` in students, `sekolah_id` in employees, `employee_id` in employee_documents
3. **TEXT PRIMARY KEY** instead of auto-increment INTEGER — ID generation is manual (`EMP-{timestamp}-{random}`), which is fine but over-engineered
4. **JSON stored in TEXT columns** — `schools.students`, `schools.teachers`, `schools.facilities`, `schools.risk_indicators` are JSON serialized. Querying individual fields requires `JSON_EXTRACT()`. The app currently parses them in application code.
5. **No CHECK constraints** beyond `student_mutations.jenis IN ('MASUK', 'KELUAR')`
6. **`documents` table is unused** — the app uses `employee_documents` instead; `documents` table is legacy
7. **students.jenjang** is TEXT but should be constrained (TK/SD/SMP/SMA/SMK/SLB)
8. **status_pegawai** has no CHECK constraint — various inconsistent values observed (Lainnya, Honorer, PPPK, etc.)
9. **students.nisn** and **employees.nik** have no UNIQUE constraint (nik is UNIQUE in employees, but nisn is not in students)
10. **No updated_at triggers** — all timestamps are managed by application code

### 3.3 ID Generation Pattern

```
EMP-{timestamp}-{random6}     → employees
DOC-{timestamp}-{random6}     → employee_documents
STU-{timestamp}-{random4}     → students
CAL-{timestamp}-{random6}     → academic_calendar
PRD-{timestamp}-{random6}     → employee_periods
REC-{slug}-{timestamp}        → recommendations
alert-{type}-{npsn}-{ts}      → alerts
u-{type}-{suffix}             → users
```

**Issue**: Timestamp-based IDs are predictable; random suffix too short (4-8 chars) for collision safety at scale.

---

## 4. Frontend Component Audit

### 4.1 Module Coverage (17 Modules)

| Module | Component | CRUD | Filters | Pagination | Validation | Empty State | Error State |
|---|---|---|---|---|---|---|---|
| Executive Dashboard | `ExecutiveDashboard.tsx` | R | ✅ School/village | ❌ | N/A | Fallback to mock | Fallback to mock |
| Live Monitor | `LiveMonitor.tsx` | R | ✅ Severity | ❌ | N/A | Fallback to mock | Fallback to mock |
| Data Warehouse | `DataWarehouse.tsx` | R | ✅ Multi-tab | ❌ | N/A | Fallback to mock | Fallback to mock |
| Human Resources | `HumanResources.tsx` | R | ✅ School/status | ❌ | N/A | Fallback to mock | Fallback to mock |
| Manajemen Pegawai | `ManajemenPegawai.tsx` | CRUD | ✅ School/name | ❌ | ✅ | ✅ | ✅ |
| Student Management | `StudentManagement.tsx` | CRUD | ✅ School/rombel/name | ❌ | ✅ | ✅ | ✅ |
| Rombel Management | `RombelManagement.tsx` | R | ✅ School | ❌ | N/A | ✅ | ✅ |
| School Profile | `SchoolProfile.tsx` | RU | ❌ | ❌ | ✅ | ✅ | ✅ |
| Infrastructure | `Infrastructure.tsx` | R | ✅ | ❌ | N/A | ✅ | ✅ |
| Scenario Simulator | `ScenarioSimulator.tsx` | R | N/A | ❌ | N/A | ✅ | ✅ |
| Document Intel | `DocumentIntel.tsx` | CRUD | ✅ Multi-filter | ❌ | ✅ | ✅ | ✅ |
| Command Console | `CommandConsole.tsx` | R | N/A | ❌ | N/A | ✅ | ✅ |
| Report Center | `ReportCenter.tsx` | R | ✅ School/month | ❌ | N/A | ✅ | ✅ |
| Monthly Report | `MonthlyReport.tsx` | R | ✅ | ❌ | N/A | ✅ | ✅ |
| Laporan Preview | `LaporanPreview.tsx` | R | ✅ | ❌ | N/A | ✅ | ✅ |
| Academic Calendar | `AcademicCalendar.tsx` | CRUD | ✅ Semester | ❌ | ✅ | ✅ | ✅ |
| Target KPI | `TargetKPI.tsx` | RU | ❌ | ❌ | ✅ | ✅ | ✅ |
| Advanced HR | `AdvancedHR.tsx` | R | ✅ | ❌ | N/A | ✅ | ✅ |
| GIS Map | `GisMap.tsx` | R | ✅ Village | ❌ | N/A | ✅ | ✅ |
| School Comparison | `SchoolComparison.tsx` | R | ✅ Multi-select | ❌ | N/A | ✅ | ✅ |

### 4.2 Common Frontend Issues

1. **No pagination on large lists** — StudentManagement could render 6600+ rows
2. **All components fall back to mock/static data** when DB fails — no indication to user
3. **No loading spinners** — components render immediately with fallback data
4. **ErrorBoundary** exists but only catches render crashes, not API errors
5. **Form validation** in ManajemenPegawai, StudentManagement, DocumentIntel is client-side only
6. **Filtering is client-side** (useMemo) — no debounce or server-side filtering
7. **All icons are from `lucide-react`** — consistent
8. **Mobile responsiveness** not evaluated (no media queries observed in Tailwind classes — fixed sidebar)
9. **No confirmation dialogs** on most delete operations (except DocumentIntel)

---

## 5. Role-Based Access Control Audit

### 5.1 Role Definitions

| Role | Backend Middleware | Frontend Menu | School Scope |
|---|---|---|---|
| `admin` | `requireRole('admin')` | All 17 modules | None (see all) |
| `staff_kecamatan` | `requireRole('staff_kecamatan')` | All 17 modules | None (see all) |
| `operator_sekolah` | Default (no requireRole) | 9 modules | Own school only |

### 5.2 Backend Enforcement

| Endpoint | Admin | Staff Kecamatan | Operator Sekolah |
|---|---|---|---|
| `/api/predict` | ✅ | ✅ | ✅ |
| `/api/simulate` | ✅ | ✅ | ✅ |
| `/api/chat` | ✅ | ✅ | ✅ |
| `/api/employees*` | ✅ | ✅ | ✅ + schoolScope |
| `/api/students*` | ✅ | ✅ | ✅ + schoolScope |
| `/api/schools*` | ✅ | ✅ | ✅ + schoolScope |
| `/api/calendar*` | ✅ | ✅ | ✅ (no scope? inconsistent) |
| `/api/alerts` | ✅ | ✅ | ✅ |
| `/api/recommendations` | ✅ | ✅ | ✅ |
| `/api/reports/*` | ✅ | ✅ | ✅ + schoolScope |
| `/api/document-search` | ✅ | ✅ | ✅ + schoolScope |
| `/api/upload-file` | ✅ | ✅ | ✅ + schoolScope |
| `/api/documents/*` | ✅ | ✅ | ✅ + schoolScope |
| `/api/debug/seed` | ✅ requireRole('admin') | ❌ | ❌ |

**Issues**: 
- Calendar routes have NO schoolScope — operator can see all calendar events
- `GET /api/employees/:id/documents` (app.ts:596) has NO schoolScope check
- `POST /api/recommendations/:id/apply` has no role check beyond `authenticateToken`
- All `requireRole` checks use hardcoded string arrays, never include `staff_kecamatan` separately (same as admin)

### 5.3 Frontend Menu Access (Sidebar.tsx)

| Menu | admin | staff_kecamatan | operator_sekolah |
|---|---|---|---|
| Executive Dashboard | ✅ | ✅ | ✅ |
| Live Monitor | ✅ | ✅ | ✅ |
| Data Warehouse | ✅ | ✅ | ✅ |
| Human Resources | ✅ | ✅ | ✅ |
| Manajemen Pegawai | ✅ | ✅ | ✅ |
| Student Management | ✅ | ✅ | ✅ |
| Rombel Management | ✅ | ✅ | ✅ |
| School Profile | ✅ | ✅ | ✅ |
| Infrastructure | ✅ | ✅ | ✅ |
| Scenario Simulator | ✅ | ✅ | ❌ |
| Document Intel | ✅ | ✅ | ✅ |
| Command Console | ✅ | ✅ | ❌ |
| Report Center | ✅ | ✅ | ✅ |
| Target KPI | ✅ | ✅ | ❌ |
| Advanced HR | ✅ | ✅ | ❌ |
| GIS Map | ✅ | ✅ | ❌ |
| Academic Calendar | ✅ | ✅ | ❌ |
| School Comparison | ✅ | ✅ | ❌ |

**Issue**: Several modules accessible to operator_sekolah on the backend but hidden in sidebar (Scenario, Command Console, Target KPI, Advanced HR, GIS Map, Calendar, Comparison). This is intentional design but creates unused endpoints for operator role.

---

## 6. Security Audit

### 🔴 CRITICAL (6 findings)

| # | Finding | Location | Impact | Fix |
|---|---|---|---|---|
| 1 | **Plaintext password storage** | `db.ts:1285`, `app.ts:77` | Any DB breach exposes all credentials | Use bcrypt/argon2 |
| 2 | **Hardcoded JWT secret** | `app.ts:12` | JWT signing key in source code | Use env variable only |
| 3 | **SQL injection via dynamic column names** | `db.ts:761,843,945,1173` | Attacker controls `key` iteration from data object | Whitelist allowed columns |
| 4 | **No CSRF protection** | All endpoints | Cross-site request forgery on all state-changing ops | Implement CSRF tokens or SameSite cookies |
| 5 | **No rate limiting** | All login/auth endpoints | Brute-force attack on passwords | Add express-rate-limit |
| 6 | **No security headers** | Express app | No helmet, no CORS configuration | Add helmet + configure CORS |

### 🟠 HIGH (8 findings)

| # | Finding | Location | Impact | Fix |
|---|---|---|---|---|
| 7 | **Hardcoded fallback credentials** | `app.ts:97-106` | Admin/Timker456 and Admin2/Timker123 always work | Remove hardcoded fallbacks |
| 8 | **No input sanitization** | All POST/PUT endpoints | XSS attacks via name fields | Sanitize with DOMPurify or escape |
| 9 | **No request size validation** | `app.ts:10` | 10mb limit only; no field-level limits | Add per-field size limits |
| 10 | **Document DELETE from Drive** | `app.ts:706-714` | Imports googleapis dynamically each delete | Import at top level |
| 11 | **No file type validation on upload** | `app.ts:763` | Any base64 content accepted | Validate magic bytes |
| 12 | **No file size validation on upload** | `app.ts:773` | Only buffer.length stored, no limit check | Reject files > 5MB |
| 13 | **No ownership verification on recommendations/apply** | `app.ts:1083` | Any authenticated user can mark any recommendation applied | Add scope/role check |
| 14 | **Unused `documents` table is a data orphan** | `db.ts:119-130` | Legacy table still created but never used | Remove or migrate |

### 🟡 MEDIUM (5 findings)

| # | Finding | Location | Impact | Fix |
|---|---|---|---|---|
| 15 | **No HTTPS enforcement** | server.ts | Traffic not encrypted | Add redirect middleware |
| 16 | **JWT token in localStorage** | AuthContext | XSS can steal token | Use httpOnly cookies |
| 17 | **Token never expires on server** | app.ts:86,91 | Cannot revoke tokens server-side | Add token blacklist |
| 18 | **Error messages leak info** | app.ts:783 | `err.message` returned to client | Return generic messages |
| 19 | **Operator password is deterministic** | app.ts:107 | `sp_{npsn}` — easy to guess | Generate random passwords |

---

## 7. Performance Audit

| Issue | Location | Impact |
|---|---|---|
| No pagination on students (6600+ rows) | `GET /api/students` | Client downloads ALL students |
| No pagination on employees (427 rows) | `GET /api/employees` | Acceptable at current scale but won't scale |
| `getAllSchools()` called in almost every request | Multiple endpoints | Repeated full table scans |
| `getAlerts()` called inside loop in getMonthlyReport | `db.ts:530` | N+1 on alerts filtered by schoolName |
| No indexes on foreign key columns | All tables | Sequential scans on JOIN queries |
| No connection pooling for Turso | `db.ts:89-96` | New connection per DB access (libSQL handles this internally, but no pooling) |
| JSON stored in TEXT columns | `schools` table | Cannot query individual fields efficiently |
| No caching layer | Entire app | Every request hits the database |

---

## 8. Data Integrity Audit

| Issue | Location | Impact |
|---|---|---|
| Hard DELETE on students | `db.ts:1188` | Orphaned parent/address/health records |
| No ON DELETE CASCADE | All tables | Orphan records when parent deleted |
| Soft DELETE on employees (is_active=0) | `db.ts:787` | Employee docs still reference deleted employee |
| No UNIQUE constraint on students.nisn | `db.ts:246` | Duplicate NISN possible |
| student_mutations.siswa_nisn not constrained | `db.ts:310` | Mutation references non-existent student |
| No transaction for multi-table operations | All endpoints | Partial writes on failure |
| Seed data runs on every startup | `app.ts:1226-1233` | Possible duplicate runs |
| `documents` table created but unused | `db.ts:119-130` | Wasted schema |

---

## 9. Feature Completeness Checklist

### ✅ Implemented
- [x] JWT authentication with 3 roles
- [x] School CRUD (via seed/upsert)
- [x] Employee CRUD with 17 fields
- [x] Employee document upload/delete/verify with Google Drive
- [x] Student CRUD with detail (parents/address/health)
- [x] Academic calendar CRUD with semester view
- [x] Monthly report generation
- [x] Predictive analytics engine
- [x] Policy simulation with Gemini AI
- [x] AI command console chat
- [x] Document search (basic LIKE)
- [x] Alerts and recommendations
- [x] School health scoring
- [x] GIS map view
- [x] School comparison tool
- [x] KPI target tracking
- [x] Error boundary
- [x] Change password
- [x] Batch employee+document query

### ❌ Missing
- [ ] User management UI (no CRUD for users)
- [ ] Audit log / activity history
- [ ] Data export (CSV/Excel) for tables
- [ ] Print-friendly report layout
- [ ] Email notifications
- [ ] Bulk student/employee import
- [ ] Two-factor authentication
- [ ] Password complexity requirements
- [ ] Session management (logout everywhere)
- [ ] Data backup/restore
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit/integration tests
- [ ] CI/CD pipeline tests
- [ ] Mobile responsive design
- [ ] Offline support
- [ ] Real-time updates (WebSocket)
- [ ] Full-text search (FTS5)
- [ ] Data validation middleware

---

## 10. Recommendations

### Immediate (Week 1-2)
1. **Hash all passwords** with bcrypt — `npm install bcryptjs`
2. **Move JWT secret** to env-only, rotate existing tokens
3. **Remove hardcoded fallback credentials** — Admin/Timker456, Admin2/Timker123
4. **Remove deterministic operator passwords** — `sp_{npsn}` is guessable
5. **Add express-rate-limit** on all auth routes
6. **Add helmet** for security headers

### Short-term (Week 3-4)
7. **Add FOREIGN KEY constraints** across all related tables (students, employees, etc.)
8. **Add indexes** on `school_npsn`, `sekolah_id`, `employee_id`, `siswa_nisn`
9. **Fix SQL injection** in dynamic UPDATE functions — whitelist allowed columns
10. **Add CSRF protection** — double-submit cookie pattern
11. **Add input sanitization** — strip HTML from name fields
12. **Implement pagination** on `/api/students` (limit/offset or cursor-based)
13. **Wrap multi-table operations in transactions** (student delete + cascade, etc.)
14. **Fix empty catch blocks** — log errors properly

### Medium-term (Month 2)
15. **Add user management UI** — create/edit/delete users, assign roles
16. **Add audit logging** — track all CRUD operations with user, timestamp, diff
17. **Implement full-text search** using SQLite FTS5 for documents
18. **Add data export** (CSV/Excel) for all list views
19. **Add rate limiting on file uploads** — per-user daily limit
20. **Validate file types by magic bytes** — not just MIME type
21. **Add test suite** — Vitest for unit tests, Playwright for E2E

### Long-term (Month 3+)
22. **Switch JWT from localStorage to httpOnly cookies**
23. **Add refresh token rotation**
24. **Implement WebSocket for real-time alerts**
25. **Add caching layer** (Redis or in-memory with TTL)
26. **Migrate TEXT JSON columns to normalized tables**
27. **Add proper error boundaries per component**
28. **Mobile-responsive sidebar (collapsible)**
29. **API documentation with Swagger/OpenAPI**
30. **CI/CD pipeline with automated tests**

---

## Appendix: Code Quality Notes

### Dead Code
- `src/db.ts:119-130` — `documents` table: created in schema but never written to (only `employee_documents` is used)
- `src/db.ts:430` — `getVillageStats()` returns mock data, never queries DB
- `src/app.ts:1197-1209` — `getDistPath()` tries `__dirname` first (not available in ESM)

### Code Duplication
- Seed logic duplicated between `db.ts:347-390` and `app.ts:1148-1188` (`/api/debug/seed`)
- Role scope checking repeated in every endpoint — could be a middleware wrapper

### Inconsistencies
- `schools.status` stored as 'NEGERI'/'SWASTA' but displayed as 'Negeri'/'Swasta'
- Employee delete is soft (is_active=0), Student delete is hard (DELETE FROM)
- Some endpoints return `{ success: true }`, others return the entity
- `students.status_siswa` compared with `LOWER(status_siswa) = 'aktif'` but also stored as-is

### TypeScript Issues
- Extensive use of `as any` casting (60+ occurrences in db.ts)
- `catch {}` and `catch { return null }` lose type safety
- `req.params.id` used without validation (NanoID format assumed)
- No DTO/request validation types — all fields are `any`
