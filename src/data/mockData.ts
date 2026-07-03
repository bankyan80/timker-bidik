import { School, VillageStats } from '../types';

export const VILLAGES = [
  'Lemahabang',
  'Lemahabang Kulon',
  'Cipeujeuh Wetan',
  'Cipeujeuh Kulon',
  'Belawa',
  'Tuk Karangsuwung',
  'Picungpugur',
  'Sindanglaut',
  'Wangkelang',
  'Asem',
  'Sigong',
  'Sarajaya',
  'Leuwidingding'
];

export const REAL_COORDINATES_DMS: Record<string, { latDms: string; lngDms: string }> = {
  '20215287': { latDms: '6°49\'54"S', lngDms: '108°36\'54"E' },
  '20215230': { latDms: '6°49\'51"S', lngDms: '108°35\'8"E' },
  '20215216': { latDms: '6°50\'40"S', lngDms: '108°37\'12"E' },
  '20214570': { latDms: '6°50\'8"S', lngDms: '108°38\'23"E' },
  '20214479': { latDms: '6°49\'38"S', lngDms: '108°37\'14"E' },
  '20214656': { latDms: '6°49\'53"S', lngDms: '108°37\'41"E' },
  '20214726': { latDms: '6°50\'19"S', lngDms: '108°38\'37"E' },
  '20215464': { latDms: '6°50\'10"S', lngDms: '108°37\'13"E' },
  '20215161': { latDms: '6°49\'28"S', lngDms: '108°37\'43"E' },
  '20215164': { latDms: '6°50\'37"S', lngDms: '108°37\'28"E' },
  '20215221': { latDms: '6°49\'37"S', lngDms: '108°37\'42"E' },
  '20215381': { latDms: '6°49\'55"S', lngDms: '108°36\'25"E' },
  '20215380': { latDms: '6°49\'50"S', lngDms: '108°37\'32"E' },
  '20215286': { latDms: '6°49\'50"S', lngDms: '108°37\'16"E' },
  '20215506': { latDms: '6°50\'15"S', lngDms: '108°38\'23"E' },
  '20215517': { latDms: '6°50\'36"S', lngDms: '108°38\'35"E' },
  '20215564': { latDms: '6°50\'8"S', lngDms: '108°34\'56"E' },
  '20246442': { latDms: '06°51\'05.6"S', lngDms: '108°37\'31.6"E' },
  '20246445': { latDms: '6°50\'6"S', lngDms: '108°37\'48"E' },
  '20215162': { latDms: '6°49\'55"S', lngDms: '108°37\'46"E' },
  '20215584': { latDms: '6°50\'2"S', lngDms: '108°34\'29"E' },
  '20244513': { latDms: '6.8272064S', lngDms: '108.647168E' },
  '20270605': { latDms: '6°49\'47"S', lngDms: '108°37\'10"E' }
};

export function getSchoolDMS(school: School | { npsn: string; coordinates: { lat: number; lng: number } }): { latDms: string; lngDms: string } {
  if (REAL_COORDINATES_DMS[school.npsn]) {
    return REAL_COORDINATES_DMS[school.npsn];
  }
  const toDMS = (val: number, isLat: boolean) => {
    const dir = isLat ? (val < 0 ? 'S' : 'N') : (val < 0 ? 'W' : 'E');
    const absVal = Math.abs(val);
    const deg = Math.floor(absVal);
    const min = Math.floor((absVal - deg) * 60);
    const sec = Math.round(((absVal - deg) * 60 - min) * 60 * 10) / 10;
    return `${deg}°${min}'${sec}"${dir}`;
  };
  return {
    latDms: toDMS(school.coordinates.lat, true),
    lngDms: toDMS(school.coordinates.lng, false)
  };
}

