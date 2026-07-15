import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import { SimulationScenario, SimulationResult } from './types';
import { getDb, initSchema, seedData, getAllSchools, getAlerts, getRecommendations, getDocuments, searchDocuments, getEmployees, getEmployeesBySchool, getEmployeeDocuments, getStudentAggregates, getTeacherAggregates, getEmployeeCount, insertEmployee, updateEmployee, deleteEmployee, upsertEmployeeDocument, verifyEmployeeDocument, getStudents, getStudentsBySchool, getStudentsByRombel, getStudentsWithDetail, getRombelList, insertStudent, updateStudent, deleteStudent, getStudentByNik, getCalendarEvents, getCalendarEventById, insertCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getEmployeePeriods, insertEmployeePeriod, updateEmployeePeriod, deleteEmployeePeriod, getMonthlyReport, getUserByUsername, changePassword, deleteEmployeeDocument, getStudentDetail, upsertStudentParents, upsertStudentAddress, upsertStudentHealth, getAllUsers, getUserById, createUser, updateUser, deleteUser, getAlumni, getAlumniById, insertAlumni, updateAlumni, insertActivityLog, getActivityLogs, getMonthlySubmissions, submitMonthlyReport } from './db';
import { getAuth as getDriveAuth } from './drive';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(helmet());

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
app.use('/api/', apiLimiter);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'timker-bidik-secret-key-change-in-production') {
  console.error('FATAL: JWT_SECRET environment variable must be set to a secure random value');
  process.exit(1);
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'staff_kecamatan' | 'operator_sekolah';
  schoolNpsn?: string;
  schoolName?: string;
  schoolLevel?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

/**
 * Returns the school NPSN to scope data to, or null if user can see all schools.
 * Admin and staff_kecamatan see all; operator_sekolah only sees their own school.
 */
function getSchoolScope(req: express.Request): string | null {
  if (!req.user) return null;
  if (req.user.role === 'operator_sekolah') return req.user.schoolNpsn || null;
  return null; // null = no filter (see all)
}

/**
 * Helper to log an activity from current request context
 */
async function logActivity(req: express.Request, action: string, entityType?: string, entityId?: string, details?: Record<string, any>) {
  if (!req.user) return;
  await insertActivityLog({
    user_id: req.user.id,
    username: req.user.username,
    user_role: req.user.role,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ? JSON.stringify(details) : '{}',
    ip_address: req.ip || req.socket.remoteAddress || undefined,
  });
}

// ── Auth endpoints ──
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  try {
    const dbUser = await getUserByUsername(username);
    if (dbUser) {
      const passwordMatch = await bcrypt.compare(password, dbUser.password);
      if (passwordMatch) {
        if (dbUser.role === 'operator_sekolah' && dbUser.school_npsn) {
          const schools = await getAllSchools();
          const school = schools.find(s => s.npsn === dbUser.school_npsn);
          if (school) {
            const user: AuthUser = {
              id: dbUser.id, username: dbUser.username, role: 'operator_sekolah',
              schoolNpsn: school.npsn, schoolName: school.name, schoolLevel: school.level,
            };
            const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
            await insertActivityLog({
              user_id: user.id, username: user.username, user_role: user.role,
              action: 'login', entity_type: 'auth', entity_id: user.id,
              details: JSON.stringify({ method: 'password' }),
              ip_address: req.ip || req.socket.remoteAddress || undefined,
            });
            return res.json({ token, user });
          }
          // School not found in DB — operator cannot log in
          return res.status(401).json({ error: 'Sekolah tidak ditemukan. Hubungi admin.' });
        }
        const user: AuthUser = { id: dbUser.id, username: dbUser.username, role: dbUser.role as any };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        await insertActivityLog({
          user_id: user.id, username: user.username, user_role: user.role,
          action: 'login', entity_type: 'auth', entity_id: user.id,
          details: JSON.stringify({ method: 'password' }),
          ip_address: req.ip || req.socket.remoteAddress || undefined,
        });
        return res.json({ token, user });
      }
    }
  } catch (err) {
    console.error('Login error:', err);
  }

  return res.status(401).json({ error: 'Username atau password salah' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    const dbUser = await getUserByUsername(req.user!.username);
    if (!dbUser) return res.status(400).json({ error: 'User tidak ditemukan' });

    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Password saat ini salah' });
    }

    const ok = await changePassword(req.user!.username, newPassword);
    if (!ok) return res.status(500).json({ error: 'Gagal mengubah password' });

    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('change-password error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
    console.log('Gemini AI Client successfully initialized server-side.');
  } else {
    console.warn('GEMINI_API_KEY not set. Operating in high-fidelity simulated intelligence mode.');
  }
} catch (error) {
  console.error('Error initializing Gemini AI client:', error);
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Predictive Engine Endpoint
app.post('/api/predict', authenticateToken, async (req, res) => {
  const { years = 1 } = req.body;
  const numYears = parseInt(years, 10);
  if (isNaN(numYears) || numYears < 1 || numYears > 50) {
    return res.status(400).json({ error: 'Years must be a number between 1 and 50' });
  }
  const schools = await getAllSchools();

  const totalStudents = schools.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teachers.total, 0);
  const projectedStudentGrowthRate = 0.024;
  const projectedStudents = Math.round(totalStudents * Math.pow(1 + projectedStudentGrowthRate, numYears));
  const retiringTeachersCount = Math.round(schools.reduce((sum, s) => sum + s.teachers.retiringSoon, 0) * (numYears / 3));
  const averageClassSize = 32;
  const currentClassroomsNeeded = Math.ceil(totalStudents / averageClassSize);
  const projectedClassroomsNeeded = Math.ceil(projectedStudents / averageClassSize);
  const classroomsToBuild = Math.max(0, projectedClassroomsNeeded - currentClassroomsNeeded);
  const projectedTeachers = totalTeachers - retiringTeachersCount;
  const idealTeachersProjected = Math.round(projectedStudents / 20);
  const projectedShortage = Math.max(0, idealTeachersProjected - projectedTeachers);

  res.json({
    targetYear: 2026 + numYears,
    yearsAhead: numYears,
    students: {
      current: totalStudents,
      projected: projectedStudents,
      growthPercent: +(projectedStudentGrowthRate * 100 * numYears).toFixed(1)
    },
    teachers: {
      current: totalTeachers,
      retiring: retiringTeachersCount,
      projected: projectedTeachers,
      projectedShortage
    },
    infrastructure: {
      classroomsNeeded: projectedClassroomsNeeded,
      classroomsToBuild: classroomsToBuild,
      criticalRehabRecommended: schools.filter(s => s.facilities.classroomCondition.heavyDamage > 0).length
    },
    summaryText: `Within ${numYears} year(s), Kecamatan Lemahabang is projected to experience a student count increase to ${projectedStudents.toLocaleString()} (+${(projectedStudentGrowthRate * 100 * numYears).toFixed(1)}%). With ${retiringTeachersCount} teachers retiring, the teacher shortage will swell to an estimated ${projectedShortage} personnel across all levels.`
  });
});

// 2. Policy Simulation Engine
app.post('/api/simulate', authenticateToken, async (req, res) => {
  const scenario: SimulationScenario = req.body;
  const schools = await getAllSchools();
  const totalStudents = schools.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teachers.total, 0);

  const beforeShortage = schools.filter(s => s.riskIndicators.teacherShortage).length;
  const beforeSurplus = schools.filter(s => !s.riskIndicators.teacherShortage && s.teachers.total > (s.students.total / 15)).length;
  const beforeClassroomDeficit = schools.reduce((sum, s) => sum + s.facilities.classroomCondition.heavyDamage, 0);
  const beforeBudget = 24.5;

  const retiringEffect = scenario.teachersRetiring || 0;
  const growthEffect = scenario.studentGrowthPercent || 0;
  const pppkEffect = scenario.newPppkAssigned || 0;
  const schoolMergeCount = scenario.schoolMergeNpsns?.length || 0;

  const afterStudents = Math.round(totalStudents * (1 + (growthEffect / 100)));
  const afterTeachers = totalTeachers - retiringEffect + pppkEffect;
  const teacherRatioImpact = afterStudents / afterTeachers;
  const afterShortage = Math.max(0, Math.round(beforeShortage + (retiringEffect * 0.8) - (pppkEffect * 0.9) - (schoolMergeCount * 0.5)));
  const afterSurplus = Math.max(0, Math.round(beforeSurplus - (retiringEffect * 0.2) + (pppkEffect * 0.1)));
  const classroomReduction = schoolMergeCount > 0 ? schoolMergeCount * 2 : 0;
  const afterClassroomDeficit = Math.max(0, beforeClassroomDeficit + Math.round(growthEffect * 0.4) - classroomReduction);
  const budgetDelta = (pppkEffect * 0.05) + (afterClassroomDeficit * 0.15) - (schoolMergeCount * 0.2);
  const afterBudget = +(beforeBudget + budgetDelta).toFixed(2);

  const staffingImpactDesc = pppkEffect > retiringEffect
    ? `Staffing capacity is net-positive (+${pppkEffect - retiringEffect} teachers). Student-teacher ratio decreases to ${(teacherRatioImpact).toFixed(1)}:1, easing pressure on rural schools.`
    : `Staffing capacity faces deficit pressure (-${retiringEffect - pppkEffect} teachers). Ratio rises to ${(teacherRatioImpact).toFixed(1)}:1, increasing the teacher shortage by ${Math.abs(afterShortage - beforeShortage)} schools.`;

  const infraPressureDesc = schoolMergeCount > 0
    ? `Merging ${schoolMergeCount} facilities saves operational overhead and consolidates available resources, reducing classroom deficit to ${afterClassroomDeficit} blocks.`
    : `Student population growth of ${growthEffect}% increases classroom occupancy. Immediate construction of ${afterClassroomDeficit} classroom units is highly recommended to avoid dual-shift classes.`;

  const responsePayload: SimulationResult = {
    before: {
      shortageCount: beforeShortage,
      surplusCount: beforeSurplus,
      classroomDeficit: beforeClassroomDeficit,
      budgetMiliar: beforeBudget
    },
    after: {
      shortageCount: afterShortage,
      surplusCount: afterSurplus,
      classroomDeficit: afterClassroomDeficit,
      budgetMiliar: afterBudget,
      budgetDeltaMiliar: +budgetDelta.toFixed(2),
      staffingImpactDesc,
      infraPressureDesc
    },
    insights: [
      `PPPK Assignment: Placing ${pppkEffect} teachers covers ${Math.round((pppkEffect / (retiringEffect || 1)) * 100)}% of the upcoming retirement gap.`,
      schoolMergeCount > 0 ? `School Merge Strategy: Consolidating ${schoolMergeCount} schools saves Rp ${(schoolMergeCount * 200).toLocaleString('id-ID')} million annually in operational costs.` : `Consider targeted school merging in villages with decreasing enrollments to pool available teachers.`,
      `Infrastructure pressure: Standard operational budget will require a shift of Rp ${(Math.abs(budgetDelta) * 1000).toFixed(0)} million to maintain standard service guidelines (SPM).`
    ]
  };

  if (aiClient) {
    try {
      const prompt = `Kamu adalah analis kebijakan pendidikan untuk TIMKER BIDIK 360 Kecamatan Lemahabang.
Bahasa yang dipakai santai, kayak ngobrol sama kepala dinas yang pengen tau kondisi riil — bukan laporan kaku.
Analisis simulasi kebijakan berikut:
- Guru pensiun: ${retiringEffect} orang, pertumbuhan siswa: ${growthEffect}%, PPPK baru: ${pppkEffect}, merger sekolah: ${schoolMergeCount}.
- Dampak: Rasio siswa-guru ${(teacherRatioImpact).toFixed(1)}:1. Sekolah kekurangan guru dari ${beforeShortage} jadi ${afterShortage}. Defisit kelas: ${afterClassroomDeficit}. Anggaran: ${budgetDelta >= 0 ? '+' : ''}${budgetDelta} Miliar IDR.

Beri 3 poin singkat dalam bahasa Indonesia yang enak dibaca:
1. Satu peringatan soal tekanan staffing.
2. Satu implikasi geografis/spasial.
3. Satu arahan efisiensi anggaran.
Bikin realistis, padat, dan jangan kaku.`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      if (aiResponse?.text) {
        const bulletPoints = aiResponse.text
          .split('\n')
          .map(line => line.replace(/^[-*•\d.\s]+/, '').trim())
          .filter(line => line.length > 5);
        if (bulletPoints.length >= 2) {
          responsePayload.insights = bulletPoints;
        }
      }
    } catch (err) {
      console.error('Error getting Gemini simulation analysis:', err);
    }
  }

  res.json(responsePayload);
});

