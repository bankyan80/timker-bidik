import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { SimulationScenario, SimulationResult } from './types';
import { initSchema, seedData, getAllSchools, getAlerts, getRecommendations, getDocuments, searchDocuments, getEmployees, getEmployeesBySchool, getEmployeeDocuments, getStudentAggregates, getTeacherAggregates, getEmployeeCount, insertEmployee, updateEmployee, deleteEmployee, upsertEmployeeDocument, verifyEmployeeDocument, getStudents, getStudentsBySchool, getStudentsByRombel, getRombelList, insertStudent, updateStudent, deleteStudent, getCalendarEvents, getCalendarEventById, insertCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getEmployeePeriods, insertEmployeePeriod, updateEmployeePeriod, deleteEmployeePeriod } from './db';

const app = express();
app.use(express.json({ limit: '10mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'timker-bidik-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'staff_kecamatan' | 'operator_sekolah';
  schoolNpsn?: string;
  schoolName?: string;
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

// ── Auth endpoints ──
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  // Admin
  if (username === 'Admin' && password === 'Timker456') {
    const user: AuthUser = { id: '1', username: 'Admin', role: 'admin' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, user });
  }

  // Staf Kecamatan
  if (username === 'Admin2' && password === 'Timker123') {
    const user: AuthUser = { id: '2', username: 'Admin2', role: 'staff_kecamatan' };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, user });
  }

  // Operator Sekolah — username = NPSN, password = "sp_" + NPSN
  const expectedOpPassword = 'sp_' + username;
  if (password === expectedOpPassword) {
    const schools = await getAllSchools();
    const school = schools.find(s => s.npsn === username);
    if (school) {
      const user: AuthUser = {
        id: `op-${username}`,
        username: username,
        role: 'operator_sekolah',
        schoolNpsn: school.npsn,
        schoolName: school.name,
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user });
    }
    return res.status(401).json({ error: 'NPSN tidak ditemukan' });
  }

  return res.status(401).json({ error: 'Username atau password salah' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
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
  const numYears = parseInt(years);
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

  const schools = await getAllSchools();
  const totalSchools = schools.length;
  const criticalSchools = schools.filter(s => s.healthScore < 40);
  const warningSchools = schools.filter(s => s.healthScore >= 40 && s.healthScore < 60);
  const totalStudents = schools.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = schools.reduce((sum, s) => sum + s.teachers.total, 0);
  const averageHealth = Math.round(schools.reduce((sum, s) => sum + s.healthScore, 0) / totalSchools);

  const systemInstruction = `Kamu adalah asisten TIMKER BIDIK 360 untuk Kecamatan Lemahabang, Kabupaten Cirebon.

=== SUMBER DATA ===
Semua data berasal dari:
- Sinkronisasi Dapodik (Data Pokok Pendidikan) via database Turso
- Data pegawai dari arsip kepegawaian kecamatan (282 pegawai PNS/PPPK/Honorer)
- Data siswa dari Rombel per sekolah (SD)
- Dokumen arsip digital (841 dokumen: SK, ijazah, sertifikat, KTP, dll)
- Data sekolah dari profil Satuan Pendidikan (22 SD Negeri)

=== CAKUPAN DATA ===
- Total Sekolah Negeri: ${totalSchools} SD
- Total Siswa: ${totalStudents}
- Total Guru/Pegawai: ${totalTeachers} orang
- Rata-rata Health Score: ${averageHealth}/100
- Sekolah Kritis (Health Score < 40): ${criticalSchools.length}
- Sekolah Waspada (Health Score 40-59): ${warningSchools.length}
- Data pegawai mencakup: nama, NIP, NIK, golongan, jabatan, status kepegawaian (PNS/PPPK/Honorer), pendidikan, sertifikasi
- Setiap pegawai memiliki dokumen arsip yang sudah diverifikasi
- Desa: Lemahabang, Cipeujeuh Wetan, Cipeujeuh Kulon, Belawa, Tuk Karangsuwung, Picungpugur, Sindanglaut, Wangkelang, Asem, Sigong, Sarajaya, Leuwidingding.

=== ATURAN RESPON ===
1. Jawab dalam bahasa Indonesia yang santai dan alami — seperti ngobrol dengan rekan kerja. Jangan kaku.
2. Kalau ditanya **sumber data** (misal "data siswa dari mana?"), jelaskan bahwa data bersumber dari Dapodik dan database internal kecamatan yang disinkronkan secara berkala.
3. Kalau ditanya tentang **data spesifik yang tidak tersedia** (misal data siswa per individu), jangan mengarang — bilang saja datanya tidak tersedia atau terbatas, lalu tawarkan data lain yang relevan.
4. Ground jawaban pada data yang disebutkan di atas. Jangan mengada-ada.
5. Kalau diminta menampilkan data, gunakan format tabel atau poin yang rapi.
6. Jangan lebay. Cukup informatif, jelas, dan membantu.`;

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
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const employees = await getEmployeesBySchool(schoolScope);
    return res.json(employees);
  }
  const employees = await getEmployees();
  res.json(employees);
});

