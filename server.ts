import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { ALL_SCHOOLS, GET_VILLAGE_STATS, MOCK_ALERTS, MOCK_DOCUMENTS, MOCK_RECOMMENDATIONS } from './src/data/mockData.ts';
import { SimulationScenario, SimulationResult } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let aiClient: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log('Gemini AI Client successfully initialized server-side.');
  } else {
    console.warn('GEMINI_API_KEY not set or contains placeholder. Operating in high-fidelity simulated intelligence mode.');
  }
} catch (error) {
  console.error('Error initializing Gemini AI client:', error);
}

// -----------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Predictive Engine Endpoint
app.post('/api/predict', (req, res) => {
  const { years = 1 } = req.body;
  const numYears = parseInt(years);

  // Compute projections based on current warehouse state
  const totalStudents = ALL_SCHOOLS.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.total, 0);
  const currentShortage = ALL_SCHOOLS.filter(s => s.riskIndicators.teacherShortage).reduce((sum, s) => sum + (Math.round(s.students.total / 20) - s.teachers.total), 0);

  // Growth formulas
  const projectedStudentGrowthRate = 0.024; // 2.4% compound annual student growth in subdistrict
  const projectedStudents = Math.round(totalStudents * Math.pow(1 + projectedStudentGrowthRate, numYears));
  
  // Teachers retiring over the period
  // SDN and secondary teacher retirements
  const retiringTeachersCount = Math.round(ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.retiringSoon, 0) * (numYears / 3));
  
  // Classrooms needed
  const averageClassSize = 32;
  const currentClassroomsNeeded = Math.ceil(totalStudents / averageClassSize);
  const projectedClassroomsNeeded = Math.ceil(projectedStudents / averageClassSize);
  const classroomsToBuild = Math.max(0, projectedClassroomsNeeded - currentClassroomsNeeded);

  // Shortage prediction
  const projectedTeachers = totalTeachers - retiringTeachersCount;
  const idealTeachersProjected = Math.round(projectedStudents / 20); // 1:20 ratio target
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
      criticalRehabRecommended: ALL_SCHOOLS.filter(s => s.facilities.classroomCondition.heavyDamage > 0).length
    },
    summaryText: `Within ${numYears} year(s), Kecamatan Lemahabang is projected to experience a student count increase to ${projectedStudents.toLocaleString()} (+${(projectedStudentGrowthRate * 100 * numYears).toFixed(1)}%). With ${retiringTeachersCount} teachers retiring, the teacher shortage will swell to an estimated ${projectedShortage} personnel across all levels.`
  });
});

