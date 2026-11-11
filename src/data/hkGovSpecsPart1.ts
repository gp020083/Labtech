import { GovTestSpecItem } from './hkGovSpecTypes';

export const HK_GOV_SPECS_A: GovTestSpecItem[] = [
  {
    id: 'bleeding',
    stpCode: 'BL',
    calcId: 'bleeding',
    emoji: '💧',
    titleZh: '水泥漿泌水率及自由膨脹率',
    titleEn: 'Grout Bleeding & Free Expansion',
    testStd: 'ASTM C940-22 · STP04 Rev. 2',
    summaryZh: '泥釘 · 微型樁 · 嵌岩工字樁 · 報告修約至最近 0.2%',
    summaryEn: 'Soil Nail · Mini-pile · Socketed H-pile · Report to nearest 0.2%',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 7, 8 & 17',
        clauseEn: 'GS 2020 Ed. Sec. 7, 8 & 17',
        keyLimitBadge: '泥釘 ≤ 0.5% · 樁基 ≤ 2.0%',
        highlightBadge: '泥釘 ≤ 0.5% · 樁基 ≤ 2.0%',
        metrics: [
          { label: 'Sec. 7 泥釘 / 岩栓 3h', value: '≤ 0.5%', tone: 'rose' },
          { label: 'Sec. 8 樁基 3h · 24h', value: '≤ 2.0% · 24h = 0%', tone: 'brand' },
          { label: '新拌膨脹 · Sec. 17 預應力', value: '0–4% · EN 445 ≤ 0.3%', tone: 'emerald' },
        ],
        criteriaZh:
          'Sec. 7 泥釘/岩栓：3h ≤ 0.5% · 24h = 0%\nSec. 8 樁基灌漿：3h ≤ 2.0% · 24h = 0%\n新拌自由膨脹 0–4% · Sec. 17 預應力按 BS EN 445 ≤ 0.3%',
        criteriaEn:
          'Sec. 7 Soil Nails/Rock Bolts: 3h ≤ 0.5% · 24h = 0%\nSec. 8 Piling Grout: 3h ≤ 2.0% · 24h = 0%\nFresh Expansion 0–4% · Sec. 17 PT Ducts per BS EN 445 ≤ 0.3%',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 5 & 6',
        clauseEn: 'ArchSD GS 2022 Sec. 5 & 6',
        keyLimitBadge: '3h ≤ 2.0% · 24h = 0%',
        highlightBadge: '3h ≤ 2.0% · 24h = 0%',
        metrics: [
          { label: 'Sec. 5 樁基 3h 泌水', value: '≤ 2.0%', tone: 'emerald' },
          { label: '24h 吸收 · 預應力管道', value: '24h = 0% · PT 0%', tone: 'brand' },
          { label: 'ASTM C940 新拌自由膨脹', value: '0–4%', tone: 'emerald' },
        ],
        criteriaZh:
          'Sec. 5 樁基灌漿：3h 泌水 ≤ 2.0% · 24h = 0%\nSec. 6 預應力管道：24h 游離水 0%\nASTM C940 新拌自由膨脹：0–4% · 28d 抗壓 ≥ 40 MPa',
        criteriaEn:
          'Sec. 5 Piling Grout: 3h Bleeding ≤ 2.0% · 24h = 0%\nSec. 6 PT Ducts: 24h Free Water = 0%\nASTM C940 Fresh Free Expansion: 0–4% · 28d Cube ≥ 40 MPa',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HA GS 2024 & HKHA Piling Spec',
        clauseEn: 'HA GS 2024 & HKHA Piling Spec',
        keyLimitBadge: '3h ≤ 2.0% · w/c ≤ 0.45',
        highlightBadge: '3h ≤ 2.0% · w/c ≤ 0.45',
        metrics: [
          { label: '3h 泌水上限', value: '≤ 2.0%', tone: 'amber' },
          { label: '24h 游離水 · 水灰比', value: '0% · w/c ≤ 0.45', tone: 'brand' },
          { label: '新拌自由膨脹 · 取樣', value: '0–4% · 每班次連磚', tone: 'emerald' },
        ],
        criteriaZh:
          '3h 泌水率 ≤ 2.0% · 24h 完全吸收 0%\n新拌自由膨脹 0–4% · 水灰比 w/c ≤ 0.45\n每班次連同漿磚同步取樣並修約至 0.2%',
        criteriaEn:
          '3h Bleeding ≤ 2.0% · 24h Free Water = 0%\nFresh Free Expansion 0–4% · w/c ≤ 0.45\nSampled per shift with cubes · report to nearest 0.2%',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Cl. 5.3.2, 5.3.3 & Sec. 7',
        clauseEn: 'CoP Foundations Cl. 5.3.2, 5.3.3 & Sec. 7',
        keyLimitBadge: '3h ≤ 2.0% · fcu ≥ 30 MPa',
        highlightBadge: '3h ≤ 2.0% · fcu ≥ 30 MPa',
        metrics: [
          { label: 'Sec. 7 灌漿 3h · 24h', value: '≤ 2.0% · 24h = 0%', tone: 'violet' },
          { label: 'Cl. 5.3.3 Mini-pile 水灰比', value: 'w/c ≤ 0.45', tone: 'brand' },
          { label: '自由膨脹 · 28d 強度', value: '≤ 5% · fcu ≥ 30 MPa', tone: 'emerald' },
        ],
        criteriaZh:
          'Sec. 7 灌漿工藝：3h 泌水 ≤ 2.0% · 24h = 0%\nCl. 5.3.2 Socket H-pile 及 Cl. 5.3.3 Mini-pile：w/c ≤ 0.45\n自由膨脹 ≤ 5% · 28d 特徵強度 fcu ≥ 30 MPa',
        criteriaEn:
          'Sec. 7 Grouting: 3h Bleeding ≤ 2.0% · 24h = 0%\nCl. 5.3.2 Socketed H-pile & Cl. 5.3.3 Mini-pile: w/c ≤ 0.45\nFree Expansion ≤ 5% · 28d fcu ≥ 30 MPa',
      },
    },
  },
  {
    id: 'flowcone',
    stpCode: 'FC',
    calcId: 'flowcone',
    emoji: '⏱️',
    titleZh: '水泥漿流錐流動度測試',
    titleEn: 'Grout Flow Cone Efflux Time',
    testStd: 'ASTM C939/C939M-22 · STP05 Rev. 2',
    summaryZh: 'ASTM C939 方法適用上限 ≤ 35 s · 均值修約至最近 0.2 s',
    summaryEn: 'ASTM C939 method ceiling ≤ 35 s · Report mean to nearest 0.2 s',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 7 & Sec. 8',
        clauseEn: 'GS 2020 Ed. Sec. 7 & Sec. 8',
        keyLimitBadge: '泥釘 15–30 s · 樁基 11–30 s',
        highlightBadge: '泥釘 15–30 s · 樁基 11–30 s',
        metrics: [
          { label: 'Sec. 7 泥釘 / 錨固', value: '15–30 s · 必 ≥ 15 s', tone: 'rose' },
          { label: 'Sec. 8 樁基灌漿', value: '11–30 s', tone: 'brand' },
          { label: '清水校準 · 雙次重複性', value: '8.0 ± 0.2 s · ≤ 1.8 s', tone: 'emerald' },
        ],
        criteriaZh:
          'Sec. 7 泥釘/錨固：流秒 ≥ 15 s · 常用 15–30 s\nSec. 8 樁基灌漿：11–30 s · ASTM C939 方法上限 ≤ 35 s\n1725 mL 清水校準 8.0 ± 0.2 s · 雙次差 ≤ 1.8 s · 修約 0.2 s',
        criteriaEn:
          'Sec. 7 Soil Nails/Anchors: ≥ 15 s · typ. 15–30 s\nSec. 8 Piling Grout: 11–30 s · ASTM C939 ceiling ≤ 35 s\n1725 mL Water Cal 8.0 ± 0.2 s · Repeatability ≤ 1.8 s · round 0.2 s',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 5 & 6',
        clauseEn: 'ArchSD GS 2022 Sec. 5 & 6',
        keyLimitBadge: '10–30 s · 漿溫 ≤ 30 °C',
        highlightBadge: '10–30 s · 漿溫 ≤ 30 °C',
        metrics: [
          { label: 'Sec. 5 初始流秒', value: '10–30 s', tone: 'emerald' },
          { label: '30 min 保持流動度', value: '≤ 30 s', tone: 'brand' },
          { label: '現場漿溫 · 清水校準', value: '≤ 30 °C · 8.0 ± 0.2 s', tone: 'amber' },
        ],
        criteriaZh:
          'Sec. 5 樁基初始流秒：10–30 s · 按批核試拌\n30 min 保持流秒 ≤ 30 s · ASTM C939 適用上限 ≤ 35 s\n現場漿溫 ≤ 30 °C · 清水校準 8.0 ± 0.2 s',
        criteriaEn:
          'Sec. 5 Initial Efflux: 10–30 s per approved Trial Mix\n30-min Retained Efflux ≤ 30 s · ASTM C939 ceiling ≤ 35 s\nSite Grout Temp ≤ 30 °C · Water Cal 8.0 ± 0.2 s',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HA GS 2024 & HKHA Piling Spec',
        clauseEn: 'HA GS 2024 & HKHA Piling Spec',
        keyLimitBadge: '12–30 s · 每批必測',
        highlightBadge: '12–30 s · 每批必測',
        metrics: [
          { label: '規定流秒範圍', value: '12–30 s', tone: 'amber' },
          { label: '雙次重複性 · 修約', value: '≤ 1.8 s · 0.2 s', tone: 'brand' },
          { label: '每日清水校準 · 漿溫', value: '≥ 2 次 · 記錄溫度', tone: 'emerald' },
        ],
        criteriaZh:
          '規定流秒範圍：12–30 s · 方法適用上限 ≤ 35 s\n雙次測試差 ≤ 1.8 s · 平均值修約至最近 0.2 s\n工地每日最少 2 次清水校準 8.0 ± 0.2 s 並記錄漿溫',
        criteriaEn:
          'Required Efflux: 12–30 s · ASTM C939 ceiling ≤ 35 s\nRepeatability ≤ 1.8 s · report mean to nearest 0.2 s\nMin twice-daily water check 8.0 ± 0.2 s + log grout temp',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Sec. 5 & 7 · RSE Plan',
        clauseEn: 'CoP Foundations Sec. 5 & 7 · RSE Plan',
        keyLimitBadge: '10–30 s · 按批核試拌',
        highlightBadge: '10–30 s · 按批核試拌',
        metrics: [
          { label: '批核 Trial Mix 流秒', value: '10–30 s', tone: 'violet' },
          { label: 'ASTM C939 方法上限', value: '≤ 35 s', tone: 'amber' },
          { label: '清水校準 · 雙次差', value: '8.0 ± 0.2 s · ≤ 1.8 s', tone: 'emerald' },
        ],
        criteriaZh:
          '按 RSE 批核 Trial Mix 控制流秒：一般 10–30 s\nASTM C939 方法上限 ≤ 35 s · 逾 35 s 不適用此法\n清水校準 8.0 ± 0.2 s · 雙次差 ≤ 1.8 s · 修約至 0.2 s',
        criteriaEn:
          'Efflux per RSE approved Trial Mix: typ. 10–30 s\nASTM C939 method ceiling ≤ 35 s\nWater Cal 8.0 ± 0.2 s · Repeatability ≤ 1.8 s · nearest 0.2 s',
      },
    },
  },
];
