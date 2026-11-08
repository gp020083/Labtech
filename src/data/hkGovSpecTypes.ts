export type GovDeptId = 'CEDD' | 'ASD' | 'HOUSING' | 'BD';

export interface DeptRequirement {
  dept: GovDeptId;
  clauseZh: string;
  clauseEn: string;
  criteriaZh: string;
  criteriaEn: string;
  keyLimitBadge: string;
}

export interface GovTestSpecItem {
  id: string;
  stpCode?: string;
  calcId?: 'bleeding' | 'plt' | 'koden' | 'flowcone' | 'pointload' | 'inclinometer';
  emoji: string;
  titleZh: string;
  titleEn: string;
  testStd: string;
  summaryZh: string;
  summaryEn: string;
  depts: Record<GovDeptId, DeptRequirement>;
}

export const GOV_DEPTS: { id: GovDeptId; short: string; fullZh: string; fullEn: string; badgeCls: string }[] = [
  { id: 'CEDD', short: 'CEDD', fullZh: 'CEDD 土木工程拓展署 (GS Civil 2024)', fullEn: 'CEDD (GS for Civil Engineering Works)', badgeCls: 'bg-sky-100 text-sky-900 border-sky-200' },
  { id: 'ASD', short: 'ASD', fullZh: 'ASD 建築署 (ArchSD GS Building 2022)', fullEn: 'ASD / ArchSD (GS for Building 2022)', badgeCls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { id: 'HOUSING', short: 'Housing', fullZh: 'Housing 房屋署 / 房委會 (HKHA Spec)', fullEn: 'Housing Authority (HKHA Spec Library)', badgeCls: 'bg-amber-100 text-amber-900 border-amber-200' },
  { id: 'BD', short: 'BD', fullZh: 'BD 屋宇署 (CoP Foundations 2017 / CS1)', fullEn: 'BD (CoP for Foundations 2017 / PNAP)', badgeCls: 'bg-violet-100 text-violet-900 border-violet-200' },
];

export const BD_ROCK_TABLE_2_1 = [
  { cat: 'Cat 1(a)', grade: 'Grade I (Fresh)', tcr: '100%', is50: '≥ 3.0 MPa', ucs: '≥ 75 MPa', qa: '10,000 kPa' },
  { cat: 'Cat 1(b)', grade: 'Grade II or better', tcr: '≥ 95%', is50: '≥ 2.0 MPa', ucs: '≥ 50 MPa', qa: '7,500 kPa' },
  { cat: 'Cat 1(c)', grade: 'Grade III or better', tcr: '≥ 85%', is50: '≥ 1.0 MPa', ucs: '≥ 25 MPa', qa: '5,000 kPa' },
  { cat: 'Cat 1(d)', grade: 'Grade IV or better', tcr: '≥ 50%', is50: 'N/A', ucs: 'N/A', qa: '3,000 kPa' },
];
