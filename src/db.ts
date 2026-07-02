import { createClient } from '@libsql/client';
import { School, VillageStats, Recommendation, AlertMessage, DocumentMeta, SimulationScenario, SimulationResult } from './types';
import { VILLAGES, ALL_SCHOOLS, GET_VILLAGE_STATS, MOCK_ALERTS, MOCK_DOCUMENTS, MOCK_RECOMMENDATIONS } from './data/mockData';

let db: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (db) return db;
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_TOKEN;
  if (!url || !token) return null;
  db = createClient({ url, authToken: token });
  return db;
}

export async function initSchema() {
  const client = getDb();
  if (!client) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schools (
      npsn TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      status TEXT NOT NULL,
      village TEXT NOT NULL,
      accreditation TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      students TEXT NOT NULL,
      teachers TEXT NOT NULL,
      facilities TEXT NOT NULL,
      health_score INTEGER NOT NULL,
      risk_indicators TEXT NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      school_name TEXT,
      school_npsn TEXT,
      last_updated TEXT NOT NULL,
      status TEXT NOT NULL,
      ocr_content_sample TEXT NOT NULL DEFAULT '',
      anomalies TEXT NOT NULL DEFAULT '[]'
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL,
      impact_score INTEGER NOT NULL,
      estimated_cost_miliar REAL NOT NULL,
      timeline_months INTEGER NOT NULL,
      target_school_npsn TEXT,
      category TEXT NOT NULL,
      applied INTEGER NOT NULL DEFAULT 0
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      school_name TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL
    )
  `);
}

export async function seedData() {
  const client = getDb();
  if (!client) return;

  const existing = await client.execute('SELECT COUNT(*) as count FROM schools');
  if (Number(existing.rows[0].count) > 0) return;

  for (const school of ALL_SCHOOLS) {
    await client.execute({
      sql: `INSERT INTO schools (npsn, name, level, status, village, accreditation, lat, lng, students, teachers, facilities, health_score, risk_indicators)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        school.npsn, school.name, school.level, school.status, school.village,
        school.accreditation, school.coordinates.lat, school.coordinates.lng,
        JSON.stringify(school.students), JSON.stringify(school.teachers),
        JSON.stringify(school.facilities), school.healthScore,
        JSON.stringify(school.riskIndicators)
      ]
    });
  }

  for (const doc of MOCK_DOCUMENTS) {
    await client.execute({
      sql: `INSERT INTO documents (id, title, category, school_name, school_npsn, last_updated, status, ocr_content_sample, anomalies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        doc.id, doc.title, doc.category, doc.schoolName ?? null,
        doc.schoolNpsn ?? null, doc.lastUpdated, doc.status,
        doc.ocrContentSample, JSON.stringify(doc.anomaliesDetected)
      ]
    });
  }

  for (const rec of MOCK_RECOMMENDATIONS) {
    await client.execute({
      sql: `INSERT INTO recommendations (id, title, description, urgency, impact_score, estimated_cost_miliar, timeline_months, target_school_npsn, category, applied)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        rec.id, rec.title, rec.description, rec.urgency, rec.impactScore,
        rec.estimatedCostMiliar, rec.timelineMonths, rec.targetSchoolNpsn ?? null,
        rec.category, rec.applied ? 1 : 0
      ]
    });
  }

  for (const alert of MOCK_ALERTS) {
    await client.execute({
      sql: `INSERT INTO alerts (id, timestamp, school_name, severity, message, category)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [alert.id, alert.timestamp, alert.schoolName, alert.severity, alert.message, alert.category]
    });
  }
}

export async function getAllSchools(): Promise<School[]> {
  const client = getDb();
  if (!client) return ALL_SCHOOLS;
  const result = await client.execute('SELECT * FROM schools');
  return result.rows.map(row => ({
    npsn: row.npsn as string,
    name: row.name as string,
    level: row.level as School['level'],
    status: row.status as School['status'],
    village: row.village as string,
    accreditation: row.accreditation as School['accreditation'],
    coordinates: { lat: row.lat as number, lng: row.lng as number },
    students: JSON.parse(row.students as string),
    teachers: JSON.parse(row.teachers as string),
    facilities: JSON.parse(row.facilities as string),
    healthScore: row.health_score as number,
    riskIndicators: JSON.parse(row.risk_indicators as string),
  }));
}

export async function getVillageStats(): Promise<VillageStats[]> {
  return GET_VILLAGE_STATS();
}

export async function getAlerts(): Promise<AlertMessage[]> {
  const client = getDb();
  if (!client) return MOCK_ALERTS;
  const result = await client.execute('SELECT * FROM alerts ORDER BY timestamp DESC');
  return result.rows.map(row => ({
    id: row.id as string,
    timestamp: row.timestamp as string,
    schoolName: row.school_name as string,
    severity: row.severity as AlertMessage['severity'],
    message: row.message as string,
    category: row.category as AlertMessage['category'],
  }));
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const client = getDb();
  if (!client) return MOCK_RECOMMENDATIONS;
  const result = await client.execute('SELECT * FROM recommendations ORDER BY impact_score DESC');
  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    urgency: row.urgency as Recommendation['urgency'],
    impactScore: row.impact_score as number,
    estimatedCostMiliar: row.estimated_cost_miliar as number,
    timelineMonths: row.timeline_months as number,
    targetSchoolNpsn: (row.target_school_npsn as string) ?? undefined,
    category: row.category as Recommendation['category'],
    applied: (row.applied as number) === 1,
  }));
}

export async function getDocuments(): Promise<DocumentMeta[]> {
  const client = getDb();
  if (!client) return MOCK_DOCUMENTS;
  const result = await client.execute('SELECT * FROM documents');
  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    category: row.category as DocumentMeta['category'],
    schoolName: (row.school_name as string) ?? undefined,
    schoolNpsn: (row.school_npsn as string) ?? undefined,
    lastUpdated: row.last_updated as string,
    status: row.status as DocumentMeta['status'],
    ocrContentSample: row.ocr_content_sample as string,
    anomaliesDetected: JSON.parse(row.anomalies as string),
  }));
}

export async function searchDocuments(query: string): Promise<DocumentMeta[]> {
  const docs = await getDocuments();
  const q = query.toLowerCase();
  return docs.filter(doc =>
    doc.title.toLowerCase().includes(q) ||
    doc.category.toLowerCase().includes(q) ||
    (doc.schoolName && doc.schoolName.toLowerCase().includes(q)) ||
    doc.ocrContentSample.toLowerCase().includes(q)
  );
}

export { ALL_SCHOOLS as FALLBACK_SCHOOLS };