// 3. AI Assistant Chat and Command Console
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const schoolScope = getSchoolScope(req);
  const allSchoolsRaw = await getAllSchools();
  const schools = schoolScope
    ? allSchoolsRaw.filter(s => s.npsn === schoolScope)
    : allSchoolsRaw;
  const totalSchools = schools.length;
  const criticalSchools = schools.filter(s => s.healthScore < 40);
  const warningSchools = schools.filter(s => s.healthScore >= 40 && s.healthScore < 60);
  const totalStudents = schools.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teachers.total, 0);
  const averageHealth = totalSchools > 0
    ? Math.round(schools.reduce((sum, s) => sum + s.healthScore, 0) / totalSchools)
    : 0;

  const scopeInfo = schoolScope
    ? `Anda hanya memiliki akses ke SATU sekolah: ${schools[0]?.name} (NPSN: ${schoolScope}). Semua data dan analisis hanya terbatas pada sekolah ini.`
    : 'Anda memiliki akses ke SELURUH data Kecamatan Lemahabang.';

  const villages = [...new Set(allSchoolsRaw.map(s => s.village))].join(', ');

  const systemInstruction = `Kamu adalah asisten TIMKER BIDIK 360 untuk Kecamatan Lemahabang, Kabupaten Cirebon.

=== SUMBER DATA ===
Semua data berasal dari:
- Sinkronisasi Dapodik (Data Pokok Pendidikan) via database Turso
- Data pegawai dari arsip kepegawaian kecamatan
- Data siswa dari Rombel per sekolah
- Dokumen arsip digital
- Data sekolah dari profil Satuan Pendidikan

=== CAKUPAN DATA ===
${scopeInfo}
${schoolScope ? '' : `- Total Sekolah: ${totalSchools}`}
${schoolScope ? `- Sekolah: ${schools[0]?.name} (${schools[0]?.level})` : `- Total Sekolah: ${totalSchools} ${totalSchools > 0 ? schools[0]?.level || '' : ''}`}
- Total Siswa: ${totalStudents}
- Total Guru/Pegawai: ${totalTeachers} orang
${schoolScope ? '' : `- Rata-rata Health Score: ${averageHealth}/100
- Sekolah Kritis: ${criticalSchools.length}
- Sekolah Waspada: ${warningSchools.length}`}
- Desa tercakup: ${schoolScope ? schools.map(s => s.village).join(', ') : villages}

=== ATURAN RESPON ===
1. Jawab dalam bahasa Indonesia yang santai dan alami — seperti ngobrol dengan rekan kerja. Jangan kaku.
2. Kalau pengguna adalah OPERATOR SEKOLAH, hanya tampilkan data sekolahnya sendiri. Jangan menampilkan data sekolah lain.
3. Kalau ditanya **sumber data**, jelaskan bahwa data bersumber dari Dapodik dan database internal.
4. Kalau ditanya data spesifik yang tidak tersedia, jangan mengarang.
5. Ground jawaban pada data yang disebutkan di atas.
6. Gunakan format tabel atau poin yang rapi jika diminta menampilkan data.
7. Jangan lebay. Cukup informatif, jelas, dan membantu.`;

  if (aiClient) {
    try {
      const contents = history.map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      return res.json({
        text: response.text || 'Maaf, saya tidak dapat memproses tanggapan saat ini.',
        reply: response.text || 'Maaf, saya tidak dapat memproses tanggapan saat ini.',
        grounded: true
      });
    } catch (err: any) {
      console.error('Error generating AI response via Gemini:', err);
    }
  }

  let responseText = '';
  const msgLower = message.toLowerCase();

  // ── Intent detection ──
  const intents: { pattern: RegExp; action: () => string }[] = [
    {
      // Critical schools
      pattern: /\b(kritis?|critical|rawan|darurat|genting|menyedihkan)\b/,
      action: () => {
        const critical = schools.filter(s => s.healthScore < 40);
        const warning = schools.filter(s => s.healthScore >= 40 && s.healthScore < 60);
        let table = `| NPSN | Nama Sekolah | Desa | Health Score |\n|---|---|---|---|\n`;
        for (const s of [...critical, ...warning].slice(0, 10)) {
          table += `| ${s.npsn} | ${s.name} | ${s.village} | **${s.healthScore}** |\n`;
        }
        return `**Sekolah dengan Health Score Terendah di Lemahabang**\n\n${table}` +
          (critical.length > 0 ? `\n⚠️ **${critical.length} sekolah** masuk kategori kritis (skor < 40). Butuh intervensi segera.` : '');
      }
    },
    {
      // Prediction / shortage
      pattern: /\b(prediksi?|proyeksi?|proyeksikan|ramal|shortage|pensiun|kekurangan guru)\b/,
      action: () => {
        const retiring = schools.reduce((sum, s) => sum + s.teachers.retiringSoon, 0) || Math.round(totalTeachers * 0.12);
        const shortage = criticalSchools.length;
        return `### Proyeksi ${3} Tahun ke Depan\n\n` +
          `1. **Pensiun Guru** — Diperkirakan **${retiring} guru** pensiun dalam 36 bulan. Eksposur tertinggi di desa dengan sekolah usia tua.\n` +
          `2. **Pertumbuhan Siswa** — Rata-rata ~2.4%/tahun. Butuh tambahan kelas baru di desa berkembang.\n` +
          `3. **Kesenjangan Tenaga** — ${shortage} sekolah sudah kritis. Tanpa tambahan PPPK, kondisi bisa meluas ke ${Math.min(shortage * 2, totalSchools)} sekolah.`;
      }
    },
    {
      // Compare / village
      pattern: /\b(banding|desa|perbandingan|village|kelurahan)\b/,
      action: () => {
        const villageMap: Record<string, { schools: number; students: number; teachers: number; healthSum: number }> = {};
        for (const s of schools) {
          if (!villageMap[s.village]) villageMap[s.village] = { schools: 0, students: 0, teachers: 0, healthSum: 0 };
          villageMap[s.village].schools++;
          villageMap[s.village].students += s.students.total;
          villageMap[s.village].teachers += s.teachers.total;
          villageMap[s.village].healthSum += s.healthScore;
        }
        let table = `| Desa | Sekolah | Siswa | Guru | R:S:G | Rerata Skor |\n|---|---|---|---|---|---|\n`;
        for (const [v, d] of Object.entries(villageMap).sort((a, b) => b[1].students - a[1].students)) {
          const ratio = d.teachers > 0 ? (d.students / d.teachers).toFixed(1) : 'N/A';
          const avg = Math.round(d.healthSum / d.schools);
          table += `| ${v} | ${d.schools} | ${d.students} | ${d.teachers} | ${ratio}:1 | ${avg}/100 |\n`;
        }
        return `### Perbandingan Antar Desa\n\n${table}`;
      }
    },
    {
      // School detail by name or NPSN
      pattern: /\b(sd(n| negeri)?\s*\d+|sdn?\.?\s*\d+|npsn\s*\d+)\b/i,
      action: () => {
        const match = msgLower.match(/\b(sd(n| negeri)?\s*\d+|sdn?\.?\s*\d+|npsn\s*\d+)\b/i);
        if (!match) return '';
        const keyword = match[0].toLowerCase();
        const school = schools.find(s =>
          s.name.toLowerCase().includes(keyword) ||
          s.npsn.includes(keyword.replace('npsn ', ''))
        );
        if (!school) return '';
        return `**${school.name}** (NPSN: ${school.npsn})\n` +
          `- Desa: ${school.village}\n` +
          `- Akreditasi: ${school.accreditation}\n` +
          `- Siswa: ${school.students.total} (L:${school.students.male} P:${school.students.female})\n` +
          `- Guru: ${school.teachers.total} (Sertifikasi:${school.teachers.certified} PNS:${school.teachers.pns} PPPK:${school.teachers.pppk})\n` +
          `- Health Score: **${school.healthScore}/100**\n` +
          `- Status: ${school.healthScore < 40 ? '🟥 Kritis' : school.healthScore < 60 ? '🟧 Waspada' : '🟩 Sehat'}`;
      }
    },
    {
      // Employee / teacher / pegawai
      pattern: /\b(guru|pegawai|tenaga pendidik|karyawan|employee|staff)\b/,
      action: () => {
        const certified = schools.reduce((sum, s) => sum + s.teachers.certified, 0);
        const pns = schools.reduce((sum, s) => sum + s.teachers.pns, 0);
        const pppk = schools.reduce((sum, s) => sum + s.teachers.pppk, 0);
        const honorer = schools.reduce((sum, s) => sum + s.teachers.honorer, 0);
        return `**Data Kepegawaian ${totalSchools} SD Negeri Lemahabang**\n\n` +
          `- Total Guru: **${totalTeachers}** orang\n` +
          `- PNS: ${pns} | PPPK: ${pppk} | Honorer: ${honorer}\n` +
          `- Tersertifikasi: **${certified}** (${totalTeachers > 0 ? Math.round(certified/totalTeachers*100) : 0}%)\n` +
          `- Butuh Sertifikasi: ${Math.max(0, totalTeachers - certified)} orang\n` +
          `- Rata-rata Health Score: ${averageHealth}/100\n` +
          `- Sekolah Kritis: ${criticalSchools.length} | Waspada: ${warningSchools.length}`;
      }
    },
    {
      // Student / student data
      pattern: /\b(siswa|murid|peserta didik|student|total siswa)\b/,
      action: () => {
        return `**Data Siswa ${totalSchools} SD Negeri Lemahabang**\n\n` +
          `- Total Siswa: **${totalStudents}**\n` +
          `- Rata-rata per sekolah: ${Math.round(totalStudents / totalSchools)} siswa\n` +
          `- Sekolah dengan siswa terbanyak: ${schools.reduce((max, s) => s.students.total > max.students.total ? s : max).name}` + '\n' +
          `- Rasio siswa-guru rata-rata: ${totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : 'N/A'}:1\n` +
          `- ${criticalSchools.length} sekolah kritis membutuhkan perhatian khusus`;
      }
    },
  ];

  for (const intent of intents) {
    if (intent.pattern.test(msgLower)) {
      responseText = intent.action();
      break;
    }
  }

  if (!responseText) {
    // Check for specific questions with keyword fallback
    if (msgLower.includes('siapa') || msgLower.includes('nama') || msgLower.includes('sebutkan')) {
      const top = schools.slice(0, 5);
      responseText = `Berikut beberapa sekolah di Lemahabang:\n${top.map(s => `- **${s.name}** (${s.village}) — Skor: ${s.healthScore}`).join('\n')}\n\nAda ${totalSchools} SD Negeri total. Mau detail sekolah tertentu?`;
    } else if (msgLower.includes('berapa') || msgLower.includes('jumlah') || msgLower.includes('banyak')) {
      responseText = `**Ringkasan Data Pendidikan Lemahabang:**\n` +
        `- Sekolah: ${totalSchools} SD Negeri\n` +
        `- Siswa: ${totalStudents}\n` +
        `- Guru: ${totalTeachers}\n` +
        `- Rata-rata Health Score: ${averageHealth}/100`;
    } else if (msgLower.includes('rekomendasi') || msgLower.includes('saran') || msgLower.includes('solusi')) {
      const worst = schools.filter(s => s.healthScore < 40);
      if (worst.length > 0) {
        responseText = `**Rekomendasi Prioritas:**\n\n` +
          `1. Intervensi segera untuk **${worst.length} sekolah kritis** (skor < 40).\n` +
          `2. Tambah alokasi PPPK di sekolah dengan rasio siswa-guru tertinggi.\n` +
          `3. Percepat sertifikasi guru honorer untuk meningkatkan kualitas pengajaran.\n` +
          `4. Alokasikan DAK Rehab untuk sekolah dengan fasilitas rusak berat.`;
      } else {
        responseText = `Saat ini tidak ada sekolah dalam kondisi kritis. Fokus pada pemeliharaan dan peningkatan kualitas sudah berjalan baik.`;
      }
    } else if (msgLower.includes('dokumen') || msgLower.includes('arsip') || msgLower.includes('berkas')) {
      responseText = `**Dokumen & Arsip Digital**\n\n` +
        `Sistem menyimpan **841 dokumen** terkait kepegawaian (SK, ijazah, sertifikat, KTP, dll).\n` +
        `Setiap pegawai memiliki arsip yang sudah diverifikasi. Gunakan menu *Dokumen Intel* untuk browsing.`;
    } else if (msgLower.includes('terima kasih') || msgLower.includes('thanks') || msgLower.includes('makasih')) {
      responseText = `Sama-sama! Senang bisa membantu. Kalau ada yang mau ditanya lagi, tinggal bilang ya.`;
    } else {
      responseText = `Halo! Saya asisten **TIMKER BIDIK 360** Kecamatan Lemahabang.\n\n` +
        `Coba tanya:\n` +
        `- *"Tampilkan sekolah kritis"*\n` +
        `- *"Berapa jumlah siswa?"*\n` +
        `- *"Bandingkan desa"*\n` +
        `- *"Data guru di SDN 1 Wangkelang"*\n` +
        `- *"Rekomendasi perbaikan"*\n\n` +
        `Atau langsung cek menu di samping untuk dashboard, peta, dan simulasi.`;
    }
  }

  res.json({
    text: responseText,
    reply: responseText,
    grounded: false
  });
});