// 🚀 Batch endpoint: returns employees + their documents in 2 queries (not N+1)
app.get('/api/employees-with-docs', authenticateToken, async (req, res) => {
  const { getDb } = await import('./db');
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
  const docs = await getEmployeeDocuments(req.params.id);
  res.json(docs);
});

// Employee CRUD
app.post('/api/employees', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope && req.body.sekolah_id !== schoolScope) {
    return res.status(403).json({ error: 'Forbidden: you can only add employees to your own school' });
  }
  const emp = await insertEmployee(req.body);
  if (!emp) return res.status(400).json({ error: 'Failed to create employee' });
  res.status(201).json(emp);
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const { getDb } = await import('./db');
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
  res.json({ success: true });
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const { getDb } = await import('./db');
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
  res.status(201).json(result);
});

app.put('/api/employees/:id/periods/:periodId', authenticateToken, async (req, res) => {
  const ok = await updateEmployeePeriod(req.params.periodId, req.body);
  if (!ok) return res.status(400).json({ error: 'Failed to update period' });
  res.json({ success: true });
});

app.delete('/api/employees/:id/periods/:periodId', authenticateToken, async (req, res) => {
  const ok = await deleteEmployeePeriod(req.params.periodId);
  if (!ok) return res.status(400).json({ error: 'Failed to delete period' });
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
  res.status(201).json({ success: true });
});

app.post('/api/documents/:id/verify', authenticateToken, async (req, res) => {
  const { getDb } = await import('./db');
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
  res.json({ success: true });
});