// Helper to generate coordinates in Lemahabang area (lat: -6.83, lng: 108.62)
const getVillageCenter = (village: string): { lat: number; lng: number } => {
  switch (village) {
    case 'Lemahabang': return { lat: -6.832, lng: 108.618 };
    case 'Lemahabang Kulon': return { lat: -6.824, lng: 108.628 };
    case 'Cipeujeuh Wetan': return { lat: -6.825, lng: 108.610 };
    case 'Cipeujeuh Kulon': return { lat: -6.828, lng: 108.602 };
    case 'Belawa': return { lat: -6.852, lng: 108.612 };
    case 'Tuk Karangsuwung': return { lat: -6.818, lng: 108.625 };
    case 'Picungpugur': return { lat: -6.842, lng: 108.632 };
    case 'Sindanglaut': return { lat: -6.838, lng: 108.605 };
    case 'Wangkelang': return { lat: -6.862, lng: 108.635 };
    case 'Asem': return { lat: -6.844, lng: 108.620 };
    case 'Sigong': return { lat: -6.835, lng: 108.639 };
    case 'Sarajaya': return { lat: -6.838, lng: 108.643 };
    case 'Leuwidingding': return { lat: -6.843, lng: 108.624 };
    default: return { lat: -6.830, lng: 108.620 };
  }
};