// 4. Employee & Document API
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const pageLimit = Math.min(Math.max(parseInt(limit as string, 10) || 10000, 1), 50000);
    const pageOffset = Math.max(parseInt(offset as string, 10) || 0, 0);
    const schoolScope = getSchoolScope(req);
    let employees;
    if (schoolScope) {
      employees = await getEmployeesBySchool(schoolScope);
    } else {
      employees = await getEmployees();
    }
    const paginated = employees.slice(pageOffset, pageOffset + pageLimit);
    res.json({
      data: paginated,
      total: employees.length,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error('GET /api/employees error:', err);
    res.status(500).json({ error: 'Gagal memuat data pegawai' });
  }
});

// 5. Schools & Dashboard API
app.get('/api/employees-with-docs', authenticateToken, async (req, res) => {
  const db = getDb();
  if (!db) return res.json([]);

  const schoolScope = getSchoolScope(req);

  const emps = await db.execute({
    sql: `SELECT e.*,
      sk.name AS school_name,
      sk.level AS school_level,
      CASE WHEN sk.status = 'NEGERI' THEN 'Negeri' WHEN sk.status = 'SWASTA' THEN 'Swasta' ELSE sk.status END AS school_status
    FROM employees e
    LEFT JOIN schools sk ON sk.npsn = e.sekolah_id
    WHERE e.is_active = 1${schoolScope ? ' AND e.sekolah_id = ?' : ''}
    ORDER BY e.nama ASC`,
    args: schoolScope ? [schoolScope] : []
  });
  const edocs = await db.execute('SELECT * FROM employee_documents ORDER BY employee_id, kategori ASC');

  const docsByEmp = new Map<string, any[]>();
  for (const d of edocs.rows) {
    const eid = (d as any).employee_id as string;
    if (!docsByEmp.has(eid)) docsByEmp.set(eid, []);
    docsByEmp.get(eid)!.push(d);
  }

  const result = emps.rows.map((row: any) => ({
    ...row,
    documents: docsByEmp.get(row.id as string) || [],
  }));

  res.json(result);
});

app.get('/api/employees/school/:npsn', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  // Operator can only access their own school
  if (schoolScope && schoolScope !== req.params.npsn) {
    return res.status(403).json({ error: 'Forbidden: you can only access your own school' });
  }
  const employees = await getEmployeesBySchool(req.params.npsn);
  res.json(employees);
});

app.get('/api/employees/:id/documents', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const db = getDb();
    if (db) {
      const emp = await db.execute('SELECT sekolah_id FROM employees WHERE id = ?', [req.params.id]);
      if (emp.rows.length > 0 && (emp.rows[0] as any).sekolah_id !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only access employees in your own school' });
      }
    }
  }
  const docs = await getEmployeeDocuments(req.params.id);
  res.json(docs);
});

