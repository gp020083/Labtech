import { GovTestSpecItem } from './hkGovSpecTypes';
import { HK_GOV_SPECS_A } from './hkGovSpecsPart1';
import { HK_GOV_SPECS_B } from './hkGovSpecsPart2';
import { HK_GOV_SPECS_C } from './hkGovSpecsPart3';

export * from './hkGovSpecTypes';

const HK_GOV_SPEC_VC: GovTestSpecItem = {
  id: 'inclinometer',
  stpCode: 'VC',
  calcId: 'inclinometer',
  emoji: '🧭',
  titleZh: '鑽孔及樁身垂直度偏差檢測',
  titleEn: 'Verticality Check — PeeWee & Biaxial Inclinometer',
  testStd: 'HOKLAS-5 PeeWee / Devishot · BD Table 7.4',
  summaryZh: '微型樁 · 嵌岩工字樁 · 鋼板樁 · 鑽孔偏斜測量',
  summaryEn: 'Mini-pile · Socketed H-pile · Sheet Pile · Borehole Deviation Survey',
  depts: {
    CEDD: {
      dept: 'CEDD',
      clauseZh: 'GS 2020 Ed. Sec. 8',
      clauseEn: 'GS 2020 Ed. Sec. 8',
      keyLimitBadge: '直樁 ≤ 1:75 · 斜樁 ≤ 1:25',
      highlightBadge: '直樁 ≤ 1:75 · 斜樁 ≤ 1:25',
      metrics: [
        { label: '垂直樁傾斜上限', value: '≤ 1 : 75', tone: 'brand' },
        { label: '斜樁偏差 · 樁頂偏位', value: '≤ 1 : 25 · ± 75 mm', tone: 'emerald' },
        { label: '雙軸正反讀數核查', value: 'A0+A180 零位補償', tone: 'amber' },
      ],
      criteriaZh:
        'Sec. 8 垂直樁傾斜度 ≤ 1:75 · 斜樁偏差 ≤ 1:25\n樁頂切斷面平面偏位 ≤ 75 mm\n按 A0/A180 及 B0/B180 正反讀數消除探頭零點偏移',
      criteriaEn:
        'Sec. 8 Vertical piles ≤ 1:75 · raking piles ≤ 1:25\nCut-off plan offset ≤ 75 mm\nBiaxial A0/A180 & B0/B180 survey eliminates zero-bias drift',
    },
    ASD: {
      dept: 'ASD',
      clauseZh: 'ArchSD GS 2022 Sec. 4 & Sec. 5',
      clauseEn: 'ArchSD GS 2022 Sec. 4 & Sec. 5',
      keyLimitBadge: '鋼板樁 ≤ 1:400 · Mini ≤ 1:100',
      highlightBadge: '鋼板樁 ≤ 1:400 · Mini ≤ 1:100',
      metrics: [
        { label: 'Sec. 4 鋼板樁垂直度', value: '≤ 1 : 400 · 導樁 1 : 500', tone: 'rose' },
        { label: 'Sec. 5 Mini-pile 微型樁', value: '≤ 1 : 100', tone: 'emerald' },
        { label: 'Sec. 5 鑽孔樁 / 工字樁', value: '≤ 1 : 75', tone: 'brand' },
      ],
      criteriaZh:
        'Sec. 4 鋼板樁 ≤ 1:400 · 端樁及導向樁 ≤ 1:500\nSec. 5 樁基 ≤ 1:75 · Mini-pile 微型樁 ≤ 1:100\n全孔分段記錄傾角與方位角計算累積合成位移',
      criteriaEn:
        'Sec. 4 Steel sheet piles ≤ 1:400 · end/guide piles ≤ 1:500\nSec. 5 Bored/Socketed H-piles ≤ 1:75 · Mini-piles ≤ 1:100\nLog inclination & azimuth per depth station for cumulative drift',
    },
    HOUSING: {
      dept: 'HOUSING',
      clauseZh: 'HA GS 2024 & HKHA Piling Spec',
      clauseEn: 'HA GS 2024 & HKHA Piling Spec',
      keyLimitBadge: 'Mini ≤ 1:100 · 大樁 ≤ 1:75',
      highlightBadge: 'Mini ≤ 1:100 · 大樁 ≤ 1:75',
      metrics: [
        { label: 'Mini-pile 微型樁', value: '≤ 1 : 100 · ± 15 mm', tone: 'amber' },
        { label: '大口徑樁 / 嵌岩工字樁', value: '≤ 1 : 75 · ± 75 mm', tone: 'brand' },
        { label: '下放鋼芯前核實', value: '全深連續偏斜剖面', tone: 'emerald' },
      ],
      criteriaZh:
        'Mini-pile 微型樁：垂直度 ≤ 1:100 · 平面偏位 ± 15 mm\n大口徑鑽孔樁及嵌岩工字樁：垂直度 ≤ 1:75 · 平面偏位 ± 75 mm\n落鋼筋或工字鋼前完成全孔垂直度驗收',
      criteriaEn:
        'Mini-piles: Verticality ≤ 1:100 · plan offset ± 15 mm\nLarge bored & socketed H-piles: ≤ 1:75 · plan offset ± 75 mm\nVerify full-depth deviation profile prior to steel installation',
    },
    BD: {
      dept: 'BD',
      clauseZh: 'CoP Foundations Table 7.4',
      clauseEn: 'CoP Foundations Table 7.4',
      keyLimitBadge: 'Mini ±15mm/1:100 · 大樁 ±75mm/1:75',
      highlightBadge: 'Mini ±15mm/1:100 · 大樁 ±75mm/1:75',
      metrics: [
        { label: 'Table 7.4 Mini-pile', value: '± 15 mm · ≤ 1 : 100', tone: 'rose' },
        { label: 'Table 7.4 鑽孔樁 / 工字樁', value: '± 75 mm · ≤ 1 : 75', tone: 'violet' },
        { label: '截面尺寸容差', value: '± 3%', tone: 'emerald' },
      ],
      criteriaZh:
        'Table 7.4 Mini-pile 微型樁：平面 ± 15 mm · 垂直度 ≤ 1:100\nTable 7.4 鑽孔樁、嵌岩工字樁及壁樁：平面 ± 75 mm · 垂直度 ≤ 1:75\n構件截面尺寸容差 ± 3%',
      criteriaEn:
        'Table 7.4 Mini-piles: Plan ± 15 mm · Verticality ≤ 1:100\nTable 7.4 Bored piles, Socketed H-piles & Barrettes: Plan ± 75 mm · ≤ 1:75\nCross-sectional dimension tolerance ± 3%',
    },
  },
};

export const HK_GOV_SPECS: GovTestSpecItem[] = [
  ...HK_GOV_SPECS_A,
  ...HK_GOV_SPECS_B,
  ...HK_GOV_SPECS_C,
  HK_GOV_SPEC_VC,
];