// 2. Policy Simulation Engine
app.post('/api/simulate', async (req, res) => {
  const scenario: SimulationScenario = req.body;
  const totalStudents = ALL_SCHOOLS.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.total, 0);

  // Calculate "before" state
  const schoolsCount = ALL_SCHOOLS.length;
  const beforeShortage = ALL_SCHOOLS.filter(s => s.riskIndicators.teacherShortage).length;
  const beforeSurplus = ALL_SCHOOLS.filter(s => !s.riskIndicators.teacherShortage && s.teachers.total > (s.students.total / 15)).length;
  const beforeClassroomDeficit = ALL_SCHOOLS.reduce((sum, s) => sum + s.facilities.classroomCondition.heavyDamage, 0);
  const beforeBudget = 24.5; // Miliar Rupiah regional educational operational budget

  // Calculate "after" state based on simulated variables
  const retiringEffect = scenario.teachersRetiring || 0;
  const growthEffect = scenario.studentGrowthPercent || 0;
  const pppkEffect = scenario.newPppkAssigned || 0;
  const schoolMergeCount = scenario.schoolMergeNpsns?.length || 0;

  const afterStudents = Math.round(totalStudents * (1 + (growthEffect / 100)));
  const afterTeachers = totalTeachers - retiringEffect + pppkEffect;
  
  // Adjusted metrics
  const teacherRatioImpact = afterStudents / afterTeachers;
  const afterShortage = Math.max(0, Math.round(beforeShortage + (retiringEffect * 0.8) - (pppkEffect * 0.9) - (schoolMergeCount * 0.5)));
  const afterSurplus = Math.max(0, Math.round(beforeSurplus - (retiringEffect * 0.2) + (pppkEffect * 0.1)));
  
  const classroomReduction = schoolMergeCount > 0 ? schoolMergeCount * 2 : 0;
  const afterClassroomDeficit = Math.max(0, beforeClassroomDeficit + Math.round(growthEffect * 0.4) - classroomReduction);

  // Budget impact: Class rehab (1.2M per heavy damaged classroom), PPPK salary (0.05M per teacher), school merge (saves 0.1M per school merged)
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

  // AI-Enhanced Simulation Commentary if Gemini client is active
  if (aiClient) {
    try {
      const prompt = `You are the lead policy simulated analyzer for TIMKER BIDIK 360.
Analyze this education policy simulation for Kecamatan Lemahabang:
- Scenario: ${retiringEffect} teachers retiring, ${growthEffect}% student population growth, ${pppkEffect} new PPPK teachers assigned, ${schoolMergeCount} schools merged.
- Calculated Impact: Student-teacher ratio reaches ${(teacherRatioImpact).toFixed(1)}:1. Number of understaffed schools changes from ${beforeShortage} to ${afterShortage}. Classroom shortage becomes ${afterClassroomDeficit}. Regional budget variance is ${budgetDelta >= 0 ? '+' : ''}${budgetDelta} Miliar IDR.

Generate 3 concise bullet points in Indonesian for the executive dashboard:
1. One critical warning on the staffing pressure.
2. One spatial/geographical implication.
3. One operational budget optimization directive.
Keep each bullet point highly realistic, concise, and focused on regional educational standards (SPM).`;

      const aiResponse = await aiClient.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      if (aiResponse?.text) {
        // Split text by lines and clean
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
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const totalSchools = ALL_SCHOOLS.length;
  const criticalSchools = ALL_SCHOOLS.filter(s => s.healthScore < 40);
  const warningSchools = ALL_SCHOOLS.filter(s => s.healthScore >= 40 && s.healthScore < 60);
  const totalStudents = ALL_SCHOOLS.reduce((sum, s) => sum + s.students.total, 0);
  const totalTeachers = ALL_SCHOOLS.reduce((sum, s) => sum + s.teachers.total, 0);
  const averageHealth = Math.round(ALL_SCHOOLS.reduce((sum, s) => sum + s.healthScore, 0) / totalSchools);

  // Generate dynamic contextual prompt
  const systemInstruction = `You are the TIMKER BIDIK 360 AI Assistant (Intelligent Education Command Console) for Kecamatan Lemahabang.
You assist the Admin Kecamatan in analyzing school distributions, teachers, students, facilities, and regional policy choices.
You have access to the education data warehouse of Kecamatan Lemahabang:
- Total Schools: ${totalSchools}
- Total Students: ${totalStudents}
- Total Teachers: ${totalTeachers}
- Average School Health Score: ${averageHealth}/100
- Critical Schools Count (Health < 40): ${criticalSchools.length} (including SDN 1 Belawa, SDN 1 Wangkelang, SDN 1 Picungpugur)
- Warning Schools Count (Health 40-59): ${warningSchools.length}
- Major Villages: Lemahabang, Cipeujeuh Wetan, Cipeujeuh Kulon, Belawa, Tuk Karangsuwung, Picungpugur, Sindanglaut, Wangkelang.

Rules:
1. Always respond in Indonesian unless asked otherwise. Keep the tone highly professional, precise, scannable, and data-dense (like an enterprise business intelligence officer).
2. Ground your answers strictly on the actual schools data mentioned.
3. If asked to "Show critical schools", "Predict shortage", "Compare villages", or similar commands, provide direct scannable tables, bold statistics, and clear action items.
4. Keep the code fragments or markdown pristine.`;

  // Check if real Gemini API should be queried
  if (aiClient) {
    try {
      // Map chat history to Gemini API format if present
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
      // Fallback to rich mock assistant if API call fails
    }
  }

  // Fallback procedural chat response engine (High-fidelity mockup)
  let responseText = '';
  const msgLower = message.toLowerCase();

  if (msgLower.includes('critical') || msgLower.includes('kritis') || msgLower.includes('show critical')) {
    responseText = `Berikut adalah daftar sekolah berstatus **Kritis (Health Score < 40)** yang memerlukan intervensi mendesak di Kecamatan Lemahabang:

| NPSN | Nama Sekolah | Desa/Kelurahan | Health Score | Isu Utama |
|---|---|---|---|---|
| **20214011** | SDN 1 Wangkelang | Wangkelang | **32** | Atap ambruk di 2 blok kelas, guru PNS hanya 1 orang |
| **20214008** | SDN 1 Belawa | Belawa | **35** | Sanitasi buruk, rasio siswa-guru amblas (28:1) |
| **20214010** | SDN 1 Picungpugur | Picungpugur | **38** | 3 ruang kelas rusak berat, kekurangan guru olahraga & agama |

**Rekomendasi Tindakan:**
1. Alokasikan anggaran darurat DAK Rehabilitasi untuk **SDN 1 Wangkelang** sebesar Rp 1,2 Miliar.
2. Tempatkan minimal 2 guru PPPK kelas baru di **SDN 1 Belawa** pada kuartal depan.`;
  } else if (msgLower.includes('predict') || msgLower.includes('prediksi') || msgLower.includes('shortage')) {
    responseText = `### Hasil Analisis Prediktif AI (Tahun Ajaran 2027-2030):

Berdasarkan algoritma peramalan data demografis dan siklus karir pendidik di Kecamatan Lemahabang, berikut proyeksi 3 tahun ke depan:

1. **Krisis Pensiun Guru:**
   * Diperkirakan **52 guru PNS** akan pensiun dalam 36 bulan ke depan.
   * Tingkat eksposur tertinggi berada di desa **Lemahabang** dan **Cipeujeuh Wetan**.
   
2. **Lonjakan Populasi Siswa:**
   * Pertumbuhan siswa tertinggi diperkirakan terjadi di desa **Tuk Karangsuwung** dan **Lemahabang** rata-rata **+3.2% per tahun**.
   * Dibutuhkan tambahan **12 ruang kelas baru (RKB)** untuk menghindari sistem kelas bergantian (dual-shift).

3. **Indeks Kesenjangan Tenaga Pengajar:**
   * Defisit guru akan meningkat dari **217 guru** menjadi **285 guru** jika tidak ada penambahan PPPK/PNS baru.`;
  } else if (msgLower.includes('compare') || msgLower.includes('banding') || msgLower.includes('desa')) {
    responseText = `### Perbandingan Indikator Pendidikan Antar Desa (Kecamatan Lemahabang):

| Nama Desa | Jumlah Sekolah | Total Siswa | Total Guru | Rasio Siswa:Guru | Rata-rata Health Score | Status Defisit |
|---|---|---|---|---|---|---|
| **Lemahabang** | 4 | 1,420 | 64 | 22:1 | 82/100 | Rendah |
| **Cipeujeuh Wetan**| 3 | 560 | 20 | 28:1 | 68/100 | **Tinggi** |
| **Belawa** | 3 | 650 | 29 | 22:1 | 55/100 | **Kritis** |
| **Wangkelang** | 1 | 120 | 4 | 30:1 | 32/100 | **Kritis** |

*Desa Wangkelang dan Belawa membutuhkan perhatian khusus terkait pemenuhan Sarana Prasarana dan kuota Guru Pengganti.*`;
  } else {
    responseText = `Halo! Saya adalah **TIMKER BIDIK 360 AI Assistant**. Saya siap membantu Anda melakukan tata kelola pendidikan di tingkat Kecamatan Lemahabang secara data-driven.

Anda dapat memberikan perintah atau pertanyaan taktis seperti:
* **"Tunjukkan sekolah kritis"** — Melihat daftar sekolah dengan skor kesehatan terendah.
* **"Prediksi krisis guru tahun depan"** — Simulasi data pensiun dan kebutuhan formasi PPPK.
* **"Bandingkan desa Cipeujeuh dan Belawa"** — Komparasi spasial sebaran guru dan fasilitas.
* **"Bagaimana cara mengoptimalkan anggaran rehab kelas?"** — Rekomendasi alokasi dana operasional.

Silakan ajukan pertanyaan atau pilih menu modul di samping untuk mulai memantau!`;
  }

  res.json({
    text: responseText,
    reply: responseText,
    grounded: false
  });
});

// 4. Document OCR / Semantic Search Engine
app.get('/api/document-search', (req, res) => {
  const { q = '' } = req.query;
  const query = q.toString().toLowerCase();

  if (!query) {
    return res.json(MOCK_DOCUMENTS);
  }

  const filtered = MOCK_DOCUMENTS.filter(doc => {
    return doc.title.toLowerCase().includes(query) ||
           doc.category.toLowerCase().includes(query) ||
           (doc.schoolName && doc.schoolName.toLowerCase().includes(query)) ||
           doc.ocrContentSample.toLowerCase().includes(query);
  });

  res.json(filtered);
});

// Serve static assets in production, otherwise mount Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted successfully for full-stack integration.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving compiled static distribution from /dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TIMKER BIDIK 360 Platform listening on http://localhost:${PORT}`);
  });
}

startServer();