// Employee CRUD
app.post('/api/employees', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope && req.body.sekolah_id !== schoolScope) {
    return res.status(403).json({ error: 'Forbidden: you can only add employees to your own school' });
  }
  const sanitized = { ...req.body, nama: req.body.nama || '', nik: req.body.nik || '' };
  const emp = await insertEmployee(sanitized);
  if (!emp) return res.status(400).json({ error: 'Failed to create employee' });
  await logActivity(req, 'create', 'employee', emp.id, { nama: sanitized.nama, sekolah_id: sanitized.sekolah_id });
  res.status(201).json(emp);
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const db = getDb();
    if (db) {
      const emp = await db.execute('SELECT sekolah_id FROM employees WHERE id = ?', [req.params.id]);
      if (emp.rows.length > 0 && (emp.rows[0] as any).sekolah_id !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only update employees in your own school' });
      }
    }
  }
  const ok = await updateEmployee(req.params.id, req.body);
  if (!ok) return res.status(400).json({ error: 'Failed to update employee' });
  await logActivity(req, 'update', 'employee', req.params.id, { updated_fields: Object.keys(req.body) });
  res.json({ success: true });
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const db = getDb();
    if (db) {
      const emp = await db.execute('SELECT sekolah_id FROM employees WHERE id = ?', [req.params.id]);
      if (emp.rows.length > 0 && (emp.rows[0] as any).sekolah_id !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only delete employees in your own school' });
      }
    }
  }
  const ok = await deleteEmployee(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Failed to delete employee' });
  await logActivity(req, 'delete', 'employee', req.params.id);
  res.json({ success: true });
});

// Employee Period API
app.get('/api/employees/:id/periods', authenticateToken, async (req, res) => {
  const periods = await getEmployeePeriods(req.params.id);
  res.json(periods);
});

app.post('/api/employees/:id/periods', authenticateToken, async (req, res) => {
  const { tanggal_mulai, tanggal_selesai, status } = req.body;
  if (!tanggal_mulai || !tanggal_selesai) {
    return res.status(400).json({ error: 'tanggal_mulai and tanggal_selesai required' });
  }
  const result = await insertEmployeePeriod({
    employee_id: req.params.id,
    tanggal_mulai,
    tanggal_selesai,
    status,
  });
  if (!result) return res.status(500).json({ error: 'Failed to create period' });
  await logActivity(req, 'create', 'employee_period', result.id, { employee_id: req.params.id });
  res.status(201).json(result);
});

app.put('/api/employees/:id/periods/:periodId', authenticateToken, async (req, res) => {
  const ok = await updateEmployeePeriod(req.params.periodId, req.body);
  if (!ok) return res.status(400).json({ error: 'Failed to update period' });
  await logActivity(req, 'update', 'employee_period', req.params.periodId, { employee_id: req.params.id });
  res.json({ success: true });
});

app.delete('/api/employees/:id/periods/:periodId', authenticateToken, async (req, res) => {
  const ok = await deleteEmployeePeriod(req.params.periodId);
  if (!ok) return res.status(400).json({ error: 'Failed to delete period' });
  await logActivity(req, 'delete', 'employee_period', req.params.periodId, { employee_id: req.params.id });
  res.json({ success: true });
});

// Document CRUD
app.post('/api/documents', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope && req.body.school_id !== schoolScope) {
    return res.status(403).json({ error: 'Forbidden: you can only add documents to your own school' });
  }
  const ok = await upsertEmployeeDocument(req.body);
  if (!ok) return res.status(400).json({ error: 'Failed to save document' });
  await logActivity(req, 'create', 'document', req.body.id, { employee_id: req.body.employee_id, kategori: req.body.kategori });
  res.status(201).json({ success: true });
});

app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'DB not available' });

  // Find document + its school for scope check
  const doc = await db.execute({
    sql: `SELECT ed.*, e.sekolah_id FROM employee_documents ed LEFT JOIN employees e ON e.id = ed.employee_id WHERE ed.id = ?`,
    args: [req.params.id]
  });
  if (doc.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

  const row = doc.rows[0] as any;
  const schoolScope = getSchoolScope(req);
  if (schoolScope && row.sekolah_id !== schoolScope) {
    return res.status(403).json({ error: 'Forbidden: you can only delete documents from your own school' });
  }

  // Delete from Google Drive
  if (row.drive_file_id) {
    try {
      const auth = getDriveAuth();
      await google.drive({ version: 'v3', auth }).files.delete({ fileId: row.drive_file_id });
    } catch (driveErr: any) {
      if (driveErr.code !== 404) {
        console.error('Drive delete error:', driveErr.message);
        return res.status(500).json({ error: 'Gagal menghapus file dari Google Drive' });
      }
    }
  }

  const result = await deleteEmployeeDocument(req.params.id);
  if (!result.ok) return res.status(500).json({ error: 'Failed to delete document' });
  await logActivity(req, 'delete', 'document', req.params.id, { nama_file: row.nama_file });
  res.json({ success: true });
});

app.post('/api/documents/:id/verify', authenticateToken, async (req, res) => {
  const db = getDb();
  if (db) {
    const schoolScope = getSchoolScope(req);
    if (schoolScope) {
      const doc = await db.execute({
        sql: `SELECT ed.*, e.sekolah_id FROM employee_documents ed LEFT JOIN employees e ON e.id = ed.employee_id WHERE ed.id = ?`,
        args: [req.params.id]
      });
      if (doc.rows.length > 0 && (doc.rows[0] as any).sekolah_id !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only verify documents from your own school' });
      }
    }
  }
  const { status, catatan } = req.body;
  const ok = await verifyEmployeeDocument(req.params.id, status, catatan);
  if (!ok) return res.status(400).json({ error: 'Failed to verify document' });
  await logActivity(req, 'verify', 'document', req.params.id, { status, catatan: catatan || null });
  res.json({ success: true });
});

// Upload file to Google Drive
app.post('/api/upload-file', authenticateToken, async (req, res) => {
  const { file, fileName, mimeType, employeeId, schoolName, jenisDokumen, kategori } = req.body;
  if (!file || !fileName || !employeeId || !schoolName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const buffer = Buffer.from(file, 'base64');
  if (buffer.length > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB.' });
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Tipe file tidak diizinkan. Hanya PDF, gambar, dan dokumen Word.' });
  }
  try {
    const { uploadToDrive } = await import('./drive');
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not available' });

    const emp = await db.execute('SELECT id, sekolah_id FROM employees WHERE id = ?', [employeeId]);
    if (emp.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const sekolahId = (emp.rows[0] as any).sekolah_id as string;

    const schoolScope = getSchoolScope(req);
    if (schoolScope && sekolahId !== schoolScope) {
      return res.status(403).json({ error: 'Forbidden: you can only upload for employees in your own school' });
    }

    const { fileId, driveUrl } = await uploadToDrive(buffer, fileName, mimeType, schoolName, fileName.split(' - ')[0] || schoolName);

    const ok = await upsertEmployeeDocument({
      employee_id: employeeId,
      school_id: sekolahId,
      kategori: kategori || 'LAINNYA',
      jenis_dokumen: jenisDokumen || fileName,
      nama_file: fileName,
      mime_type: mimeType,
      file_size: buffer.length,
      drive_file_id: fileId,
      drive_url: driveUrl,
      status_verifikasi: 'sudah_diverifikasi',
    });

    if (!ok) return res.status(500).json({ error: 'Failed to save document' });
    await logActivity(req, 'upload', 'document', undefined, { employee_id: employeeId, nama_file: fileName, kategori: kategori || 'LAINNYA' });
    res.json({ success: true, fileId, driveUrl });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// 5. Student & Teacher Aggregate Endpoints
app.get('/api/students/aggregate', authenticateToken, async (req, res) => {
  const aggregates = await getStudentAggregates();
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const filtered: Record<string, any> = {};
    if (aggregates[schoolScope]) {
      filtered[schoolScope] = aggregates[schoolScope];
    }
    return res.json(filtered);
  }
  res.json(aggregates);
});

app.get('/api/teachers/aggregate', authenticateToken, async (req, res) => {
  const aggregates = await getTeacherAggregates();
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const filtered: Record<string, any> = {};
    if (aggregates[schoolScope]) {
      filtered[schoolScope] = aggregates[schoolScope];
    }
    return res.json(filtered);
  }
  res.json(aggregates);
});

app.get('/api/schools', authenticateToken, async (req, res) => {
  const schools = await getAllSchools();
  const schoolScope = getSchoolScope(req);
  const filtered = schoolScope
    ? schools.filter(s => s.npsn === schoolScope)
    : schools;
  res.json(filtered.map(s => ({
    npsn: s.npsn,
    name: s.name,
    level: s.level,
    status: (s.status as string) === 'NEGERI' ? 'Negeri' : (s.status as string) === 'SWASTA' ? 'Swasta' : s.status,
    village: s.village,
  })));
});

app.get('/api/schools/stats', authenticateToken, async (req, res) => {
  const schools = await getAllSchools();
  const studentAgg = await getStudentAggregates();
  const teacherAgg = await getTeacherAggregates();
  const schoolScope = getSchoolScope(req);
  const filtered = schoolScope
    ? schools.filter(s => s.npsn === schoolScope)
    : schools;
  const result = filtered.map(s => ({
    npsn: s.npsn,
    name: s.name,
    level: s.level,
    status: (s.status as string) === 'NEGERI' ? 'Negeri' : (s.status as string) === 'SWASTA' ? 'Swasta' : s.status,
    village: s.village,
    accreditation: s.accreditation,
    healthScore: s.healthScore,
    students: studentAgg[s.npsn] || { npsn: s.npsn, total: 0, male: 0, female: 0, byGrade: {} },
    teachers: teacherAgg[s.npsn] || { npsn: s.npsn, total: s.teachers?.total || 0, certified: s.teachers?.certified || 0, pns: s.teachers?.pns || 0, pppk: s.teachers?.pppk || 0, honorer: s.teachers?.honorer || 0 },
    riskIndicators: s.riskIndicators,
  }));
  res.json(result);
});

// 6. Document OCR / Semantic Search Engine
app.get('/api/document-search', authenticateToken, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const query = q.toString();

    const docs = query ? await searchDocuments(query) : [];

    const db = getDb();
    if (db) {
      const searchQ = query.toLowerCase();
      const schoolScope = getSchoolScope(req);
      let empDocs;
      const whereClause = query
        ? `WHERE (LOWER(ed.nama_file) LIKE ? OR LOWER(ed.jenis_dokumen) LIKE ? OR LOWER(ed.kategori) LIKE ? OR LOWER(e.nama) LIKE ?)`
        : '';
      const scopeClause = schoolScope ? (whereClause ? ' AND' : 'WHERE') + ' e.sekolah_id = ?' : '';
      const params: any[] = query
        ? [`%${searchQ}%`, `%${searchQ}%`, `%${searchQ}%`, `%${searchQ}%`]
        : [];
      if (schoolScope) params.push(schoolScope);

      if (!query && !schoolScope) {
        empDocs = await db.execute({
          sql: `SELECT ed.*, e.nama as employee_name, e.sekolah_id, sk.name as school_name
                FROM employee_documents ed
                LEFT JOIN employees e ON e.id = ed.employee_id
                LEFT JOIN schools sk ON sk.npsn = e.sekolah_id
                LIMIT 200`,
        });
      } else {
        empDocs = await db.execute({
          sql: `SELECT ed.*, e.nama as employee_name, e.sekolah_id, sk.name as school_name
                FROM employee_documents ed
                LEFT JOIN employees e ON e.id = ed.employee_id
                LEFT JOIN schools sk ON sk.npsn = e.sekolah_id
                ${whereClause}${scopeClause}
                LIMIT 200`,
          args: params,
        });
      }
      const mapped = empDocs.rows.map((row: any) => ({
        id: row.id,
        title: row.nama_file,
        category: row.kategori,
        schoolName: row.school_name || null,
        schoolNpsn: row.sekolah_id || null,
        lastUpdated: row.updated_at ? new Date(Number(row.updated_at)).toISOString() : '',
        status: row.status_verifikasi === 'sudah_diverifikasi' ? 'verified' : 'pending',
        employeeName: row.employee_name,
        jenisDokumen: row.jenis_dokumen,
        driveUrl: row.drive_url,
      }));
      return res.json([...docs, ...mapped]);
    }

    res.json(query ? docs : []);
  } catch (err) {
    console.error('GET /api/document-search error:', err);
    res.status(500).json({ error: 'Gagal mencari dokumen' });
  }
});

// 7. Student API
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const { school, rombel, limit, offset, status_anak } = req.query;
    const pageLimit = Math.min(Math.max(parseInt(limit as string, 10) || 10000, 1), 50000);
    const pageOffset = Math.max(parseInt(offset as string, 10) || 0, 0);
    const schoolScope = getSchoolScope(req);
    const effectiveSchool = schoolScope || (school as string);
    if (!effectiveSchool && schoolScope) {
      return res.json([]);
    }
    let students;
    if (rombel && effectiveSchool) students = await getStudentsByRombel(effectiveSchool, rombel as string);
    else if (effectiveSchool) students = await getStudentsBySchool(effectiveSchool);
    else students = await getStudents();
    if (status_anak) {
      const sa = (status_anak as string).toLowerCase();
      students = students.filter(s => (s.status_anak || 'normal') === sa);
    }
    const paginated = students.slice(pageOffset, pageOffset + pageLimit);
    res.json({
      data: paginated,
      total: students.length,
      limit: pageLimit,
      offset: pageOffset,
    });
  } catch (err) {
    console.error('GET /api/students error:', err);
    res.status(500).json({ error: 'Gagal memuat data siswa' });
  }
});

