export type GovDeptId = 'CEDD' | 'ASD' | 'HOUSING' | 'BD';

export interface GovDeptCriterion {
  dept: GovDeptId;
  clauseZh: string;
  clauseEn: string;
  criteriaZh: string;
  criteriaEn: string;
  keyLimitBadge: string;
  highlightBadge?: string;
  metrics?: {
    label: string;
    value: string;
    tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'violet';
  }[];
}

export type DeptRequirement = GovDeptCriterion;

export interface GovTestSpecItem {
  id: string;
  stpCode?: string;
  calcId?: 'bleeding' | 'flowcone' | 'koden' | 'sonic' | 'pointload' | 'plt' | 'inclinometer';
  emoji: string;
  titleZh: string;
  titleEn: string;
  testStd: string;
  summaryZh: string;
  summaryEn: string;
  depts: Record<GovDeptId, GovDeptCriterion>;
}

export const GOV_DEPTS: {
  id: GovDeptId;
  short: string;
  editionTag: string;
  fullZh: string;
  fullEn: string;
  badgeCls: string;
}[] = [
  {
    id: 'CEDD',
    short: 'CEDD',
    editionTag: 'GS 2020 Ed. · 2024修訂',
    fullZh: 'CEDD 土木工程拓展署 · GS 2020 Ed. · 2024修訂',
    fullEn: 'CEDD · GS for Civil Eng. Works 2020 Ed. w/ 2024 Amendments',
    badgeCls: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    id: 'ASD',
    short: 'ASD',
    editionTag: 'ArchSD GS 2022 Ed.',
    fullZh: 'ASD 建築署 · ArchSD GS Building 2022 Ed.',
    fullEn: 'ASD / ArchSD · GS for Building 2022 Ed.',
    badgeCls: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  {
    id: 'HOUSING',
    short: 'Housing',
    editionTag: 'HA GS 2024 & Piling',
    fullZh: 'Housing 房屋署 · HA GS 2024 & Piling Spec',
    fullEn: 'Housing Authority · HA GS 2024 & Piling Spec',
    badgeCls: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'BD',
    short: 'BD',
    editionTag: 'CoP 2017 · 2024 Ed.',
    fullZh: 'BD 屋宇署 · CoP Foundations 2017 · 2024 Ed.',
    fullEn: 'BD · CoP for Foundations 2017 · 2024 Edition',
    badgeCls: 'bg-violet-100 text-violet-900 border-violet-200',
  },
];

export const BD_ROCK_TABLE_2_1 = [
  {
    cat: 'Cat 1(a)',
    grade: 'Grade I · 新鮮岩石',
    tcr: '100%',
    is50: '≥ 3.0 MPa',
    ucs: '≥ 75 MPa',
    qa: '10,000 kPa',
  },
  {
    cat: 'Cat 1(b)',
    grade: 'Grade II 或以上',
    tcr: '> 95%',
    is50: '≥ 2.0 MPa',
    ucs: '≥ 50 MPa',
    qa: '7,500 kPa',
  },
  {
    cat: 'Cat 1(c)',
    grade: 'Grade III 或以上',
    tcr: '> 85%',
    is50: '≥ 1.0 MPa',
    ucs: '≥ 25 MPa',
    qa: '5,000 kPa',
  },
  {
    cat: 'Cat 1(d)',
    grade: 'Grade III 或以上 · 優於 IV',
    tcr: '> 50%',
    is50: '表內不設下限 · STP06 適用 UCS > 15 MPa',
    ucs: '表內不設下限',
    qa: '3,000 kPa',
  },
];
