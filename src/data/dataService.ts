import { School, VillageStats, AlertMessage, Recommendation } from '../types';
import { api } from '../api';

let cachedSchools: School[] | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await api(url);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

export async function loadSchools(): Promise<School[]> {
  if (cachedSchools) return cachedSchools;
  const apiSchools = await fetchJson<any[]>('/api/schools/stats');
  if (apiSchools && apiSchools.length > 0) {
    cachedSchools = apiSchools.map(s => {
      const defaultStudents = { total: 0, male: 0, female: 0, byGrade: {}, growthTrend: [0, 0, 0, 0, 0] };
      const defaultTeachers = {
        total: 0, certified: 0, pns: 0, pppk: 0, honorer: 0,
        subjects: {}, pendingCertification: 0, retiringSoon: 0,
      };
      const defaultFacilities = {
        classroomCondition: { good: 0, lightDamage: 0, heavyDamage: 0 },
        hasLibrary: false, hasLab: false, toiletsGood: 0, toiletsDamaged: 0,
        internetSpeedMbps: 0, internetProvider: '',
      };
      return {
        npsn: s.npsn,
        name: s.name,
        level: s.level || 'SD',
        status: s.status || 'Negeri',
        village: s.village,
        accreditation: s.accreditation || 'Belum Terakreditasi',
        coordinates: { lat: s.lat || 0, lng: s.lng || 0 },
        students: s.students || defaultStudents,
        teachers: s.teachers || defaultTeachers,
        facilities: s.facilities || defaultFacilities,
        healthScore: s.healthScore ?? 50,
        riskIndicators: s.riskIndicators || {
          teacherShortage: false, studentOverload: false,
          infrastructureCritical: false, retirementExposure: false,
        },
      } as School;
    });
    return cachedSchools;
  }
  const { ALL_SCHOOLS } = await import('./mockData');
  cachedSchools = ALL_SCHOOLS;
  return cachedSchools;
}

export async function loadVillageStats(): Promise<VillageStats[]> {
  const { GET_VILLAGE_STATS } = await import('./mockData');
  return GET_VILLAGE_STATS();
}

export async function loadAlerts(): Promise<AlertMessage[]> {
  const alerts = await fetchJson<AlertMessage[]>('/api/alerts');
  if (alerts) return alerts;
  return [];
}

export async function loadRecommendations(): Promise<Recommendation[]> {
  const recs = await fetchJson<Recommendation[]>('/api/recommendations');
  if (recs) return recs;
  return [];
}

export async function loadStudentAggregates(): Promise<Record<string, { total: number; male: number; female: number; byGrade: Record<string, number> }>> {
  const agg = await fetchJson<Record<string, { total: number; male: number; female: number; byGrade: Record<string, number> }>>('/api/students/aggregate');
  return agg || {};
}

export async function loadTeacherAggregates(): Promise<Record<string, { total: number; certified: number; pns: number; pppk: number; honorer: number }>> {
  const agg = await fetchJson<Record<string, { total: number; certified: number; pns: number; pppk: number; honorer: number }>>('/api/teachers/aggregate');
  return agg || {};
}

export function clearCache() {
  cachedSchools = null;
}