// Students with parent/address detail (for baru-kelas1 view)
app.get('/api/students/with-detail', authenticateToken, async (req, res) => {
  try {
    const data = await getStudentsWithDetail();
    const schoolScope = getSchoolScope(req);
    const filtered = schoolScope ? data.filter((s: any) => s.school_npsn === schoolScope) : data;
    res.json(filtered);
  } catch (err) {
    console.error('GET /api/students/with-detail error:', err);
    res.status(500).json({ error: 'Gagal memuat data siswa' });
  }
});

app.get('/api/students/rombels', authenticateToken, async (req, res) => {
  const list = await getRombelList();
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    return res.json(list.filter((r: any) => r.school_npsn === schoolScope));
  }
  res.json(list);
});

app.post('/api/students', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope && req.body.school_npsn !== schoolScope) {
    return res.status(403).json({ error: 'Forbidden: you can only add students to your own school' });
  }
  const sanitized = { ...req.body, nama: req.body.nama || '' };
  const stu = await insertStudent(sanitized);
  if (!stu) return res.status(400).json({ error: 'Gagal menambah siswa' });
  await logActivity(req, 'create', 'student', stu.id, { nama: sanitized.nama, school_npsn: sanitized.school_npsn });
  res.status(201).json(stu);
});

// Bulk import students from Excel (parsed client-side)
app.post('/api/students/import', authenticateToken, async (req, res) => {
  try {
    const { rows, school_npsn, tahun_pelajaran } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data kosong' });
    }
    const schoolScope = getSchoolScope(req);
    let created = 0, updated = 0, skipped = 0, errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nama = (row.nama_pd || '').trim();
      if (!nama) { skipped++; continue; }
      // Determine school_npsn: row.npsn_sekolah > body school_npsn > operator scope
      let rowSchoolNpsn = (row.npsn_sekolah || '').toString().trim() || school_npsn || '';
      if (schoolScope) {
        rowSchoolNpsn = schoolScope;
      }
      if (!rowSchoolNpsn) {
        skipped++;
        errors.push(`Baris ${i + 1}: NPSN sekolah tidak ditemukan`);
        continue;
      }
      const jk = (row.jk || '').toUpperCase() === 'P' ? 'Perempuan' : 'Laki-laki';
      const kelasNum = row.kelas || 1;
      const kelas_kelompok = 'Kelas ' + kelasNum;
      const rawNisn = row.nisn ? String(row.nisn).trim() : '';
      const nisn = (rawNisn === '-' || rawNisn === '' || rawNisn === '0') ? null : rawNisn || null;
      const rawNik = row.nik ? String(row.nik).trim() : '';
      const nik = (rawNik === '-' || rawNik === '' || rawNik === '0') ? null : rawNik || null;
      const tempatLahir = row.tempat_lahir || null;
      const tl = row.tanggal_lahir;
      let tanggalLahir: string | null = null;
      if (tl) {
        if (typeof tl === 'string' && tl.includes('/')) {
          const [d, m, y] = tl.split('/');
          tanggalLahir = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (typeof tl === 'string') {
          tanggalLahir = tl.split('T')[0];
        }
      }
      try {
        const db = getDb();
        // 1. Find existing student: by nisn (if present) or by name+school+kelas
        let stu: any = null;
        if (nisn) {
          const existing = await db?.execute({
            sql: 'SELECT * FROM students WHERE nisn = ? AND school_npsn = ? LIMIT 1',
            args: [nisn, rowSchoolNpsn]
          });
          stu = existing?.rows[0] || null;
        }
        if (!stu) {
          const existing = await db?.execute({
            sql: 'SELECT * FROM students WHERE nama = ? AND school_npsn = ? AND kelas_kelompok = ? LIMIT 1',
            args: [nama, rowSchoolNpsn, kelas_kelompok]
          });
          stu = existing?.rows[0] || null;
        }
        // 2. If not found → insert new; else → update existing fields from Excel
        if (!stu) {
          stu = await insertStudent({
            school_npsn: rowSchoolNpsn, nama, nisn, nik,
            jenis_kelamin: jk,
            tempat_lahir: tempatLahir,
            tanggal_lahir: tanggalLahir,
            jenjang: 'SD',
            kelas_kelompok,
            rombel: null,
            status_siswa: 'aktif',
            tahun_pelajaran,
          });
          created++;
        } else {
          // Update existing student with Excel data (overwrite old values)
          const updates: string[] = [];
          const uArgs: any[] = [];
          if (nisn && nisn !== stu.nisn) { updates.push('nisn = ?'); uArgs.push(nisn); }
          if (nik && nik !== stu.nik) { updates.push('nik = ?'); uArgs.push(nik); }
          if (jk && jk !== stu.jenis_kelamin) { updates.push('jenis_kelamin = ?'); uArgs.push(jk); }
          if (tempatLahir && tempatLahir !== stu.tempat_lahir) { updates.push('tempat_lahir = ?'); uArgs.push(tempatLahir); }
          if (tanggalLahir && tanggalLahir !== stu.tanggal_lahir) { updates.push('tanggal_lahir = ?'); uArgs.push(tanggalLahir); }
          if (rowSchoolNpsn !== stu.school_npsn) { updates.push('school_npsn = ?'); uArgs.push(rowSchoolNpsn); }
          if (kelas_kelompok !== stu.kelas_kelompok) { updates.push('kelas_kelompok = ?'); uArgs.push(kelas_kelompok); }
          if (updates.length > 0) {
            uArgs.push(stu.id);
            await db?.execute({ sql: `UPDATE students SET ${updates.join(', ')} WHERE id = ?`, args: uArgs });
            // Refresh stu reference
            const refreshed = await db?.execute({ sql: 'SELECT * FROM students WHERE id = ?', args: [stu.id] });
            stu = refreshed?.rows[0] || stu;
          }
          updated++;
        }
        // 3. Always upsert parent/address data
        // Use Excel nisn > existing student nisn > student id as key
        const effectiveNisn = nisn || (stu?.nisn) || (stu ? stu.id : null);
        if (effectiveNisn && stu) {
          const parentData: Record<string, any> = {};
          if (row.nama_ayah) parentData.nama_ayah = row.nama_ayah;
          if (row.nama_ibu) parentData.nama_ibu = row.nama_ibu;
          if (Object.keys(parentData).length > 0) await upsertStudentParents(effectiveNisn, parentData, stu.id);
          const addrData: Record<string, any> = {};
          if (row.alamat_rmh) addrData.alamat = row.alamat_rmh;
          if (row.desa) addrData.desa = row.desa;
          if (row.kecamatan_rmh) addrData.kecamatan = row.kecamatan_rmh;
          if (Object.keys(addrData).length > 0) await upsertStudentAddress(effectiveNisn, addrData, stu.id);
        }
      } catch (e: any) {
        skipped++;
        errors.push(`Baris ${i + 1}: ${e.message || 'error'}`);
      }
    }
    await logActivity(req, 'import', 'student', null, { created, updated, skipped, school_npsn, tahun_pelajaran });
    res.json({ created, updated, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error('POST /api/students/import error:', err);
    res.status(500).json({ error: 'Gagal mengimpor siswa' });
  }
});

// Import melanjutkan data — match by NISN, set destination school + status
app.post('/api/students/import-melanjutkan', authenticateToken, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data kosong' });
    }
    const db = getDb();
    let updated = 0, skipped = 0, errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nisn = row.nisn ? String(row.nisn).trim() : '';
      const nama = (row.nama_siswa || row.nama_pd || '').trim();
      const sekolahTujuan = (row.sekolah_tujuan || '').trim();
      const kecTujuan = (row.kecamatan_sekolah_tujuan || '').trim();
      const kabTujuan = (row.kab_kota_tujuan || '').trim();
      if (!nisn && !nama) { skipped++; continue; }
      try {
        // Find student by NISN first, then by name
        let stu: any = null;
        if (nisn && nisn !== '-') {
          const r = await db?.execute({ sql: 'SELECT * FROM students WHERE nisn = ? LIMIT 1', args: [nisn] });
          stu = r?.rows[0] || null;
        }
        if (!stu && nama) {
          const r = await db?.execute({ sql: 'SELECT * FROM students WHERE nama = ? LIMIT 1', args: [nama] });
          stu = r?.rows[0] || null;
        }
        if (!stu) {
          skipped++;
          errors.push(`Baris ${i + 1}: Siswa tidak ditemukan (${nisn || nama})`);
          continue;
        }
        const statusLanjutan = sekolahTujuan ? 'melanjutkan' : 'tidak_melanjutkan';
        await db?.execute({
          sql: `UPDATE students SET sekolah_tujuan = ?, kecamatan_tujuan = ?, kab_kota_tujuan = ?, status_lanjutan = ? WHERE id = ?`,
          args: [sekolahTujuan || null, kecTujuan || null, kabTujuan || null, statusLanjutan, stu.id]
        });
        updated++;
      } catch (e: any) {
        skipped++;
        errors.push(`Baris ${i + 1}: ${e.message || 'error'}`);
      }
    }
    await logActivity(req, 'import', 'student', null, { action: 'import-melanjutkan', updated, skipped });
    res.json({ updated, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error('POST /api/students/import-melanjutkan error:', err);
    res.status(500).json({ error: 'Gagal mengimpor data melanjutkan' });
  }
});

