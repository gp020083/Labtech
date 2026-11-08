import { GovTestSpecItem } from './hkGovSpecTypes';
import { HK_GOV_SPECS_A } from './hkGovSpecsPart1';
import { HK_GOV_SPECS_B } from './hkGovSpecsPart2';
import { HK_GOV_SPECS_C } from './hkGovSpecsPart3';

export * from './hkGovSpecTypes';

const HK_GOV_SPECS_D: GovTestSpecItem[] = [
  {
    id: 'conc',
    emoji: '🧱',
    titleZh: 'Concrete Cube & Slump 混凝土測試',
    titleEn: 'Concrete Cube Strength & Slump',
    testStd: 'CS1:2010',
    summaryZh: '27±2°C 養護 · 抗壓強度 · Slump',
    summaryEn: '27±2°C Curing · Cube Strength · Slump',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS Sec. 16 & CS1:2010',
        clauseEn: 'GS Sec. 16 & CS1:2010',
        keyLimitBadge: '27±2°C · Tremie 175–225mm',
        criteriaZh: '養護水溫: 27 ± 2°C (CS1:2010)\nTremie 樁混凝土 Slump: 175–225 mm\n每車卸料前核對 Slump',
        criteriaEn: 'Curing: 27 ± 2°C (CS1:2010)\nTremie pile slump: 175–225 mm\nCheck every truck on site',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS Sec. 6',
        clauseEn: 'ArchSD GS Sec. 6',
        keyLimitBadge: 'CS1:2010 · Slump ±25/30mm',
        criteriaZh: 'Slump 容差: ±25 mm (≥150mm 為 ±30mm)\nHOKLAS Lab 按 CS1:2010 壓試',
        criteriaEn: 'Slump tol.: ±25 mm (±30mm if ≥150mm)\nTested by HOKLAS lab per CS1',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HKHA Concrete & RFID Spec',
        clauseEn: 'HKHA Concrete & RFID Spec',
        keyLimitBadge: 'RFID 晶片 · 7d 強度監察',
        criteriaZh: '強制嵌入 RFID 防偽晶片\n27 ± 2°C 養護 + 7d 早期強度預警',
        criteriaEn: 'Mandatory embedded RFID tag\n27 ± 2°C curing + 7d trend alert',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'PNAP APP-53 & CS1:2010',
        clauseEn: 'PNAP APP-53 & CS1:2010',
        keyLimitBadge: 'Mean4 ≥ fcu+4/5 · Min ≥ fcu-4',
        criteriaZh: 'Mean of 4 ≥ fcu + 4 MPa (100mm: +5)\nMin Single ≥ fcu - 4 MPa',
        criteriaEn: 'Mean of 4 ≥ fcu + 4 MPa (100mm: +5)\nMin Single ≥ fcu - 4 MPa',
      },
    },
  },
  {
    id: 'srt',
    emoji: '🏜️',
    titleZh: 'Sand Replacement 壓實度測試 (MDD %)',
    titleEn: 'Sand Replacement Soil Compaction',
    testStd: 'Geospec 3 (TM 11.1 / 10.1)',
    summaryZh: 'Earthworks · Subgrade · Backfill',
    summaryEn: 'Earthworks · Subgrade · Backfill',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS Sec. 6 & Geospec 3',
        clauseEn: 'GS Sec. 6 & Geospec 3',
        keyLimitBadge: '一般 ≥ 95% · 路基 ≥ 98% MDD',
        criteriaZh: '一般填土 / 斜坡 ≥ 95% MDD\n路基頂 300–600mm / 背填 ≥ 98% MDD\n綠化區 ≥ 90% MDD',
        criteriaEn: 'General / slope fill ≥ 95% MDD\nRoad subgrade / backfill ≥ 98% MDD\nLandscape ≥ 90% MDD',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS Sec. 3',
        clauseEn: 'ArchSD GS Sec. 3',
        keyLimitBadge: '≥ 95% MDD · OMC ±2–3%',
        criteriaZh: '結構底回填 ≥ 95% MDD (每層 ≤ 250mm)\nMoisture Content: OMC ±2% 至 ±3%',
        criteriaEn: 'Structural backfill ≥ 95% MDD (≤ 250mm/lift)\nMoisture: OMC ±2% to ±3%',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HKHA Earthworks Spec',
        clauseEn: 'HKHA Earthworks Spec',
        keyLimitBadge: 'EVA 車道 ≥ 98% MDD',
        criteriaZh: '一般回填 ≥ 95% MDD\n屋邨道路及 EVA 車道 ≥ 98% MDD',
        criteriaEn: 'General backfill ≥ 95% MDD\nEstate roads & EVA ≥ 98% MDD',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'Approved Site Formation Plan',
        clauseEn: 'Approved Site Formation Plan',
        keyLimitBadge: '≥ 95% / 98% MDD',
        criteriaZh: '按批核圖每層抽驗 ≥ 95% / 98% MDD\nHOKLAS 報告核實',
        criteriaEn: 'Per approved plan ≥ 95% / 98% MDD\nVerified by HOKLAS report',
      },
    },
  },
];

export const HK_GOV_SPECS: GovTestSpecItem[] = [
  ...HK_GOV_SPECS_A,
  ...HK_GOV_SPECS_B,
  ...HK_GOV_SPECS_C,
  ...HK_GOV_SPECS_D,
];