// Generate highly detailed schools matching coordinates uploaded by the user
const baseSchools: Omit<School, 'healthScore' | 'riskIndicators'>[] = [
  // ── TK NEGERI ──
  {
    npsn: '20270605',
    name: 'TK NEGERI LEMAHABANG',
    level: 'TK',
    status: 'Negeri',
    village: 'Lemahabang',
    accreditation: 'B',
    coordinates: { lat: -6.8297, lng: 108.6194 },
    students: {
      total: 90, male: 45, female: 45,
      byGrade: { 'Kelompok A': 45, 'Kelompok B': 45 },
      growthTrend: [80, 85, 88, 90, 90]
    },
    teachers: {
      total: 6, certified: 3, pns: 2, pppk: 2, honorer: 2,
      subjects: { 'Guru TK': 4, 'Agama': 1, 'Seni': 1 },
      pendingCertification: 2, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 2, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: false, hasLab: false,
      toiletsGood: 2, toiletsDamaged: 0,
      internetSpeedMbps: 10, internetProvider: 'Telkom'
    }
  },
  // ── SD NEGERI (existing) ──
  {
    npsn: '20215287',
    name: 'SD NEGERI 1 CIPEUJEUH KULON',
    level: 'SD',
    status: 'Negeri',
    village: 'Cipeujeuh Kulon',
    accreditation: 'A',
    coordinates: { lat: -6.831667, lng: 108.615000 },
    students: {
      total: 210, male: 105, female: 105,
      byGrade: { 'Kelas 1': 35, 'Kelas 2': 34, 'Kelas 3': 36, 'Kelas 4': 35, 'Kelas 5': 35, 'Kelas 6': 35 },
      growthTrend: [190, 195, 200, 205, 210]
    },
    teachers: {
      total: 9, certified: 6, pns: 5, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 1, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 5, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 3, toiletsDamaged: 1,
      internetSpeedMbps: 30, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215230',
    name: 'SD NEGERI 1 BELAWA',
    level: 'SD',
    status: 'Negeri',
    village: 'Belawa',
    accreditation: 'B',
    coordinates: { lat: -6.830833, lng: 108.585556 },
    students: {
      total: 180, male: 92, female: 88,
      byGrade: { 'Kelas 1': 30, 'Kelas 2': 30, 'Kelas 3': 30, 'Kelas 4': 30, 'Kelas 5': 30, 'Kelas 6': 30 },
      growthTrend: [160, 165, 170, 175, 180]
    },
    teachers: {
      total: 6, certified: 3, pns: 3, pppk: 1, honorer: 2,
      subjects: { 'Guru Kelas': 4, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 2, lightDamage: 3, heavyDamage: 1 },
      hasLibrary: false, hasLab: false, toiletsGood: 1, toiletsDamaged: 2,
      internetSpeedMbps: 15, internetProvider: 'Telkomsel Orbit'
    }
  },
  {
    npsn: '20215216',
    name: 'SD NEGERI 1 ASEM',
    level: 'SD',
    status: 'Negeri',
    village: 'Asem',
    accreditation: 'B',
    coordinates: { lat: -6.844444, lng: 108.620000 },
    students: {
      total: 195, male: 98, female: 97,
      byGrade: { 'Kelas 1': 32, 'Kelas 2': 33, 'Kelas 3': 32, 'Kelas 4': 33, 'Kelas 5': 33, 'Kelas 6': 32 },
      growthTrend: [180, 185, 190, 192, 195]
    },
    teachers: {
      total: 8, certified: 4, pns: 4, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 1, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 4, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 20, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20214570',
    name: 'SD NEGERI 3 SIGONG',
    level: 'SD',
    status: 'Negeri',
    village: 'Sigong',
    accreditation: 'B',
    coordinates: { lat: -6.835556, lng: 108.639722 },
    students: {
      total: 160, male: 82, female: 78,
      byGrade: { 'Kelas 1': 27, 'Kelas 2': 26, 'Kelas 3': 27, 'Kelas 4': 26, 'Kelas 5': 27, 'Kelas 6': 27 },
      growthTrend: [150, 152, 155, 158, 160]
    },
    teachers: {
      total: 7, certified: 3, pns: 3, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 5, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 2, lightDamage: 4, heavyDamage: 0 },
      hasLibrary: false, hasLab: false, toiletsGood: 1, toiletsDamaged: 1,
      internetSpeedMbps: 10, internetProvider: 'Telkomsel Flash'
    }
  },
  {
    npsn: '20214479',
    name: 'SD NEGERI 3 CIPEUJEUH WETAN',
    level: 'SD',
    status: 'Negeri',
    village: 'Cipeujeuh Wetan',
    accreditation: 'A',
    coordinates: { lat: -6.827222, lng: 108.620556 },
    students: {
      total: 240, male: 122, female: 118,
      byGrade: { 'Kelas 1': 40, 'Kelas 2': 40, 'Kelas 3': 40, 'Kelas 4': 40, 'Kelas 5': 40, 'Kelas 6': 40 },
      growthTrend: [210, 220, 225, 230, 240]
    },
    teachers: {
      total: 10, certified: 7, pns: 6, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 7, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 6, lightDamage: 0, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 4, toiletsDamaged: 0,
      internetSpeedMbps: 40, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20214656',
    name: 'SD NEGERI 2 LEMAHABANG',
    level: 'SD',
    status: 'Negeri',
    village: 'Lemahabang',
    accreditation: 'A',
    coordinates: { lat: -6.831389, lng: 108.628056 },
    students: {
      total: 280, male: 142, female: 138,
      byGrade: { 'Kelas 1': 47, 'Kelas 2': 46, 'Kelas 3': 47, 'Kelas 4': 46, 'Kelas 5': 47, 'Kelas 6': 47 },
      growthTrend: [260, 265, 270, 275, 280]
    },
    teachers: {
      total: 11, certified: 8, pns: 7, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 8, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 1, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 7, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 4, toiletsDamaged: 1,
      internetSpeedMbps: 50, internetProvider: 'Biznet'
    }
  },
  {
    npsn: '20214726',
    name: 'SD NEGERI 2 SARAJAYA',
    level: 'SD',
    status: 'Negeri',
    village: 'Sarajaya',
    accreditation: 'B',
    coordinates: { lat: -6.838611, lng: 108.643611 },
    students: {
      total: 175, male: 90, female: 85,
      byGrade: { 'Kelas 1': 29, 'Kelas 2': 29, 'Kelas 3': 30, 'Kelas 4': 29, 'Kelas 5': 29, 'Kelas 6': 29 },
      growthTrend: [160, 162, 168, 172, 175]
    },
    teachers: {
      total: 7, certified: 3, pns: 3, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 5, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 3, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 3, lightDamage: 3, heavyDamage: 0 },
      hasLibrary: false, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 10, internetProvider: 'Telkomsel Orbit'
    }
  },
  {
    npsn: '20215464',
    name: 'SD NEGERI 1 SINDANGLAUT',
    level: 'SD',
    status: 'Negeri',
    village: 'Sindanglaut',
    accreditation: 'A',
    coordinates: { lat: -6.836111, lng: 108.620278 },
    students: {
      total: 310, male: 158, female: 152,
      byGrade: { 'Kelas 1': 52, 'Kelas 2': 51, 'Kelas 3': 52, 'Kelas 4': 51, 'Kelas 5': 52, 'Kelas 6': 52 },
      growthTrend: [280, 290, 300, 305, 310]
    },
    teachers: {
      total: 13, certified: 10, pns: 9, pppk: 3, honorer: 1,
      subjects: { 'Guru Kelas': 9, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1, 'Seni': 1 },
      pendingCertification: 1, retiringSoon: 3
    },
    facilities: {
      classroomCondition: { good: 8, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 5, toiletsDamaged: 1,
      internetSpeedMbps: 50, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215161',
    name: 'SD NEGERI 1 LEMAHABANG KULON',
    level: 'SD',
    status: 'Negeri',
    village: 'Lemahabang Kulon',
    accreditation: 'A',
    coordinates: { lat: -6.824444, lng: 108.628611 },
    students: {
      total: 260, male: 133, female: 127,
      byGrade: { 'Kelas 1': 43, 'Kelas 2': 43, 'Kelas 3': 44, 'Kelas 4': 43, 'Kelas 5': 44, 'Kelas 6': 43 },
      growthTrend: [230, 240, 245, 250, 260]
    },
    teachers: {
      total: 11, certified: 8, pns: 7, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 8, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 6, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 3, toiletsDamaged: 1,
      internetSpeedMbps: 30, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215164',
    name: 'SD NEGERI 1 LEUWIDINGDING',
    level: 'SD',
    status: 'Negeri',
    village: 'Leuwidingding',
    accreditation: 'B',
    coordinates: { lat: -6.843611, lng: 108.624444 },
    students: {
      total: 185, male: 95, female: 90,
      byGrade: { 'Kelas 1': 31, 'Kelas 2': 31, 'Kelas 3': 31, 'Kelas 4': 30, 'Kelas 5': 31, 'Kelas 6': 31 },
      growthTrend: [170, 175, 180, 182, 185]
    },
    teachers: {
      total: 7, certified: 3, pns: 3, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 5, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 3, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 3, lightDamage: 3, heavyDamage: 0 },
      hasLibrary: false, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 15, internetProvider: 'Telkomsel Flash'
    }
  },
  {
    npsn: '20215221',
    name: 'SD NEGERI 3 LEMAHABANG',
    level: 'SD',
    status: 'Negeri',
    village: 'Lemahabang',
    accreditation: 'A',
    coordinates: { lat: -6.826944, lng: 108.628333 },
    students: {
      total: 420, male: 220, female: 200,
      byGrade: { 'Kelas 1': 70, 'Kelas 2': 70, 'Kelas 3': 70, 'Kelas 4': 70, 'Kelas 5': 70, 'Kelas 6': 70 },
      growthTrend: [350, 370, 390, 410, 420]
    },
    teachers: {
      total: 18, certified: 12, pns: 10, pppk: 5, honorer: 3,
      subjects: { 'Guru Kelas': 12, 'Agama Islam': 3, 'PJOK': 2, 'Bahasa Inggris': 1 },
      pendingCertification: 4, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 12, lightDamage: 0, heavyDamage: 0 },
      hasLibrary: true, hasLab: true, toiletsGood: 8, toiletsDamaged: 0,
      internetSpeedMbps: 100, internetProvider: 'Biznet'
    }
  },
  {
    npsn: '20215381',
    name: 'SD NEGERI 2 CIPEUJEUH KULON',
    level: 'SD',
    status: 'Negeri',
    village: 'Cipeujeuh Kulon',
    accreditation: 'B',
    coordinates: { lat: -6.831944, lng: 108.606944 },
    students: {
      total: 170, male: 87, female: 83,
      byGrade: { 'Kelas 1': 28, 'Kelas 2': 28, 'Kelas 3': 29, 'Kelas 4': 28, 'Kelas 5': 29, 'Kelas 6': 28 },
      growthTrend: [155, 160, 162, 165, 170]
    },
    teachers: {
      total: 7, certified: 4, pns: 4, pppk: 1, honorer: 2,
      subjects: { 'Guru Kelas': 5, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 1, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 4, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 20, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215380',
    name: 'SD NEGERI 2 CIPEUJEUH WETAN',
    level: 'SD',
    status: 'Negeri',
    village: 'Cipeujeuh Wetan',
    accreditation: 'B',
    coordinates: { lat: -6.830556, lng: 108.625556 },
    students: {
      total: 190, male: 96, female: 94,
      byGrade: { 'Kelas 1': 32, 'Kelas 2': 32, 'Kelas 3': 32, 'Kelas 4': 31, 'Kelas 5': 32, 'Kelas 6': 31 },
      growthTrend: [175, 180, 185, 188, 190]
    },
    teachers: {
      total: 8, certified: 5, pns: 4, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 5, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: false, hasLab: false, toiletsGood: 3, toiletsDamaged: 1,
      internetSpeedMbps: 20, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215286',
    name: 'SD NEGERI 1 CIPEUJEUH WETAN',
    level: 'SD',
    status: 'Negeri',
    village: 'Cipeujeuh Wetan',
    accreditation: 'A',
    coordinates: { lat: -6.830556, lng: 108.621111 },
    students: {
      total: 250, male: 128, female: 122,
      byGrade: { 'Kelas 1': 42, 'Kelas 2': 41, 'Kelas 3': 42, 'Kelas 4': 41, 'Kelas 5': 42, 'Kelas 6': 42 },
      growthTrend: [220, 230, 240, 245, 250]
    },
    teachers: {
      total: 11, certified: 7, pns: 6, pppk: 2, honorer: 3,
      subjects: { 'Guru Kelas': 8, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 6, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 4, toiletsDamaged: 1,
      internetSpeedMbps: 30, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215506',
    name: 'SD NEGERI 1 SIGONG',
    level: 'SD',
    status: 'Negeri',
    village: 'Sigong',
    accreditation: 'B',
    coordinates: { lat: -6.837500, lng: 108.639722 },
    students: {
      total: 185, male: 95, female: 90,
      byGrade: { 'Kelas 1': 31, 'Kelas 2': 31, 'Kelas 3': 31, 'Kelas 4': 30, 'Kelas 5': 31, 'Kelas 6': 31 },
      growthTrend: [165, 170, 175, 180, 185]
    },
    teachers: {
      total: 8, certified: 4, pns: 4, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 3, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 4, lightDamage: 2, heavyDamage: 1 },
      hasLibrary: true, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 15, internetProvider: 'Telkomsel Flash'
    }
  },
  {
    npsn: '20215517',
    name: 'SD NEGERI 1 SARAJAYA',
    level: 'SD',
    status: 'Negeri',
    village: 'Sarajaya',
    accreditation: 'B',
    coordinates: { lat: -6.843333, lng: 108.643056 },
    students: {
      total: 190, male: 97, female: 93,
      byGrade: { 'Kelas 1': 32, 'Kelas 2': 31, 'Kelas 3': 32, 'Kelas 4': 31, 'Kelas 5': 32, 'Kelas 6': 32 },
      growthTrend: [170, 175, 180, 185, 190]
    },
    teachers: {
      total: 8, certified: 4, pns: 4, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 3, lightDamage: 4, heavyDamage: 1 },
      hasLibrary: false, hasLab: false, toiletsGood: 1, toiletsDamaged: 2,
      internetSpeedMbps: 10, internetProvider: 'Telkomsel Flash'
    }
  },
  {
    npsn: '20215564',
    name: 'SD NEGERI 2 BELAWA',
    level: 'SD',
    status: 'Negeri',
    village: 'Belawa',
    accreditation: 'C',
    coordinates: { lat: -6.835556, lng: 108.582222 },
    students: {
      total: 135, male: 69, female: 66,
      byGrade: { 'Kelas 1': 23, 'Kelas 2': 22, 'Kelas 3': 23, 'Kelas 4': 22, 'Kelas 5': 23, 'Kelas 6': 22 },
      growthTrend: [150, 145, 140, 138, 135]
    },
    teachers: {
      total: 5, certified: 1, pns: 1, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 4, 'Agama Islam': 1 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 0, lightDamage: 3, heavyDamage: 3 },
      hasLibrary: false, hasLab: false, toiletsGood: 0, toiletsDamaged: 3,
      internetSpeedMbps: 5, internetProvider: 'Telkomsel Orbit'
    }
  },
  {
    npsn: '20246442',
    name: 'SD NEGERI 1 PICUNGPUGUR',
    level: 'SD',
    status: 'Negeri',
    village: 'Picungpugur',
    accreditation: 'B',
    coordinates: { lat: -6.851556, lng: 108.625444 },
    students: {
      total: 215, male: 110, female: 105,
      byGrade: { 'Kelas 1': 36, 'Kelas 2': 35, 'Kelas 3': 36, 'Kelas 4': 36, 'Kelas 5': 36, 'Kelas 6': 36 },
      growthTrend: [195, 200, 205, 210, 215]
    },
    teachers: {
      total: 9, certified: 5, pns: 4, pppk: 2, honorer: 3,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 2, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 4, lightDamage: 3, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 20, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20246445',
    name: 'SD NEGERI 1 TUK KARANGSUWUNG',
    level: 'SD',
    status: 'Negeri',
    village: 'Tuk Karangsuwung',
    accreditation: 'B',
    coordinates: { lat: -6.835000, lng: 108.630000 },
    students: {
      total: 220, male: 112, female: 108,
      byGrade: { 'Kelas 1': 37, 'Kelas 2': 36, 'Kelas 3': 37, 'Kelas 4': 36, 'Kelas 5': 37, 'Kelas 6': 37 },
      growthTrend: [190, 198, 205, 212, 220]
    },
    teachers: {
      total: 9, certified: 5, pns: 5, pppk: 2, honorer: 2,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1, 'Bahasa Inggris': 1 },
      pendingCertification: 1, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 5, lightDamage: 2, heavyDamage: 1 },
      hasLibrary: true, hasLab: false, toiletsGood: 3, toiletsDamaged: 1,
      internetSpeedMbps: 25, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215162',
    name: 'SD NEGERI 1 LEMAHABANG',
    level: 'SD',
    status: 'Negeri',
    village: 'Lemahabang',
    accreditation: 'A',
    coordinates: { lat: -6.831944, lng: 108.629444 },
    students: {
      total: 315, male: 161, female: 154,
      byGrade: { 'Kelas 1': 53, 'Kelas 2': 52, 'Kelas 3': 53, 'Kelas 4': 52, 'Kelas 5': 53, 'Kelas 6': 52 },
      growthTrend: [290, 295, 302, 310, 315]
    },
    teachers: {
      total: 13, certified: 10, pns: 9, pppk: 3, honorer: 1,
      subjects: { 'Guru Kelas': 9, 'Agama Islam': 2, 'PJOK': 2 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 9, lightDamage: 2, heavyDamage: 0 },
      hasLibrary: true, hasLab: false, toiletsGood: 4, toiletsDamaged: 1,
      internetSpeedMbps: 50, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '20215584',
    name: 'SD NEGERI 1 WANGKELANG',
    level: 'SD',
    status: 'Negeri',
    village: 'Wangkelang',
    accreditation: 'C',
    coordinates: { lat: -6.833889, lng: 108.574722 },
    students: {
      total: 125, male: 64, female: 61,
      byGrade: { 'Kelas 1': 21, 'Kelas 2': 21, 'Kelas 3': 21, 'Kelas 4': 20, 'Kelas 5': 21, 'Kelas 6': 21 },
      growthTrend: [140, 135, 130, 128, 125]
    },
    teachers: {
      total: 5, certified: 1, pns: 1, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 4, 'Agama Islam': 1 },
      pendingCertification: 2, retiringSoon: 2
    },
    facilities: {
      classroomCondition: { good: 1, lightDamage: 2, heavyDamage: 2 },
      hasLibrary: false, hasLab: false, toiletsGood: 1, toiletsDamaged: 2,
      internetSpeedMbps: 8, internetProvider: 'Telkomsel Flash'
    }
  },
  {
    npsn: '20244513',
    name: 'SD NEGERI 4 SIGONG',
    level: 'SD',
    status: 'Negeri',
    village: 'Sigong',
    accreditation: 'B',
    coordinates: { lat: -6.827206, lng: 108.647168 },
    students: {
      total: 155, male: 79, female: 76,
      byGrade: { 'Kelas 1': 26, 'Kelas 2': 25, 'Kelas 3': 26, 'Kelas 4': 26, 'Kelas 5': 26, 'Kelas 6': 26 },
      growthTrend: [140, 142, 148, 152, 155]
    },
    teachers: {
      total: 6, certified: 2, pns: 2, pppk: 1, honorer: 3,
      subjects: { 'Guru Kelas': 4, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 2, retiringSoon: 1
    },
    facilities: {
      classroomCondition: { good: 3, lightDamage: 2, heavyDamage: 1 },
      hasLibrary: false, hasLab: false, toiletsGood: 2, toiletsDamaged: 1,
      internetSpeedMbps: 10, internetProvider: 'Telkomsel Flash'
    }
  },
  // ── TK SWASTA ──
  {
    npsn: '69987654',
    name: 'TK PERTIWI LEMAHABANG',
    level: 'TK',
    status: 'Swasta',
    village: 'Lemahabang',
    accreditation: 'B',
    coordinates: { lat: -6.830, lng: 108.620 },
    students: {
      total: 50, male: 25, female: 25,
      byGrade: { 'Kelompok A': 25, 'Kelompok B': 25 },
      growthTrend: [40, 42, 45, 48, 50]
    },
    teachers: {
      total: 4, certified: 2, pns: 0, pppk: 0, honorer: 4,
      subjects: { 'Guru TK': 3, 'Agama': 1 },
      pendingCertification: 2, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 2, lightDamage: 0, heavyDamage: 0 },
      hasLibrary: false, hasLab: false,
      toiletsGood: 1, toiletsDamaged: 0,
      internetSpeedMbps: 5, internetProvider: 'IndiHome'
    }
  },
  {
    npsn: '69987655',
    name: 'TK ISLAM AL-IKHLAS',
    level: 'TK',
    status: 'Swasta',
    village: 'Cipeujeuh Wetan',
    accreditation: 'A',
    coordinates: { lat: -6.825, lng: 108.610 },
    students: {
      total: 40, male: 20, female: 20,
      byGrade: { 'Kelompok A': 18, 'Kelompok B': 22 },
      growthTrend: [30, 33, 36, 38, 40]
    },
    teachers: {
      total: 4, certified: 1, pns: 0, pppk: 0, honorer: 4,
      subjects: { 'Guru TK': 2, 'Agama': 1, 'Seni': 1 },
      pendingCertification: 3, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 1, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: false, hasLab: false,
      toiletsGood: 1, toiletsDamaged: 0,
      internetSpeedMbps: 5, internetProvider: 'Telkom'
    }
  },
  // ── KB (KELOMPOK BERMAIN) ──
  {
    npsn: '69998765',
    name: 'KB AL-FALAH',
    level: 'KB',
    status: 'Swasta',
    village: 'Belawa',
    accreditation: 'Belum Terakreditasi',
    coordinates: { lat: -6.852, lng: 108.612 },
    students: {
      total: 25, male: 13, female: 12,
      byGrade: { 'Kelompok Bermain': 25 },
      growthTrend: [15, 18, 20, 22, 25]
    },
    teachers: {
      total: 3, certified: 0, pns: 0, pppk: 0, honorer: 3,
      subjects: { 'Guru KB': 2, 'Agama': 1 },
      pendingCertification: 3, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 1, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: false, hasLab: false,
      toiletsGood: 1, toiletsDamaged: 0,
      internetSpeedMbps: 3, internetProvider: 'Smartfren'
    }
  },
  {
    npsn: '69998766',
    name: 'KB MELATI INDAH',
    level: 'KB',
    status: 'Swasta',
    village: 'Picungpugur',
    accreditation: 'Belum Terakreditasi',
    coordinates: { lat: -6.842, lng: 108.632 },
    students: {
      total: 20, male: 10, female: 10,
      byGrade: { 'Kelompok Bermain': 20 },
      growthTrend: [12, 14, 16, 18, 20]
    },
    teachers: {
      total: 2, certified: 0, pns: 0, pppk: 0, honorer: 2,
      subjects: { 'Guru KB': 2 },
      pendingCertification: 2, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 1, lightDamage: 0, heavyDamage: 0 },
      hasLibrary: false, hasLab: false,
      toiletsGood: 1, toiletsDamaged: 0,
      internetSpeedMbps: 3, internetProvider: 'Telkomsel'
    }
  },
  // ── SD SWASTA ──
  // ── SD IT AL IRSYAD AL ISLAMIYYAH (Swasta) ──
  {
    npsn: '20215221',
    name: 'SD IT AL IRSYAD AL ISLAMIYYAH',
    level: 'SD',
    status: 'Swasta',
    village: 'Lemahabang Kulon',
    accreditation: 'B',
    coordinates: { lat: -6.826944444444444, lng: 108.62833333333332 },
    students: {
      total: 150, male: 80, female: 70,
      byGrade: { 'Kelas 1': 25, 'Kelas 2': 25, 'Kelas 3': 25, 'Kelas 4': 25, 'Kelas 5': 25, 'Kelas 6': 25 },
      growthTrend: [130, 138, 142, 146, 150]
    },
    teachers: {
      total: 8, certified: 3, pns: 0, pppk: 0, honorer: 8,
      subjects: { 'Guru Kelas': 6, 'Agama Islam': 1, 'PJOK': 1 },
      pendingCertification: 4, retiringSoon: 0
    },
    facilities: {
      classroomCondition: { good: 4, lightDamage: 1, heavyDamage: 0 },
      hasLibrary: true, hasLab: false,
      toiletsGood: 2, toiletsDamaged: 0,
      internetSpeedMbps: 10, internetProvider: 'Telkom'
    }
  }
];

const generateRestOfSchools = (): School[] => {
  const list: School[] = [];
  
  baseSchools.forEach(bs => {
    const ratio = bs.students.total / (bs.teachers.total || 1);
    const isUnderstaffed = bs.level === 'SD' ? ratio > 28 : bs.level === 'TK' ? ratio > 15 : ratio > 12;
    
    const classroomsCount = bs.facilities.classroomCondition.good + bs.facilities.classroomCondition.lightDamage + bs.facilities.classroomCondition.heavyDamage;
    const isOverloaded = bs.students.total / (classroomsCount || 1) > 38;
    
    const isCriticalInfra = bs.facilities.classroomCondition.heavyDamage > 1 || bs.facilities.toiletsDamaged > bs.facilities.toiletsGood;
    const isRetirementHigh = bs.teachers.retiringSoon / (bs.teachers.total || 1) > 0.15;
    
    let teacherShortageSev = isUnderstaffed ? 25 : 0;
    let studentOverloadSev = isOverloaded ? 20 : 0;
    let infraDamageSev = isCriticalInfra ? 30 : bs.facilities.classroomCondition.lightDamage * 5;
    let retirementRiskSev = isRetirementHigh ? 15 : bs.teachers.retiringSoon * 3;
    
    const severityScore = teacherShortageSev + studentOverloadSev + infraDamageSev + retirementRiskSev;
    const healthScore = Math.max(5, 100 - severityScore);

    list.push({
      ...bs,
      healthScore: Math.round(healthScore),
      riskIndicators: {
        teacherShortage: isUnderstaffed,
        studentOverload: isOverloaded,
        infrastructureCritical: isCriticalInfra,
        retirementExposure: isRetirementHigh
      }
    });
  });

  return list;
};

export const ALL_SCHOOLS = generateRestOfSchools();

export const GET_VILLAGE_STATS = (): VillageStats[] => {
  return VILLAGES.map(v => {
    const schoolsInVillage = ALL_SCHOOLS.filter(s => s.village === v);
    const totalStudents = schoolsInVillage.reduce((acc, curr) => acc + curr.students.total, 0);
    const totalTeachers = schoolsInVillage.reduce((acc, curr) => acc + curr.teachers.total, 0);
    const avgHealthScore = schoolsInVillage.reduce((acc, curr) => acc + curr.healthScore, 0) / schoolsInVillage.length;
    const shortageCount = schoolsInVillage.filter(s => s.riskIndicators.teacherShortage).length;

    return {
      name: v,
      totalSchools: schoolsInVillage.length,
      totalStudents,
      totalTeachers,
      teacherShortage: shortageCount,
      avgHealthScore: Math.round(avgHealthScore),
      studentGrowthRate: parseFloat((1.5 + (VILLAGES.indexOf(v) * 0.4)).toFixed(1))
    };
  });
};