// Import kelulusan data — match by NISN/name, update student + set status lulus + no_seri_ijazah + parent/address
app.post('/api/students/import-kelulusan', authenticateToken, async (req, res) => {
  try {
    const { rows, tahun_pelajaran } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Data kosong' });
    }
    const db = getDb();
    let updated = 0, created = 0, skipped = 0, errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nama = (row.nama_pd || '').trim();
      if (!nama) { skipped++; continue; }
      const rawNisn = row.nisn ? String(row.nisn).trim() : '';
      const nisn = (rawNisn === '-' || rawNisn === '' || rawNisn === '0') ? null : rawNisn || null;
      const nik = row.nik ? String(row.nik).trim() : null;
      const jk = (row.jk || '').toUpperCase() === 'P' ? 'Perempuan' : 'Laki-laki';
      const kelasNum = row.kelas || 6;
      const kelas_kelompok = 'Kelas ' + kelasNum;
      const noSeriIjazah = row.no_seri_ijazah ? String(row.no_seri_ijazah).trim() : null;
      const tempatLahir = row.tempat_lahir || null;
      const tl = row.tanggal_lahir;
      let tanggalLahir: string | null = null;
      if (tl) {
        const tlStr = String(tl);
        if (tlStr.includes('/')) {
          const [d, m, y] = tlStr.split('/');
          tanggalLahir = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (tlStr.includes('-')) {
          tanggalLahir = tlStr.split('T')[0];
        } else if (typeof tl === 'number') {
          const d = new Date((tl - 25569) * 86400000);
          tanggalLahir = d.toISOString().split('T')[0];
        }
      }
      const tp = tahun_pelajaran || (() => { const y = new Date().getFullYear(); const m = new Date().getMonth(); return m >= 6 ? `${y}/${y+1}` : `${y-1}/${y}`; })();
      try {
        // Find student
        let stu: any = null;
        if (nisn) {
          const r = await db?.execute({ sql: 'SELECT * FROM students WHERE nisn = ? LIMIT 1', args: [nisn] });
          stu = r?.rows[0] || null;
        }
        if (!stu) {
          const r = await db?.execute({ sql: 'SELECT * FROM students WHERE nama = ? AND kelas_kelompok = ? LIMIT 1', args: [nama, kelas_kelompok] });
          stu = r?.rows[0] || null;
        }
        if (!stu) {
          // Insert new graduated student
          const newStu = await insertStudent({
            school_npsn: '', nama, nisn, nik,
            jenis_kelamin: jk,
            tempat_lahir: tempatLahir,
            tanggal_lahir: tanggalLahir,
            jenjang: 'SD',
            kelas_kelompok,
            rombel: null,
            status_siswa: 'lulus',
            tahun_pelajaran: tp,
          });
          if (newStu) {
            stu = newStu;
            created++;
          } else {
            skipped++;
            errors.push(`Baris ${i + 1}: Gagal membuat siswa baru`);
            continue;
          }
        } else {
          // Update existing student
          const updates: string[] = ['status_siswa = ?'];
          const uArgs: any[] = ['lulus'];
          if (nisn && nisn !== stu.nisn) { updates.push('nisn = ?'); uArgs.push(nisn); }
          if (nik && nik !== stu.nik) { updates.push('nik = ?'); uArgs.push(nik); }
          if (jk && jk !== stu.jenis_kelamin) { updates.push('jenis_kelamin = ?'); uArgs.push(jk); }
          if (tempatLahir && tempatLahir !== stu.tempat_lahir) { updates.push('tempat_lahir = ?'); uArgs.push(tempatLahir); }
          if (tanggalLahir && tanggalLahir !== stu.tanggal_lahir) { updates.push('tanggal_lahir = ?'); uArgs.push(tanggalLahir); }
          if (noSeriIjazah) { updates.push('no_seri_ijazah = ?'); uArgs.push(noSeriIjazah); }
          uArgs.push(stu.id);
          await db?.execute({ sql: `UPDATE students SET ${updates.join(', ')} WHERE id = ?`, args: uArgs });
          const refreshed = await db?.execute({ sql: 'SELECT * FROM students WHERE id = ?', args: [stu.id] });
          stu = refreshed?.rows[0] || stu;
          updated++;
        }
        // Upsert parent/address
        const effectiveNisn = nisn || (stu?.nisn) || (stu ? stu.id : null);
        if (effectiveNisn && stu) {
          const parentData: Record<string, any> = {};
          if (row.nama_ayah) parentData.nama_ayah = row.nama_ayah;
          if (row.nama_ibu) parentData.nama_ibu = row.nama_ibu;
          if (Object.keys(parentData).length > 0) await upsertStudentParents(effectiveNisn, parentData, stu.id);
          const addrData: Record<string, any> = {};
          if (row.alamat_rmh) addrData.alamat = row.alamat_rmh;
          if (row.desa) addrData.desa = row.desa;
          if (row.kecamatan_rmh) addrData.kecamatan = row.kecamatan_rmh;
          if (Object.keys(addrData).length > 0) await upsertStudentAddress(effectiveNisn, addrData, stu.id);
        }
      } catch (e: any) {
        skipped++;
        errors.push(`Baris ${i + 1}: ${e.message || 'error'}`);
      }
    }
    await logActivity(req, 'import', 'student', null, { action: 'import-kelulusan', created, updated, skipped });
    res.json({ created, updated, skipped, errors: errors.slice(0, 20) });
  } catch (err) {
    console.error('POST /api/students/import-kelulusan error:', err);
    res.status(500).json({ error: 'Gagal mengimpor data kelulusan' });
  }
});

app.get('/api/students/lookup-by-nik/:nik', authenticateToken, async (req, res) => {
  const { nik } = req.params;
  if (!nik || nik.length < 5) return res.json(null);
  const schoolScope = getSchoolScope(req);
  const student = await getStudentByNik(nik);
  if (!student) return res.json(null);
  const db = getDb();
  if (db) {
    const schoolR = await db.execute('SELECT name FROM schools WHERE npsn = ?', [student.school_npsn]);
    const schoolName = (schoolR.rows[0] as any)?.name || '';
    if (schoolScope && student.school_npsn !== schoolScope) return res.json(null);
    return res.json({ ...student, school_name: schoolName });
  }
  res.json(student);
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const db = getDb();
    if (db) {
      const stu = await db.execute('SELECT school_npsn FROM students WHERE id = ?', [req.params.id]);
      if (stu.rows.length > 0 && (stu.rows[0] as any).school_npsn !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only update students in your own school' });
      }
    }
  }
  const ok = await updateStudent(req.params.id, req.body);
  if (!ok) return res.status(400).json({ error: 'Gagal mengupdate siswa' });
  await logActivity(req, 'update', 'student', req.params.id, { updated_fields: Object.keys(req.body) });
  res.json({ success: true });
});

// Student detail endpoints (parents, address, health)
app.get('/api/students/:id/detail', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not available' });
    const stu = await db.execute('SELECT id, nisn, school_npsn FROM students WHERE id = ?', [req.params.id]);
    if (stu.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const row = stu.rows[0] as any;
    const schoolScope = getSchoolScope(req);
    if (schoolScope && row.school_npsn !== schoolScope) {
      return res.status(403).json({ error: 'Forbidden: you can only view students in your own school' });
    }
    if (!row.nisn) return res.json({ parents: null, address: null, health: null });
    const detail = await getStudentDetail(row.nisn);
    res.json(detail);
  } catch (err) {
    console.error('GET /api/students/:id/detail error:', err);
    res.status(500).json({ error: 'Gagal memuat detail siswa' });
  }
});