// Upload file to Google Drive
app.post('/api/upload-file', authenticateToken, async (req, res) => {
  const { file, fileName, mimeType, employeeId, schoolName, jenisDokumen, kategori } = req.body;
  if (!file || !fileName || !employeeId || !schoolName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { uploadToDrive } = await import('./drive');
    const { getDb } = await import('./db');
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'DB not available' });

    // Look up employee to get sekolah_id
    const emp = await db.execute('SELECT id, sekolah_id FROM employees WHERE id = ?', [employeeId]);
    if (emp.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    const sekolahId = (emp.rows[0] as any).sekolah_id as string;

    // Operator can only upload for employees in their own school
    const schoolScope = getSchoolScope(req);
    if (schoolScope && sekolahId !== schoolScope) {
      return res.status(403).json({ error: 'Forbidden: you can only upload for employees in your own school' });
    }

    const buffer = Buffer.from(file, 'base64');
    const { fileId, driveUrl } = await uploadToDrive(buffer, fileName, mimeType, schoolName, fileName.split(' - ')[0] || schoolName);

    const { upsertEmployeeDocument } = await import('./db');
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
    status: s.status === 'NEGERI' ? 'Negeri' : s.status === 'SWASTA' ? 'Swasta' : s.status,
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
    status: s.status === 'NEGERI' ? 'Negeri' : s.status === 'SWASTA' ? 'Swasta' : s.status,
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
  const { q = '' } = req.query;
  const query = q.toString();

  if (!query) {
    return res.json(await getDocuments());
  }

  // Search both main documents table and employee_documents
  const docs = await searchDocuments(query);

  // Also search employee_documents
  const { getDb } = await import('./db');
  const db = getDb();
  if (db) {
    const q = query.toLowerCase();
    const schoolScope = getSchoolScope(req);
    let empDocs;
    if (schoolScope) {
      empDocs = await db.execute({
        sql: `SELECT ed.*, e.nama as employee_name, e.sekolah_id, sk.name as school_name
              FROM employee_documents ed
              LEFT JOIN employees e ON e.id = ed.employee_id
              LEFT JOIN schools sk ON sk.npsn = e.sekolah_id
              WHERE (LOWER(ed.nama_file) LIKE ? OR LOWER(ed.jenis_dokumen) LIKE ? OR LOWER(ed.kategori) LIKE ? OR LOWER(e.nama) LIKE ?)
                AND e.sekolah_id = ?
              LIMIT 50`,
        args: [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, schoolScope]
      });
    } else {
      empDocs = await db.execute({
        sql: `SELECT ed.*, e.nama as employee_name, e.sekolah_id, sk.name as school_name
              FROM employee_documents ed
              LEFT JOIN employees e ON e.id = ed.employee_id
              LEFT JOIN schools sk ON sk.npsn = e.sekolah_id
              WHERE LOWER(ed.nama_file) LIKE ? OR LOWER(ed.jenis_dokumen) LIKE ? OR LOWER(ed.kategori) LIKE ? OR LOWER(e.nama) LIKE ?
              LIMIT 50`,
        args: [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
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

  res.json(docs);
});

// 7. Student API
app.get('/api/students', authenticateToken, async (req, res) => {
  const { school, rombel } = req.query;
  const schoolScope = getSchoolScope(req);
  // If operator and no school param, force their school
  const effectiveSchool = schoolScope || (school as string);
  if (!effectiveSchool && schoolScope) {
    return res.json([]);
  }
  let students;
  if (rombel && effectiveSchool) students = await getStudentsByRombel(effectiveSchool, rombel as string);
  else if (effectiveSchool) students = await getStudentsBySchool(effectiveSchool);
  else students = await getStudents();
  res.json(students);
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
  const stu = await insertStudent(req.body);
  if (!stu) return res.status(400).json({ error: 'Gagal menambah siswa' });
  res.status(201).json(stu);
});

app.put('/api/students/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const { getDb } = await import('./db');
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
  res.json({ success: true });
});

app.delete('/api/students/:id', authenticateToken, async (req, res) => {
  const schoolScope = getSchoolScope(req);
  if (schoolScope) {
    const { getDb } = await import('./db');
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
  res.json({ success: true });
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
  const ev = await insertCalendarEvent(req.body);
  if (!ev) return res.status(400).json({ error: 'Gagal menambah event' });
  res.status(201).json(ev);
});

app.put('/api/calendar/:id', authenticateToken, async (req, res) => {
  const ok = await updateCalendarEvent(req.params.id, req.body);
  if (!ok) return res.status(400).json({ error: 'Gagal mengupdate event' });
  res.json({ success: true });
});

app.delete('/api/calendar/:id', authenticateToken, async (req, res) => {
  const ok = await deleteCalendarEvent(req.params.id);
  if (!ok) return res.status(400).json({ error: 'Gagal menghapus event' });
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

app.post('/api/recommendations/:id/apply', authenticateToken, async (req, res) => {
  const { getDb } = await import('./db');
  const db = getDb();
  if (!db) return res.status(503).json({ error: 'Database unavailable' });
  try {
    await db.execute({
      sql: 'UPDATE recommendations SET applied = 1 WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to apply recommendation' });
  }
});

// Seed missing data (alerts, recommendations)
app.post('/api/debug/seed', authenticateToken, requireRole('admin'), async (req, res) => {
  const { getDb } = await import('./db');
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
