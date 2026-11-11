import { GovTestSpecItem } from './hkGovSpecTypes';

export const HK_GOV_SPECS_B: GovTestSpecItem[] = [
  {
    id: 'koden',
    stpCode: 'KD',
    calcId: 'koden',
    emoji: '📡',
    titleZh: 'Koden 超聲波孔壁垂直度及孔徑剖面',
    titleEn: 'Koden Ultrasonic Borehole Verticality & Profiling',
    testStd: 'HKCI TM3 Issue 2 (2024) · STP02 Rev. 7',
    summaryZh: '大口徑鑽孔樁 · 壁樁 · 擴底樁 · 全段及每 10 m 分段核對',
    summaryEn: 'Bored Pile · Barrette · Bell-out · Overall & every 10 m section check',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 8',
        clauseEn: 'GS 2020 Ed. Sec. 8',
        keyLimitBadge: '垂直度 ≤ 1:75 · 偏位 ± 75 mm',
        highlightBadge: '垂直度 ≤ 1:75 · 偏位 ± 75 mm',
        metrics: [
          { label: '鑽孔樁垂直度上限', value: '≤ 1 : 75', tone: 'brand' },
          { label: '樁頂平面偏位', value: '± 75 mm', tone: 'emerald' },
          { label: '雙軸剖面 · 深度核對', value: 'X-X & Y-Y · ≤ min(0.3m, 1%)', tone: 'amber' },
        ],
        criteriaZh:
          '垂直度 ≤ 1:75 · 指定鄰近敏感結構樁 ≤ 1:100\n樁頂切斷面平面偏位 ≤ 75 mm\n清底後量度 X-X 及 Y-Y 兩軸並核對測繩深度誤差 ≤ min(0.3 m, 1%)',
        criteriaEn:
          'Verticality ≤ 1:75 · ≤ 1:100 near sensitive structures\nCut-off plan offset ≤ 75 mm\nProfile X-X & Y-Y axes · depth check ≤ min(0.3 m, 1%)',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 5',
        clauseEn: 'ArchSD GS 2022 Sec. 5',
        keyLimitBadge: '大樁 ≤ 1:75 · 密樁 ≤ 1:100',
        highlightBadge: '大樁 ≤ 1:75 · 密樁 ≤ 1:100',
        metrics: [
          { label: 'Sec. 5 垂直度上限', value: '≤ 1 : 75 · 密樁 1 : 100', tone: 'emerald' },
          { label: '樁頂平面偏位', value: '± 75 mm', tone: 'brand' },
          { label: '套管校準 · 絞車速度', value: 'NS/WE 內徑 · 5–11 m/min', tone: 'amber' },
        ],
        criteriaZh:
          'Sec. 5 樁基工程：垂直度 ≤ 1:75 · 密樁或批核圖 ≤ 1:100\n樁頂平面偏位 ≤ 75 mm\n須於已知 NS/WE 內徑鋼套管校準比例因子 SH · 探頭升降 5–11 m/min',
        criteriaEn:
          'Sec. 5 Piling Work: Verticality ≤ 1:75 · close piles ≤ 1:100\nPlan offset ≤ 75 mm\nCalibrate SH in NS/WE steel casing · winch speed 5–11 m/min',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HKHA Bored Pile & Mini-pile Spec',
        clauseEn: 'HKHA Bored Pile & Mini-pile Spec',
        keyLimitBadge: '大樁 ≤ 1:75 · Mini ≤ 1:100',
        highlightBadge: '大樁 ≤ 1:75 · Mini ≤ 1:100',
        metrics: [
          { label: '大口徑鑽孔樁', value: '≤ 1 : 75 · ± 75 mm', tone: 'amber' },
          { label: 'Mini-pile 微型樁', value: '≤ 1 : 100 · ± 15 mm', tone: 'rose' },
          { label: 'HKCI TM3 分段核對', value: '全段 + 每 10 m 分段', tone: 'brand' },
        ],
        criteriaZh:
          '大口徑鑽孔樁 ≤ 1:75 · Mini-pile 微型樁 ≤ 1:100\n按 HKCI TM3 同時核對全段 D1–D2 及每 10 m 分段合成傾斜度\n清底合格後落鋼筋籠前完成超聲波驗孔',
        criteriaEn:
          'Large Bored Piles ≤ 1:75 · Mini-piles ≤ 1:100\nCheck both overall D1–D2 and every 10 m section per HKCI TM3\nComplete UES profiling after cleaning prior to cage lowering',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Table 7.4',
        clauseEn: 'CoP Foundations Table 7.4',
        keyLimitBadge: '大樁 ±75mm/1:75 · Mini ±15mm/1:100',
        highlightBadge: '大樁 ±75mm/1:75 · Mini ±15mm/1:100',
        metrics: [
          { label: '大口徑樁平面 · 垂直度', value: '± 75 mm · ≤ 1 : 75', tone: 'violet' },
          { label: 'Mini-pile 平面 · 垂直度', value: '± 15 mm · ≤ 1 : 100', tone: 'rose' },
          { label: 'Table 7.4 截面尺寸容差', value: '± 3%', tone: 'emerald' },
        ],
        criteriaZh:
          'Table 7.4 大口徑樁/壁樁：平面 ± 75 mm · 垂直度 ≤ 1:75 · 截面尺寸 ± 3%\nTable 7.4 Mini-pile 微型樁：平面 ± 15 mm · 垂直度 ≤ 1:100\n合成偏移 LR = √(Lx² + Ly²) 精確至 1 mm',
        criteriaEn:
          'Table 7.4 Bored Piles/Barrettes: Plan ± 75 mm · Verticality ≤ 1:75 · Dimension ± 3%\nTable 7.4 Mini-piles: Plan ± 15 mm · Verticality ≤ 1:100\nResultant shift LR = √(Lx² + Ly²) reported to 1 mm',
      },
    },
  },
  {
    id: 'sonic',
    stpCode: 'SO',
    calcId: 'sonic',
    emoji: '🔊',
    titleZh: '跨孔超聲波樁身完整性測井',
    titleEn: 'Crosshole Sonic Logging Integrity Test',
    testStd: 'ASTM D6760-16 · STP03 Rev. 3',
    summaryZh: '齡期 ≥ 7 日 · 管內水溫 0–30 °C · 最少拉升秒數 L / 0.5 s',
    summaryEn: 'Age ≥ 7 days · Tube water 0–30 °C · Min pulling time L / 0.5 s',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 8',
        clauseEn: 'GS 2020 Ed. Sec. 8',
        keyLimitBadge: '齡期 ≥ 7d · FAT ≤ 20%',
        highlightBadge: '齡期 ≥ 7d · FAT ≤ 20%',
        metrics: [
          { label: '混凝土測試齡期', value: '≥ 7 日', tone: 'brand' },
          { label: '良好波速 · 異常延遲', value: '> 3,500 m/s · FAT > 20%', tone: 'rose' },
          { label: '拉升速度 · 管內水溫', value: '≤ 0.5 m/s · 0–30 °C', tone: 'emerald' },
        ],
        criteriaZh:
          '澆築後 ≥ 7 日測試全部聲測管組合剖面\n良好混凝土波速 > 3,500 m/s · FAT 延遲 > 20% 須鑽芯核實\n探頭拉升速度 ≤ 0.5 m/s · 管內水溫 0–30 °C',
        criteriaEn:
          'Test ≥ 7 days after concreting across all tube-pair profiles\nGood wave speed > 3,500 m/s · FAT delay > 20% triggers core check\nPulling speed ≤ 0.5 m/s · Tube water temp 0–30 °C',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 5 Cl. 5.36',
        clauseEn: 'ArchSD GS 2022 Sec. 5 Cl. 5.36',
        keyLimitBadge: '鋼管 ID ≥ 42 mm · 禁 PVC',
        highlightBadge: '鋼管 ID ≥ 42 mm · 禁 PVC',
        metrics: [
          { label: 'Cl. 5.36 聲測黑鐵管', value: 'ID ≥ 42 mm · 禁 PVC', tone: 'emerald' },
          { label: 'FAT 評級門檻', value: '≤ 10% 良 · > 20% 異常', tone: 'rose' },
          { label: '驗收合格後處理', value: '全管壓力灌漿封孔', tone: 'brand' },
        ],
        criteriaZh:
          'Sec. 5 Cl. 5.36 必須採用 Mild Steel 鋼管直達樁底 · 內徑 ID ≥ 42 mm · 嚴禁 PVC 管\nFAT 延遲 ≤ 10% 良好 · > 20% 屬可疑異常\n驗收合格後以無收縮水泥漿壓力封管',
        criteriaEn:
          'Sec. 5 Cl. 5.36 Mild steel tubes to pile toe · ID ≥ 42 mm · no PVC tubes\nFAT delay ≤ 10% Good · > 20% questionable/anomaly\nPressure grout tubes after acceptance',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HKHA Pile Integrity Spec',
        clauseEn: 'HKHA Pile Integrity Spec',
        keyLimitBadge: '100% 全數 HOKLAS 檢驗',
        highlightBadge: '100% 全數 HOKLAS 檢驗',
        metrics: [
          { label: '大口徑樁抽檢比例', value: '100% 全數檢驗', tone: 'amber' },
          { label: '掃描與測錘長度差', value: '|A - B| ≤ max(0.25m, 1%)', tone: 'brand' },
          { label: '重點核查位置', value: '樁底 Soft Toe 及冷縫', tone: 'rose' },
        ],
        criteriaZh:
          '100% 大口徑鑽孔樁須由獨立 HOKLAS 實驗室進行全剖面 CSL\n掃描長度與測錘深度誤差 |A - B| ≤ max(0.25 m, 1%)\n重點核查樁底接觸面 Soft Toe 及施工冷縫',
        criteriaEn:
          '100% large diameter bored piles tested by HOKLAS lab\nScanned vs plumbed length |A - B| ≤ max(0.25 m, 1%)\nStrict check on soft toe contact and cold joints',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Cl. 8.6 & PNAP APP-18',
        clauseEn: 'CoP Foundations Cl. 8.6 & PNAP APP-18',
        keyLimitBadge: 'Cl. 8.6 · FAT > 20% 補鑽芯',
        highlightBadge: 'Cl. 8.6 · FAT > 20% 補鑽芯',
        metrics: [
          { label: 'Cl. 8.6 強制驗樁', value: 'HOKLAS 認可實驗室', tone: 'violet' },
          { label: '異常觸發補鑽門檻', value: 'FAT > 20% 或失波', tone: 'rose' },
          { label: 'STP03 Rev. 3 最少拉升時間', value: 'Min t = L / 0.5 s', tone: 'emerald' },
        ],
        criteriaZh:
          'BD CoP Cl. 8.6 及 PNAP APP-18 強制 HOKLAS 跨孔超聲波驗樁\nFAT 延遲 > 20% 或能量大幅衰減須補鑽 Verification Core\n按 STP03 Rev. 3 以校準秒錶監控拉升時間 ≥ L / 0.5 s',
        criteriaEn:
          'Mandatory HOKLAS CSL testing per BD CoP Cl. 8.6 & PNAP APP-18\nFAT delay > 20% or severe energy loss triggers verification coring\nStopwatch-monitored pulling time ≥ L / 0.5 s per STP03 Rev. 3',
      },
    },
  },
];