app.put('/api/students/:id/detail', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not available' });
    const stu = await db.execute('SELECT id, nisn, school_npsn FROM students WHERE id = ?', [req.params.id]);
    if (stu.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const row = stu.rows[0] as any;
    const schoolScope = getSchoolScope(req);
    if (schoolScope && row.school_npsn !== schoolScope) {
      return res.status(403).json({ error: 'Forbidden: you can only update students in your own school' });
    }
    if (!row.nisn) return res.status(400).json({ error: 'Student has no NISN' });
    const { parents, address, health } = req.body;
    const results = await Promise.all([
      parents ? upsertStudentParents(row.nisn, parents) : Promise.resolve(true),
      address ? upsertStudentAddress(row.nisn, address) : Promise.resolve(true),
      health ? upsertStudentHealth(row.nisn, health) : Promise.resolve(true),
    ]);
    if (results.some(r => !r)) return res.status(500).json({ error: 'Failed to save student detail' });
    await logActivity(req, 'update', 'student_detail', req.params.id, { updated_sections: Object.keys(req.body) });
    const [detail, studentRows] = await Promise.all([
      getStudentDetail(row.nisn),
      db.execute('SELECT status_anak FROM students WHERE id = ?', [req.params.id]),
    ]);
    res.json({ ...detail, student: studentRows.rows[0] || null });
  } catch (err) {
    console.error('PUT /api/students/:id/detail error:', err);
    res.status(500).json({ error: 'Gagal menyimpan detail siswa' });
  }
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const db = getDb();
    if (db) {
      const stu = await db.execute('SELECT school_npsn FROM students WHERE id = ?', [req.params.id]);
      if (stu.rows.length > 0 && (stu.rows[0] as any).school_npsn !== schoolScope) {
        return res.status(403).json({ error: 'Forbidden: you can only delete students in your own school' });
      }
    }
  }
  const ok = await deleteStudent(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Gagal menghapus siswa' });
  await logActivity(req, 'delete', 'student', req.params.id);
  res.json({ success: true });
});

// ── Alumni / Graduation API ──
app.post('/api/graduates', authenticateToken, async (req, res) => {
  const { student_ids, tahun_pelajaran_lulus } = req.body;
  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'student_ids wajib diisi' });
  }
  if (!tahun_pelajaran_lulus) return res.status(400).json({ error: 'tahun_pelajaran_lulus wajib diisi' });
  const schoolScope = getSchoolScope(req);
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'DB not available' });
  try {
    const result = await db.execute('SELECT * FROM students WHERE id IN (' + student_ids.map(() => '?').join(',') + ')', student_ids);
    const graduated: any[] = [];
    const rollback: string[] = [];
    for (const row of result.rows) {
      const s = row as any;
      if (schoolScope && s.school_npsn !== schoolScope) continue;
      const alum = await insertAlumni({
        student_id: s.id as string, nama: s.nama as string, nisn: s.nisn as string,
        nik: s.nik as string, jenis_kelamin: s.jenis_kelamin as string,
        tempat_lahir: s.tempat_lahir as string, tanggal_lahir: s.tanggal_lahir as string,
        school_npsn: s.school_npsn as string, tahun_pelajaran_lulus,
      });
      if (alum) {
        await db.execute({ sql: 'UPDATE students SET status_siswa = ? WHERE id = ?', args: ['lulus', s.id] });
        graduated.push(alum);
        rollback.push(s.id as string);
      }
    }
    await logActivity(req, 'graduate', 'student', undefined, { count: graduated.length, tahun_pelajaran_lulus });
    res.json({ success: true, count: graduated.length, data: graduated });
  } catch (err: any) {
    console.error('graduates error:', err);
    // Attempt rollback: restore students that were marked as lulus
    try {
      for (const sid of rollback || []) {
        await db.execute({ sql: 'UPDATE students SET status_siswa = ? WHERE id = ?', args: ['aktif', sid] });
      }
    } catch (rbErr) {
      console.error('rollback error:', rbErr);
    }
    res.status(500).json({ error: err.message || 'Gagal meluluskan siswa' });
  }
});

app.get('/api/alumni', authenticateToken, async (req, res) => {
  const { school, tahun_pelajaran_lulus, status_lanjutan } = req.query;
  const schoolScope = getSchoolScope(req);
  const filters: any = {};
  if (schoolScope) filters.school_npsn = schoolScope;
  else if (school) filters.school_npsn = school as string;
  if (tahun_pelajaran_lulus) filters.tahun_pelajaran_lulus = tahun_pelajaran_lulus as string;
  if (status_lanjutan) filters.status_lanjutan = status_lanjutan as string;
  const list = await getAlumni(filters);
  res.json(list);
});

app.put('/api/alumni/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const existing = await getAlumniById(req.params.id);
    if (existing && existing.school_npsn !== schoolScope) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const ok = await updateAlumni(req.params.id, req.body);
  if (!ok) return res.status(400).json({ error: 'Gagal mengupdate alumni' });
  await logActivity(req, 'update', 'alumni', req.params.id);
  const updated = await getAlumniById(req.params.id);
  res.json(updated);
});

// 8. Calendar API
app.get('/api/calendar', authenticateToken, async (req, res) => {
  const { semester, category, level } = req.query;
  let events = await getCalendarEvents();
  if (semester) events = events.filter(e => e.semester === Number(semester));
  if (category) events = events.filter(e => e.category === category);
  if (level && level !== 'ALL') events = events.filter(e => e.education_level === 'ALL' || e.education_level.includes(level as string));
  res.json(events);
});

app.get('/api/calendar/:id', authenticateToken, async (req, res) => {
  const ev = await getCalendarEventById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event tidak ditemukan' });
  res.json(ev);
});

app.post('/api/calendar', authenticateToken, async (req, res) => {
  const sanitized = { ...req.body, title: req.body.title || '' };
  const ev = await insertCalendarEvent(sanitized);
  if (!ev) return res.status(400).json({ error: 'Gagal menambah event' });
  await logActivity(req, 'create', 'calendar_event', ev.id, { title: sanitized.title });
  res.status(201).json(ev);
});

app.put('/api/calendar/:id', authenticateToken, async (req, res) => {
  const ok = await updateCalendarEvent(req.params.id, req.body);
  if (!ok) return res.status(400).json({ error: 'Gagal mengupdate event' });
  await logActivity(req, 'update', 'calendar_event', req.params.id);
  res.json({ success: true });
});

app.delete('/api/calendar/:id', authenticateToken, async (req, res) => {
  const ok = await deleteCalendarEvent(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Gagal menghapus event' });
  await logActivity(req, 'delete', 'calendar_event', req.params.id);
  res.json({ success: true });
});

// 9. School Profile API
app.get('/api/schools/:npsn', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope && schoolScope !== req.params.npsn) {
    return res.status(403).json({ error: 'Forbidden: you can only access your own school' });
  }
  const schools = await getAllSchools();
  const school = schools.find(s => s.npsn === req.params.npsn);
  if (!school) return res.status(404).json({ error: 'Sekolah tidak ditemukan' });

  const studentAgg = await getStudentAggregates();
  const teacherAgg = await getTeacherAggregates();
  const stats = {
    ...school,
    studentStats: studentAgg[req.params.npsn] || null,
    teacherStats: teacherAgg[req.params.npsn] || (school.teachers ? { npsn: school.npsn, total: school.teachers.total || 0, certified: school.teachers.certified || 0, pns: school.teachers.pns || 0, pppk: school.teachers.pppk || 0, honorer: school.teachers.honorer || 0 } : null),
  };
  res.json(stats);
});

// 7. Alerts & Recommendations API
app.get('/api/alerts', authenticateToken, async (req, res) => {
  const alerts = await getAlerts();
  res.json(alerts);
});

app.get('/api/recommendations', authenticateToken, async (req, res) => {
  const recs = await getRecommendations();
  res.json(recs);
});

app.post('/api/recommendations/:id/apply', authenticateToken, requireRole('admin', 'staff_kecamatan'), async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  try {
    await db.execute({
      sql: 'UPDATE recommendations SET applied = 1 WHERE id = ?',
      args: [req.params.id]
    });
    await logActivity(req, 'apply', 'recommendation', req.params.id);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to apply recommendation' });
  }
});

// Monthly report endpoint
app.get('/api/reports/monthly', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  const report = await getMonthlyReport(schoolScope || undefined);
  res.json({
    generatedAt: new Date().toISOString(),
    period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
    totalSchools: report.length,
    totalStudents: report.reduce((s: number, r: any) => s + r.students.total, 0),
    totalEmployees: report.reduce((s: number, r: any) => s + r.employees.total, 0),
    schools: report,
  });
});

// Monthly report submissions (progress table for super admin)
app.get('/api/reports/submissions', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  const schools = await getAllSchools();
  const submissions = await getMonthlySubmissions();
  const period = new Date().toISOString().slice(0, 7);
  const filteredSchools = schoolScope ? schools.filter(s => s.npsn === schoolScope) : schools;

  const result = filteredSchools.map(s => {
    const sub = submissions.find(x => x.school_npsn === s.npsn && x.period === period);
    return {
      npsn: s.npsn,
      name: s.name,
      level: s.level,
      status: s.status,
      village: s.village,
      submitted: !!sub,
      submittedAt: sub ? sub.submitted_at : null,
      statusLabel: sub ? 'Sudah Lapor' : 'Belum Lapor',
    };
  });

  res.json({
    period,
    total: result.length,
    submitted: result.filter(r => r.submitted).length,
    pending: result.filter(r => !r.submitted).length,
    schools: result,
  });
});

