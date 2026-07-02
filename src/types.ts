export interface School {
  npsn: string;
  name: string;
  level: 'SD' | 'SMP' | 'SMA' | 'SMK';
  status: 'Negeri' | 'Swasta';
  village: string;
  accreditation: 'A' | 'B' | 'C' | 'Belum Terakreditasi';
  coordinates: { lat: number; lng: number };
  students: {
    total: number;
    male: number;
    female: number;
    byGrade: Record<string, number>;
    growthTrend: number[]; // past 5 years
  };
  teachers: {
    total: number;
    certified: number;
    pns: number;
    pppk: number;
    honorer: number;
    subjects: Record<string, number>;
    pendingCertification: number;
    retiringSoon: number; // next 1-3 years
  };
  facilities: {
    classroomCondition: { good: number; lightDamage: number; heavyDamage: number };
    hasLibrary: boolean;
    hasLab: boolean;
    toiletsGood: number;
    toiletsDamaged: number;
    internetSpeedMbps: number;
    internetProvider: string;
  };
  healthScore: number; // calculated 0-100
  riskIndicators: {
    teacherShortage: boolean;
    studentOverload: boolean;
    infrastructureCritical: boolean;
    retirementExposure: boolean;
  };
}

export interface VillageStats {
  name: string;
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  teacherShortage: number;
  avgHealthScore: number;
  studentGrowthRate: number; // percentage
}

export interface SimulationScenario {
  teachersRetiring: number;
  studentGrowthPercent: number;
  newPppkAssigned: number;
  schoolMergeNpsns: string[];
}

export interface SimulationResult {
  before: {
    shortageCount: number;
    surplusCount: number;
    classroomDeficit: number;
    budgetMiliar: number;
  };
  after: {
    shortageCount: number;
    surplusCount: number;
    classroomDeficit: number;
    budgetMiliar: number;
    budgetDeltaMiliar: number;
    staffingImpactDesc: string;
    infraPressureDesc: string;
  };
  insights: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  impactScore: number; // 0-100
  estimatedCostMiliar: number;
  timelineMonths: number;
  targetSchoolNpsn?: string;
  category: 'Staffing' | 'Infrastructure' | 'Certification' | 'Governance';
  applied?: boolean;
}

export interface AlertMessage {
  id: string;
  timestamp: string; // e.g., "08:15"
  schoolName: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  category: 'Staffing' | 'Infrastructure' | 'Certification' | 'Document';
}

export interface DocumentMeta {
  id: string;
  title: string;
  category: 'Accreditation' | 'BOS' | 'Profile' | 'Facility' | 'Regulation';
  schoolName?: string;
  schoolNpsn?: string;
  lastUpdated: string;
  status: 'Complete' | 'Draft' | 'Missing' | 'Action Required';
  ocrContentSample: string;
  anomaliesDetected: string[];
}
