import { GovTestSpecItem } from './hkGovSpecTypes';

export const HK_GOV_SPECS_C: GovTestSpecItem[] = [
  {
    id: 'pointload',
    stpCode: 'PO',
    calcId: 'pointload',
    emoji: '🪨',
    titleZh: '岩石點荷載強度指數 Is(50) 及取芯率 TCR',
    titleEn: 'Rock Point Load Index Is(50) & Core Recovery TCR',
    testStd: 'ASTM D5731-16 · STP06 Rev. 2',
    summaryZh: '僅限徑向及軸向岩芯 · 嚴禁塊狀試樣 · 岩層須鑽探核實最少 5 m',
    summaryEn: 'Diametral & Axial cores only · No irregular lumps · Prove ≥ 5 m rock depth',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 8 & Geoguide 3',
        clauseEn: 'GS 2020 Ed. Sec. 8 & Geoguide 3',
        keyLimitBadge: '10–60 s 破壞 · 僅限岩芯',
        highlightBadge: '10–60 s 破壞 · 僅限岩芯',
        metrics: [
          { label: 'HOKLAS 認可試樣範圍', value: '僅限徑向及軸向岩芯', tone: 'rose' },
          { label: '穩定加載破壞時間', value: '10–60 s', tone: 'brand' },
          { label: '批量截尾均值 n ≥ 10', value: '剔除最高 2 + 最低 2', tone: 'emerald' },
        ],
        criteriaZh:
          '僅限徑向及軸向岩芯試樣 · 嚴禁不規則塊狀試樣\n10–60 s 內貫穿兩加載錐頂破壞 · 修正因子 F = (De/50)^0.45\n每組 n ≥ 10 時剔除最高 2 個及最低 2 個值計算平均 Is(50)',
        criteriaEn:
          'Diametral & Axial rock cores only · no blocks or irregular lumps\nFail steadily within 10–60 s through both cone tips · F = (De/50)^0.45\nFor n ≥ 10 specimens, drop 2 highest & 2 lowest values for mean Is(50)',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 3 & 5',
        clauseEn: 'ArchSD GS 2022 Sec. 3 & 5',
        keyLimitBadge: '1(c): TCR > 85% · Is(50) ≥ 1 MPa',
        highlightBadge: '1(c): TCR > 85% · Is(50) ≥ 1 MPa',
        metrics: [
          { label: 'Cat 1(b) 取芯率 · 指數', value: 'TCR > 95% · ≥ 2.0 MPa', tone: 'emerald' },
          { label: 'Cat 1(c) 取芯率 · 指數', value: 'TCR > 85% · ≥ 1.0 MPa', tone: 'brand' },
          { label: '岩層鑽探核實深度', value: '最少 5 m', tone: 'amber' },
        ],
        criteriaZh:
          'Sec. 3 & 5 嵌岩地基：Cat 1(b) TCR > 95% 且 Is(50) ≥ 2.0 MPa\nCat 1(c) TCR > 85% 且 Is(50) ≥ 1.0 MPa · 僅限徑向及軸向岩芯\n基底下須鑽探核實最少 5 m 連續岩層品質',
        criteriaEn:
          'Sec. 3 & 5 Rock Socket: Cat 1(b) TCR > 95% & Is(50) ≥ 2.0 MPa\nCat 1(c) TCR > 85% & Is(50) ≥ 1.0 MPa · Diametral/Axial cores only\nProve rock quality to at least 5 m below foundation level',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HA GS 2024 & HKHA Rock Socket Spec',
        clauseEn: 'HA GS 2024 & HKHA Rock Socket Spec',
        keyLimitBadge: '鑽探入岩 ≥ 5 m · 逐米抽驗',
        highlightBadge: '鑽探入岩 ≥ 5 m · 逐米抽驗',
        metrics: [
          { label: '預鑽核實入岩深度', value: '≥ 5 m 或 3 倍樁徑', tone: 'amber' },
          { label: '徑向端距 · 軸向長徑比', value: 'L ≥ 0.5D · 0.33–1.0', tone: 'brand' },
          { label: '加載錐同軸度核查', value: 'dmax - dmin < 0.20 mm', tone: 'emerald' },
        ],
        criteriaZh:
          '每支樁預鑽 ≥ 5 m 或 3 倍樁徑入岩確認無軟弱夾層\n徑向試樣自由端距 L ≥ 0.5D · 軸向長徑比 0.33 ≤ D/W ≤ 1.0\n工地同軸度檢查 dmax - dmin < 0.20 mm · 僅限岩芯試樣',
        criteriaEn:
          'Pre-drill ≥ 5 m or 3 × pile diameter into rock; verify no weak seams\nDiametral free-end L ≥ 0.5D · Axial ratio 0.33 ≤ D/W ≤ 1.0\nCoaxiality variance dmax - dmin < 0.20 mm · rock cores only',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Table 2.1',
        clauseEn: 'CoP Foundations Table 2.1',
        keyLimitBadge: '1(a)≥3 · 1(b)≥2 · 1(c)≥1 MPa',
        highlightBadge: '1(a)≥3 · 1(b)≥2 · 1(c)≥1 MPa',
        metrics: [
          { label: 'Cat 1(a) / 1(b) Is(50)', value: '≥ 3.0 / ≥ 2.0 MPa', tone: 'violet' },
          { label: 'Cat 1(c) / 1(d) TCR', value: '> 85% / > 50%', tone: 'brand' },
          { label: '強制鑽探核實深度', value: '最少 5 m 深度', tone: 'rose' },
        ],
        criteriaZh:
          '1(a): TCR 100%, Is(50) ≥ 3.0 MPa · 1(b): TCR > 95%, Is(50) ≥ 2.0 MPa\n1(c): TCR > 85%, Is(50) ≥ 1.0 MPa · 1(d): Grade III 或以上, TCR > 50%\n岩層須鑽探核實最少 5 m 深度 · STP06 僅適用於 UCS > 15 MPa 岩芯',
        criteriaEn:
          '1(a): TCR 100%, Is(50) ≥ 3.0 MPa · 1(b): TCR > 95%, Is(50) ≥ 2.0 MPa\n1(c): TCR > 85%, Is(50) ≥ 1.0 MPa · 1(d): Grade III or better, TCR > 50%\nProve rock to at least 5 m depth · STP06 valid for UCS > 15 MPa cores',
      },
    },
  },
  {
    id: 'plt',
    stpCode: 'PLT',
    calcId: 'plt',
    emoji: '🏗️',
    titleZh: '平板載荷試驗',
    titleEn: 'Plate Load Test — Incremental Loading',
    testStd: 'BS 1377-9 Cl. 4.1 · BD Cl. 8.2 · HA EXC.T910.1',
    summaryZh: '4 隻 0.01 mm 正交千分錶 · 3 循環至 3W · 頂載維持 ≥ 72h',
    summaryEn: '4 orthogonal 0.01 mm dial gauges · 3 cycles to 3W · ≥ 72h peak hold',
    depts: {
      CEDD: {
        dept: 'CEDD',
        clauseZh: 'GS 2020 Ed. Sec. 6 & BS 1377-9 Cl. 4.1',
        clauseEn: 'GS 2020 Ed. Sec. 6 & BS 1377-9 Cl. 4.1',
        keyLimitBadge: '4 隻 0.01 mm 錶 · 支點 ≥ 2.5B',
        highlightBadge: '4 隻 0.01 mm 錶 · 支點 ≥ 2.5B',
        metrics: [
          { label: '鋼板尺寸 · 正交千分錶', value: '≥ 300 mm · 4 隻 0.01 mm', tone: 'brand' },
          { label: '基準樑支點距離', value: '≥ 2.5B', tone: 'emerald' },
          { label: '每級維持與穩定速率', value: '≥ 10 min · < 0.05 mm/10m', tone: 'amber' },
        ],
        criteriaZh:
          'GS Sec. 6 及 BS 1377-9 Cl. 4.1：剛性圓板或方板 ≥ 300 mm 配 4 隻 0.01 mm 千分錶\n基準樑支點距離試板邊緣 ≥ 2.5B · 嚴禁使用球座連接千斤頂\n每級維持 ≥ 10 min 且沉降速率 < 0.05 mm / 10 min',
        criteriaEn:
          'GS Sec. 6 & BS 1377-9 Cl. 4.1: Rigid round/square plate ≥ 300 mm + 4 × 0.01 mm gauges\nReference beam supports ≥ 2.5B from plate edge · no ball seating\nHold each step ≥ 10 min until rate < 0.05 mm / 10 min',
      },
      ASD: {
        dept: 'ASD',
        clauseZh: 'ArchSD GS 2022 Sec. 3 & 5',
        clauseEn: 'ArchSD GS 2022 Sec. 3 & 5',
        keyLimitBadge: '3 循環至 3W · Smax ≤ 0.15B',
        highlightBadge: '3 循環至 3W · Smax ≤ 0.15B',
        metrics: [
          { label: 'Sec. 3 & 5 加載程序', value: '3 循環 · 0.5W 級差至 3W', tone: 'emerald' },
          { label: '每級收斂標準', value: '≥ 10 min · < 0.05 mm/10m', tone: 'brand' },
          { label: '最大總沉降上限', value: 'Smax ≤ 0.15B', tone: 'amber' },
        ],
        criteriaZh:
          'Sec. 3 地基開挖及 Sec. 5 淺層承載核實：3 循環以 0.5W 級差加載至 3W\n每級維持 ≥ 10 min 且沉降收斂 < 0.05 mm / 10 min\n最大沉降 Smax ≤ 0.15B · 荷載計須按 HOKLAS SC-16 每工地校準',
        criteriaEn:
          'Sec. 3 & 5 Bearing Verification: 3 cycles in 0.5W steps up to 3W\nHold ≥ 10 min per step until rate < 0.05 mm / 10 min\nMax settlement Smax ≤ 0.15B · calibrate load cell per site under SC-16',
      },
      HOUSING: {
        dept: 'HOUSING',
        clauseZh: 'HA GS 2024 EXC.T910.1',
        clauseEn: 'HA GS 2024 EXC.T910.1',
        keyLimitBadge: '3 循環至 3W · 頂載 ≥ 72 小時',
        highlightBadge: '3 循環至 3W · 頂載 ≥ 72 小時',
        metrics: [
          { label: '加載循環 · 頂載維持', value: '3 循環至 3W · ≥ 72 小時', tone: 'amber' },
          { label: '每級穩定判據', value: '≥ 10 min 且 < 0.05 mm/10m', tone: 'rose' },
          { label: '量錶精度 · 環境監測', value: '4 隻 0.01 mm 錶 + 遮陰測溫', tone: 'emerald' },
        ],
        criteriaZh:
          'HA GS 2024 EXC.T910.1：3 循環至 3W · 頂載 3W 維持 ≥ 72 小時\n每級維持 ≥ 10 min 且沉降變化 < 0.05 mm / 10 min\n強制配置 4 隻 0.01 mm 正交千分錶、搭棚遮陰並全程記錄氣溫天氣',
        criteriaEn:
          'HA GS 2024 EXC.T910.1: 3 cycles to 3W · hold peak 3W load ≥ 72 hours\nEach step ≥ 10 min and settlement rate < 0.05 mm / 10 min\n4 orthogonal 0.01 mm dial gauges, sunshade canopy & ambient temp log',
      },
      BD: {
        dept: 'BD',
        clauseZh: 'CoP Foundations Cl. 8.2(2)',
        clauseEn: 'CoP Foundations Cl. 8.2(2)',
        keyLimitBadge: 'Smax ≤ 0.15B · 3W 維持 ≥ 72h',
        highlightBadge: 'Smax ≤ 0.15B · 3W 維持 ≥ 72h',
        metrics: [
          { label: 'Cl. 8.2(2)(f) 最大沉降', value: 'Smax ≤ 0.15B · 測試期間', tone: 'violet' },
          { label: 'Cl. 8.2(2)(d) 3W 維持', value: '≥ 72 小時 · 4 隻千分錶', tone: 'brand' },
          { label: 'Cl. 8.2(2)(g) 圓板 vs 方板 Es', value: 'Wt(1-ν²)/SB vs /1.13SB', tone: 'emerald' },
        ],
        criteriaZh:
          '3 循環至 3W 維持 ≥ 72h · 測試期間最大沉降 Smax ≤ 0.15B\n圓板 Es = Wt(1-ν²)/(S·B) · 方板 Es = Wt(1-ν²)/(1.13·S·B)\n每級維持 ≥ 10 min 且 < 0.05 mm / 10 min · 採用 4 隻正交千分錶均值',
        criteriaEn:
          '3 cycles to 3W held ≥ 72h · max settlement during test Smax ≤ 0.15B\nCircular Es = Wt(1-ν²)/(S·B) · Square Es = Wt(1-ν²)/(1.13·S·B)\nEach step ≥ 10 min & < 0.05 mm / 10 min · mean of 4 orthogonal gauges',
      },
    },
  },
];