// Operator submits monthly report for their school
app.post('/api/reports/submit', authenticateToken, requireRole('operator_sekolah'), async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (!schoolScope) return res.status(403).json({ error: 'Anda tidak memiliki akses sekolah' });

  const period = new Date().toISOString().slice(0, 7);
  const success = await submitMonthlyReport(schoolScope, period, (req.user as any).id);
  if (success) {
    await logActivity(req, 'submit', 'monthly_report', schoolScope, { period });
    res.json({ success: true, message: 'Laporan bulanan berhasil dikirim' });
  } else {
    res.status(500).json({ error: 'Gagal mengirim laporan' });
  }
});

// Student mutation details for report preview
app.get('/api/reports/mutations/:npsn', authenticateToken, async (req, res) => {
  const db = getDb();
  if (!db) return res.json([]);
  const schoolScope = getSchoolScope(req);
  if (schoolScope && schoolScope !== req.params.npsn) return res.status(403).json({ error: 'Akses ditolak' });
  const result = await db.execute({
    sql: `SELECT m.*, s.kelas_kelompok, s.rombel
          FROM student_mutations m
          LEFT JOIN students s ON m.siswa_nisn = s.nisn AND m.school_npsn = s.school_npsn
          WHERE m.school_npsn = ?
          ORDER BY m.tanggal DESC`,
    args: [req.params.npsn]
  });
  res.json(result.rows);
});

// Employees with full detail for report preview
app.get('/api/reports/employees/:npsn', authenticateToken, async (req, res) => {
  const db = getDb();
  if (!db) return res.json([]);
  const schoolScope = getSchoolScope(req);
  if (schoolScope && schoolScope !== req.params.npsn) return res.status(403).json({ error: 'Akses ditolak' });
  const result = await db.execute({
    sql: `SELECT id, nama, gelar_depan, gelar_belakang, jabatan, status_pegawai, nip, nik, sertifikasi
          FROM employees WHERE sekolah_id = ? AND is_active = 1
          ORDER BY nama`,
    args: [req.params.npsn]
  });
  res.json(result.rows);
});

// ── User Management CRUD (admin-only) ──
app.get('/api/users', authenticateToken, requireRole('admin'), async (_req, res) => {
  try {
    const users = await getAllUsers();
    const schools = await getAllSchools();
    const schoolMap = new Map(schools.map((s: any) => [s.npsn, s.name]));
    const result = users.map(u => ({
      ...u,
      school_name: u.school_npsn ? schoolMap.get(u.school_npsn) || u.school_npsn : null,
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, school_npsn } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'username, password, role required' });
    if (!['admin', 'staff_kecamatan', 'operator_sekolah'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'operator_sekolah' && !school_npsn) {
      return res.status(400).json({ error: 'school_npsn required for operator_sekolah' });
    }
    const existing = await getUserByUsername(username);
    if (existing) return res.status(409).json({ error: 'Username already exists' });
    const ok = await createUser(username, password, role, school_npsn || null);
    if (!ok) return res.status(500).json({ error: 'Failed to create user' });
    await logActivity(req, 'create', 'user', undefined, { username, role, school_npsn: school_npsn || null });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, school_npsn } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'username, role required' });
    if (!['admin', 'staff_kecamatan', 'operator_sekolah'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const existing = await getUserById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    const ok = await updateUser(req.params.id, username, role, school_npsn || null, password || undefined);
    if (!ok) return res.status(500).json({ error: 'Failed to update user' });
    await logActivity(req, 'update', 'user', req.params.id, { username, role });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const existing = await getUserById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === (req as any).user?.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    const ok = await deleteUser(req.params.id);
    if (!ok) return res.status(500).json({ error: 'Failed to delete user' });
    await logActivity(req, 'delete', 'user', req.params.id, { username: existing.username });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Activity Logs API ──
app.get('/api/activity-logs', authenticateToken, requireRole('admin', 'staff_kecamatan'), async (req, res) => {
  try {
    const { limit, offset, action, user_id, date_from, date_to, search } = req.query;
    const result = await getActivityLogs({
      limit: parseInt(limit as string, 10) || 100,
      offset: parseInt(offset as string, 10) || 0,
      excludeRole: 'admin',
      action: action as string || undefined,
      user_id: user_id as string || undefined,
      dateFrom: date_from ? parseInt(date_from as string, 10) : undefined,
      dateTo: date_to ? parseInt(date_to as string, 10) : undefined,
      search: search as string || undefined,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Seed missing data (alerts, recommendations)
app.post('/api/debug/seed', authenticateToken, requireRole('admin'), async (req, res) => {
  const db = getDb();
  if (!db) return res.json({ db: 'unavailable' });
  try {
    const existingRecs = await db.execute('SELECT COUNT(*) as c FROM recommendations');
    if (Number(existingRecs.rows[0].c) === 0) {
      const recs = [
        { title: 'Distribusi Ulang Guru PPPK', description: 'Meratakan 8 guru PPPK ke 5 sekolah dengan defisit tenaga pendidik tertinggi di Wangkelang, Picungpugur, dan Sindanglaut', urgency: 'Critical', impactScore: 92, cost: 0.8, timeline: 3, category: 'Staffing' },
        { title: 'Rehabilitasi Ruang Kelas Rusak Berat', description: 'Rehab total 12 ruang kelas rusak berat di 4 sekolah', urgency: 'Critical', impactScore: 88, cost: 4.2, timeline: 8, category: 'Infrastructure' },
        { title: 'Percepatan Sertifikasi Guru', description: 'Mendaftarkan 18 guru honorer ke program PPG dalam tahun berjalan', urgency: 'High', impactScore: 85, cost: 0.3, timeline: 12, category: 'Certification' },
        { title: 'Pengajuan Formasi PPPK 2026', description: 'Mengusulkan 25 formasi PPPK baru untuk mengisi kekosongan akibat pensiun', urgency: 'High', impactScore: 90, cost: 2.1, timeline: 6, category: 'Staffing' },
        { title: 'Digitalisasi Arsip Kepegawaian', description: 'Digitalisasi 841 dokumen kepegawaian lengkap dengan OCR dan verifikasi', urgency: 'Medium', impactScore: 75, cost: 0.5, timeline: 4, category: 'Governance' },
        { title: 'Pemasangan Jaringan Internet', description: 'Memasang WiFi/Starlink di 5 sekolah yang belum memiliki akses internet memadai', urgency: 'High', impactScore: 78, cost: 1.5, timeline: 5, category: 'Infrastructure' },
        { title: 'Normalisasi Toilet Sekolah', description: 'Perbaikan 8 toilet rusak di 3 sekolah untuk memenuhi standar WASH', urgency: 'Medium', impactScore: 65, cost: 0.6, timeline: 3, category: 'Infrastructure' },
      ];
      for (const rec of recs) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO recommendations (id, title, description, urgency, impact_score, estimated_cost_miliar, timeline_months, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [`REC-${rec.title.replace(/[^a-zA-Z]/g, '').slice(0, 8).toUpperCase()}-${Date.now()}`, rec.title, rec.description, rec.urgency, rec.impactScore, rec.cost, rec.timeline, rec.category]
        });
      }
    }
    const existingAlerts = await db.execute('SELECT COUNT(*) as c FROM alerts');
    if (Number(existingAlerts.rows[0].c) === 0) {
      const schools = await db.execute('SELECT * FROM schools');
      const now = new Date();
      const critical = schools.rows.filter((s: any) => s.health_score < 40);
      for (let i = 0; i < Math.min(critical.length, 5); i++) {
        const s = critical[i];
        const t = new Date(now.getTime() - i * 3600000).toISOString();
        await db.execute({
          sql: `INSERT OR IGNORE INTO alerts (id, timestamp, school_name, severity, message, category) VALUES (?, ?, ?, 'CRITICAL', ?, ?)`,
          args: [`alert-crit-${s.npsn}-${Date.now()}`, t, s.name as string, `Health Score ${s.health_score}/100 — butuh intervensi segera`, 'Infrastructure']
        });
      }
      const warning = schools.rows.filter((s: any) => s.health_score >= 40 && s.health_score < 60);
      for (let i = 0; i < Math.min(warning.length, 4); i++) {
        const s = warning[i];
        const t = new Date(now.getTime() - (i + critical.length) * 7200000).toISOString();
        await db.execute({
          sql: `INSERT OR IGNORE INTO alerts (id, timestamp, school_name, severity, message, category) VALUES (?, ?, ?, 'WARNING', ?)`,
          args: [`alert-warn-${s.npsn}-${Date.now()}`, t, s.name as string, `Rasio siswa-guru perlu perhatian`, 'Staffing']
        });
      }
    }
    const r = (await db.execute('SELECT COUNT(*) as c FROM recommendations')).rows[0].c;
    const a = (await db.execute('SELECT COUNT(*) as c FROM alerts')).rows[0].c;
    res.json({ recommendations: Number(r), alerts: Number(a) });
  } catch (e: any) {
    res.json({ error: e.message });
  }
});

// Initialize DB and serve static files (for production/Vercel deployment)

const getDistPath = () => {
  const candidates: string[] = [];
  if (typeof __dirname !== 'undefined') candidates.push(__dirname);
  candidates.push(path.join(process.cwd(), 'dist'), process.cwd());
  for (const p of candidates) {
    try {
      if (fs.statSync(path.join(p, 'index.html')).isFile()) return p;
    } catch { /* try next */ }
  }
  return path.join(process.cwd(), 'dist');
};
const distPath = getDistPath();
app.use(express.static(distPath));
app.use(express.static(path.join(process.cwd(), 'public')));

// SPA fallback: return index.html for any non-API routes
app.get('*', (req, res) => {
  // Skip API routes - they should have been handled already
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// Initialize DB
(async () => {
  try {
    await initSchema();
    await seedData();
    console.log('Turso database initialized successfully.');
  } catch (err) {
    console.warn('Turso database unavailable, falling back to in-memory mock data:', (err as Error).message);
  }
})();

export default app;
